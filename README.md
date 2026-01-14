# ArcherDoc AI (企业级智能文档处理平台)

ArcherDoc AI 是一个一站式智能文档处理解决方案，集成了 PPT 解析、AI 翻译、智能配图、视频生成、文章撰写等多种能力。前端采用现代 React 技术栈，后端基于 Node.js/Express 构建。

## ✨ 核心特性

*   **📝 智能翻译**: 支持保持原始排版的 PPT 文档多语言翻译。
*   **🎨 AI 配图**: 自动分析幻灯片内容，调用 ComfyUI 或 Google Gemini 生成精美配图。
*   **🎬 视频生成**: 将 PPT 转化为配音视频，支持 MiniMax、Coqui TTS 等多款语音模型。
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