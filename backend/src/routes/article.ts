import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getJobManager } from '../services/jobManager.js';
import { getAIService } from '../services/aiService.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../middleware/logger.js';
import { parseArticlePrompt } from '../utils/promptUtils.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const upload = multer();

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
 * 注意：此路由在 app.ts 中可能挂载在 /webhook 下，而不是 /webhook/api
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

export default router;
