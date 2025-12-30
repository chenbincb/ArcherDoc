import os
import argparse
import glob
from moviepy.editor import VideoFileClip, concatenate_videoclips

# 辅助函数，确保视频剪辑的尺寸是偶数
def ensure_even_dimensions(clip):
    w, h = clip.size
    new_w = w if w % 2 == 0 else w - 1
    new_h = h if h % 2 == 0 else h - 1
    if new_w != w or new_h != h:
        return clip.crop(width=new_w, height=new_h, x_center=w/2, y_center=h/2)
    return clip

def main():
    """
    主执行函数，合并所有单页视频为完整视频。
    """
    parser = argparse.ArgumentParser(description="Merge all single slide videos into a complete video.")
    parser.add_argument("--work-dir", required=True, help="Working directory containing slide data (should include job ID).")
    parser.add_argument("--output-dir", required=True, help="Directory to save the merged video (should include job ID).")
    parser.add_argument("--output-file", default="final_video.mp4", help="Name of the merged video file.")
    parser.add_argument("--fps", type=int, default=24, help="Video frames per second (default: 24).")
    args = parser.parse_args()

    # Extract job ID from work directory path
    job_id = os.path.basename(args.work_dir)

    print(f"--- Starting Script: 4c_merge_videos.py ---")
    print(f"Job ID: {job_id}")
    print(f"Work directory: {args.work_dir}")
    print(f"Output directory: {args.output_dir}")
    print(f"Output file: {args.output_file}")
    print(f"FPS: {args.fps}\n")
    
    try:
        # 构建视频文件路径
        # work_dir already contains jobId, so we don't need to add it again
        video_dir = os.path.join(args.work_dir, "video")
        print(f"Looking for videos in: {video_dir}")
        
        # 获取所有单页视频文件，按幻灯片顺序排序
        video_files = sorted(
            glob.glob(os.path.join(video_dir, "slide_*.mp4")),
            key=lambda x: int(os.path.basename(x).split('_')[1].split('.')[0])
        )
        
        if not video_files:
            raise FileNotFoundError(f"No video files found in {video_dir}")
        
        print(f"Found {len(video_files)} video files:")
        for i, video_file in enumerate(video_files):
            print(f"  {i+1}. {os.path.basename(video_file)}")
        
        # 创建视频剪辑列表
        video_clips = []
        for video_file in video_files:
            try:
                clip = VideoFileClip(video_file)
                clip = ensure_even_dimensions(clip)
                video_clips.append(clip)
                print(f"  ✓ Added {os.path.basename(video_file)} (duration: {clip.duration:.2f}s, resolution: {clip.size[0]}x{clip.size[1]})")
            except Exception as e:
                print(f"  ✗ Failed to load {os.path.basename(video_file)}: {e}")
        
        if not video_clips:
            raise ValueError("No valid video clips to merge")
        
        # 合并视频剪辑
        print(f"\n--- Merging {len(video_clips)} video clips ---")
        final_clip = concatenate_videoclips(video_clips, method="compose")
        
        # 创建输出目录（如果不存在）
        # output_dir already contains jobId, so we don't need to add it again
        output_path = os.path.join(args.output_dir, args.output_file)
        output_dir = os.path.dirname(output_path)
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            print(f"Created output directory: {output_dir}")
        
        # 写入合并后的视频文件
        print(f"\n--- Writing merged video ---")
        print(f"Output path: {output_path}")
        print(f"Resolution: {final_clip.size[0]}x{final_clip.size[1]}")
        print(f"Duration: {final_clip.duration:.2f}s")
        
        final_clip.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            fps=args.fps,
            ffmpeg_params=['-pix_fmt', 'yuv420p']
        )
        
        # 关闭所有视频剪辑
        for clip in video_clips:
            clip.close()
        final_clip.close()
        
        print(f"\n--- Success ---")
        print(f"Merged video saved to: {output_path}")
        print(f"Video size: {os.path.getsize(output_path) / (1024 * 1024):.2f} MB")
        
        # 返回合并后的视频URL（用于n8n工作流）
        print(f"\n--- Video URL ---")
        video_url = f"http://178.118.101.128:5678/webhook/serve-slide-video-webhook/slides-data/{job_id}/{args.output_file}"
        print(video_url)
        
    except Exception as e:
        print(f"\n--- Error ---")
        print(f"An error occurred during video merging: {e}")
        raise

if __name__ == "__main__":
    main()