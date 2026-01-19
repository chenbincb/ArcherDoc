import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { getJobManager } from '../services/jobManager.js';
import { getPPTConverter } from '../services/pptConverter.js';
import PPTExtractor from '../services/pptExtractor.js';
import PdfExtractor from '../services/pdfExtractor.js';
import { TextDocumentExtractor } from '../services/wordExtractor.js'; // Will create this
import { ImageExtractor } from '../services/imageExtractor.js';
import { getAIService } from '../services/aiService.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../middleware/logger.js';
import JSZip from 'jszip';
import { UploadRequestBody } from '../types/index.js';
import { parseArticlePrompt } from '../utils/promptUtils.js';

const router = Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pptx', '.docx', '.pdf', '.txt', '.md', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowedExts.join(', ')}`));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

/**
 * POST /webhook/api/upload-ppt
 * 上传文档文件并创建处理任务 (支持 PPTX, DOCX, PDF, TXT, MD)
 */
router.post(
  '/upload-ppt',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'pptFile', maxCount: 1 }, // 保持兼容旧前端字段名
    { name: 'pptFile0', maxCount: 1 }
  ]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const body = req.body as UploadRequestBody;

    // 获取上传的文件(支持多种字段名)
    const uploadedFile = files.file?.[0] || files.pptFile?.[0] || files.pptFile0?.[0];

    logger.info('Received document upload', {
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

      // 保存上传的文件到Job目录 (保持原扩展名)
      const jobDir = jobManager.getJobDir(jobId);
      const ext = path.extname(uploadedFile.originalname).toLowerCase();
      const targetPath = path.join(jobDir, `input${ext}`);
      await fs.rename(uploadedFile.path, targetPath);

      logger.success(`Job created: ${jobId} for file: ${uploadedFile.originalname}`);

      await processDocumentAsync(jobId, targetPath, body);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/?jobId=${jobId}`;

      logger.success(`Job ${jobId} processing completed, redirecting to frontend`);
      res.json({
        success: true,
        jobId,
        processingType: body.processingType,
        message: 'File uploaded and processed successfully',
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
 * 异步处理文档 (支持多格式)
 */
async function processDocumentAsync(
  jobId: string,
  filePath: string,
  options: UploadRequestBody
): Promise<void> {
  const jobManager = getJobManager();
  const pptConverter = getPPTConverter();

  const ext = path.extname(filePath).toLowerCase();
  const isPPT = ext === '.pptx';
  const isPDF = ext === '.pdf';
  const isTextDoc = ['.docx', '.txt', '.md'].includes(ext);
  const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);

  let slides: Array<{ id: number; title: string; content: string; notes?: string; items?: any[] }> = [];
  let metadata = {
    title: path.basename(filePath),
    author: 'Unknown',
    slideCount: 0,
    filename: path.basename(filePath),
    uploadTime: new Date().toISOString(),
  };

  // ========================== DEBUG LOGGING ==========================
  logger.info(`[DEBUG] processDocumentAsync received:`, {
    jobId,
    filePath,
    ext,
    isPPT,
    isPDF,
    isTextDoc,
    isImage,
    processingType: options.processingType
  });
  // ===============================================================

  try {
    // 更新状态为处理中
    await jobManager.updateJob(jobId, {
      status: 'processing',
      progress: 10
    });

    const jobDir = jobManager.getJobDir(jobId);
    const imagesDir = path.join(jobDir, 'slides');

    // 提前初始化 AI 服务
    const aiService = getAIService(
      options.aiProvider || '',
      options.aiApiKey || '',
      options.aiModel || '',
      options.aiBaseUrl || ''
    );

    // ==========================================
    // 阶段 1: 预处理 (转图)
    // ==========================================

    // 只有 PPT 和 PDF 需要转图用于视觉识别
    if (isPPT) {
      logger.info(`Converting PPT to images for job ${jobId}...`);
      await pptConverter.convertToImages(filePath, imagesDir);
      await jobManager.updateJob(jobId, { progress: 30 });
    } else if (isPDF) {
      logger.info(`PDF will be converted to images inside its extractor.`);
      // PDF 转图逻辑在 PdfExtractor 内部调用
    }

    // ==========================================
    // 阶段 2: 内容提取 (根据格式分发)
    // ==========================================

    let slides: Array<{ id: number; title: string; content: string; notes?: string; items?: any[] }> = [];
    let metadata = { title: path.basename(filePath), author: 'Unknown', slideCount: 0 };

    if (isPPT) {
      logger.info(`Extracting PPT content for job ${jobId}...`);
      const extractor = new PPTExtractor();
      // 传入 imagesDir 和 aiService 以启用视觉识别融合
      const extractedSlides = await extractor.extractSlidesContent(filePath, imagesDir, aiService);
      const extractedMeta = await extractor.extractMetadata(filePath);

      slides = extractedSlides.map(s => ({ ...s, id: s.slideId }));
      metadata = extractedMeta;

    } else if (isPDF) {
      logger.info(`Extracting PDF content for job ${jobId}...`);
      const extractor = new PdfExtractor(aiService);
      // PdfExtractor 内部会处理转图
      slides = await extractor.extractContent(filePath, jobDir);
      metadata.slideCount = slides.length;

    } else if (isTextDoc) {
      logger.info(`Extracting Text content from ${ext} for job ${jobId}...`);
      const extractor = new TextDocumentExtractor();
      const content = await extractor.extractText(filePath);

      // 将纯文本包装成单页 Slide 结构，以便复用后续逻辑
      slides = [{
        id: 1,
        title: 'Document Content',
        content: content,
        notes: ''
      }];
      metadata.slideCount = 1;

    } else if (isImage) {
      logger.info(`Extracting Image content from ${ext} for job ${jobId}...`);

      // Ensure slides directory exists and copy image for frontend serving
      await fs.mkdir(imagesDir, { recursive: true });
      const targetImagePath = path.join(imagesDir, `slide_0${ext}`);
      await fs.copyFile(filePath, targetImagePath);

      const extractor = new ImageExtractor(aiService);
      // 直接调用 extractContent 获取标准化的 Slide 数组
      slides = await extractor.extractContent(filePath);
      metadata.slideCount = 1;
    }

    // 保存提取的内容
    const contentPath = path.join(jobDir, 'doc_content.json');
    await fs.writeFile(contentPath, JSON.stringify({
      metadata,
      slides
    }, null, 2), 'utf-8');
    logger.info(`Saved extracted content to ${contentPath}`);
    await jobManager.updateJob(jobId, { progress: 60 });

    // ==========================================
    // 阶段 3: 业务生成 (仅在非 translation 类型时执行)
    // ==========================================

    if (options.processingType === 'translation') {
      logger.info(`Extraction completed for translation job ${jobId}. Skipping generation.`);
      // 直接跳过生成阶段
    } else if (options.processingType === 'article') {
      logger.info(`Generating article for job ${jobId}...`);

      // 构建内容摘要
      const contentSummary = slides.map(slide =>
        `[${slide.title}]\n${slide.content}`
      ).join('\n\n');

      const rawPrompt = options.customPrompt || `
请根据以下文档内容生成一篇专业的公众号文章:

标题: ${metadata.title}
内容摘要:
${contentSummary}

要求:
1. 文章风格: ${options.articleStyle || '专业严谨'}
2. 文章类型: ${options.articleType || 'general'}
3. 字数要求: 2000-3000字
`;

      const parsedPrompt = await parseArticlePrompt(
        rawPrompt,
        {
          id: jobId,
          originalFilename: options.pptFile?.originalname || options.file?.originalname,
          auditorEmail: options.auditorEmail
        },
        { metadata, slides: slides as any }
      );

      const articleContent = await aiService.generateArticle(
        '',
        options.articleType || 'blog',
        options.articleStyle || 'professional',
        parsedPrompt
      );

      // 保存文章 (统一为单源真相：article.txt)
      const articlePath = path.join(jobDir, 'article.txt');
      await fs.writeFile(articlePath, articleContent, 'utf-8');

      // 同时保存文章 JSON 数据，方便前端读取字数等信息
      const articleJsonPath = path.join(jobDir, 'article.json');
      const articleData = {
        article: {
          content: articleContent,
          word_count: articleContent.length,
          generation_time: new Date().toISOString()
        },
        metadata: {
          style: options.articleStyle,
          type: options.articleType,
          provider: options.aiProvider
        }
      };
      await fs.writeFile(articleJsonPath, JSON.stringify(articleData, null, 2), 'utf-8');

      logger.success(`Article generated and saved to ${articlePath}`);
      await jobManager.updateJob(jobId, { progress: 90 });

    } else if (options.processingType === 'video' || options.processingType === 'image') {

      // 视频/图片目前只对 PPT/PDF 开放 (因为它们有"页"的概念)
      // 如果是纯文本，这里的 slides 只有一页，效果可能一般，但逻辑是兼容的

      logger.info(`Generating ${options.processingType} data for job ${jobId}...`);
      const outputData = [];

      for (const slide of slides) {
        if (options.processingType === 'video') {
          const noteContent = await aiService.generateSpeech(
            slide.title,
            slide.content,
            slide.notes || ''
          );
          outputData.push({ id: slide.id, note: noteContent });

        } else {
          // 图片模式
          const analysisResult = await aiService.analyzeSlideForImage(
            slide.title,
            slide.content,
            'nanobanana',
            'auto',              // visualFrameworkId - AI自动选择
            'tech_blue_glass'    // visualThemeId - 默认科技蓝主题
          );
          outputData.push({
            id: slide.id,
            title: slide.title,
            content: slide.content,
            description: analysisResult.description,
            suggestedPrompt: analysisResult.suggestedPrompt,
            keywords: analysisResult.keywords,
            style: analysisResult.style
          });
        }
        logger.info(`Processed item ${slide.id}/${slides.length}`);
      }

      const outputFile = options.processingType === 'video' ? 'notes.json' : 'image_data.json';
      const outputPath = path.join(jobDir, outputFile);
      await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');

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
