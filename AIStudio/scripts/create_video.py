#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
统一视频制作脚本
合并原有的视频生成功能，支持单个和批量视频制作
使用说明：
  python create_video.py --mode batch --work-dir work_dir --output-dir video_dir
  python create_video.py --mode single --work-dir work_dir --slide-id 0 --output-file slide_0.mp4
  python create_video.py --mode final --work-dir work_dir --output-file final_video.mp4
"""

import os
import sys
import json
import argparse
import glob
import logging
from typing import Dict, Any, List, Optional, Union
from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips, CompositeVideoClip

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoCreator:
    """视频制作器"""

    def __init__(self):
        pass

    def ensure_even_dimensions(self, clip):
        """确保视频剪辑的尺寸是偶数"""
        w, h = clip.size
        new_w = w if w % 2 == 0 else w - 1
        new_h = h if h % 2 == 0 else h - 1
        if new_w != w or new_h != h:
            return clip.crop(width=new_w, height=new_h, x_center=w/2, y_center=h/2)
        return clip

    def create_single_video(self, image_path: str, audio_path: Optional[str], output_path: str,
                          default_duration: float = 3.0) -> bool:
        """创建单个视频文件"""
        try:
            logger.info(f"Creating video: {image_path} + {audio_path or 'no audio'} -> {output_path}")

            # 加载图片
            img_clip = ImageClip(image_path)
            img_clip = self.ensure_even_dimensions(img_clip)

            duration = default_duration

            # 如果有音频，使用音频长度
            if audio_path and os.path.exists(audio_path):
                try:
                    audio_clip = AudioFileClip(audio_path)
                    duration = audio_clip.duration
                    img_clip = img_clip.set_audio(audio_clip)
                    logger.info(f"Using audio duration: {duration:.2f}s")
                except Exception as e:
                    logger.warning(f"Failed to load audio {audio_path}: {e}")
                    logger.info(f"Using default duration: {duration}s")

            # 设置视频时长
            img_clip = img_clip.set_duration(duration)

            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path), exist_ok=True)

            # 写入视频文件
            img_clip.write_videofile(
                output_path,
                fps=24,
                codec='libx264',
                audio_codec='aac' if audio_path and os.path.exists(audio_path) else None,
                temp_audiofile='temp-audio.m4a',
                remove_temp=True,
                logger=None
            )

            # 清理资源
            img_clip.close()

            logger.info(f"Video created successfully: {output_path}")
            return True

        except Exception as e:
            logger.error(f"Error creating single video: {e}")
            return False

    def create_batch_videos(self, work_dir: str, output_dir: Optional[str] = None) -> bool:
        """批量创建视频"""
        try:
            slides_dir = os.path.join(work_dir, "slides")
            audio_dir = os.path.join(work_dir, "audio")

            if not os.path.exists(slides_dir):
                logger.error(f"Slides directory not found: {slides_dir}")
                return False

            # 设置输出目录
            if not output_dir:
                output_dir = os.path.join(work_dir, "video")

            os.makedirs(output_dir, exist_ok=True)

            # 获取图片文件
            image_files = sorted(
                glob.glob(os.path.join(slides_dir, "slide_*.png")),
                key=lambda x: int(os.path.basename(x).split('_')[1].split('.')[0])
            )

            if not image_files:
                logger.error("No slide images found")
                return False

            logger.info(f"Found {len(image_files)} slide images")
            success_count = 0

            for i, img_path in enumerate(image_files):
                slide_num = i
                audio_path = os.path.join(audio_dir, f"slide_{slide_num}.mp3")
                output_path = os.path.join(output_dir, f"slide_{slide_num}.mp4")

                logger.info(f"Processing slide {slide_num}/{len(image_files)}")

                if self.create_single_video(img_path, audio_path, output_path):
                    success_count += 1
                else:
                    logger.error(f"Failed to create video for slide {slide_num}")

            logger.info(f"Batch video creation completed: {success_count}/{len(image_files)} successful")
            return success_count > 0

        except Exception as e:
            logger.error(f"Error in batch video creation: {e}")
            return False

    def create_final_video(self, work_dir: str, output_file: str) -> bool:
        """创建最终合并视频"""
        try:
            video_dir = os.path.join(work_dir, "video")

            if not os.path.exists(video_dir):
                logger.error(f"Video directory not found: {video_dir}")
                return False

            # 获取视频文件
            video_files = sorted(
                glob.glob(os.path.join(video_dir, "slide_*.mp4")),
                key=lambda x: int(os.path.basename(x).split('_')[1].split('.')[0])
            )

            if not video_files:
                logger.error("No slide videos found for merging")
                return False

            logger.info(f"Found {len(video_files)} slide videos for merging")

            # 加载视频剪辑
            video_clips = []
            for video_path in video_files:
                try:
                    clip = ImageClip(video_path.replace('.mp4', '.png'))  # 临时使用图片
                    video_clips.append(clip)
                except Exception as e:
                    logger.error(f"Failed to load video {video_path}: {e}")
                    continue

            if not video_clips:
                logger.error("No valid video clips to merge")
                return False

            # 合并视频
            logger.info("Merging video clips...")
            final_clip = concatenate_videoclips(video_clips)

            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_file), exist_ok=True)

            # 写入最终视频
            final_clip.write_videofile(
                output_file,
                fps=24,
                codec='libx264',
                logger=None
            )

            # 清理资源
            final_clip.close()
            for clip in video_clips:
                clip.close()

            logger.info(f"Final video created successfully: {output_file}")
            return True

        except Exception as e:
            logger.error(f"Error creating final video: {e}")
            return False

    def create_final_video_with_audio(self, work_dir: str, output_file: str) -> bool:
        """创建最终合并视频（包含音频）"""
        try:
            slides_dir = os.path.join(work_dir, "slides")
            audio_dir = os.path.join(work_dir, "audio")

            if not os.path.exists(slides_dir):
                logger.error(f"Slides directory not found: {slides_dir}")
                return False

            # 获取图片文件
            image_files = sorted(
                glob.glob(os.path.join(slides_dir, "slide_*.png")),
                key=lambda x: int(os.path.basename(x).split('_')[1].split('.')[0])
            )

            if not image_files:
                logger.error("No slide images found")
                return False

            logger.info(f"Found {len(image_files)} slide images")
            video_clips = []

            for i, img_path in enumerate(image_files):
                slide_num = i
                audio_path = os.path.join(audio_dir, f"slide_{slide_num}.mp3")

                try:
                    # 创建单个视频剪辑
                    img_clip = ImageClip(img_path)
                    img_clip = self.ensure_even_dimensions(img_clip)

                    duration = 3.0  # 默认时长

                    # 如果有音频，使用音频长度
                    if audio_path and os.path.exists(audio_path):
                        try:
                            audio_clip = AudioFileClip(audio_path)
                            duration = audio_clip.duration
                            img_clip = img_clip.set_audio(audio_clip)
                            logger.info(f"Slide {slide_num}: using audio duration {duration:.2f}s")
                        except Exception as e:
                            logger.warning(f"Failed to load audio for slide {slide_num}: {e}")
                            logger.info(f"Slide {slide_num}: using default duration {duration}s")

                    img_clip = img_clip.set_duration(duration)
                    video_clips.append(img_clip)

                except Exception as e:
                    logger.error(f"Failed to create clip for slide {slide_num}: {e}")
                    continue

            if not video_clips:
                logger.error("No valid video clips to merge")
                return False

            # 合并视频
            logger.info("Merging video clips with audio...")
            final_clip = concatenate_videoclips(video_clips)

            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_file), exist_ok=True)

            # 写入最终视频
            final_clip.write_videofile(
                output_file,
                fps=24,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile='temp-final-audio.m4a',
                remove_temp=True,
                logger=None
            )

            # 清理资源
            final_clip.close()
            for clip in video_clips:
                clip.close()

            logger.info(f"Final video with audio created successfully: {output_file}")
            return True

        except Exception as e:
            logger.error(f"Error creating final video with audio: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description='Create video files')
    parser.add_argument('--mode', required=True, choices=['single', 'batch', 'final'], help='Creation mode')
    parser.add_argument('--work-dir', help='Working directory containing slides and audio')
    parser.add_argument('--output-dir', help='Output directory for batch mode')
    parser.add_argument('--output-file', help='Output file path for single/final mode')
    parser.add_argument('--slide-id', type=int, help='Slide ID (for single mode)')
    parser.add_argument('--image-path', help='Image path (for single mode)')
    parser.add_argument('--audio-path', help='Audio path (for single mode)')
    parser.add_argument('--default-duration', type=float, default=3.0, help='Default duration in seconds')

    args = parser.parse_args()

    creator = VideoCreator()

    if args.mode == 'single':
        if args.slide_id is None:
            if not args.image_path:
                logger.error("Either --slide-id (with work-dir) or --image-path is required for single mode")
                sys.exit(1)

            # 直接使用提供的路径
            if args.image_path:
                output_path = args.output_file or os.path.splitext(args.image_path)[0] + '.mp4'
                success = creator.create_single_video(args.image_path, args.audio_path, output_path, args.default_duration)
            else:
                logger.error("Invalid parameters for single mode")
                sys.exit(1)
        else:
            # 使用slide_id和工作_dir
            if not args.work_dir:
                logger.error("--work-dir is required when using --slide-id")
                sys.exit(1)

            image_path = os.path.join(args.work_dir, "slides", f"slide_{args.slide_id}.png")
            audio_path = os.path.join(args.work_dir, "audio", f"slide_{args.slide_id}.mp3")
            output_path = args.output_file or os.path.join(args.work_dir, "video", f"slide_{args.slide_id}.mp4")

            success = creator.create_single_video(image_path, audio_path, output_path, args.default_duration)

    elif args.mode == 'batch':
        if not args.work_dir:
            logger.error("--work-dir is required for batch mode")
            sys.exit(1)

        success = creator.create_batch_videos(args.work_dir, args.output_dir)

    elif args.mode == 'final':
        if not args.work_dir:
            logger.error("--work-dir is required for final mode")
            sys.exit(1)

        if not args.output_file:
            args.output_file = os.path.join(args.work_dir, "final_video.mp4")

        # 优先尝试创建带音频的视频
        success = creator.create_final_video_with_audio(args.work_dir, args.output_file)

        # 如果失败，尝试创建不带音频的视频
        if not success:
            logger.warning("Failed to create final video with audio, trying without audio...")
            success = creator.create_final_video(args.work_dir, args.output_file)

    if success:
        logger.info("Video creation completed successfully!")
        sys.exit(0)
    else:
        logger.error("Video creation failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
