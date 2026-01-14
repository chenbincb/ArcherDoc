# ArcherDoc AI 部署指南 (Systemd + Serve)

本文档介绍基于 Systemd 的生产环境部署方案。此方案不依赖 Nginx，而是直接使用 `npx serve` 托管前端，并使用 `node` 运行后端。

## 📋 目录结构

假设项目部署在 `/home/n8n/ArcherDoc`：

```text
/home/n8n/ArcherDoc/
├── backend/    # 后端项目
├── frontend/   # 前端项目
└── www/        # (可选) 落地页或其他静态资源
```

## 🛠 环境准备

1.  **Node.js**: 确保安装了 Node.js (建议 v18+)。
2.  **FFmpeg**: 后端视频生成必需。
    ```bash
    sudo apt-get install ffmpeg
    ```

---

## 🖥 1. 后端部署 (Backend)

### 配置与编译
1.  进入后端目录：
    ```bash
    cd /home/n8n/ArcherDoc/backend
    ```
2.  安装依赖并编译：
    ```bash
    npm install
    npm run build
    ```
3.  配置环境变量：
    复制 `.env` 文件并填入必要的 Key。
    ```bash
    cp .env.example .env
    ```

### Systemd 服务配置
创建服务文件 `/etc/systemd/system/archerdoc_backend.service`：

```ini
[Unit]
Description=ArcherDoc API Server
After=network.target

[Service]
User=n8n
WorkingDirectory=/home/n8n/ArcherDoc/backend

# 启动命令
ExecStart=/usr/bin/node dist/server.js

# 重启策略
Restart=always
RestartSec=10

# 环境变量
Environment=NODE_ENV=production
Environment=PORT=4567
# 如果需要更多变量，可在此追加或使用 EnvironmentFile

[Install]
WantedBy=multi-user.target
```

---

## 🌐 2. 前端部署 (Frontend)

### 配置与编译
1.  进入前端目录：
    ```bash
    cd /home/n8n/ArcherDoc/frontend
    ```
2.  **关键步骤**：设置后端 API 地址。
    由于不使用 Nginx 反向代理，前端必须知道后端的完整地址。
    编辑 `.env` 文件：
    ```properties
    # 替换为您的服务器实际 IP 或域名 + 端口 4567
    VITE_API_BASE_URL=http://<您的服务器IP>:4567
    ```
3.  安装依赖并编译：
    ```bash
    npm install
    npm run build
    ```
    *注意：Vite 在构建时会将 VITE_API_BASE_URL 注入到代码中。如果 IP 变更，需要重新运行 `npm run build`。*

### Systemd 服务配置
创建服务文件 `/etc/systemd/system/archerdoc.service`：

```ini
[Unit]
Description=ArcherDoc Web Server
After=network.target

[Service]
User=n8n
WorkingDirectory=/home/n8n/ArcherDoc/frontend

# 启动命令 (使用 serve 托管 dist 目录，端口 8080)
# -s: 单页应用模式 (SPA)
ExecStart=/usr/bin/npx serve -s dist -p 8080

# 重启策略
Restart=always
RestartSec=10

Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

---

## 🚀 服务管理

### 启动服务
```bash
# 重载配置
sudo systemctl daemon-reload

# 启动后端
sudo systemctl start archerdoc_backend
sudo systemctl enable archerdoc_backend

# 启动前端
sudo systemctl start archerdoc
sudo systemctl enable archerdoc
```

### 状态检查
```bash
# 查看所有服务状态
systemctl list-units --type=service --state=running | grep archerdoc

# 查看具体日志
journalctl -u archerdoc_backend -f
journalctl -u archerdoc -f
```

### 更新发布
当代码有更新时：
1.  拉取最新代码 (`git pull`)。
2.  后端：`npm install && npm run build` -> `sudo systemctl restart archerdoc_backend`。
3.  前端：`npm install && npm run build` -> `sudo systemctl restart archerdoc`。

## ⚡️ 3. 一键自动化部署 (可选)

为了简化每次手动编译、复制文件和重启服务的繁琐过程，我们提供了 `deploy.sh` 脚本。

### 功能特性
此脚本会自动执行以下流程：
1.  **自动备份**: 在部署前通过 SSH 登录服务器，将现有的 `backend` 和 `frontend` 目录打包备份到 `backups/` 目录（以时间戳命名）。
2.  **本地构建**: 在本地机器上执行 `npm run build`。
3.  **增量上传**: 使用 `rsync` 高效上传 `dist` 目录。
4.  **自动重启**: 调用 `systemctl restart` 重启服务。

### 使用方法

1.  打开项目根目录下的 `deploy.sh`，确认以下配置：
    ```bash
    SERVER_USER="n8n"
    SERVER_IP="178.104.163.8"  # 您的服务器IP
    REMOTE_DIR="/home/n8n/ArcherDoc"
    ```
2.  在终端直接运行：
    ```bash
    chmod +x deploy.sh
    ./deploy.sh
    ```

3.  脚本运行成功后，服务即已更新完毕。

