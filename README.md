# ArcherDoc AI (企业级智能文档处理平台)

ArcherDoc AI 是一个一站式智能文档处理解决方案，集成了 PPT 解析、AI 翻译、智能配图、视频生成、文章撰写等多种能力。前端采用现代 React 技术栈，后端基于 Node.js/Express 构建。

## ✨ 核心特性

*   **📝 智能翻译**: 支持保持原始排版的 PPT 文档多语言翻译。
*   **🎨 AI 提示词工程**: 内置 32 种专业视觉框架与 7 种企业级主题（含手工剪贴簿风格），支持解耦内容分析与样式渲染。
*   **🖼️ 智能配图**: 自动解析内容并提取中文文字标签，支持三种图片生成引擎：
    - **ComfyUI** - 本地部署的 Stable Diffusion 工作流
    - **NanoBanana** - Google Gemini (Imagen 3) 云端生成
    - **GLM-Image** - 智谱 AI 图像生成，支持中文 Prompt
*   **🎬 视频生成**: 将 PPT 转化为配音视频，支持动态索引映射与主流 TTS 模型（MiniMax, Coqui, Qwen）。
*   **✍️ 文章创作**: 基于 PPT 内容，一键生成技术博客、营销文案或详细报告。
*   **🖥️ 多端支持**: 支持 Web 浏览器访问与 Windows/Mac 桌面客户端。

## 🏗 系统架构

项目采用前后端分离架构：

*   **Frontend**: `React 19` + `Vite` + `TypeScript` + `TailwindCSS`
*   **Backend**: `Node.js` + `Express` + `TypeScript`
*   **AI Services**: 标准化接口对接 Ollama, vLLM, ComfyUI, Google Gemini 等服务。

## 🚀 极速启动

### 前置要求
*   Node.js (v18+)
*   npm 或 yarn
*   FFmpeg (后端视频生成需要)

### 第一步：启动后端

打开一个终端窗口，进入 `backend` 目录：

```bash
cd backend
npm install
npm run dev
```
后端服务将在 `http://localhost:4567` 启动。

### 第二步：启动前端

打开另一个终端窗口，进入 `frontend` 目录：

```bash
cd frontend
npm install
# 复制环境配置
cp .env.example .env
npm run dev
```
前端页面将在 `http://localhost:3000` (或自动分配的端口) 启动。

## 📜 部署指南

### 自动部署（推荐）

项目提供了自动化部署脚本 `deploy.sh`：

1. **配置服务器信息**
   编辑 `deploy.sh` 文件，根据您的服务器信息修改以下参数：
   ```bash
   SERVER_USER="your_server_username"  # 服务器用户名
   SERVER_IP="your_server_ip"         # 服务器IP地址
   REMOTE_DIR="/path/to/your/project"  # 服务器项目路径
   ```

2. **配置SSH免密登录**（如果尚未配置）
   ```bash
   ssh-keygen -t rsa
   ssh-copy-id your_username@your_server_ip
   ```

3. **执行部署**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

**部署脚本功能：**
- 自动创建当前版本的备份（保留最近10个备份）
- 编译后端和前端代码
- 使用rsync增量上传，避免重复传输大量文件
- 排除node_modules、uploads、jobs等不需要上传的目录
- 部署完成后自动重启服务

### 手动部署

1. **克隆代码到服务器**
   ```bash
   git clone <repository-url>
   cd ArcherDoc
   ```

2. **安装依赖**
   ```bash
   # 后端
   cd backend
   npm install
   npm run build

   # 前端
   cd ../frontend
   npm install
   npm run build
   ```

3. **配置环境变量**
   根据您的服务器环境配置 `backend/.env` 文件

4. **启动服务**
   ```bash
   # 使用PM2或其他进程管理器启动后端
   cd backend
   pm2 start npm --name "archerdoc-backend" -- run start

   # 前端可通过nginx等web服务器部署dist目录
   ```

详细部署文档请参阅 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 📚 详细文档

*   [前端开发文档](frontend/README.md)
*   [后端开发文档](backend/README.md)

## 🤝 贡献与开发

项目采用 TypeScript 全栈开发，前后端共享核心类型定义。
*   **配置**: AI 服务地址配置在 `frontend/src/constants.ts`。
*   **类型**: 核心接口定义在 `frontend/src/types.ts` 和 `backend/src/types/index.ts` (已同步)。

---
Copyright © 2025 Archeros