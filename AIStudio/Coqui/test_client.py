#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Coqui TTS服务测试客户端
用于测试API接口功能
"""

import requests
import json
import time
import os
from typing import Optional

class TTSTestClient:
    """TTS服务测试客户端"""

    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()

    def health_check(self) -> bool:
        """健康检查"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                print("✅ 服务健康状态:")
                print(f"   状态: {data['status']}")
                print(f"   模型已加载: {data['model_loaded']}")
                print(f"   GPU可用: {data['gpu_available']}")
                if data['gpu_memory_used']:
                    print(f"   GPU内存使用: {data['gpu_memory_used']:.1f} GB")
                return True
            else:
                print(f"❌ 健康检查失败: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ 健康检查异常: {e}")
            return False

    def get_stats(self) -> bool:
        """获取服务统计信息"""
        try:
            response = self.session.get(f"{self.base_url}/stats")
            if response.status_code == 200:
                data = response.json()
                print("📊 服务统计信息:")
                print(f"   GPU名称: {data.get('gpu_name', 'N/A')}")
                print(f"   总内存: {data.get('total_memory_gb', 'N/A')} GB")
                print(f"   已分配: {data.get('allocated_memory_gb', 'N/A')} GB")
                print(f"   可用内存: {data.get('available_memory_gb', 'N/A')} GB")
                print(f"   模型已加载: {data.get('model_loaded', 'N/A')}")
                return True
            else:
                print(f"❌ 获取统计信息失败: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ 获取统计信息异常: {e}")
            return False

    def generate_audio(self, text: str, speaker_wav: Optional[str] = None,
                      output_filename: Optional[str] = None) -> bool:
        """生成音频"""
        print(f"🔊 正在生成音频: {text[:30]}...")

        payload = {"text": text}
        if speaker_wav:
            payload["speaker_wav"] = speaker_wav
        if output_filename:
            payload["output_filename"] = output_filename

        start_time = time.time()

        try:
            response = self.session.post(
                f"{self.base_url}/generate",
                json=payload,
                timeout=120
            )

            processing_time = time.time() - start_time

            if response.status_code == 200:
                data = response.json()
                if data["success"]:
                    print("✅ 音频生成成功!")
                    print(f"   任务ID: {data['task_id']}")
                    print(f"   输出路径: {data['output_path']}")
                    print(f"   处理时间: {data['processing_time']:.2f} 秒")

                    # 检查文件是否存在
                    if os.path.exists(data["output_path"]):
                        file_size = os.path.getsize(data["output_path"]) / 1024  # KB
                        print(f"   文件大小: {file_size:.1f} KB")

                    return True
                else:
                    print(f"❌ 音频生成失败: {data.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ API请求失败: {response.status_code}")
                print(f"   错误信息: {response.text}")
                return False

        except requests.Timeout:
            print("❌ 请求超时 (120秒)")
            return False
        except Exception as e:
            print(f"❌ 请求异常: {e}")
            return False

    def test_multiple_requests(self, texts: list) -> None:
        """测试多个请求"""
        print(f"🧪 测试 {len(texts)} 个音频生成请求...")
        print("=" * 60)

        success_count = 0
        total_time = 0

        for i, text in enumerate(texts, 1):
            print(f"\n📝 请求 {i}/{len(texts)}")
            output_filename = f"batch_test_{i}.mp3"

            success = self.generate_audio(
                text=text,
                speaker_wav="/home/n8n/AIStudio/default_speaker.wav",
                output_filename=output_filename
            )

            if success:
                success_count += 1

            # 短暂等待避免过于频繁的请求
            time.sleep(1)

        print("\n" + "=" * 60)
        print(f"📈 批量测试完成:")
        print(f"   成功: {success_count}/{len(texts)}")
        print(f"   成功率: {success_count/len(texts)*100:.1f}%")

def main():
    """主测试函数"""
    print("🚀 Coqui TTS 服务测试")
    print("=" * 50)

    # 创建测试客户端
    client = TTSTestClient()

    # 1. 健康检查
    print("\n1️⃣ 健康检查")
    if not client.health_check():
        print("❌ 服务不可用，请检查服务状态")
        return

    # 2. 获取统计信息
    print("\n2️⃣ 服务统计")
    client.get_stats()

    # 3. 单次音频生成测试
    print("\n3️⃣ 单次音频生成测试")
    test_text = "欢迎使用Coqui TTS服务，这是一个测试音频生成。"
    client.generate_audio(
        text=test_text,
        speaker_wav="/home/n8n/AIStudio/default_speaker.wav",
        output_filename="single_test.mp3"
    )

    # 4. 批量测试
    print("\n4️⃣ 批量音频生成测试")
    test_texts = [
        "这是第一个测试音频，用于验证服务的批量处理能力。",
        "Coqui TTS支持高质量的中文语音合成，效果非常自然。",
        "GPU加速使得音频生成速度大幅提升，适合生产环境使用。",
        "这个服务可以7x24小时稳定运行，提供持续可用的TTS能力。"
    ]
    client.test_multiple_requests(test_texts)

    print("\n🎉 测试完成!")
    print("📁 生成的音频文件位于: /home/n8n/AIStudio/jobs/audio/")

if __name__ == "__main__":
    main()