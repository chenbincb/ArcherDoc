import { Router, Request, Response } from 'express';
import path from 'path';
import { getJobManager } from '../services/jobManager.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../middleware/logger.js';
import { JobData } from '../types/index.js';

const router = Router();

/**
 * GET /webhook/api/get-job-data
 * 获取Job数据(增强版：包含所有资源的就绪状态)
 */
router.get(
  '/get-job-data',
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId, type } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'jobId is required'
      });
    }

    logger.info(`Fetching job data: ${jobId}`);

    const jobManager = getJobManager();
    const job = jobManager.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const jobDir = jobManager.getJobDir(jobId);
    const fs = await import('fs/promises');

    try {
      // 1. 读取基础内容文件 (notes.json 或 image_data.json)
      const notesPath = path.join(jobDir, 'notes.json');
      const imageDataPath = path.join(jobDir, 'image_data.json');

      let notesData: any[] = [];
      try {
        const content = await fs.readFile(notesPath, 'utf-8');
        notesData = JSON.parse(content);
      } catch {
        try {
          const content = await fs.readFile(imageDataPath, 'utf-8');
          notesData = JSON.parse(content);
        } catch {
          notesData = [];
        }
      }

      // 2. 扫描物理目录以确认文件真实存在
      const getFiles = async (subdir: string) => {
        try {
          const files = await fs.readdir(path.join(jobDir, subdir));
          return files;
        } catch {
          return [];
        }
      };

      const slideFiles = await getFiles('slides');
      const audioFiles = await getFiles('audio');
      const videoFiles = await getFiles('video');
      const genImageFiles = await getFiles('generated_images');

      // 3. 构建统一的幻灯片资源状态矩阵
      // 确定总页数 (优先使用扫描到的原始图片数量，如果没有则看notes)
      const maxSlideNum = Math.max(
        ...slideFiles.map(f => parseInt(f.match(/\d+/)![0]) + 1), // slide_0 -> 1
        notesData.length
      );

      const slides = [];
      for (let i = 0; i < maxSlideNum; i++) {
        // 兼容 0-based 和 1-based 索引查找内容
        const slideId = i; // 我们在这里统一用 0-based 逻辑，前端会根据这个渲染
        const noteEntry = notesData.find((n: any) => (n.id === slideId || n.id === slideId + 1 || n.slideId === slideId || n.slideId === slideId + 1));

        // 检查各种文件是否存在
        // 我们同时检查 slide_0 和 slide_1 以应对不同导出工具的差异
        const hasFile = (list: string[], prefix: string, ext: string) =>
          list.includes(`${prefix}${i}${ext}`) || list.includes(`${prefix}${i + 1}${ext}`);

        const hasSlide = hasFile(slideFiles, 'slide_', '.png');
        const hasAudio = hasFile(audioFiles, 'slide_', '.mp3');
        const hasVideo = hasFile(videoFiles, 'slide_', '.mp4');
        const hasGenImage = hasFile(genImageFiles, 'slide_', '.png');

        slides.push({
          index: i,
          slideId: i + 1,
          note: noteEntry?.note || noteEntry?.description || '',
          title: noteEntry?.title || '',
          resources: {
            image: {
              exists: hasSlide,
              url: hasSlide ? `/webhook/servefiles/api/slides-data/${jobId}/images/slide_${i}.png` : null
            },
            audio: {
              exists: hasAudio,
              url: hasAudio ? `/webhook/servefiles/api/slides-data/${jobId}/audio/slide_${i}.mp3` : null
            },
            video: {
              exists: hasVideo,
              url: hasVideo ? `/webhook/servefiles/api/slides-data/${jobId}/video/slide_${i}.mp4` : null
            },
            generatedImage: {
              exists: hasGenImage,
              url: hasGenImage ? `/webhook/servefiles/api/slides-data/${jobId}/generated_images/slide_${i}.png` : null
            }
          }
        });
      }

      res.json({
        success: true,
        data: {
          jobId: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          metadata: job.metadata,
          slides: slides, // ✅ 新增的统一资源结构
          notes: notesData // 保持向下兼容
        }
      });
    } catch (error: any) {
      logger.error(`Error reading job data for ${jobId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to read job data'
      });
    }
  })
);

/**
 * GET /webhook/api/get-article-data
 * 获取文章数据
 */
router.get(
  '/get-article-data',
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'jobId is required'
      });
    }

    logger.info(`Fetching article data: ${jobId}`);

    const jobManager = getJobManager();
    const job = jobManager.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const jobDir = jobManager.getJobDir(jobId);
    const fs = await import('fs/promises');

    try {
      const articleJsonPath = path.join(jobDir, 'article.json');
      const articleTxtPath = path.join(jobDir, 'article.txt');
      const oldJsonPath = path.join(jobDir, 'generated_article.json');
      const oldTxtPath = path.join(jobDir, 'generated_article.txt');

      let content = '';
      let wordCount = 0;

      try {
        // 优先尝试读取 JSON (结构化数据)
        const jsonContent = await fs.readFile(articleJsonPath, 'utf-8');
        const articleData = JSON.parse(jsonContent);
        content = articleData.article?.content || articleData.content || '';
        wordCount = articleData.article?.word_count || content.length;
      } catch {
        try {
          // 尝试读取 TXT
          content = await fs.readFile(articleTxtPath, 'utf-8');
          wordCount = content.length;
        } catch {
          // 兼容旧版
          try {
            const oldJson = await fs.readFile(oldJsonPath, 'utf-8');
            const articleData = JSON.parse(oldJson);
            content = articleData.article?.content || '';
            wordCount = content.length;
          } catch {
            try {
              content = await fs.readFile(oldTxtPath, 'utf-8');
              wordCount = content.length;
            } catch {
              content = '';
            }
          }
        }
      }

      // 同时读取notes.json(如果存在)
      const notesPath = `${jobDir}/notes.json`;
      let notes = [];

      try {
        const notesContent = await fs.readFile(notesPath, 'utf-8');
        const notesData = JSON.parse(notesContent);
        notes = notesData.notes || notesData;
      } catch {
        // notes.json不存在
      }

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          article: {
            content,
            wordCount
          },
          notes,
          metadata: job.metadata
        }
      });
    } catch (error: any) {
      logger.error(`Error reading article data for ${jobId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to read article data'
      });
    }
  })
);

export default router;
