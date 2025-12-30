import http from 'http';
import { URL } from 'url';
import { IncomingMessage } from 'http';

/**
 * ComfyUI图片生成服务
 */
export class ComfyUIService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://178.109.129.11:8188') {
    this.baseUrl = baseUrl;
  }

  /**
   * 构建ComfyUI工作流
   */
  private buildComfyUIWorkflow(
    prompt: string,
    negativePrompt: string,
    width: number,
    height: number,
    batchSize: number = 1
  ): any {
    const seed = Math.floor(Math.random() * 1000000000);

    return {
      "3": {
        "inputs": {
          "seed": seed,
          "steps": 9,
          "cfg": 1.0,
          "sampler_name": "euler",
          "scheduler": "simple",
          "denoise": 1,
          "model": ["16", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["13", 0]
        },
        "class_type": "KSampler"
      },
      "6": {
        "inputs": {
          "text": prompt,
          "clip": ["18", 0]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "text": negativePrompt || 'low quality, blurry, distorted, ugly, bad anatomy',
          "clip": ["18", 0]
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["17", 0]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": `slide_${Date.now()}`,
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      },
      "13": {
        "inputs": {
          "width": width || 1024,
          "height": height || 1024,
          "batch_size": Math.min(Math.max(batchSize, 1), 4)
        },
        "class_type": "EmptySD3LatentImage"
      },
      "16": {
        "inputs": {
          "unet_name": "z_image_turbo_bf16.safetensors",
          "weight_dtype": "default"
        },
        "class_type": "UNETLoader"
      },
      "17": {
        "inputs": {
          "vae_name": "ae.safetensors"
        },
        "class_type": "VAELoader"
      },
      "18": {
        "inputs": {
          "clip_name": "qwen_3_4b.safetensors",
          "type": "lumina2",
          "device": "default"
        },
        "class_type": "CLIPLoader"
      }
    };
  }

  /**
   * 提交图片生成任务到ComfyUI
   */
  async generateImage(
    prompt: string,
    options: {
      negativePrompt?: string;
      width?: number;
      height?: number;
      batchSize?: number;
    }
  ): Promise<string> {
    const workflow = this.buildComfyUIWorkflow(
      prompt,
      options.negativePrompt || '',
      options.width || 1024,
      options.height || 1024,
      options.batchSize || 1
    );

    const url = new URL(`${this.baseUrl}/prompt`);

    // 提交任务
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const req = http.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, (res) => {
        resolve(res);
      });

      req.on('error', reject);
      req.write(JSON.stringify({ prompt: workflow }));
      req.end();
    });

    if (response.statusCode !== 200) {
      throw new Error(`ComfyUI API error: ${response.statusCode}`);
    }

    const data = await new Promise<any>((resolve, reject) => {
      let rawData = '';
      response.on('data', (chunk) => rawData += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(rawData));
        } catch (e) {
          reject(e);
        }
      });
      response.on('error', reject);
    });

    if (!data.prompt_id) {
      throw new Error('No prompt_id in ComfyUI response');
    }

    return data.prompt_id;
  }

  /**
   * 轮询等待图片生成完成
   */
  async waitForCompletion(promptId: string, maxWaitTime: number = 300000): Promise<{
    filename: string;
    subfolder: string;
    type: string;
  }> {
    const startTime = Date.now();
    const url = new URL(`${this.baseUrl}/history/${promptId}`);

    while (Date.now() - startTime < maxWaitTime) {
      const historyData = await this.getHistory(promptId);

      if (historyData && historyData[promptId]) {
        // 检查是否完成
        const status = historyData[promptId].status;
        if (status && status.completed) {
          // 获取生成的图片信息
          const outputs = historyData[promptId].outputs;
          if (outputs && outputs["9"] && outputs["9"].images && outputs["9"].images.length > 0) {
            return outputs["9"].images[0];
          }
        }
      }

      // 等待2秒后重试
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`ComfyUI generation timeout after ${maxWaitTime}ms`);
  }

  /**
   * 获取历史记录
   */
  private async getHistory(promptId: string): Promise<any> {
    const url = new URL(`${this.baseUrl}/history/${promptId}`);

    return new Promise((resolve, reject) => {
      const req = http.request(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }, (res) => {
        let rawData = '';
        res.on('data', (chunk) => rawData += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(rawData));
          } catch (e) {
            reject(e);
          }
        });
        res.on('error', reject);
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * 下载生成的图片
   */
  async downloadImage(filename: string, subfolder: string = ''): Promise<Buffer> {
    let urlPath = '/view';
    if (subfolder) {
      urlPath += `?filename=${filename}&subfolder=${subfolder}`;
    } else {
      urlPath += `?filename=${filename}`;
    }

    const url = new URL(`${this.baseUrl}${urlPath}`);

    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      http.request(url, {
        method: 'GET'
      }, (res) => {
        resolve(res);
      }).on('error', reject).end();
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to download image from ComfyUI: ${response.statusCode}`);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of response) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * 完整的图片生成流程
   */
  async generateImageAndWait(
    prompt: string,
    options: {
      negativePrompt?: string;
      width?: number;
      height?: number;
      batchSize?: number;
    }
  ): Promise<Buffer> {
    // 1. 提交生成任务
    const promptId = await this.generateImage(prompt, options);

    // 2. 等待生成完成
    const imageInfo = await this.waitForCompletion(promptId);

    // 3. 下载图片
    return await this.downloadImage(imageInfo.filename, imageInfo.subfolder);
  }
}

export default ComfyUIService;
