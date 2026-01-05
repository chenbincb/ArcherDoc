# ArcherDoc 部署指南 (Systemd 版)

本文档将指导如何在 Ubuntu 服务器上部署 ArcherDoc，使用 Systemd 管理后端服务，Nginx 作为反向代理。

## 1. 解决当前问题
您遇到的 `permission denied` 错误是因为脚本没有执行权限。
虽然在使用 Systemd 时通常不需要手动运行此脚本，但如果需要运行，请执行：
```bash
chmod +x ./start.sh
```

## 2. 后端部署 (Systemd)

### 2.1 准备文件与环境
**您**是对的，生产环境运行**不需要**上传 `src` 源码目录，但需要上传以下文件到服务器 `/home/n8n/ArcherDoc/backend/`：

1.  **`dist/` 文件夹**: 包含编译后的 JS 代码。
2.  **`package.json`**: 用于安装运行依赖 (Express, Multer 等)。
3.  **`.env`**: 环境变量配置文件。
4.  *(可选) `jobs/` 和 `uploads/`*: 如果需保留已有数据。

上传后，在服务器执行：
```bash
cd /home/n8n/ArcherDoc/backend
# 仅安装生产环境依赖
npm install --production
```

> [!CAUTION]
> **不要运行 `npm run dev`**：该命令会尝试运行 `src` 下的 TypeScript 源码，导致 "Cannot find module" 错误。
> **请运行 `npm start`**：或者直接使用配置好的 Systemd 服务 (推荐)。


### 2.2 安装服务文件
我们将使用生成的 `archerdoc-backend.service` 文件。

1.  **复制服务文件**:
    ```bash
    sudo cp archerdoc-backend.service /etc/systemd/system/
    ```

2.  **重新加载 Systemd**:
    ```bash
    sudo systemctl daemon-reload
    ```

3.  **启动并开机自启**:
    ```bash
    sudo systemctl enable archerdoc-backend
    sudo systemctl start archerdoc-backend
    ```

4.  **检查状态**:
    ```bash
    sudo systemctl status archerdoc-backend
    ```

5.  **查看日志**:
    如果需要调试，可以使用：
    ```bash
    journalctl -u archerdoc-backend -f
    ```

## 3. 前端部署 (确认)
您提到前端已经配置好：
*   User: `n8n`
*   Working Directory: `/home/n8n/ArcherDoc/frontend`
*   Command: `npx serve -s dist -p 8080`

请确保前端服务正在运行：
```bash
# 假设您的前端服务名为 archerdoc-frontend (或者您自己命名的服务)
sudo systemctl status archerdoc-frontend
```
如果不确定服务名，可以查看 `/etc/systemd/system/` 下的文件。

## 4. Nginx 反向代理 (可选但推荐)
为了让外部通过统一的端口 (80) 访问，并解决跨域问题，建议配置 Nginx。
Nginx 监听 80 端口，将根路径 `/` 转发给前端 (8080)，将 `/webhook/` 等 API 路径转发给后端 (4567)。

1.  **安装 Nginx**:
    ```bash
    sudo apt update
    sudo apt install nginx
    ```

2.  **配置 Nginx**:
    参考项目根目录下的 `nginx.conf.example`。
    可以将配置复制到 `/etc/nginx/sites-available/archerdoc`，然后建立软链接到 `sites-enabled`。

    ```bash
    sudo nano /etc/nginx/sites-available/archerdoc
    # 粘贴 nginx.conf.example 的内容并修改 server_name (域名或 IP)
    
    sudo ln -s /etc/nginx/sites-available/archerdoc /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```


## 5. Python AI 服务部署 (Coqui TTS)

如果需要更快的语音合成速度和更高质量的效果，可以部署独立的 Python TTS 服务。

### 5.1 环境准备
*   **Python**: 3.10 或更高版本
*   **CUDA**: (可选) 如果有 NVIDIA 显卡，建议安装 CUDA 11.8+ 以支持 GPU 加速

### 5.2 安装依赖
上传 `backend/Coqui` 目录到服务器 `/home/n8n/ArcherDoc/backend/Coqui`。

```bash
cd /home/n8n/ArcherDoc/backend/Coqui

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 5.3 配置 Systemd 服务
创建一个新的服务文件 `/etc/systemd/system/archerdoc-tts.service`：

```ini
[Unit]
Description=ArcherDoc Coqui TTS Service
After=network.target

[Service]
Type=simple
User=n8n
WorkingDirectory=/home/n8n/ArcherDoc/backend/Coqui
Environment="PATH=/home/n8n/ArcherDoc/backend/Coqui/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="CUDA_VISIBLE_DEVICES=0"
ExecStart=/home/n8n/ArcherDoc/backend/Coqui/venv/bin/python tts_service.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 5.4 启动服务
```bash
sudo systemctl daemon-reload
sudo systemctl enable archerdoc-tts
sudo systemctl start archerdoc-tts
sudo systemctl status archerdoc-tts
```

默认端口为 **8001**。请确保防火墙允许该端口，或在 Node.js 后端配置正确的内网地址。
