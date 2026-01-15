import { Router, Request, Response } from 'express';
import { getJobManager } from '../services/jobManager.js';
import { getVideoService } from '../services/videoService.js';
import { getTTSService } from '../services/ttsService.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../middleware/logger.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

/**
 * 异步生成视频逻辑
 */
async function generateVideoAsync(jobId: string, settings: any, mode: 'single' | 'final' = 'final', slideId?: number): Promise<void> {
    const jobManager = getJobManager();
    const videoService = getVideoService();

    try {
        const jobDir = jobManager.getJobDir(jobId);
        const videoDir = path.join(jobDir, 'video');
        const tempDir = path.join(jobDir, 'temp');
        await fs.mkdir(videoDir, { recursive: true });
        await fs.mkdir(tempDir, { recursive: true });

        if (mode === 'single') {
            // --- 单页视频生成模式 ---
            if (slideId === undefined) throw new Error('slideId is required for single mode');

            logger.info(`Generating single slide video: Job ${jobId}, Slide ${slideId}`);
            await jobManager.updateJob(jobId, { status: 'processing', progress: 10 });

            // 1. 获取讲稿内容
            const notesPath = path.join(jobDir, 'notes.json');
            const notesData = JSON.parse(await fs.readFile(notesPath, 'utf-8'));

            // 查找对应的note，兼容 0-based 和 1-based 索引
            let note = notesData.find((n: any) => {
                const nid = n.id !== undefined ? n.id : n.slideId;
                return nid === slideId;
            });

            if (!note) {
                // 尝试匹配 slideId + 1 (处理 0 vs 1 的差异)
                note = notesData.find((n: any) => {
                    const nid = n.id !== undefined ? n.id : n.slideId;
                    return nid === (slideId + 1);
                });
            }

            if (!note) {
                // 如果还是找不到，打印现有的 IDs 以便调试
                const availableIds = notesData.map((n: any) => n.id !== undefined ? n.id : n.slideId);
                logger.warn(`Note not found for slide ${slideId}. Available IDs: ${availableIds.join(', ')}`);
                throw new Error(`Note not found for slide ${slideId}`);
            }

            // 2. 检查音频
            const audioDir = path.join(jobDir, 'audio');
            const audioPath = path.join(audioDir, `slide_${slideId}.mp3`);
            let hasAudio = false;

            try {
                await fs.access(audioPath);
                hasAudio = true;
            } catch {
                // 音频不存在，如果提供了settings则生成，否则报错
                if (settings && (settings.ttsService || settings.modelType)) {
                    logger.info(`Audio missing for slide ${slideId}, attempting to generate...`);
                    const ttsService = getTTSService();
                    const ttsType = settings.ttsService || settings.modelType || 'minimax';

                    const audioBuffer = await ttsService.generateAudio(note.note, ttsType, {
                        groupId: settings.minimaxGroupId,
                        accessToken: settings.minimaxAccessToken,
                        voiceId: settings.minimaxVoiceId || settings.voiceId,
                        speakerWav: settings.speakerWav,
                        apiKey: settings.qwenApiKey,
                        model: settings.qwenModel,
                        voice: settings.qwenVoiceId
                    });

                    await ttsService.saveAudio(audioBuffer, audioPath);
                    hasAudio = true;
                } else {
                    logger.warn(`Audio missing for slide ${slideId} and no TTS settings provided.`);
                }
            }

            // 3. 合成单页视频
            const slidesDir = path.join(jobDir, 'slides');
            let imagePath = path.join(slidesDir, `slide_${slideId}.png`);

            // 容错处理：检查 slide_0 vs slide_1
            try { await fs.access(imagePath); } catch {
                imagePath = path.join(slidesDir, `slide_${slideId - 1}.png`);
                try { await fs.access(imagePath); } catch {
                    throw new Error(`Slide image not found for slide ${slideId}`);
                }
            }

            const videoPath = path.join(videoDir, `slide_${slideId}.mp4`);
            await videoService.generateSlideVideo(imagePath, hasAudio ? audioPath : null, videoPath);

            logger.success(`Single slide video generated: ${videoPath}`);
            await jobManager.updateJob(jobId, { status: 'completed', progress: 100 });
            return;
        }

        // --- 全量视频合成模式 (Final) ---
        logger.info(`Generating final video for Job ${jobId}`);
        await jobManager.updateJob(jobId, { status: 'processing', progress: 10 });
        const slidesDir = path.join(jobDir, 'slides');
        const audioDir = path.join(jobDir, 'audio');

        // 获取 slides 列表
        const files = await fs.readdir(slidesDir);
        const slideFiles = files.filter(f => f.startsWith('slide_') && f.endsWith('.png'));

        // 排序 slide_1, slide_2...
        slideFiles.sort((a, b) => {
            const numA = parseInt(a.match(/slide_(\d+)/)?.[1] || '0');
            const numB = parseInt(b.match(/slide_(\d+)/)?.[1] || '0');
            return numA - numB;
        });

        logger.info(`Found ${slideFiles.length} slides for video generation`);

        const videoSegments: string[] = [];

        // 1. 生成每一页的视频片段
        for (let i = 0; i < slideFiles.length; i++) {
            const slideFile = slideFiles[i];
            const slideId = parseInt(slideFile.match(/slide_(\d+)/)?.[1] || '0');

            // 进度更新
            const progress = 10 + Math.floor((i / slideFiles.length) * 60);
            await jobManager.updateJob(jobId, { status: 'processing', progress });

            const imagePath = path.join(slidesDir, slideFile);
            const audioPath = path.join(audioDir, `slide_${slideId}.mp3`);
            const segmentPath = path.join(tempDir, `segment_${slideId}.mp4`);

            let hasAudio = false;
            try {
                await fs.access(audioPath);
                hasAudio = true;
            } catch {
                logger.warn(`Audio not found for slide ${slideId}, video will be silent`);
            }

            await videoService.generateSlideVideo(imagePath, hasAudio ? audioPath : null, segmentPath);
            videoSegments.push(segmentPath);
        }

        // 2. 合并所有片段
        await jobManager.updateJob(jobId, { status: 'processing', progress: 80 });
        const finalVideoPath = path.join(videoDir, 'final_video.mp4');

        logger.info(`Merging ${videoSegments.length} video segments...`);
        await videoService.mergeVideos(videoSegments, finalVideoPath, tempDir);

        logger.success(`Final video generated: ${finalVideoPath}`);
        await jobManager.updateJob(jobId, { status: 'completed', progress: 100 });

    } catch (error: any) {
        logger.error('Async video generation failed:', error);
        await jobManager.updateJob(jobId, {
            status: 'error',
            error: `Video generation failed: ${error.message}`
        });
        throw error;
    }
}

/**
 * POST /webhook/api/generate-video
 * 生成视频 (路由入口)
 */
router.post(
    '/generate-video',
    asyncHandler(async (req: Request, res: Response) => {
        const { jobId, settings, mode, slideId } = req.body;

        logger.info('Generating video', { jobId, mode, slideId });

        if (!jobId) {
            return res.status(400).json({
                success: false,
                error: 'jobId is required'
            });
        }

        try {
            const jobManager = getJobManager();
            const job = jobManager.getJob(jobId);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }

            logger.info(`Starting video generation (${mode || 'final'})...`);

            // 阻塞处理
            await generateVideoAsync(jobId, settings || {}, mode || 'final', slideId);

            res.json({
                success: true,
                message: `Video generation (${mode || 'final'}) completed`
            });
        } catch (error: any) {
            logger.error('Video generation failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

export default router;
