import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getJobManager } from '../services/jobManager.js';
import { getAIService } from '../services/aiService.js';
import { getTTSService } from '../services/ttsService.js';
import { getVideoService } from '../services/videoService.js';
import DocxGenerator from '../services/docxGenerator.js';
import ComfyUIService from '../services/comfyUIService.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../middleware/logger.js';
import { parseArticlePrompt } from '../utils/promptUtils.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

/**
 * 图片元数据接口
 */
interface ImageMetadata {
  prompt: string;
  negativePrompt?: string;
  provider: string;
  width: number;
  height: number;
  generationTime: number;
  createdAt: string;
}

/**
 * 获取下一个图片编号
 * @param generatedImagesDir 生成图片目录
 * @param prefix 文件名前缀 (如 slide_1 或 image)
 * @param provider 生成器 (comfyui 或 gemini)
 * @returns 下一个编号 (如 001, 002)
 */
async function getNextImageNumber(
  generatedImagesDir: string,
  prefix: string,
  provider: string
): Promise<string> {
  try {
    const files = await fs.readdir(generatedImagesDir);
    // 匹配格式: {prefix}_{provider}_XXX.png
    const pattern = new RegExp(`^${prefix}_${provider}_(\\d+)\\.png$`);
    let maxNumber = 0;

    for (const file of files) {
      const match = file.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    return String(maxNumber + 1).padStart(3, '0');
  } catch (error) {
    // 目录不存在或读取失败，从 001 开始
    return '001';
  }
}

/**
 * 保存图片和元数据
 * @param imagePath 图片完整路径
 * @param imageBuffer 图片数据
 * @param metadata 元数据
 */
async function saveImageWithMetadata(
  imagePath: string,
  imageBuffer: Buffer,
  metadata: ImageMetadata
): Promise<void> {
  // 保存图片
  await fs.writeFile(imagePath, imageBuffer);

  // 保存元数据 JSON
  const metadataPath = imagePath.replace('.png', '.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
}

// 配置文件上传
const upload = multer();

/**
 * POST /webhook/api/generate-docx
 * 根据翻译后的结构化数据生成 Word 文档
 */
router.post(
  '/generate-docx',
  asyncHandler(async (req: Request, res: Response) => {
    const { slides, filename } = req.body;

    logger.info('Generating Word document from items');

    if (!slides || !Array.isArray(slides)) {
      return res.status(400).json({
        success: false,
        error: 'slides array is required'
      });
    }

    try {
      const docxGenerator = new DocxGenerator();
      const buffer = await docxGenerator.generateFromContent(slides);

      const downloadName = filename || 'translated_document.docx';

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);

      res.send(buffer);
      logger.success('Word document generated successfully');
    } catch (error: any) {
      logger.error('Word generation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

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
    const startTime = Date.now();
    const {
      jobId,
      slideId,
      provider,
      nanobananaResponseData,
      prompt,
      negativePrompt,
      width,
      height,
      comfyuiBaseUrl,
      isTextMode
    } = req.body;

    logger.info('Generating image', { jobId, slideId, provider, isTextMode });

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

      // 统一转换为小写进行校验
      const normalizedProvider = (provider || '').toLowerCase();

      // 根据模式确定文件名前缀
      const filePrefix = isTextMode ? 'image' : `slide_${slideId}`;
      // 统一 provider 名称用于文件名
      const providerName = normalizedProvider === 'nanobanana' ? 'gemini' : 'comfyui';

      // NanoBanana图片生成 logic
      if (normalizedProvider === 'nanobanana' && nanobananaResponseData) {
        try {
          const responseData = JSON.parse(nanobananaResponseData);

          // 从Gemini响应中提取图片数据
          if (responseData.candidates && responseData.candidates[0]?.content?.parts) {
            for (const part of responseData.candidates[0].content.parts) {
              if (part.inlineData?.data) {
                // Base64图片数据
                const imageData = Buffer.from(part.inlineData.data, 'base64');

                // 获取下一个编号
                const nextNumber = await getNextImageNumber(generatedImagesDir, filePrefix, providerName);
                const fileName = `${filePrefix}_${providerName}_${nextNumber}.png`;
                const imagePath = path.join(generatedImagesDir, fileName);

                // 保存图片和元数据
                const generationTime = (Date.now() - startTime) / 1000;
                await saveImageWithMetadata(imagePath, imageData, {
                  prompt: prompt || '',
                  negativePrompt: negativePrompt || '',
                  provider: providerName,
                  width: width || 1024,
                  height: height || 1024,
                  generationTime,
                  createdAt: new Date().toISOString()
                });

                logger.success(`Image saved: ${fileName} (${imageData.length} bytes)`);

                return res.json({
                  success: true,
                  data: {
                    imageUrl: `/webhook/servefiles/api/slides-data/${jobId}/generated_images/${fileName}`,
                    fileName,
                    fileSize: imageData.length,
                    generationTime
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
      if (normalizedProvider === 'comfyui') {
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

          // 获取下一个编号
          const nextNumber = await getNextImageNumber(generatedImagesDir, filePrefix, providerName);
          const fileName = `${filePrefix}_${providerName}_${nextNumber}.png`;
          const outputPath = path.join(generatedImagesDir, fileName);

          // 保存图片和元数据
          const generationTime = (Date.now() - startTime) / 1000;
          await saveImageWithMetadata(outputPath, imageBuffer, {
            prompt: prompt || '',
            negativePrompt: negativePrompt || '',
            provider: providerName,
            width: width || 1024,
            height: height || 1024,
            generationTime,
            createdAt: new Date().toISOString()
          });

          logger.success(`ComfyUI image generated: ${fileName} (${imageBuffer.length} bytes)`);

          return res.json({
            success: true,
            data: {
              imageUrl: `/webhook/servefiles/api/slides-data/${jobId}/generated_images/${fileName}`,
              fileName,
              fileSize: imageBuffer.length,
              generationTime
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

      // 读取之前保存的内容 (兼容新旧命名)
      const jobDir = jobManager.getJobDir(jobId);
      let contentPath = path.join(jobDir, 'doc_content.json');

      try {
        await fs.access(contentPath);
      } catch {
        // 回退到旧的命名约定
        contentPath = path.join(jobDir, 'ppt_content.json');
      }

      let pptContentData: any = { slides: [] };
      let contentSummary = '';
      try {
        pptContentData = JSON.parse(await fs.readFile(contentPath, 'utf-8'));
        const slides = pptContentData.slides || [];

        contentSummary = slides.map((slide: any) =>
          `第${slide.slideId}页: ${slide.title || ''}\n${slide.content || ''}`
        ).join('\n\n');
      } catch (err) {
        logger.warn(`Failed to read ppt_content.json for job ${jobId}, falling back to filename`);
        contentSummary = job.metadata.originalFilename || '';
      }

      // 解析占位符 (合并新传入的参数以覆盖旧设置)
      const effectiveMetadata = {
        ...job.metadata,
        articleStyle: articleStyle || job.metadata.articleStyle,
        articleType: articleType || job.metadata.articleType
      };

      const parsedPrompt = await parseArticlePrompt(
        customPrompt || `请对以下文章进行修订或生成新文章:\n\n原始内容:\n{{CONTENT_SUMMARY}}\n\n要求: 风格{{WRITING_STYLE}}`,
        effectiveMetadata,
        pptContentData,
        existingArticle || ''
      );

      const articleContent = await aiService.generateArticle(
        contentSummary,
        articleType || 'blog',
        articleStyle || 'professional',
        parsedPrompt
      );

      // 保存文章 (统一保存路径为 article.txt)
      const articlePath = path.join(jobDir, 'article.txt');
      await fs.writeFile(articlePath, articleContent, 'utf-8');

      // 更新 article.json
      const articleJsonPath = path.join(jobDir, 'article.json');
      const articleData = {
        article: {
          content: articleContent,
          word_count: articleContent.length,
          generation_time: new Date().toISOString()
        },
        metadata: {
          style: articleStyle || job.metadata.articleStyle,
          type: articleType || job.metadata.articleType,
          provider: aiProvider || job.metadata.aiProvider
        }
      };
      await fs.writeFile(articleJsonPath, JSON.stringify(articleData, null, 2), 'utf-8');

      logger.success(`Article regenerated and saved to ${articlePath}`);

      // 更新Job状态
      await jobManager.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date()
      });

      logger.success(`Article regenerated for job ${jobId}`);

      res.json({
        success: true,
        message: 'Article regenerated successfully',
        articlePath: `/download-file/${jobId}/article.txt`
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
