import https from 'https';
import http from 'http';
import { URL } from 'url';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { IncomingMessage } from 'http';

const pipelineAsync = promisify(pipeline);

/**
 * TTS服务
 * 支持MiniMax、Coqui TTS、Qwen TTS三种服务
 */
export class TTSService {
  /**
   * 使用MiniMax API生成音频
   */
  async generateMiniMaxAudio(
    text: string,
    options: {
      groupId: string;
      accessToken: string;
      voiceId: string;
      speechRate?: number;
    }
  ): Promise<Buffer> {
    const url = new URL(`https://api.minimaxi.com/v1/t2a_v2?GroupId=${options.groupId}`);

    const payload = {
      text,
      model: 'speech-2.6-hd',
      voice_setting: {
        voice_id: options.voiceId || 'Chinese (Mandarin)_News_Anchor'
      },
      speed: options.speechRate || 1.0
    };

    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${options.accessToken}`,
          'Content-Type': 'application/json'
        }
      }, (res) => {
        resolve(res);
      });

      req.on('error', reject);
      req.write(JSON.stringify(payload));
      req.end();
    });

    if (response.statusCode !== 200) {
      throw new Error(`MiniMax API error: ${response.statusCode}`);
    }

    const data = await new Promise<any>((resolve, reject) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        try {
          const rawData = Buffer.concat(chunks).toString('utf-8');

          // 尝试解析 JSON
          try {
            const parsedData = JSON.parse(rawData);
            resolve(parsedData);
          } catch (e) {
            // 如果解析失败，打印原始数据的前200个字符以供调试
            console.error('MiniMax response parsing failed. Raw data preview:', rawData.substring(0, 200));
            reject(new Error(`Failed to parse MiniMax response: ${(e as any).message}`));
          }
        } catch (e) {
          reject(e);
        }
      });
      response.on('error', reject);
    });

    // 检查响应状态
    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw new Error(`MiniMax API error: ${data.base_resp.status_msg} (Code: ${data.base_resp.status_code})`);
    }

    // 解码base64音频数据
    if (!data.data?.audio) {
      // 某些情况下 MiniMax 可能返回 trace_id 但没有 audio
      throw new Error(`No audio data in MiniMax response. Trace ID: ${data.base_resp?.trace_id || 'unknown'}`);
    }

    // MiniMax返回的是十六进制字符串(hex)，不是base64
    const audioBuffer = Buffer.from(data.data.audio, 'hex');

    // 检查 Buffer 有效性
    if (audioBuffer.length === 0) {
      throw new Error('Generated audio buffer is empty');
    }

    return audioBuffer;
  }

  /**
   * 使用Coqui TTS生成音频
   */
  async generateCoquiAudio(
    text: string,
    options: {
      url: string;
      speakerWav: string;
      gpuThresholdGb?: number;
    }
  ): Promise<Buffer> {
    // 优先使用传入的 URL，如果没有则使用默认值
    const urlStr = options.url || 'http://178.109.129.11:8001/generate';
    const url = new URL(urlStr);

    // 注意：尝试不传递 output_path，期望 API 直接返回音频流数据
    // 这样可以兼容开发环境(Mac)和生产环境(Linux)
    const payload = {
      text,
      speaker_wav: options.speakerWav,
      language_id: 'zh', // 显式指定中文，某些模型需要
      gpu_threshold_gb: options.gpuThresholdGb || 4.0
    };

    console.log('Coqui TTS Payload:', JSON.stringify(payload));

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
      req.write(JSON.stringify(payload));
      req.end();
    });

    if (response.statusCode !== 200) {
      throw new Error(`Coqui TTS API error: ${response.statusCode}`);
    }

    // 检查 Content-Type，确认是音频流还是 JSON
    const contentType = response.headers['content-type'];

    if (contentType && contentType.includes('application/json')) {
      // 如果返回的是 JSON，说明可能出错了或者是为了返回元数据
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

      if (!data.success && data.error) {
        throw new Error(`Coqui TTS failed: ${data.error}`);
      }

      // 如果成功但返回 JSON，说明它不支持流式输出，必须写文件
      // 此时抛出明确错误，提示需在同构环境下运行
      throw new Error(`Coqui TTS returned JSON (output_path required?). This mode requires backend and TTS service to share file system.`);
    }

    // 假设直接返回音频流
    const chunks: Buffer[] = [];
    for await (const chunk of response) {
      chunks.push(Buffer.from(chunk));
    }

    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length === 0) {
      throw new Error('Generated Coqui audio buffer is empty');
    }

    return audioBuffer;
  }

  /**
   * 使用Qwen TTS生成音频 (最新 Qwen3-TTS-Flash 接口)
   */
  async generateQwenAudio(
    text: string,
    options: {
      apiKey: string;
      model: string;
      voiceId: string;
    }
  ): Promise<Buffer> {
    // 使用经过验证的多模态生成 Endpoint
    const url = new URL('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation');

    // 修正Payload结构，Qwen3要求voice参数放在input内部
    const payload = {
      model: options.model || 'qwen3-tts-flash',
      input: {
        text: text,
        voice: options.voiceId || 'Cherry' // 默认 Cherry (qwen3-tts-flash 推荐音色)
      }
    };

    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json'
        }
      }, (res) => {
        resolve(res);
      });

      req.on('error', reject);
      req.write(JSON.stringify(payload));
      req.end();
    });

    if (response.statusCode !== 200) {
      // 读取错误信息以便调试
      const errData = await new Promise<string>((resolve) => {
        let d = '';
        response.on('data', c => d += c);
        response.on('end', () => resolve(d));
      });
      throw new Error(`Qwen TTS API error: ${response.statusCode} - ${errData}`);
    }

    const data = await new Promise<any>((resolve, reject) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(e);
        }
      });
      response.on('error', reject);
    });

    // Qwen3返回URL,需要下载音频文件 (WAV格式)
    if (!data.output?.audio?.url) {
      throw new Error(`No audio URL in Qwen response: ${JSON.stringify(data)}`);
    }

    // 下载音频文件 (根据协议动态选择 http 或 https)
    const audioUrl = data.output.audio.url;
    const client = audioUrl.startsWith('https') ? https : http;

    const audioResponse = await new Promise<IncomingMessage>((resolve, reject) => {
      client.get(audioUrl, resolve).on('error', reject);
    });

    if (audioResponse.statusCode !== 200) {
      throw new Error(`Failed to download audio from Qwen: ${audioResponse.statusCode}`);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of audioResponse) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  /**
   * 统一的音频生成接口
   */
  async generateAudio(
    text: string,
    service: 'minimax' | 'coqui_tts' | 'qwen_tts',
    options: any
  ): Promise<Buffer> {
    switch (service) {
      case 'minimax':
        return await this.generateMiniMaxAudio(text, options);

      case 'coqui_tts':
        return await this.generateCoquiAudio(text, options);

      case 'qwen_tts':
        return await this.generateQwenAudio(text, options);

      default:
        throw new Error(`Unknown TTS service: ${service}`);
    }
  }

  /**
   * 保存音频到文件
   */
  async saveAudio(audioBuffer: Buffer, outputPath: string): Promise<void> {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, audioBuffer);
  }
}

// 导出单例
let ttsServiceInstance: TTSService | null = null;

export const getTTSService = (): TTSService => {
  if (!ttsServiceInstance) {
    ttsServiceInstance = new TTSService();
  }
  return ttsServiceInstance;
};

export default TTSService;
