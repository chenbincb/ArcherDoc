import {
  ImageProvider,
  ImageGenerationRequest,
  GeneratedImage,
  ImageGenerationSettings,
  ComfyUISettings,
  NanoBananaSettings
} from '../types';
import { API_CONFIG } from '../constants';

/**
 * 图片生成服务类
 */
export class ImageService {

  /**
   * 根据宽高比计算图片尺寸
   */
  private static calculateDimensionsFromAspectRatio(aspectRatio: string): { width: number; height: number } {
    switch (aspectRatio) {
      case '1:1':
        return { width: 1024, height: 1024 };
      case '2:3':
        return { width: 832, height: 1248 };
      case '3:2':
        return { width: 1248, height: 832 };
      case '3:4':
        return { width: 864, height: 1184 };
      case '4:3':
        return { width: 1184, height: 864 };
      case '4:5':
        return { width: 896, height: 1152 };
      case '5:4':
        return { width: 1152, height: 896 };
      case '9:16':
        return { width: 768, height: 1344 };
      case '16:9':
        return { width: 1344, height: 768 };
      case '21:9':
        return { width: 1536, height: 672 };
      default:
        return { width: 1024, height: 1024 };
    }
  }

  /**
   * 分析幻灯片内容，生成图片描述和提示词建议
   */
  static async analyzeSlideForImage(slideTitle: string, slideContent: string, provider: ImageProvider): Promise<{
    description: string;
    suggestedPrompt: string;
    keywords: string[];
    style: string;
  }> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/analyze-slide-for-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slideTitle,
          slideContent,
          provider
        }),
      });

      if (!response.ok) {
        throw new Error(`分析失败: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        description: result.description || '',
        suggestedPrompt: result.suggestedPrompt || '',
        keywords: result.keywords || [],
        style: result.style || 'realistic'
      };
    } catch (error) {
      console.error('分析幻灯片内容失败:', error);
      throw error;
    }
  }

  /**
   * 使用ComfyUI生成图片
   */
  static async generateImageWithComfyUI(request: ImageGenerationRequest, settings: ImageGenerationSettings): Promise<GeneratedImage> {
    const startTime = Date.now();

    try {
      const comfyuiSettings = settings.comfyuiSettings;

      // 构建ComfyUI请求数据
      const comfyuiRequest = {
        prompt: this.buildComfyUIPrompt(request.prompt, request.negativePrompt, comfyuiSettings),
        workflow: comfyuiSettings.workflowId || 'default',
        settings: {
          steps: comfyuiSettings.steps,
          cfg_scale: comfyuiSettings.cfgScale,
          width: request.width || comfyuiSettings.width,
          height: request.height || comfyuiSettings.height,
          sampler: comfyuiSettings.sampler,
          scheduler: comfyuiSettings.scheduler
        }
      };

      const response = await fetch(`${comfyuiSettings.baseUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(comfyuiRequest),
      });

      if (!response.ok) {
        throw new Error(`ComfyUI生成失败: ${response.statusText}`);
      }

      const result = await response.json();
      const generationTime = (Date.now() - startTime) / 1000;

      // 等待图片生成完成并获取结果
      const generatedImage = await this.waitForComfyUIResult(result.prompt_id, comfyuiSettings.baseUrl);

      return {
        id: `comfyui_${Date.now()}`,
        slideId: request.slideId,
        url: generatedImage.url,
        thumbnailUrl: generatedImage.thumbnailUrl || generatedImage.url,
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        generationTime,
        provider: ImageProvider.COMFYUI,
        width: request.width || comfyuiSettings.width,
        height: request.height || comfyuiSettings.height,
        fileSize: generatedImage.fileSize || 0,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('ComfyUI图片生成失败:', error);
      throw error;
    }
  }

  /**
   * 使用Nano Banana (Google Gemini) 生成图片
   */
  static async generateImageWithNanoBanana(request: ImageGenerationRequest, settings: ImageGenerationSettings): Promise<GeneratedImage> {
    const startTime = Date.now();

    try {
      const nanobananaSettings = settings.nanobananaSettings;

      // 直接调用Google Gemini API
      // 根据文档使用正确的imageConfig格式
      const geminiRequest = {
        contents: [{
          parts: [{
            text: request.prompt
          }]
        }],
        generationConfig: {
          responseModalities: ["Image"],
          imageConfig: {
            aspectRatio: nanobananaSettings.aspectRatio,
            // 根据质量设置图片大小 - 根据文档使用imageSize参数
            imageSize: nanobananaSettings.quality === 'hd' ? '2K' : '1K'
          }
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${nanobananaSettings.model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': nanobananaSettings.apiKey,
        },
        body: JSON.stringify(geminiRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Gemini API调用失败: ${response.statusText} - ${errorText}`);
      }

      const geminiResult = await response.json();
      const generationTime = (Date.now() - startTime) / 1000;

      if (!geminiResult.candidates || geminiResult.candidates.length === 0) {
        throw new Error('Google Gemini未返回生成的图片');
      }

      // 生成jobId并调用n8n保存响应数据
      const jobId = Date.now().toString();

      const n8nRequest = {
        jobId,
        slideId: request.slideId,
        provider: 'nanobanana',
        nanobananaResponseData: JSON.stringify(geminiResult)
      };

      const n8nResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nRequest),
      });

      if (!n8nResponse.ok) {
        throw new Error(`n8n保存响应失败: ${n8nResponse.statusText}`);
      }

      const n8nResult = await n8nResponse.json();
      const baseUrl = API_CONFIG.BASE_URL;
      const imageUrl = `${baseUrl}/webhook/servefiles/api/slides-data/${jobId}/generated_images/slide_${request.slideId}.png`;

      // 根据宽高比计算实际尺寸
      const dimensions = ImageService.calculateDimensionsFromAspectRatio(nanobananaSettings.aspectRatio);

      return {
        id: `nanobanana_${Date.now()}`,
        slideId: request.slideId,
        url: imageUrl,
        thumbnailUrl: imageUrl,
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        generationTime,
        provider: ImageProvider.NANO_BANANA,
        width: dimensions.width,
        height: dimensions.height,
        fileSize: n8nResult.data?.fileSize || 0,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Nano Banana图片生成失败:', error);
      throw error;
    }
  }

  /**
   * AI优化提示词
   */
  static async optimizePrompt(originalPrompt: string, description: string, slideTitle: string): Promise<string> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/optimize-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalPrompt,
          description,
          slideTitle
        }),
      });

      if (!response.ok) {
        throw new Error(`优化失败: ${response.statusText}`);
      }

      const result = await response.json();
      return result.optimizedPrompt || originalPrompt;
    } catch (error) {
      console.error('优化提示词失败:', error);
      throw error;
    }
  }

  /**
   * 替换PPTX中的图片
   */
  static async replaceImagesInPPTX(originalPPTX: File, generatedImages: GeneratedImage[]): Promise<Blob> {
    try {
      const formData = new FormData();
      formData.append('pptxFile', originalPPTX);
      formData.append('imageData', JSON.stringify(
        generatedImages.map(img => ({
          slideId: img.slideId,
          imageUrl: img.url,
          prompt: img.prompt
        }))
      ));

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/replace-pptx-images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`替换图片失败: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('替换PPTX图片失败:', error);
      throw error;
    }
  }

  /**
   * 构建ComfyUI提示词
   */
  private static buildComfyUIPrompt(prompt: string, negativePrompt: string, settings: ComfyUISettings): any {
    return {
      1: {
        inputs: {
          text: prompt,
          clip: "1"
        },
        class_type: "CLIPTextEncode"
      },
      2: {
        inputs: {
          text: negativePrompt,
          clip: "1"
        },
        class_type: "CLIPTextEncode"
      },
      3: {
        inputs: {
          seed: Math.floor(Math.random() * 1000000),
          steps: settings.steps,
          cfg: settings.cfgScale,
          sampler_name: settings.sampler,
          scheduler: settings.scheduler,
          denoise: 1,
          model: ["4", 0],
          positive: ["1", 0],
          negative: ["2", 0],
          latent_image: ["5", 0]
        },
        class_type: "KSampler"
      },
      4: {
        inputs: {
          model_name: settings.model
        },
        class_type: "CheckpointLoaderSimple"
      },
      5: {
        inputs: {
          width: settings.width,
          height: settings.height,
          batch_size: 1
        },
        class_type: "EmptyLatentImage"
      },
      6: {
        inputs: {
          samples: ["3", 0],
          vae: ["4", 2]
        },
        class_type: "VAEDecode"
      },
      7: {
        inputs: {
          filename_prefix: "generated_image",
          images: ["6", 0]
        },
        class_type: "SaveImage"
      }
    };
  }

  /**
   * 等待ComfyUI生成完成
   */
  private static async waitForComfyUIResult(promptId: string, baseUrl: string): Promise<{ url: string; thumbnailUrl?: string; fileSize?: number }> {
    const maxAttempts = 120; // 最多等待2分钟
    const delay = 1000; // 每秒检查一次

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${baseUrl}/history/${promptId}`);

        if (!response.ok) {
          throw new Error(`检查生成状态失败: ${response.statusText}`);
        }

        const history = await response.json();

        if (history[promptId] && history[promptId].outputs) {
          const outputs = history[promptId].outputs;

          // 查找图片输出
          for (const nodeId in outputs) {
            const nodeOutput = outputs[nodeId];
            if (nodeOutput.images && nodeOutput.images.length > 0) {
              const image = nodeOutput.images[0];
              const imageUrl = `${baseUrl}/view?filename=${image.filename}`;

              // 尝试获取缩略图
              const thumbnailUrl = `${baseUrl}/view?filename=${image.filename}&thumbnail=true`;

              // 尝试获取文件大小（可能需要额外请求）
              let fileSize = 0;
              try {
                const headResponse = await fetch(imageUrl, { method: 'HEAD' });
                if (headResponse.ok) {
                  const contentLength = headResponse.headers.get('content-length');
                  fileSize = contentLength ? parseInt(contentLength) : 0;
                }
              } catch (e) {
                console.warn('无法获取文件大小:', e);
              }

              return {
                url: imageUrl,
                thumbnailUrl,
                fileSize
              };
            }
          }
        }

        // 如果还没完成，等待后重试
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        console.error(`检查生成状态失败 (尝试 ${i + 1}/${maxAttempts}):`, error);
        if (i === maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('图片生成超时');
  }

  /**
   * 验证ComfyUI连接
   */
  static async validateComfyUIConnection(baseUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/system_stats`);
      return response.ok;
    } catch (error) {
      console.error('ComfyUI连接验证失败:', error);
      return false;
    }
  }

  /**
   * 验证Nano Banana API密钥
   */
  static async validateNanoBananaApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.nanobanana.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Nano Banana API密钥验证失败:', error);
      return false;
    }
  }

  /**
   * 获取ComfyUI可用模型列表
   */
  static async getComfyUIModels(baseUrl: string): Promise<string[]> {
    try {
      const response = await fetch(`${baseUrl}/object_info`);
      if (!response.ok) {
        throw new Error(`获取模型列表失败: ${response.statusText}`);
      }

      const objectInfo = await response.json();
      const models: string[] = [];

      // 查找CheckpointLoaderSimple类型的模型
      for (const nodeId in objectInfo) {
        const nodeInfo = objectInfo[nodeId];
        if (nodeInfo.class_type === 'CheckpointLoaderSimple') {
          const inputInfo = nodeInfo.input?.required;
          if (inputInfo && inputInfo.model_name && inputInfo.model_name[0]) {
            models.push(...inputInfo.model_name[0]);
          }
        }
      }

      return models;
    } catch (error) {
      console.error('获取ComfyUI模型列表失败:', error);
      return [];
    }
  }
}