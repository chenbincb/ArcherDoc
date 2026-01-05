#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Coqui TTS Service
持久化GPU加速音频生成服务
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import torch
import os
import time
import logging
import uuid
from typing import Optional

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Coqui TTS Service",
    description="高性能GPU加速TTS服务",
    version="1.0.0"
)

class AudioRequest(BaseModel):
    text: str
    speaker_wav: Optional[str] = None
    output_filename: Optional[str] = None

class AudioResponse(BaseModel):
    success: bool
    task_id: str
    output_path: str = None
    processing_time: float = None
    error: str = None

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    gpu_available: bool
    gpu_memory_used: float = None

# 全局TTS服务实例（单例，模型常驻）
tts_generator = None

class TTSGenerator:
    """TTS生成器，封装模型加载和音频生成"""

    def __init__(self, service_type: str = "coqui"):
        self.service_type = service_type
        # 类级别的静态缓存，所有实例共享
        self._coqui_model = None
        self._coqui_device = None

    def _load_coqui_model(self, device: str = "cuda"):
        """加载Coqui TTS模型（带缓存）"""
        # 如果模型已加载且在正确的设备上，直接返回
        if self._coqui_model is not None and self._coqui_device == device:
            logger.info("✅ Coqui TTS model already loaded (cached) - skipping loading")
            return self._coqui_model

        try:
            # 尝试导入Coqui TTS
            try:
                from TTS.api import TTS
            except ImportError:
                logger.error("Coqui TTS not installed. Please install with: pip install TTS")
                return None

            # 修复 PyTorch 2.6+ 的 weights_only 安全问题
            import torch.serialization
            from TTS.tts.configs.xtts_config import XttsConfig
            from TTS.tts.models.xtts import Xtts, XttsAudioConfig, XttsArgs
            from TTS.config.shared_configs import BaseDatasetConfig
            from TTS.tts.configs.shared_configs import BaseTTSConfig
            torch.serialization.add_safe_globals([
                XttsConfig, Xtts, XttsAudioConfig, BaseDatasetConfig, XttsArgs, BaseTTSConfig
            ])

            # 首次加载模型
            logger.info("🚀 Loading Coqui TTS model on GPU (first time only)...")
            import time
            start_time = time.time()

            self._coqui_model = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2").to(device)
            self._coqui_device = device

            load_time = time.time() - start_time
            logger.info(f"✅ Coqui TTS model loaded successfully in {load_time:.1f}s (cached for future use)")

            return self._coqui_model

        except Exception as e:
            logger.error(f"❌ Error loading Coqui TTS model: {e}")
            return None

    def generate_coqui_audio(self, text: str, output_path: str, speaker_wav: str = None) -> bool:
        """使用Coqui TTS生成音频（本地）"""
        try:
            # 首先检查GPU可用性
            try:
                import torch
                if not torch.cuda.is_available():
                    logger.error("CUDA GPU not available. Coqui TTS requires GPU acceleration.")
                    logger.error("Please ensure:")
                    logger.error("1. NVIDIA GPU is installed")
                    logger.error("2. CUDA drivers are installed")
                    logger.error("3. PyTorch with CUDA support is installed")
                    return False

                # 检查GPU数量和内存
                device_count = torch.cuda.device_count()
                current_device = torch.cuda.current_device()
                gpu_name = torch.cuda.get_device_name(current_device)
                total_memory = torch.cuda.get_device_properties(current_device).total_memory / 1024**3  # GB
                allocated_memory = torch.cuda.memory_allocated(current_device) / 1024**3  # GB
                available_memory = total_memory - allocated_memory

                logger.info(f"Using CUDA GPU: {gpu_name}")
                logger.info(f"Total GPU Memory: {total_memory:.1f} GB")
                logger.info(f"Allocated Memory: {allocated_memory:.1f} GB")
                logger.info(f"Available Memory: {available_memory:.1f} GB")
                logger.info(f"Available GPUs: {device_count}")

                # 检查是否有足够的内存用于XTTS
                if available_memory < 3.0:  # XTTS约需要2-3GB
                    logger.warning(f"⚠️  Low GPU memory available: {available_memory:.1f} GB")
                    logger.warning("XTTS requires ~2-3GB. Model may not cache properly.")
                    logger.warning("Consider stopping other GPU processes for better performance.")

                # 设置GPU设备
                device = "cuda"

            except ImportError:
                logger.error("PyTorch not installed. Please install with: pip install torch")
                return False

            # 使用缓存的模型加载
            tts = self._load_coqui_model(device)
            if tts is None:
                logger.error("Failed to load Coqui TTS model")
                return False

            # 设置说话人声音文件
            speaker_wav_path = speaker_wav or "/home/n8n/AIStudio/default_speaker.wav"

            if os.path.exists(speaker_wav_path):
                logger.info(f"Using speaker voice: {speaker_wav_path}")
                logger.info(f"Generating audio on GPU for text: {text[:50]}...")

                # 在GPU上执行TTS推理
                with torch.cuda.device(device):
                    # 清理GPU内存缓存
                    torch.cuda.empty_cache()

                    tts.tts_to_file(
                        text=text,
                        speaker_wav=speaker_wav_path,
                        file_path=output_path,
                        language="zh"
                    )

                    logger.info(f"GPU memory used after TTS: {torch.cuda.memory_allocated(device) / 1024**2:.1f} MB")

                    # 推理完成后只清理临时缓存，保留模型
                    torch.cuda.empty_cache()
                    logger.info("Temporary GPU memory cleaned up, model kept cached")
            else:
                # 如果没有说话人文件，使用默认语音
                logger.info("Using default voice")
                logger.info(f"Generating audio on GPU for text: {text[:50]}...")

                # 在GPU上执行TTS推理
                with torch.cuda.device(device):
                    # 清理GPU内存缓存
                    torch.cuda.empty_cache()

                    tts.tts_to_file(
                        text=text,
                        file_path=output_path,
                        language="zh"
                    )

                    logger.info(f"GPU memory used after TTS: {torch.cuda.memory_allocated(device) / 1024**2:.1f} MB")

                    # 推理完成后只清理临时缓存，保留模型
                    torch.cuda.empty_cache()
                    logger.info("Temporary GPU memory cleaned up, model kept cached")

            logger.info(f"Audio saved to: {output_path}")

            # 保持模型在GPU上缓存，只清理临时内存
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    logger.info("Temporary memory cleanup completed, model kept cached")
            except:
                pass

            return True

        except Exception as e:
            logger.error(f"Error generating Coqui audio: {e}")

            # 提供更详细的GPU相关错误信息
            try:
                import torch
                if torch.cuda.is_available():
                    logger.error(f"GPU is available but TTS failed. GPU info:")
                    logger.error(f"  Device: {torch.cuda.current_device()}")
                    logger.error(f"  Name: {torch.cuda.get_device_name()}")
                    logger.error(f"  Memory allocated: {torch.cuda.memory_allocated() / 1024**2:.1f} MB")
                    logger.error(f"  Memory cached: {torch.cuda.memory_reserved() / 1024**2:.1f} MB")

                    # 尝试清理GPU内存
                    torch.cuda.empty_cache()
                    logger.error("Attempted to clear GPU memory cache")
                else:
                    logger.error("GPU is not available in the exception handler")
            except ImportError:
                logger.error("PyTorch not available for GPU diagnostics")

            return False

@app.on_event("startup")
async def startup_event():
    """服务启动时初始化模型"""
    global tts_generator
    logger.info("🚀 Starting Coqui TTS Service...")
    try:
        tts_generator = TTSGenerator(service_type="coqui")
        logger.info("✅ TTS Service ready!")
    except Exception as e:
        logger.error(f"❌ Failed to initialize TTS service: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """服务关闭时清理资源"""
    global tts_generator
    logger.info("🛑 Shutting down TTS Service...")
    # 清理GPU内存
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except:
        pass
    tts_generator = None
    logger.info("✅ TTS Service shutdown complete")

@app.post("/generate")
async def generate_audio(request: AudioRequest):
    """生成音频API"""
    global tts_generator

    if not tts_generator:
        raise HTTPException(status_code=503, detail="TTS service not ready")

    task_id = str(uuid.uuid4())
    start_time = time.time()

    try:
        # 生成音频到内存缓冲区
        import io
        from fastapi.responses import StreamingResponse
        
        # 临时文件路径 (TTS 库可能需要文件路径)
        # 如果 TTS 库支持直接写入 buffer 最好，如果不支持，可能需要先写临时文件再读取
        # Coqui TTS tts_to_file 确实需要文件路径
        
        temp_path = f"/tmp/{task_id}.wav"
        
        # 生成音频
        success = tts_generator.generate_coqui_audio(
            text=request.text,
            output_path=temp_path,
            speaker_wav=request.speaker_wav
        )

        processing_time = time.time() - start_time

        if success and os.path.exists(temp_path):
            # 读取音频数据
            with open(temp_path, "rb") as f:
                audio_data = f.read()
            
            # 清理临时文件
            os.remove(temp_path)
            
            # 返回音频流
            return StreamingResponse(
                io.BytesIO(audio_data), 
                media_type="audio/wav",
                headers={
                    "X-Task-ID": task_id,
                    "X-Processing-Time": str(processing_time)
                }
            )
        else:
            return AudioResponse(
                success=False,
                task_id=task_id,
                error="Audio generation failed"
            )

    except Exception as e:
        logger.error(f"Audio generation error: {e}")
        return AudioResponse(
            success=False,
            task_id=task_id,
            error=str(e),
            processing_time=time.time() - start_time
        )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查"""
    try:
        import torch

        gpu_available = torch.cuda.is_available()
        model_loaded = tts_generator is not None and tts_generator._coqui_model is not None

        gpu_memory_used = None
        if gpu_available:
            gpu_memory_used = torch.cuda.memory_allocated(0) / 1024**3  # GB

        return HealthResponse(
            status="healthy",
            model_loaded=model_loaded,
            gpu_available=gpu_available,
            gpu_memory_used=gpu_memory_used
        )

    except Exception as e:
        logger.error(f"Health check error: {e}")
        return HealthResponse(
            status="unhealthy",
            model_loaded=False,
            gpu_available=False
        )

@app.get("/stats")
async def get_stats():
    """获取服务统计信息"""
    try:
        import torch
        if torch.cuda.is_available():
            total_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            allocated_memory = torch.cuda.memory_allocated(0) / 1024**3
            available_memory = total_memory - allocated_memory

            return {
                "gpu_name": torch.cuda.get_device_name(0),
                "total_memory_gb": round(total_memory, 2),
                "allocated_memory_gb": round(allocated_memory, 2),
                "available_memory_gb": round(available_memory, 2),
                "model_loaded": tts_generator is not None and tts_generator._coqui_model is not None
            }
        else:
            return {"error": "GPU not available"}

    except Exception as e:
        return {"error": str(e)}

@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "Coqui TTS Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "generate": "/generate - POST",
            "health": "/health - GET",
            "stats": "/stats - GET"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, workers=1)