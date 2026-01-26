import { logger } from '../middleware/logger.js';

/**
 * GLM-Image 图片生成服务
 * 调用智谱 AI 的 GLM-Image API 生成图片
 */
export class GLMImageService {
  private apiKey: string;
  private apiUrl = 'https://open.bigmodel.cn/api/paas/v4/images/generations';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 生成图片
   * @param prompt 图片描述提示词
   * @param options 生成选项
   */
  async generateImage(
    prompt: string,
    options: {
      size?: string;       // 格式: "WIDTHxHEIGHT", 默认 "1088x1920"
      quality?: string;    // "hd" | "standard", 默认 "hd"
      watermark?: boolean; // 是否添加水印, 默认 false
    } = {}
  ): Promise<{ url: string }> {
    const {
      size = '1088x1920',
      quality = 'hd',
      watermark = false
    } = options;

    logger.info('GLM-Image generating image', { prompt: prompt.substring(0, 100), size, quality });

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-image',
        prompt,
        size,
        quality,
        watermark_enabled: String(watermark).toLowerCase()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('GLM-Image API error', { status: response.status, error: errorText });
      throw new Error(`GLM-Image API error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();

    if (!data.data || !data.data[0]?.url) {
      logger.error('GLM-Image no image returned', { data });
      throw new Error('GLM-Image API did not return an image URL');
    }

    const imageUrl = data.data[0].url;
    logger.success('GLM-Image generation completed', { url: imageUrl.substring(0, 50) });

    return { url: imageUrl };
  }

  /**
   * 下载图片到 Buffer
   * @param url 图片 URL
   */
  async downloadImage(url: string): Promise<Buffer> {
    logger.info('GLM-Image downloading image', { url: url.substring(0, 50) });

    const response = await fetch(url, { 
      method: 'GET',
      // GLM 返回的 URL 需要设置较长超时
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      throw new Error(`Failed to download image from GLM: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.success('GLM-Image download completed', { size: buffer.length });

    return buffer;
  }

  /**
   * 生成图片并下载
   * 完整流程：生成 -> 下载 -> 返回 Buffer
   */
  async generateImageAndDownload(
    prompt: string,
    options: {
      size?: string;
      quality?: string;
      watermark?: boolean;
    } = {}
  ): Promise<{ buffer: Buffer; url: string }> {
    const result = await this.generateImage(prompt, options);
    const buffer = await this.downloadImage(result.url);

    return {
      buffer,
      url: result.url
    };
  }
}

export default GLMImageService;
