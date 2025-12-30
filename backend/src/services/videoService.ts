import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../middleware/logger.js';

/**
 * 视频处理服务
 * 负责单页视频合成和视频合并
 * 严格对应 Python 脚本 create_video.py 和 merge_videos.py 的逻辑
 */
export class VideoService {

  /**
   * 获取媒体文件时长
   */
  private async getMediaDuration(mediaPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(mediaPath, (err: any, metadata: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(metadata.format.duration || 0);
      });
    });
  }

  /**
   * 将单张图片和音频合成为单页视频
   * 对应 create_video.py 中的 create_single_video 方法
   * 
   * @param imagePath 图片路径
   * @param audioPath 音频路径 (可选)
   * @param outputPath 输出视频路径
   * @param defaultDuration 默认时长 (当无音频时使用)
   */
  async generateSlideVideo(
    imagePath: string,
    audioPath: string | null,
    outputPath: string,
    defaultDuration: number = 3.0
  ): Promise<void> {
    const startTime = Date.now();

    // 强制转换为绝对路径，避免 FFmpeg 因 CWD 不一致找不到文件
    const absImagePath = path.resolve(imagePath);
    const absAudioPath = audioPath ? path.resolve(audioPath) : null;
    const absOutputPath = path.resolve(outputPath);

    logger.info(`Generating slide video: ${path.basename(absImagePath)} + ${absAudioPath ? path.basename(absAudioPath) : 'no audio'}`);

    // 检查图片是否存在
    try {
      await fs.access(absImagePath);
    } catch {
      throw new Error(`Image not found: ${absImagePath}`);
    }

    // 检查音频并获取时长
    let hasAudio = false;
    let finalDuration = defaultDuration;

    if (absAudioPath) {
      try {
        await fs.access(absAudioPath);
        hasAudio = true;
        // 预先获取音频时长，比 -shortest 更稳健
        const audioDuration = await this.getMediaDuration(absAudioPath);
        if (audioDuration > 0) {
          finalDuration = audioDuration;
          logger.info(`Detected audio duration: ${finalDuration}s`);
        }
      } catch {
        logger.warn(`Audio not found or invalid: ${absAudioPath}, using default duration`);
      }
    }

    return new Promise((resolve, reject) => {
      let command = ffmpeg();

      // 输入图片 (使用 -loop 1)
      command = command.input(absImagePath).inputOptions(['-loop 1']);

      // 显式设置总时长 (添加到输出端 -t)
      command = command.duration(finalDuration);

      // 输入音频 (如果有)
      if (hasAudio && absAudioPath) {
        command = command.input(absAudioPath);
      }

      // 视频编码设置 (对齐 Python 脚本参数)
      command = command
        .videoCodec('libx264')
        .outputOptions([
          '-pix_fmt yuv420p',
          '-r 24',
          '-vf crop=trunc(iw/2)*2:trunc(ih/2)*2',
          '-tune stillimage',
          '-movflags +faststart', // 允许视频在下载完成前开始播放
          '-preset superfast',    // 加快生成速度
          '-threads 0',           // 使用所有可用 CPU
          '-y'                    // 强制覆盖已存在的文件
        ]);

      if (hasAudio) {
        command = command
          .audioCodec('aac')
          .audioBitrate('128k');
      }

      command
        .save(absOutputPath)
        .on('start', (cmd: any) => {
          logger.info(`FFmpeg started for ${path.basename(absOutputPath)}`);
        })
        .on('end', () => {
          const duration = (Date.now() - startTime) / 1000;
          logger.info(`FFmpeg completed for ${path.basename(absOutputPath)} in ${duration}s`);
          resolve();
        })
        .on('error', (err: any, stdout: any, stderr: any) => {
          logger.error(`FFmpeg error for ${path.basename(absOutputPath)}: ${err.message}`);
          // logger.error('FFmpeg stderr:', stderr);
          reject(err);
        });
    });
  }

  /**
   * 将多个视频片段合并为一个视频
   * 对应 merge_videos.py 中的逻辑
   * 
   * @param videoPaths 视频片段路径列表
   * @param outputPath 输出视频路径
   * @param tempDir 临时目录 (用于存放 list.txt)
   */
  async mergeVideos(videoPaths: string[], outputPath: string, tempDir: string): Promise<void> {
    if (videoPaths.length === 0) {
      throw new Error('No video paths provided for merge');
    }

    const startTime = Date.now();
    const absOutputPath = path.resolve(outputPath);
    const absTempDir = path.resolve(tempDir);
    const absVideoPaths = videoPaths.map(p => path.resolve(p));

    logger.info(`Merging ${absVideoPaths.length} videos into ${path.basename(absOutputPath)}`);

    // 确保输出目录存在
    await fs.mkdir(path.dirname(absOutputPath), { recursive: true });

    // 优化：如果只有一个视频，直接复制
    if (absVideoPaths.length === 1) {
      try {
        await fs.copyFile(absVideoPaths[0], absOutputPath);
        logger.info(`Single video copied to ${path.basename(absOutputPath)}`);
        return;
      } catch (err: any) {
        throw new Error(`Failed to copy video file: ${err.message}`);
      }
    }

    // 1. 创建 FFmpeg concat list 文件
    // 格式: file '/absolute/path/to/file.mp4'
    const listFilePath = path.join(absTempDir, `merge_list_${Date.now()}.txt`);
    const listContent = absVideoPaths.map(p => `file '${p}'`).join('\n');

    await fs.writeFile(listFilePath, listContent, 'utf-8');

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(listFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c copy', // 直接流复制，不重新编码 (速度快，质量无损)
          '-movflags +faststart', // Web 优化，使视频可以快速开始播放
          '-y' // 强制覆盖输出文件
        ])
        .save(absOutputPath)
        .on('start', (cmd: any) => {
          logger.info('FFmpeg merge started');
        })
        .on('end', async () => {
          const duration = (Date.now() - startTime) / 1000;
          logger.info(`FFmpeg merge completed in ${duration}s`);

          // 清理 list 文件
          try {
            await fs.unlink(listFilePath);
          } catch (e) {
            logger.warn('Failed to delete temp list file:', e);
          }

          resolve();
        })
        .on('error', async (err: any) => {
          logger.error(`FFmpeg merge error: ${err.message}`);
          // 尝试清理
          try { await fs.unlink(listFilePath); } catch { }
          reject(err);
        });
    });
  }
}

// 导出单例
let videoServiceInstance: VideoService | null = null;

export const getVideoService = (): VideoService => {
  if (!videoServiceInstance) {
    videoServiceInstance = new VideoService();
  }
  return videoServiceInstance;
};

export default VideoService;
