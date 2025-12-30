#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
统一音频生成脚本
合并原有的音频生成功能，支持MiniMax云端、Qwen云端和Coqui本地API服务

📋 服务模式：
  - MiniMax API: 云端语音合成服务
  - Qwen API: 阿里云语音合成服务
  - Coqui API: 本地GPU加速TTS服务 (http://localhost:8001)

🚀 Coqui TTS服务要求：
  1. Coqui TTS API服务必须运行在 http://localhost:8001
  2. 支持GPU加速，首次调用会触发模型加载
  3. 模型加载后，后续调用响应时间仅需几秒

使用说明：
  批量模式：
  python generate_audio.py --mode batch --notes-file notes.json --audio-dir audio/ --service minimax --group-id xxx --access-token yyy

  单个模式（从notes.json读取）：
  python generate_audio.py --mode single --notes-file notes.json --audio-dir audio/ --slide-id 0 --service minimax --group-id xxx --access-token yyy

  单个模式（直接传递文本）：
  python generate_audio.py --mode single --audio-dir audio/ --slide-id 0 --note-text "要转换的文本" --service minimax --group-id xxx --access-token yyy

  Coqui TTS API调用：
  python generate_audio.py --mode single --audio-dir audio/ --slide-id 0 --note-text "要转换的文本" --service coqui --speaker-wav /path/to/speaker.wav

  Qwen API调用：
  python generate_audio.py --mode single --audio-dir audio/ --slide-id 0 --note-text "要转换的文本" --service qwen --api-key xxx

🔧 Coqui TTS服务管理：
  # 检查服务状态
  curl http://localhost:8001/health

  # 重启服务
  sudo systemctl restart tts-service

  # 查看日志
  sudo journalctl -u tts-service -f
"""

import os
import sys
import json
import time
import argparse
import logging
import requests
import warnings
from typing import Dict, Any, List, Optional

# 隐藏FutureWarning，这些是由于库版本不匹配造成的警告，不影响功能
warnings.filterwarnings("ignore", category=FutureWarning)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AudioGenerator:
    """音频生成器"""

    def __init__(self, service_type: str = "minimax"):
        self.service_type = service_type

    
    def generate_minimax_audio(self, text: str, output_path: str, group_id: str, access_token: str, voice_id: str) -> bool:
        """使用MiniMax API生成音频"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }

            api_url = f"https://api.minimaxi.com/v1/t2a_v2?GroupId={group_id}"

            payload = {
                "text": text,
                "model": "speech-2.6-hd",
                "voice_setting": {
                    "voice_id": voice_id or "Chinese (Mandarin)_News_Anchor"
                }
            }

            logger.info(f"Calling MiniMax API for text: {text[:50]}...")
            logger.debug(f"API URL: {api_url}")
            logger.debug(f"Payload: {payload}")

            response = requests.post(api_url, headers=headers, json=payload, timeout=120)
            response.raise_for_status()

            result = response.json()
            logger.debug(f"API Response: {result}")

            # 检查API响应状态
            if result.get("base_resp", {}).get("status_code") == 0:
                # 从data字段获取音频数据
                data = result.get("data", {})
                if "audio" in data:
                    audio_data = data["audio"]

                    # 确保输出目录存在
                    os.makedirs(os.path.dirname(output_path), exist_ok=True)

                    # 解码十六进制音频数据并保存
                    audio_bytes = bytes.fromhex(audio_data)

                    with open(output_path, 'wb') as f:
                        f.write(audio_bytes)

                    logger.info(f"Audio saved to: {output_path}")
                    return True
                else:
                    logger.error(f"No audio in data field: {result}")
                    return False
            else:
                # 处理API错误
                error_code = result.get("base_resp", {}).get("status_code", "Unknown")
                error_msg = result.get("base_resp", {}).get("status_msg", "Unknown error")
                logger.error(f"MiniMax API error: Code {error_code} - {error_msg}")
                return False

        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP error generating MiniMax audio: {e}")
            return False
        except Exception as e:
            logger.error(f"Error generating MiniMax audio: {e}")
            return False

    def generate_coqui_audio(self, text: str, output_path: str, speaker_wav: str = None) -> bool:
        """使用Coqui TTS API服务生成音频"""
        try:
            import requests
            import json
            import time
            import os

            # 检查TTS服务是否可用
            logger.info("Checking Coqui TTS service availability...")
            try:
                health_response = requests.get("http://localhost:8001/health", timeout=10)
                if health_response.status_code != 200:
                    logger.error("Coqui TTS service is not responding")
                    return False

                health_data = health_response.json()
                if not health_data.get("model_loaded", False):
                    logger.warning("TTS model not loaded, first request may take longer")
                logger.info(f"TTS service status: {health_data.get('status', 'unknown')}")

            except requests.exceptions.RequestException as e:
                logger.error(f"Cannot connect to Coqui TTS service: {e}")
                logger.error("Please ensure the TTS service is running: http://localhost:8001")
                return False

            # 准备API请求
            api_url = "http://localhost:8001/generate"

            # 直接传递完整路径
            payload = {
                "text": text,
                "output_path": output_path
            }

            # 如果有说话人文件，添加到请求中
            if speaker_wav and os.path.exists(speaker_wav):
                payload["speaker_wav"] = speaker_wav
                logger.info(f"Using speaker voice: {speaker_wav}")
            else:
                logger.info("Using default voice (no speaker file provided)")

            logger.info(f"Generating audio via TTS service for text: {text[:50]}...")

            # 调用TTS API
            start_time = time.time()

            try:
                response = requests.post(
                    api_url,
                    json=payload,
                    timeout=180  # 3分钟超时，考虑模型加载时间
                )
            except requests.exceptions.Timeout:
                logger.error("TTS service request timed out (180s)")
                return False
            except requests.exceptions.RequestException as e:
                logger.error(f"Network error calling TTS service: {e}")
                return False

            processing_time = time.time() - start_time

            # 检查响应
            if response.status_code == 200:
                try:
                    result = response.json()

                    if result.get("success", False):
                        logger.info(f"✅ TTS service generated audio successfully")
                        logger.info(f"📊 Processing time: {processing_time:.2f}s")
                        logger.info(f"📝 Task ID: {result.get('task_id', 'unknown')}")

                        # 检查输出文件是否存在
                        api_output_path = result.get("output_path")
                        if api_output_path and os.path.exists(api_output_path):
                            # 获取文件大小
                            file_size = os.path.getsize(api_output_path) / 1024  # KB
                            logger.info(f"📄 Audio file size: {file_size:.1f} KB")
                            logger.info(f"💾 Audio saved to: {api_output_path}")

                            return True
                        else:
                            logger.error(f"TTS service reported success but output file not found")
                            logger.error(f"Expected path: {output_path}")
                            logger.error(f"API returned path: {api_output_path}")
                            return False
                    else:
                        error_msg = result.get("error", "Unknown error")
                        logger.error(f"TTS service failed: {error_msg}")
                        return False

                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse TTS service response: {e}")
                    logger.error(f"Response content: {response.text[:200]}...")
                    return False

            else:
                logger.error(f"TTS service returned HTTP {response.status_code}")
                logger.error(f"Response: {response.text[:200]}...")
                return False

        except Exception as e:
            logger.error(f"Error calling Coqui TTS service: {e}")
            return False

    def generate_qwen_audio(self, text: str, output_path: str, api_key: str,
                           model: str = "qwen-tts", voice_id: str = "Chelsie") -> bool:
        """使用阿里云Qwen TTS生成音频"""
        try:
            # 尝试导入DashScope SDK
            try:
                import dashscope
            except ImportError:
                logger.error("DashScope SDK not installed. Please install with: pip install dashscope")
                return False

            # 设置API Key
            dashscope.api_key = api_key

            logger.info(f"Calling Qwen TTS API for text: {text[:50]}...")
            logger.debug(f"Model: {model}, Voice: {voice_id}")

            # 调用Qwen TTS API
            response = dashscope.audio.qwen_tts.SpeechSynthesizer.call(
                model=model,
                text=text,
                voice=voice_id
            )

            # 检查API调用状态
            if response.status_code == 200:
                # 获取音频URL
                audio_url = response.output.audio["url"]
                logger.info(f"Qwen TTS audio URL: {audio_url}")

                # 下载音频文件
                audio_response = requests.get(audio_url, timeout=120)
                audio_response.raise_for_status()

                # 确保输出目录存在
                os.makedirs(os.path.dirname(output_path), exist_ok=True)

                # 保存音频文件
                with open(output_path, 'wb') as f:
                    f.write(audio_response.content)

                logger.info(f"Qwen TTS audio saved to: {output_path}")
                return True
            else:
                logger.error(f"Qwen TTS API error: Status {response.status_code}")
                logger.error(f"Response: {response}")
                return False

        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP error downloading Qwen TTS audio: {e}")
            return False
        except Exception as e:
            logger.error(f"Error generating Qwen TTS audio: {e}")
            return False

    def generate_batch_audio(self, notes_file: str, audio_dir: str, **kwargs) -> bool:
        """批量生成音频"""
        try:
            with open(notes_file, 'r', encoding='utf-8') as f:
                notes_data = json.load(f)

            if not notes_data or 'notes' not in notes_data:
                logger.error("Invalid notes file format")
                return False

            notes = notes_data['notes']
            success_count = 0

            for note_item in notes:
                slide_number = note_item.get('slide', 0)
                text = note_item.get('note', '')

                if not text.strip():
                    logger.warning(f"Empty text for slide {slide_number}, skipping")
                    continue

                output_filename = f"slide_{slide_number}.mp3"
                output_path = os.path.join(audio_dir, output_filename)

                logger.info(f"Generating audio for slide {slide_number}")

                if self.service_type.lower() == "minimax":
                    success = self.generate_minimax_audio(
                        text, output_path,
                        kwargs.get('group_id', ''),
                        kwargs.get('access_token', ''),
                        kwargs.get('voice_id', 'Chinese (Mandarin)_News_Anchor')
                    )
                elif self.service_type.lower() == "coqui":
                    success = self.generate_coqui_audio(
                        text, output_path,
                        kwargs.get('speaker_wav')
                    )
                elif self.service_type.lower() == "qwen":
                    success = self.generate_qwen_audio(
                        text, output_path,
                        kwargs.get('api_key', ''),
                        kwargs.get('qwen_model', 'qwen-tts'),
                        kwargs.get('qwen_voice_id', 'Chelsie')
                    )
                else:
                    logger.error(f"Unsupported service: {self.service_type}")
                    continue

                if success:
                    success_count += 1
                    # 添加延迟避免API限制
                    time.sleep(1)
                else:
                    logger.error(f"Failed to generate audio for slide {slide_number}")

            logger.info(f"Batch generation completed: {success_count}/{len(notes)} successful")
            return success_count > 0

        except Exception as e:
            logger.error(f"Error in batch generation: {e}")
            return False

    def generate_single_audio(self, notes_file: str, audio_dir: str, slide_id: int, note_text: str = None, **kwargs) -> bool:
        """生成单个音频"""
        try:
            # 如果直接传递了note_text，则使用它；否则从notes.json文件读取
            if note_text:
                text = note_text
                logger.info(f"Using provided note_text directly")
            else:
                with open(notes_file, 'r', encoding='utf-8') as f:
                    notes_data = json.load(f)

                if not notes_data or 'notes' not in notes_data:
                    logger.error("Invalid notes file format")
                    return False

                notes = notes_data['notes']

                # 查找指定slide的内容
                target_note = None
                for note_item in notes:
                    if note_item.get('slide') == slide_id:
                        target_note = note_item
                        break

                if not target_note:
                    logger.error(f"No notes found for slide {slide_id}")
                    return False

                text = target_note.get('note', '')
                logger.info(f"Using note from notes.json file for slide {slide_id}")

            if not text.strip():
                logger.error(f"Empty text for slide {slide_id}")
                return False

            output_filename = f"slide_{slide_id}.mp3"
            output_path = os.path.join(audio_dir, output_filename)

            logger.info(f"Generating single audio for slide {slide_id}")

            if self.service_type.lower() == "minimax":
                success = self.generate_minimax_audio(
                    text, output_path,
                    kwargs.get('group_id', ''),
                    kwargs.get('access_token', ''),
                    kwargs.get('voice_id', 'Chinese (Mandarin)_News_Anchor')
                )
            elif self.service_type.lower() == "coqui":
                success = self.generate_coqui_audio(
                    text, output_path,
                    kwargs.get('speaker_wav')
                )
            elif self.service_type.lower() == "qwen":
                success = self.generate_qwen_audio(
                    text, output_path,
                    kwargs.get('api_key', ''),
                    kwargs.get('qwen_model', 'qwen-tts'),
                    kwargs.get('qwen_voice_id', 'Chelsie')
                )
            else:
                logger.error(f"Unsupported service: {self.service_type}")
                return False

            return success

        except Exception as e:
            logger.error(f"Error in single generation: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description='Generate audio files')
    parser.add_argument('--mode', required=True, choices=['batch', 'single'], help='Generation mode')
    parser.add_argument('--notes-file', required=False, help='Path to notes.json file (required for batch mode, optional for single mode)')
    parser.add_argument('--audio-dir', required=True, help='Directory to save audio files')
    parser.add_argument('--service', default='minimax', choices=['minimax', 'coqui', 'qwen'], help='TTS service to use')
    parser.add_argument('--slide-id', type=int, help='Slide ID (for single mode)')
    parser.add_argument('--note-text', help='Note text directly (for single mode, alternative to notes.json)')

    # MiniMax参数
    parser.add_argument('--group-id', help='MiniMax Group ID')
    parser.add_argument('--access-token', help='MiniMax Access Token')
    parser.add_argument('--voice-id', default='Chinese (Mandarin)_News_Anchor', help='MiniMax Voice ID')

    # Coqui参数
    parser.add_argument('--speaker-wav', help='Speaker wav file for Coqui TTS')

    # Qwen TTS参数
    parser.add_argument('--api-key', help='Qwen TTS API Key')
    parser.add_argument('--qwen-model', default='qwen-tts', help='Qwen TTS model name')
    parser.add_argument('--qwen-voice-id', default='Chelsie', help='Qwen TTS voice ID')

    args = parser.parse_args()

    # 参数验证
    if args.mode == 'batch':
        if not args.notes_file:
            logger.error("Notes file is required for batch mode")
            sys.exit(1)
        if not os.path.exists(args.notes_file):
            logger.error(f"Notes file not found: {args.notes_file}")
            sys.exit(1)
    else:  # single
        if args.slide_id is None:
            logger.error("Slide ID is required for single mode")
            sys.exit(1)
        if not args.note_text and not args.notes_file:
            logger.error("Either --note-text or --notes-file is required for single mode")
            sys.exit(1)
        if args.notes_file and not os.path.exists(args.notes_file):
            logger.error(f"Notes file not found: {args.notes_file}")
            sys.exit(1)

    # 确保输出目录存在
    os.makedirs(args.audio_dir, exist_ok=True)

    # 生成音频
    generator = AudioGenerator(service_type=args.service)

    if args.mode == 'batch':
        success = generator.generate_batch_audio(
            args.notes_file, args.audio_dir,
            group_id=args.group_id,
            access_token=args.access_token,
            voice_id=args.voice_id,
            speaker_wav=args.speaker_wav,
            api_key=args.api_key,
            qwen_model=args.qwen_model,
            qwen_voice_id=args.qwen_voice_id
        )
    else:  # single
        success = generator.generate_single_audio(
            args.notes_file, args.audio_dir, args.slide_id, args.note_text,
            group_id=args.group_id,
            access_token=args.access_token,
            voice_id=args.voice_id,
            speaker_wav=args.speaker_wav,
            api_key=args.api_key,
            qwen_model=args.qwen_model,
            qwen_voice_id=args.qwen_voice_id
        )

    if success:
        logger.info("Audio generation completed successfully!")
        sys.exit(0)
    else:
        logger.error("Audio generation failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()