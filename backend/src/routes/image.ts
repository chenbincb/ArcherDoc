import { Router, Request, Response } from 'express';
import { getJobManager } from '../services/jobManager.js';
import { getAIService } from '../services/aiService.js';
import ComfyUIService from '../services/comfyUIService.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../middleware/logger.js';
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
 * POST /webhook/api/save-slide-prompt
 * 保存单个 slide 的提示词到 image_data.json
 */
router.post(
    '/save-slide-prompt',
    asyncHandler(async (req: Request, res: Response) => {
        const { jobId, slideId, prompt } = req.body;

        logger.info('Saving slide prompt', { jobId, slideId });

        if (!jobId || slideId === undefined || !prompt) {
            return res.status(400).json({
                success: false,
                error: 'jobId, slideId and prompt are required'
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
            const imageDataPath = path.join(jobDir, 'image_data.json');

            // 读取现有的 image_data.json
            let imageData: any[] = [];
            try {
                const content = await fs.readFile(imageDataPath, 'utf-8');
                imageData = JSON.parse(content);
            } catch (err) {
                // 文件不存在，创建新数组
                logger.warn(`image_data.json not found for job ${jobId}, creating new one`);
            }

            // 查找并更新对应 slide 的提示词
            let found = false;
            for (let i = 0; i < imageData.length; i++) {
                if (imageData[i].id === slideId) {
                    imageData[i].suggestedPrompt = prompt;
                    imageData[i].userPrompt = prompt;
                    found = true;
                    break;
                }
            }

            // 如果没有找到，添加新的记录
            if (!found) {
                imageData.push({
                    id: slideId,
                    suggestedPrompt: prompt,
                    userPrompt: prompt
                });
            }

            // 保存更新后的文件
            await fs.writeFile(imageDataPath, JSON.stringify(imageData, null, 2), 'utf-8');

            logger.success(`Saved prompt for slide ${slideId} in job ${jobId}`);

            res.json({
                success: true,
                message: 'Prompt saved successfully'
            });
        } catch (error: any) {
            logger.error('Save prompt failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

export default router;
