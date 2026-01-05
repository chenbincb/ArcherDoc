import { Router, Request, Response } from 'express';
import path from 'path';
import { getJobManager } from '../services/jobManager.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../middleware/logger.js';

const router = Router();

console.log('✅ Data router loaded');

/**
 * 获取指定 slide/场景 的所有生成图片版本
 * @param generatedImagesDir 生成图片目录
 * @param prefix 文件名前缀 (如 slide_1 或 image)
 * @param jobId Job ID
 * @returns 图片版本数组
 */
async function getImageVersions(
  generatedImagesDir: string,
  prefix: string,
  jobId: string
): Promise<Array<{
  url: string;
  filename: string;
  metadata: any;
}>> {
  const fs = await import('fs/promises');
  const versions: Array<{ url: string; filename: string; metadata: any }> = [];

  try {
    const files = await fs.readdir(generatedImagesDir);
    // 匹配格式: {prefix}_{provider}_{number}.png 或旧格式 {prefix}.png
    const pattern = new RegExp(`^${prefix}(_\\w+_\\d+)?\\.png$`);

    const matchedFiles = files.filter(f => pattern.test(f)).sort();

    for (const filename of matchedFiles) {
      const metadataPath = path.join(generatedImagesDir, filename.replace('.png', '.json'));
      let metadata = null;

      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
      } catch {
        // 旧格式图片可能没有元数据
        metadata = { prompt: '', provider: 'unknown', width: 1024, height: 1024, generationTime: 0, createdAt: '' };
      }

      versions.push({
        url: `/webhook/servefiles/api/slides-data/${jobId}/generated_images/${filename}`,
        filename,
        metadata
      });
    }
  } catch {
    // 目录不存在
  }

  return versions;
}


/**
 * GET /webhook/api/get-doc-content
 * 获取文档提取出的原始结构化内容 (含样式)
 * Moved to top to ensure priority
 */
router.get(
  '/get-doc-content',
  asyncHandler(async (req: Request, res: Response) => {
    console.log(`🔍 Request received for /get-doc-content: ${req.query.jobId}`);
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ success: false, error: 'jobId is required' });
    }

    const jobManager = getJobManager();
    const job = jobManager.getJob(jobId);

    if (!job) {
      logger.warn(`get-doc-content: Job ${jobId} not found`);
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const jobDir = jobManager.getJobDir(jobId);
    const fs = await import('fs/promises');
    const contentPath = path.join(jobDir, 'doc_content.json');

    try {
      await fs.access(contentPath);
      const contentData = await fs.readFile(contentPath, 'utf-8');
      const docContent = JSON.parse(contentData);

      logger.info(`Successfully served doc_content.json for ${jobId}`);
      res.json({
        success: true,
        data: docContent
      });
    } catch (error: any) {
      logger.warn(`get-doc-content: File not found at ${contentPath}`);
      res.status(404).json({
        success: false,
        error: 'Document content not found or extraction in progress'
      });
    }
  })
);

/**
 * GET /webhook/api/get-job-data
 * 获取Job数据(增强版：包含所有资源的就绪状态)
 */
router.get(
  '/get-job-data',
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ success: false, error: 'jobId is required' });
    }

    const jobManager = getJobManager();
    const job = jobManager.getJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const jobDir = jobManager.getJobDir(jobId);
    const fs = await import('fs/promises');

    try {
      const notesPath = path.join(jobDir, 'notes.json');
      const imageDataPath = path.join(jobDir, 'image_data.json');

      let notesData = [];
      try {
        const rawNotes = await fs.readFile(notesPath, 'utf-8');
        notesData = JSON.parse(rawNotes);
        // 如果是对象格式 { scenes: [...] }，则提取数组
        if (notesData && typeof notesData === 'object' && !Array.isArray(notesData) && (notesData as any).scenes) {
          notesData = (notesData as any).scenes;
        }
      } catch {
        // 如果没有 notes.json，尝试读取 image_data.json (兼容旧版)
        try {
          notesData = JSON.parse(await fs.readFile(imageDataPath, 'utf-8'));
        } catch {
          // 如果是文本文档任务且没有场景数据，返回空数组
          notesData = [];
        }
      }

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

      // 识别是否为文本文档模式 (通过原始文件名或Job元数据)
      const originalFilename = job.metadata?.originalFilename || '';
      const isTextMode = !!originalFilename.match(/\.(docx|pdf|txt|md)$/i);

      const maxSlideNum = Math.max(
        ...slideFiles.map(f => {
          const m = f.match(/\d+/);
          return m ? parseInt(m[0]) + 1 : 0;
        }),
        notesData.length
      );

      const slides = [];
      for (let i = 0; i < maxSlideNum; i++) {
        const slideId = i;
        const noteEntry = notesData.find((n: any) => (n.id === slideId || n.id === slideId + 1 || n.slideId === slideId || n.slideId === slideId + 1));

        const hasFile = (list: string[], prefix: string, ext: string) =>
          list.includes(`${prefix}${i}${ext}`) || list.includes(`${prefix}${i + 1}${ext}`);

        const hasSlide = hasFile(slideFiles, 'slide_', '.png');
        const hasAudio = hasFile(audioFiles, 'slide_', '.mp3');
        const hasVideo = hasFile(videoFiles, 'slide_', '.mp4');
        const hasGenImageOld = hasFile(genImageFiles, 'slide_', '.png');

        // 获取该 slide 的所有生成图片版本
        // 逻辑与 generate.ts 保持一致: 文本文档模式前缀为 'image', 幻灯片模式为 'slide_{id}'
        const filePrefix = isTextMode ? 'image' : `slide_${i}`;
        const generatedImagesDir = path.join(jobDir, 'generated_images');
        const imageVersions = await getImageVersions(generatedImagesDir, filePrefix, jobId as string);
        const latestVersion = imageVersions.length > 0 ? imageVersions[0] : null;
        const hasGenImage = imageVersions.length > 0 || hasGenImageOld;

        slides.push({
          index: i,
          slideId: i + 1,
          note: noteEntry?.note || noteEntry?.description || '',
          title: noteEntry?.title || '',
          resources: {
            image: { exists: hasSlide, url: hasSlide ? `/webhook/servefiles/api/slides-data/${jobId}/images/slide_${i}.png` : null },
            audio: { exists: hasAudio, url: hasAudio ? `/webhook/servefiles/api/slides-data/${jobId}/audio/slide_${i}.mp3` : null },
            video: { exists: hasVideo, url: hasVideo ? `/webhook/servefiles/api/slides-data/${jobId}/video/slide_${i}.mp4` : null },
            generatedImage: {
              exists: hasGenImage,
              url: latestVersion ? latestVersion.url : null
            }
          },
          generatedImageVersions: imageVersions
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
          slides: slides,
          notes: notesData
        }
      });
    } catch (error: any) {
      logger.error(`Error reading job data for ${jobId}:`, error);
      res.status(500).json({ success: false, error: 'Failed to read job data' });
    }
  })
);

/**
 * GET /webhook/api/get-article-data
 */
router.get(
  '/get-article-data',
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.query;
    if (!jobId || typeof jobId !== 'string') return res.status(400).json({ success: false, error: 'jobId is required' });

    const jobManager = getJobManager();
    const job = jobManager.getJob(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const jobDir = jobManager.getJobDir(jobId);
    const fs = await import('fs/promises');

    try {
      const articleJsonPath = path.join(jobDir, 'article.json');
      const rawData = await fs.readFile(articleJsonPath, 'utf-8');
      const articleData = JSON.parse(rawData);

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          article: articleData.article,
          metadata: {
            ...job.metadata,
            ...articleData.metadata
          },
          source: {
            ppt_title: job.metadata.originalFilename?.replace(/\.[^/.]+$/, "")
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to read article data' });
    }
  })
);

/**
 * GET /webhook/api/get-doc-content
 * 获取文档提取出的原始结构化内容 (含样式)
 */
router.get(
  '/get-doc-content',
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.query;
    if (!jobId || typeof jobId !== 'string') return res.status(400).json({ success: false, error: 'jobId is required' });

    const jobManager = getJobManager();
    const job = jobManager.getJob(jobId);

    if (!job) {
      logger.warn(`get-doc-content: Job ${jobId} not found`);
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const jobDir = jobManager.getJobDir(jobId);
    const fs = await import('fs/promises');
    const contentPath = path.join(jobDir, 'doc_content.json');

    try {
      await fs.access(contentPath);
      const contentData = await fs.readFile(contentPath, 'utf-8');
      const docContent = JSON.parse(contentData);

      res.json({
        success: true,
        data: docContent
      });
    } catch (error: any) {
      logger.warn(`get-doc-content: File not found at ${contentPath}`);
      res.status(404).json({
        success: false,
        error: 'Document content not found or extraction in progress'
      });
    }
  })
);

export default router;