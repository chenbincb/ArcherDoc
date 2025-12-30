import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getJobManager } from '../services/jobManager.js';
import { getAIService } from '../services/aiService.js';
import { getTTSService } from '../services/ttsService.js';
import { getVideoService } from '../services/videoService.js';
import ComfyUIService from '../services/comfyUIService.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../middleware/logger.js';
import { parseArticlePrompt } from '../utils/promptUtils.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// 配置文件上传
const upload = multer();

/**
 * POST /webhook/api/analyze-slide-for-image
 * 分析幻灯片内容,生成图片描述和提示词
 */
router.post(
  '/analyze-slide-for-image',
  asyncHandler(async (req: Request, res: Response) => {
    const { slideId, slideTitle, slideContent, provider } = req.body;

    logger.info('Analyzing slide for image', { slideId, slideTitle, provider });

    if (!slideTitle || !slideContent) {
      return res.status(400).json({
        success: false,
        error: 'slideTitle and slideContent are required'
      });
    }

    try {
      // 获取AI服务
      const aiService = getAIService(
        req.body.aiProvider,
        req.body.aiApiKey,
        req.body.aiModel,
        req.body.aiBaseUrl
      );

      // 分析幻灯片
      const result = await aiService.analyzeSlideForImage(
        slideTitle,
        slideContent,
        provider || 'ComfyUI'
      );

      logger.success('Slide analysis completed');

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Slide analysis failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * POST /webhook/api/generate-images
 * 生成图片
 */
router.post(
  '/generate-images',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      jobId,
      slideId,
      provider,
      nanobananaResponseData,
      prompt,
      negativePrompt,
      width,
      height,
      comfyuiBaseUrl
    } = req.body;

    logger.info('Generating image', { jobId, slideId, provider });

    if (!jobId || slideId === undefined) {
      return res.status(400).json({
        success: false,
        error: 'jobId and slideId are required'
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
      const generatedImagesDir = path.join(jobDir, 'generated_images');

      // 确保目录存在
      await fs.mkdir(generatedImagesDir, { recursive: true });

      // 解析nanobanana响应数据(如果是NanoBanana)
      if (provider === 'nanobanana' && nanobananaResponseData) {
        try {
          const responseData = JSON.parse(nanobananaResponseData);

          // 从Gemini响应中提取图片数据
          if (responseData.candidates && responseData.candidates[0]?.content?.parts) {
            for (const part of responseData.candidates[0].content.parts) {
              if (part.inlineData?.data) {
                // Base64图片数据
                const imageData = Buffer.from(part.inlineData.data, 'base64');
                const imagePath = path.join(generatedImagesDir, `slide_${slideId}.png`);

                await fs.writeFile(imagePath, imageData);
                logger.success(`Image saved: ${imagePath}`);

                return res.json({
                  success: true,
                  data: {
                    fileSize: imageData.length
                  }
                });
              }
            }
          }
        } catch (parseError) {
          logger.error('Failed to parse nanobanana response data:', parseError);
        }
      }

      // ComfyUI图片生成
      if (provider === 'comfyui') {
        logger.info('Generating image with ComfyUI', { slideId, prompt });

        try {
          // 获取ComfyUI配置
          const baseUrl = comfyuiBaseUrl || 'http://178.109.129.11:8188';
          const comfyuiService = new ComfyUIService(baseUrl);

          // 生成图片
          const imageBuffer = await comfyuiService.generateImageAndWait(prompt, {
            negativePrompt: negativePrompt || 'low quality, blurry, distorted, ugly, bad anatomy',
            width: width || 1024,
            height: height || 1024,
            batchSize: 1
          });

          // 保存图片
          const outputPath = path.join(generatedImagesDir, `slide_${slideId}.png`);
          await fs.writeFile(outputPath, imageBuffer);

          logger.success(`ComfyUI image generated: slide_${slideId}.png (${imageBuffer.length} bytes)`);

          return res.json({
            success: true,
            data: {
              imageUrl: `/webhook/servefiles/api/slides-data/${jobId}/generated_images/slide_${slideId}.png`,
              fileSize: imageBuffer.length
            }
          });
        } catch (error: any) {
          logger.error('ComfyUI generation failed:', error);
          return res.status(500).json({
            success: false,
            error: `ComfyUI generation failed: ${error.message}`
          });
        }
      }

      // 不支持的provider
      logger.warn(`Unsupported provider: ${provider}`);
      res.json({
        success: true,
        data: {
          fileSize: 0,
          status: 'unsupported_provider',
          message: `Provider ${provider} is not supported`
        }
      });
    } catch (error: any) {
      logger.error('Image generation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * POST /webhook/api/generate-prompt
 * 生成提示词
 */
router.post(
  '/generate-prompt',
  asyncHandler(async (req: Request, res: Response) => {
    const { slideData, style } = req.body;

    logger.info('Generating prompts', { slideCount: slideData?.length });

    if (!slideData || !Array.isArray(slideData)) {
      return res.status(400).json({
        success: false,
        error: 'slideData array is required'
      });
    }

    try {
      const aiService = getAIService(
        req.body.aiProvider,
        req.body.aiApiKey,
        req.body.aiModel,
        req.body.aiBaseUrl
      );
      const prompts: string[] = [];

      for (const slide of slideData) {
        const result = await aiService.analyzeSlideForImage(
          slide.title || '',
          slide.content || '',
          style || 'ComfyUI'
        );
        prompts.push(result.suggestedPrompt);
      }

      logger.success(`Generated ${prompts.length} prompts`);

      res.json({
        success: true,
        data: {
          prompts
        }
      });
    } catch (error: any) {
      logger.error('Prompt generation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * POST /webhook/api/generate-video
 * 生成视频
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

      // 视频生成 - 异步处理
      // 1. 生成音频文件 (如果是single模式且未生成)
      // 2. 合成单页视频 (如果是single模式)
      // 3. 合成最终视频 (如果是final模式)

      logger.info(`Starting video generation (${mode || 'final'})...`);

      // ✅ 改为阻塞处理，确保前端的 Loading 状态能覆盖整个处理过程
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

/**
 * POST /webhook/api/generate-article
 * 生成文章
 */
router.post(
  '/generate-article',
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId, pptContent, articleType, articleStyle, customPrompt } = req.body;

    logger.info('Generating article', { jobId, articleType });

    if (!jobId || !pptContent) {
      return res.status(400).json({
        success: false,
        error: 'jobId and pptContent are required'
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

      const aiService = getAIService(
        job.metadata.aiProvider || 'gemini',
        job.metadata.aiApiKey || '',
        job.metadata.aiModel || '',
        job.metadata.aiBaseUrl
      );

      // 解析提示词占位符
      const parsedPrompt = await parseArticlePrompt(
        customPrompt || '请根据PPT内容生成一篇专业的文章',
        job.metadata,
        pptContent
      );

      // 生成文章
      const articleContent = await aiService.generateArticle(
        '', // AIService 内部现在直接用 prompt
        articleType || 'general',
        articleStyle || 'professional',
        parsedPrompt
      );

      // 保存文章
      const jobDir = jobManager.getJobDir(jobId);
      const articlePath = path.join(jobDir, 'article.txt');
      await fs.writeFile(articlePath, articleContent, 'utf-8');

      // 同时保存 JSON 版以便后续读取和导出
      const articleJson = {
        article: {
          content: articleContent,
          word_count: articleContent.length,
          generation_time: new Date().toISOString()
        }
      };
      await fs.writeFile(path.join(jobDir, 'article.json'), JSON.stringify(articleJson, null, 2), 'utf-8');

      // 更新Job状态
      await jobManager.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date()
      });

      logger.success(`Article generated for job ${jobId}`);

      res.json({
        success: true,
        data: {
          content: articleContent,
          wordCount: articleContent.length
        }
      });
    } catch (error: any) {
      logger.error('Article generation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * POST /webhook/regenerate-article
 * 重新生成文章
 */
router.post(
  '/regenerate-article',
  upload.none() as any,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('!!! PROCESSING REGENERATE ARTICLE REQUEST !!!');
    const {
      jobId,
      articleStyle,
      articleType,
      customPrompt,
      existingArticle, // 接收现有文章用于微调
      aiProvider,
      aiModel,
      aiApiKey,
      aiBaseUrl
    } = req.body;

    logger.info('Regenerating article', { jobId, articleStyle });

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

      // 更新状态为处理中
      await jobManager.updateJob(jobId, {
        status: 'processing',
        progress: 50
      });

      const aiService = getAIService(
        aiProvider || job.metadata.aiProvider,
        aiApiKey || job.metadata.aiApiKey,
        aiModel || job.metadata.aiModel,
        aiBaseUrl || job.metadata.aiBaseUrl
      );

      // 读取之前保存的PPT内容
      const jobDir = jobManager.getJobDir(jobId);
      const pptContentPath = path.join(jobDir, 'ppt_content.json');

      let pptContentData: any = { slides: [] };
      let contentSummary = '';
      try {
        pptContentData = JSON.parse(await fs.readFile(pptContentPath, 'utf-8'));
        const slides = pptContentData.slides || [];

        contentSummary = slides.map((slide: any) =>
          `第${slide.slideId}页: ${slide.title || ''}\n${slide.content || ''}`
        ).join('\n\n');
      } catch (err) {
        logger.warn(`Failed to read ppt_content.json for job ${jobId}, falling back to filename`);
        contentSummary = job.metadata.originalFilename || '';
      }

      // 解析占位符
      const parsedPrompt = await parseArticlePrompt(
        customPrompt || `请对以下文章进行修订或生成新文章:\n\n原始内容:\n{{CONTENT_SUMMARY}}\n\n要求: 风格{{WRITING_STYLE}}`,
        job.metadata,
        pptContentData,
        existingArticle || ''
      );

      const articleContent = await aiService.generateArticle(
        contentSummary,
        articleType || 'blog',
        articleStyle || 'professional',
        parsedPrompt
      );

      // 保存文章
      const articlePath = path.join(jobDir, 'article.txt');
      await fs.writeFile(articlePath, articleContent, 'utf-8');

      const articleJson = {
        article: {
          content: articleContent,
          word_count: articleContent.length,
          generation_time: new Date().toISOString()
        }
      };
      await fs.writeFile(path.join(jobDir, 'article.json'), JSON.stringify(articleJson, null, 2), 'utf-8');

      // 更新Job状态
      await jobManager.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date()
      });

      logger.success(`Article regenerated for job ${jobId}`);

      res.json({
        success: true
      });
    } catch (error: any) {
      logger.error('Article regeneration failed:', error);

      await getJobManager().updateJob(jobId, {
        status: 'error',
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * 异步生成视频
 * 处理逻辑与 n8n GenerateVideo.json 保持一致
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
      // 前端通常传 0-based (0, 1, 2)，而后端 PPTExtractor 通常生成 1-based (1, 2, 3)
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

      await jobManager.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result: {
          videoPath: `/webhook/servefiles/api/slides-data/${jobId}/video/slide_${slideId}.mp4`
        }
      });

      logger.success(`Single slide video completed: ${videoPath}`);

    } else {
      // --- 最终合并视频模式 ---
      logger.info(`Starting final video merge for job ${jobId}`);
      await jobManager.updateJob(jobId, { status: 'processing', progress: 10 });

      // 1. 扫描 video 目录下的所有 slide_*.mp4 文件
      let videoFiles: string[] = [];
      try {
        const files = await fs.readdir(videoDir);
        videoFiles = files
          .filter(f => f.startsWith('slide_') && f.endsWith('.mp4') && f !== 'final_video.mp4')
          .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)![0]);
            const numB = parseInt(b.match(/\d+/)![0]);
            return numA - numB;
          })
          .map(f => path.join(videoDir, f));
      } catch (err) {
        throw new Error('未找到任何已生成的单页视频片段，请先生成单页视频后再合并。');
      }

      if (videoFiles.length === 0) {
        throw new Error('未找到任何已生成的单页视频片段，请先生成单页视频后再合并。');
      }

      logger.info(`Found ${videoFiles.length} video clips to merge`);
      await jobManager.updateJob(jobId, { progress: 40 });

      // 2. 合并视频
      const finalVideoPath = path.join(videoDir, 'final_video.mp4');
      await videoService.mergeVideos(videoFiles, finalVideoPath, tempDir);

      // 3. 标记完成
      await jobManager.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        result: {
          videoPath: `/webhook/servefiles/api/slides-data/${jobId}/video/final_video.mp4`
        }
      });

      logger.success(`Final video generation completed for job ${jobId}`);
    }
  } catch (error: any) {
    logger.error(`Video generation failed for job ${jobId}:`, error);
    await jobManager.updateJob(jobId, {
      status: 'error',
      error: error.message
    });
  }
}

export default router;
