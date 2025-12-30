import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { getJobManager } from '../services/jobManager.js';
import { getPPTConverter } from '../services/pptConverter.js';
import PPTExtractor from '../services/pptExtractor.js';
import { getAIService } from '../services/aiService.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../middleware/logger.js';
import { UploadRequestBody } from '../types/index.js';
import { parseArticlePrompt } from '../utils/promptUtils.js';

const router = Router();

// 配置文件上传
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许.pptx文件
    if (path.extname(file.originalname).toLowerCase() === '.pptx') {
      cb(null, true);
    } else {
      cb(new Error('Only .pptx files are allowed'));
    }
  }
});

/**
 * POST /webhook/api/upload-ppt
 * 上传PPT文件并创建处理任务
 */
router.post(
  '/upload-ppt',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'pptFile', maxCount: 1 },
    { name: 'pptFile0', maxCount: 1 }
  ]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const body = req.body as UploadRequestBody;

    // 获取上传的文件(支持多种字段名)
    const uploadedFile = files.file?.[0] || files.pptFile?.[0] || files.pptFile0?.[0];

    logger.info('Received PPT upload', {
      filename: uploadedFile?.originalname,
      type: body.processingType
    });

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // 获取服务实例
    const jobManager = getJobManager();

    try {
      // 创建Job
      const jobId = await jobManager.createJob(body.processingType, uploadedFile.originalname, body);

      // 保存上传的文件到Job目录
      const jobDir = jobManager.getJobDir(jobId);
      const targetPath = path.join(jobDir, 'input.pptx');
      await fs.rename(uploadedFile.path, targetPath);

      logger.success(`Job created: ${jobId}`);

      await processPPTAsync(jobId, targetPath, body);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/?jobId=${jobId}`;

      logger.success(`Job ${jobId} processing completed, redirecting to frontend`);
      res.json({
        success: true,
        jobId,
        processingType: body.processingType,
        message: 'PPT uploaded and processed successfully',
        redirectUrl
      });
    } catch (error: any) {
      logger.error('Upload failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * 异步处理PPT文件
 */
async function processPPTAsync(
  jobId: string,
  pptPath: string,
  options: UploadRequestBody
): Promise<void> {
  const jobManager = getJobManager();
  const pptConverter = getPPTConverter();

  try {
    // 更新状态为处理中
    await jobManager.updateJob(jobId, {
      status: 'processing',
      progress: 10
    });

    const jobDir = jobManager.getJobDir(jobId);

    // Step 1: PPT转图片 (仅非文章模式需要)
    if (options.processingType !== 'article') {
      logger.info(`Converting PPT to images for job ${jobId}...`);
      await pptConverter.convertToImages(
        pptPath,
        path.join(jobDir, 'slides')
      );
    } else {
      logger.info(`Skipping image generation for article job ${jobId}`);
    }

    await jobManager.updateJob(jobId, { progress: 50 });

    // Step 2: 根据类型处理不同逻辑
    if (options.processingType === 'article') {
      // 文章生成模式: 提取PPT内容 → AI生成文章
      logger.info(`Extracting PPT content for job ${jobId}...`);

      const extractor = new PPTExtractor();
      const slides = await extractor.extractSlidesContent(pptPath);
      const metadata = await extractor.extractMetadata(pptPath);

      // 保存提取的内容
      const pptContentPath = path.join(jobDir, 'ppt_content.json');
      await fs.writeFile(pptContentPath, JSON.stringify({
        metadata,
        slides
      }, null, 2), 'utf-8');

      logger.info(`Extracted ${slides.length} slides from PPT`);
      await jobManager.updateJob(jobId, { progress: 60 });

      // AI生成文章
      logger.info(`Generating article for job ${jobId}...`);
      const aiService = getAIService(
        options.aiProvider || '',
        options.aiApiKey || '',
        options.aiModel || '',
        options.aiBaseUrl || ''
      );

      // 构建PPT内容摘要
      const contentSummary = slides.map(slide =>
        `第${slide.slideId}页: ${slide.title}\n${slide.content}`
      ).join('\n\n');

      const rawPrompt = options.customPrompt || `
请根据以下PPT内容生成一篇专业的公众号文章:

PPT标题: ${metadata.title}
作者: ${metadata.author}
总页数: ${metadata.slideCount}

PPT内容摘要:
${contentSummary}

要求:
1. 文章风格: ${options.articleStyle || '专业严谨'}
2. 文章类型: ${options.articleType || 'general'}
3. 内容要求: 结构清晰,逻辑严谨,适合公众号发布
4. 字数要求: 2000-3000字
`;

      // 解析占位符
      const parsedPrompt = await parseArticlePrompt(
        rawPrompt,
        {
          id: jobId,
          originalFilename: options.pptFile?.originalname || options.file?.originalname,
          auditorEmail: options.auditorEmail
        },
        { metadata, slides }
      );

      const articleContent = await aiService.generateArticle(
        '', // AIService 内部现在直接用 prompt
        options.articleType || 'blog',
        options.articleStyle || 'professional',
        parsedPrompt
      );

      // 保存生成的文章
      const articlePath = path.join(jobDir, 'generated_article.txt');
      await fs.writeFile(articlePath, articleContent, 'utf-8');

      logger.success(`Article generated: ${articleContent.length} characters`);
      await jobManager.updateJob(jobId, { progress: 90 });

    } else if (options.processingType === 'video' || options.processingType === 'image') {
      // 视频/图片模式: 生成notes.json或image_data.json
      logger.info(`Generating ${options.processingType} data for job ${jobId}...`);

      const extractor = new PPTExtractor();
      const slides = await extractor.extractSlidesContent(pptPath);

      // 生成notes/image_data
      const outputData = [];
      const aiService = getAIService(
        options.aiProvider || '',
        options.aiApiKey || '',
        options.aiModel || '',
        options.aiBaseUrl || ''
      );

      for (const slide of slides) {
        if (options.processingType === 'video') {
          // 视频模式: 生成讲稿（使用generateSpeech方法，已有正确的提示词）
          const noteContent = await aiService.generateSpeech(
            slide.title,
            slide.content,
            slide.notes
          );

          outputData.push({
            id: slide.slideId,
            note: noteContent
          });

        } else {
          // 图片模式: 生成图片描述和提示词
          const analysisResult = await aiService.analyzeSlideForImage(
            slide.title,
            slide.content,
            'nanobanana'
          );

          outputData.push({
            id: slide.slideId,
            title: slide.title,
            content: slide.content,
            description: analysisResult.description,
            suggestedPrompt: analysisResult.suggestedPrompt,
            keywords: analysisResult.keywords,
            style: analysisResult.style
          });
        }

        logger.info(`Processed slide ${slide.slideId}/${slides.length}`);
      }

      // 保存到对应的文件
      const outputFile = options.processingType === 'video' ? 'notes.json' : 'image_data.json';
      const outputPath = path.join(jobDir, outputFile);
      await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');

      logger.success(`${outputFile} generated with ${outputData.length} slides`);
      await jobManager.updateJob(jobId, { progress: 80 });
    }

    // 标记完成
    await jobManager.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date()
    });

    logger.success(`Job ${jobId} completed successfully`);
  } catch (error: any) {
    logger.error(`Job ${jobId} failed:`, error);
    await jobManager.updateJob(jobId, {
      status: 'error',
      error: error.message
    });
  }
}

export default router;
