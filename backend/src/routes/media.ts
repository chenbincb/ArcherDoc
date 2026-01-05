import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getJobManager } from '../services/jobManager.js';
import { getTTSService } from '../services/ttsService.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../middleware/logger.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const upload = multer();

/**
 * POST /webhook/api/generate-single-audio
 * 生成单个幻灯片的音频
 */
router.post(
  '/generate-single-audio',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      noteText,
      slideId,
      modelType,
      minimaxGroupId,
      minimaxAccessToken,
      minimaxVoiceId,
      speechRate,
      speakerWav,
      gpuThresholdGb,
      url,
      qwenApiKey,
      qwenModel,
      qwenVoiceId
    } = req.body;

    // 严格按照n8n的实现，使用modelType作为服务类型
    const actualService = modelType || 'minimax';

    logger.info('Generating single audio', { slideId, service: actualService, url });

    // Debug: 打印接收到的 Qwen 参数
    if (actualService === 'qwen_tts') {
      logger.info('Qwen Params:', {
        model: qwenModel,
        voiceId: qwenVoiceId,
        apiKeyPrefix: qwenApiKey ? qwenApiKey.substring(0, 4) + '...' : 'undefined'
      });
    }

    if (!noteText || slideId === undefined || !actualService) {
      return res.status(400).json({
        success: false,
        error: 'noteText, slideId and modelType are required'
      });
    }

    try {
      // 检查jobId是否存在
      const jobId = (req.body as any).jobId;
      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: 'jobId is required'
        });
      }

      logger.info('Generating audio for job', { jobId, slideId, modelType: actualService });

      const ttsService = getTTSService();

      // 调用统一的音频生成接口
      // 根据不同的服务类型，正确映射 voiceId
      const targetVoiceId = actualService === 'qwen_tts' ? qwenVoiceId : minimaxVoiceId;

      const audioBuffer = await ttsService.generateAudio(noteText, actualService as any, {
        groupId: minimaxGroupId,
        accessToken: minimaxAccessToken,
        voiceId: targetVoiceId,
        speechRate: speechRate,
        speakerWav: speakerWav,
        gpuThresholdGb: gpuThresholdGb,
        url: url,
        apiKey: qwenApiKey,
        model: qwenModel
      });

      // 保存音频文件
      const jobManager = getJobManager();
      const jobDir = jobManager.getJobDir(jobId);
      const audioDir = path.join(jobDir, 'audio');
      await fs.mkdir(audioDir, { recursive: true });

      const audioPath = path.join(audioDir, `slide_${slideId}.mp3`);
      await ttsService.saveAudio(audioBuffer, audioPath);

      logger.success(`Audio generated: slide_${slideId}.mp3 (${audioBuffer.length} bytes)`);

      // 严格按照n8n的响应格式返回
      res.json({
        status: "success",
        message: "单个音频生成成功",
        slideId: slideId,
        audioPath: `/home/n8n/AIStudio/jobs/${jobId}/audio/slide_${slideId}.mp3`
      });
    } catch (error: any) {
      logger.error('Audio generation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * POST /webhook/api/save-content
 * 保存文章或讲稿内容
 */
router.post(
  '/save-content',
  asyncHandler(async (req: Request, res: Response) => {
    const { contentType, jobId, content } = req.body;

    logger.info('Saving content', { contentType, jobId });

    if (!contentType || !jobId) {
      return res.status(400).json({
        success: false,
        error: 'contentType and jobId are required'
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

      const jobDir = jobManager.getJobDir(jobId);
      let filePath: string;

      if (contentType === 'article') {
        // 保存文章内容为JSON格式（和n8n Python脚本保持一致）
        const articleData = {
          article: {
            content: content,
            word_count: content.length,
            generation_time: new Date().toISOString()
          },
          metadata: {
            generated_by: "AI Article Generator",
            version: "1.0"
          }
        };

        filePath = path.join(jobDir, 'article.json');
        await fs.writeFile(filePath, JSON.stringify(articleData, null, 2), 'utf-8');

        // 同时保存一份纯文本版，方便预览和某些下载场景
        const txtPath = path.join(jobDir, 'article.txt');
        await fs.writeFile(txtPath, content, 'utf-8');

        logger.success(`Article saved: ${filePath} and ${txtPath}`);
      } else {
        // 默认为讲稿内容 (contentType: 'notes' 或 'video_notes')
        filePath = path.join(jobDir, 'notes.json');

        // 确保 content 是字符串或 JSON 字符串
        let contentToSave = content;
        if (typeof content !== 'string') {
          contentToSave = JSON.stringify(content, null, 2);
        }

        await fs.writeFile(filePath, contentToSave, 'utf-8');
        logger.success(`Notes saved: ${filePath}`);
      }

      res.json({
        success: true,
        message: 'Content saved successfully'
      });
    } catch (error: any) {
      logger.error('Save content failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * POST /webhook/api/export-content
 * 导出内容为不同格式（和n8n ExportWorkflow保持一致）
 * 生成所有支持的格式并保存到exports目录，返回下载链接
 */
router.post(
  '/export-content',
  asyncHandler(async (req: Request, res: Response) => {
    const { contentType, jobId } = req.body; // format参数不再需要，默认导出所有

    logger.info('Exporting content', { contentType, jobId });

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

      const jobDir = jobManager.getJobDir(jobId);
      const exportDir = path.join(jobDir, 'exports');
      await fs.mkdir(exportDir, { recursive: true });

      const timestamp = new Date().toISOString();
      const responseData: any = {
        success: true,
        jobId,
        exportedAt: timestamp,
        exportDir: exportDir
      };

      if (contentType === 'article') {
        // --- 导出文章 (HTML, MD, TXT, JSON) ---
        let title = '未命名文章';
        let content = '';

        try {
          // 读取文章数据 - 优先读取标准化命名的 article.json
          const articleJsonPath = path.join(jobDir, 'article.json');
          const articleData = JSON.parse(await fs.readFile(articleJsonPath, 'utf-8'));
          title = articleData.source?.ppt_title || articleData.title || '文章';
          content = articleData.article?.content || articleData.content || '';
        } catch {
          // 兼容旧版命名
          try {
            const oldPath = path.join(jobDir, 'generated_article.json');
            const articleData = JSON.parse(await fs.readFile(oldPath, 'utf-8'));
            content = articleData.article?.content || '';
          } catch {
            // 降级：尝试读取 txt
            try {
              content = await fs.readFile(path.join(jobDir, 'article.txt'), 'utf-8') ||
                await fs.readFile(path.join(jobDir, 'generated_article.txt'), 'utf-8');
            } catch {
              content = '';
            }
          }
        }

        const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

        // ✅ Single Source of Truth: 导出前先同步更新根目录的“真理文件”
        const articleData = {
          article: {
            content,
            word_count: content.length,
            generation_time: timestamp
          },
          jobId,
          timestamp
        };
        await fs.writeFile(path.join(jobDir, 'article.json'), JSON.stringify(articleData, null, 2), 'utf-8');
        await fs.writeFile(path.join(jobDir, 'article.txt'), content, 'utf-8');

        // 1. HTML
        const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>文章导出</title><style>body{font-family:sans-serif;line-height:1.6;padding:40px;max-width:800px;margin:0 auto;}h1{border-bottom:1px solid #eee;padding-bottom:10px;}</style></head><body><h1>文章导出</h1><div style="white-space:pre-wrap;">${content}</div></body></html>`;
        await fs.writeFile(path.join(exportDir, 'article.html'), htmlContent);

        // 2. Markdown
        const mdContent = `# 文章导出\n\n${content}\n\n---\n*导出时间: ${timestamp}*`;
        await fs.writeFile(path.join(exportDir, 'article.md'), mdContent);

        // 3. TXT & JSON
        // ✅ 不再在 exports 目录下生成重复文件，由上面的逻辑更新根目录文件
        const txtContent = `${title}\n\n${content}\n\n---\n导出时间: ${timestamp}\n字数: ${wordCount}`;
        await fs.writeFile(path.join(exportDir, 'article.txt'), txtContent);

        // 4. JSON
        const jsonContent = {
          jobId,
          title,
          content,
          contentType: 'article',
          exportedAt: timestamp,
          wordCount,
          exportFormats: ['html', 'md', 'txt', 'json']
        };
        await fs.writeFile(path.join(exportDir, 'article.json'), JSON.stringify(jsonContent, null, 2));

        // 构建响应
        responseData.message = '文章导出成功';
        responseData.contentType = 'article';

        // 只有衍生格式在 exports 目录下，JSON/TXT 现在指向根目录
        responseData.exportedFiles = [
          `${exportDir}/article.html`,
          `${exportDir}/article.md`,
          `${exportDir}/article.txt`, // 导出目录下的txt
          `${jobDir}/article.txt`,    // 根目录下的txt
          `${exportDir}/article.json`, // 导出目录下的json
          `${jobDir}/article.json`    // 根目录下的json
        ];

        // 下载逻辑：HTML/MD 去 exports 找，TXT/JSON 直接去根目录拿最新的
        responseData.downloadUrls = [
          `/download-file/${jobId}/article.html`,
          `/download-file/${jobId}/article.md`,
          `/download-file/${jobId}/article.txt`, // 优先下载 exports 目录下的
          `/download-file/${jobId}/article.json` // 优先下载 exports 目录下的
        ];

      } else {
        // --- 导出讲稿 (TXT, JSON) ---
        // 默认为讲稿 (contentType: 'notes' 或 'video_notes')
        let notesData: any[] = [];
        try {
          const notesPath = path.join(jobDir, 'notes.json');
          notesData = JSON.parse(await fs.readFile(notesPath, 'utf-8'));
        } catch {
          notesData = [];
        }

        const title = '视频讲稿';

        // ✅ Single Source of Truth: 导出前先同步保存到根目录的 notes.json
        await fs.writeFile(path.join(jobDir, 'notes.json'), JSON.stringify(notesData, null, 2));

        // 1. TXT
        let txtContent = `项目ID: ${jobId}\n导出时间: ${timestamp}\n\n`;
        notesData.forEach((item: any, idx: number) => {
          txtContent += `[Slide ${idx + 1}]\n${item.note || ''}\n\n`;
        });
        await fs.writeFile(path.join(exportDir, 'notes.txt'), txtContent);

        // 2. JSON
        // ✅ 不再在 exports 目录下生成重复的 notes.json，已在上方更新根目录文件

        // 构建响应
        responseData.message = '讲稿导出成功';
        responseData.contentType = 'video_notes';
        responseData.exportedFiles = [
          `${exportDir}/notes.txt`,
          `${jobDir}/notes.json`
        ];
        responseData.downloadUrls = [
          `/download-file/${jobId}/notes.txt`,
          `/download-file/${jobId}/notes.json`
        ];
      }

      res.json(responseData);

    } catch (error: any) {
      logger.error('Export content failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * GET /webhook/api/video-job-data
 * 获取视频任务数据和图片列表
 */
router.get(
  '/video-job-data',
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'jobId is required'
      });
    }

    logger.info(`Fetching video job data: ${jobId}`);

    try {
      const jobManager = getJobManager();
      const job = jobManager.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      const jobDir = jobManager.getJobDir(jobId);

      // 读取notes.json
      const notesPath = path.join(jobDir, 'notes.json');
      let notes: any[] = [];

      try {
        const notesContent = await fs.readFile(notesPath, 'utf-8');
        notes = JSON.parse(notesContent);
      } catch (error) {
        logger.warn('No notes.json found');
      }

      // 构建图片列表
      const slidesDir = path.join(jobDir, 'slides');
      let slides: any[] = [];

      try {
        const files = await fs.readdir(slidesDir);
        const pngFiles = files.filter(f => f.startsWith('slide_') && f.endsWith('.png'));

        slides = pngFiles.map((filename, index) => ({
          slideId: index + 1,
          imageUrl: `/webhook/servefiles/api/slides-data/${jobId}/images/${filename}`
        }));
      } catch (error) {
        logger.warn('No slides directory found');
      }

      res.json({
        success: true,
        data: {
          jobId: job.id,
          notes,
          slides
        }
      });
    } catch (error: any) {
      logger.error('Failed to fetch video job data:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * GET /webhook/api/download-file/:jobId/:fileName
 * 下载导出的文件（和n8n DownloadManager保持一致）
 */
router.get(
  '/download-file/:jobId/:fileName',
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId, fileName } = req.params;

    logger.info('Downloading file', { jobId, fileName });

    if (!jobId || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'jobId and fileName are required'
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

      const jobDir = jobManager.getJobDir(jobId);

      // ✅ 优先检查 exports 目录 (讲稿和文章导出的标准位置)
      let filePath = path.join(jobDir, 'exports', fileName);
      let fileExists = false;

      try {
        await fs.access(filePath);
        fileExists = true;
      } catch {
        // 降级：检查 Job 根目录
        filePath = path.join(jobDir, fileName);
        try {
          await fs.access(filePath);
          fileExists = true;
        } catch {
          fileExists = false;
        }
      }

      if (!fileExists) {
        return res.status(404).json({
          success: false,
          error: `File not found: ${fileName}`
        });
      }

      // 根据文件扩展名设置Content-Type
      let mimeType = 'application/octet-stream';
      if (fileName.endsWith('.json')) {
        mimeType = 'application/json';
      } else if (fileName.endsWith('.txt')) {
        mimeType = 'text/plain';
      } else if (fileName.endsWith('.md')) {
        mimeType = 'text/markdown';
      } else if (fileName.endsWith('.html')) {
        mimeType = 'text/html';
      }

      // 读取文件并发送
      const fileContent = await fs.readFile(filePath);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(fileContent);

      logger.success(`File downloaded: ${fileName}`);
    } catch (error: any) {
      logger.error('Download file failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

export default router;
