# Coqui TTS 服务

高性能GPU加速的持久化TTS（文本转语音）服务，基于Coqui TTS和FastAPI构建。

## 🌟 特性

- **GPU加速**: 强制使用GPU，性能卓越
- **模型缓存**: 首次加载后，后续请求极速响应
- **持久化服务**: Systemd管理，7x24小时稳定运行
- **REST API**: 标准HTTP接口，易于集成
- **健康检查**: 完整的服务监控和状态检查
- **批量处理**: 支持多个音频文件的批量生成

## 📋 系统要求

- **硬件**: NVIDIA GPU（建议8GB+显存）
- **软件**:
  - Python 3.8+
  - CUDA 11.0+
  - PyTorch with CUDA support
- **系统**: Linux (推荐Ubuntu 20.04+)

## 🚀 快速部署

### 1. 准备环境

```bash
# 激活虚拟环境
source /home/n8n/AIStudio/venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 部署服务

```bash
# 进入服务目录
cd /home/n8n/AIStudio/Coqui

# 运行部署脚本
./deploy.sh
```

部署脚本会自动：
- 创建必要目录
- 安装Python依赖
- 配置Systemd服务
- 启动服务并测试

### 3. 验证部署

```bash
# 检查服务状态
sudo systemctl status tts-service

# 测试API
curl http://localhost:8001/health
```

## 📖 API文档

### 基础信息

- **服务地址**: `http://localhost:8001`
- **API文档**: `http://localhost:8001/docs`
- **健康检查**: `/health`
- **服务统计**: `/stats`

### 核心接口

#### 生成音频

```bash
POST /generate
Content-Type: application/json

{
    "text": "要转换的文本内容",
    "speaker_wav": "/path/to/speaker.wav",  // 可选
    "output_filename": "output.mp3"         // 可选
}
```

**响应示例**:
```json
{
    "success": true,
    "task_id": "uuid-string",
    "output_path": "/home/n8n/AIStudio/jobs/audio/output.mp3",
    "processing_time": 2.34
}
```

#### 健康检查

```bash
GET /health
```

**响应示例**:
```json
{
    "status": "healthy",
    "model_loaded": true,
    "gpu_available": true,
    "gpu_memory_used": 2.1
}
```

## 🔧 使用示例

### 1. 命令行测试

```bash
# 基础测试
curl -X POST "http://localhost:8001/generate" \
     -H "Content-Type: application/json" \
     -d '{
       "text": "这是一个测试文本",
       "output_filename": "test.mp3"
     }'

# 使用指定说话人
curl -X POST "http://localhost:8001/generate" \
     -H "Content-Type: application/json" \
     -d '{
       "text": "使用指定说话人的测试",
       "speaker_wav": "/home/n8n/AIStudio/default_speaker.wav",
       "output_filename": "custom_voice.mp3"
     }'
```

### 2. Python客户端

```python
import requests

# 生成音频
response = requests.post(
    "http://localhost:8001/generate",
    json={
        "text": "这是一个Python客户端测试",
        "output_filename": "python_test.mp3"
    }
)

if response.json()["success"]:
    print("音频生成成功!")
    print(f"输出文件: {response.json()['output_path']}")
```

### 3. 批量处理

```python
# 使用test_client.py进行批量测试
python test_client.py
```

## 🔧 服务管理

### Systemd命令

```bash
# 启动服务
sudo systemctl start tts-service

# 停止服务
sudo systemctl stop tts-service

# 重启服务
sudo systemctl restart tts-service

# 查看状态
sudo systemctl status tts-service

# 查看日志
sudo journalctl -u tts-service -f

# 开机自启
sudo systemctl enable tts-service

# 禁用自启
sudo systemctl disable tts-service
```

### 日志管理

```bash
# 实时查看日志
sudo journalctl -u tts-service -f

# 查看最近100行日志
sudo journalctl -u tts-service -n 100

# 查看错误日志
sudo tail -f /var/log/tts_service/error.log

# 查看访问日志
sudo tail -f /var/log/tts_service/access.log
```

## 📊 监控和调试

### 服务状态检查

```bash
# 健康检查
curl http://localhost:8001/health

# 获取详细统计
curl http://localhost:8001/stats

# 查看GPU状态
nvidia-smi
```

### 性能测试

```python
# 运行性能测试
python test_client.py
```

### 常见问题排查

1. **服务启动失败**
   ```bash
   # 查看详细错误
   sudo journalctl -u tts-service -n 50
   ```

2. **GPU内存不足**
   ```bash
   # 检查GPU使用情况
   nvidia-smi

   # 重启服务清理内存
   sudo systemctl restart tts-service
   ```

3. **模型加载失败**
   ```bash
   # 检查网络连接（首次需要下载模型）
   ping huggingface.co

   # 检查磁盘空间
   df -h ~/.local/share/tts/
   ```

## 🎯 性能优化

### GPU内存管理

- **模型缓存**: 服务启动后模型常驻GPU内存 (~2-3GB)
- **临时清理**: 每次推理后自动清理临时缓存
- **内存监控**: 通过`/stats`接口实时监控GPU使用

### 并发配置

- **单Worker**: 使用单个worker避免GPU内存冲突
- **连接限制**: 最大1000并发连接
- **超时设置**: 120秒请求超时

### 批量处理建议

1. **短文本**: 适合高并发处理
2. **长文本**: 自动分段处理，减少内存压力
3. **批量大小**: 建议10-50个请求为一批

## 🔒 安全配置

### 网络安全

- **绑定地址**: 默认`0.0.0.0`，可改为`127.0.0.1`限制本地访问
- **防火墙**: 建议配置防火墙规则限制访问端口

### Systemd安全

- **用户隔离**: 使用专用用户运行
- **文件系统**: 限制文件系统访问权限
- **资源限制**: 设置合理的资源使用限制

## 📁 目录结构

```
/home/n8n/AIStudio/Coqui/
├── tts_service.py          # 主服务文件
├── gunicorn_conf.py        # Gunicorn配置
├── test_client.py          # 测试客户端
├── deploy.sh              # 部署脚本
├── requirements.txt        # Python依赖
├── tts-service.service     # Systemd服务配置
└── README.md              # 使用文档

# 运行时目录
/home/n8n/AIStudio/jobs/audio/    # 音频输出目录
/var/log/tts_service/            # 日志目录
~/.local/share/tts/              # TTS模型缓存目录
```

## 🤝 集成示例

### n8n工作流集成

```javascript
// n8n HTTP Request节点配置
{
  "method": "POST",
  "url": "http://localhost:8001/generate",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "text": "{{$node.json.text}}",
    "speaker_wav": "/home/n8n/AIStudio/default_speaker.wav",
    "output_filename": "{{$node.json.filename}}"
  }
}
```

### Python应用集成

```python
import requests
import json

class CoquiTTSClient:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url

    def generate(self, text, speaker_wav=None, output_filename=None):
        response = requests.post(
            f"{self.base_url}/generate",
            json={
                "text": text,
                "speaker_wav": speaker_wav,
                "output_filename": output_filename
            }
        )
        return response.json()

# 使用示例
tts = CoquiTTSClient()
result = tts.generate("你好，世界", output_filename="hello.mp3")
```

## 📄 许可证

MIT License

## 🆘 技术支持

如遇问题，请提供以下信息：
1. 错误日志
2. 服务状态
3. GPU状态
4. 系统环境信息

---

**享受高质量的GPU加速TTS服务！** 🎉