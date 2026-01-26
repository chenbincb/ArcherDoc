# ArcherDoc AI - Backend

ArcherDoc AI 后端服务，负责处理复杂的文档解析、AI 内容生成、视频合成与文件转换任务。

## 🛠 技术栈

- **运行时**: Node.js (建议 v18+)
- **框架**: Express.js
- **语言**: TypeScript
- **AI SDK**: Google Generative AI (Gemini), Ollama/vLLM (OpenAI Compatible)
- **文档处理**: Mammoth (DOCX), PPTX处理
- **多媒体**: FFmpeg (视频合成), Sharp (图片处理)

## 📂 目录结构

```text
backend/
├── jobs/                # 任务临时文件存储 (自动生成)
├── src/
│   ├── constants/       # 视觉框架 (32种) 与 主题 (7种) 常量定义
│   ├── routes/          # 路由控制器
│   │   ├── doc.ts       # DOCX 文档生成
│   │   ├── image.ts     # 图片生成 
│   │   ├── video.ts     # 视频生成 (支持索引容错)
│   │   ├── article.ts   # 文章生成
│   │   └── ...
│   ├── services/        # 业务逻辑层 (AIService, VideoService...)
│   ├── types/           # 类型定义
│   ├── utils/           # 工具函数
│   ├── app.ts           # Express 应用配置
│   └── server.ts        # 服务入口
└── package.json
```

## 🚀 快速开始

### 1. 安装依赖

在 `backend` 目录下运行：
```bash
npm install
```

### 2. 配置环境变量

后端依赖 `.env` 文件来获取 API Key 和 端口配置。请参考以下内容创建 `.env`：

```properties
PORT=4567
# AI 服务配置 (部分可选，视具体业务逻辑而定)
GEMINI_API_KEY=your_gemini_key
MINIMAX_GROUP_ID=...
MINIMAX_ACCESS_TOKEN=...
```

### 3. 启动开发服务器

```bash
npm run dev
```
服务默认运行在 `http://localhost:4567`。

### 4. 生产环境运行

编译 TS 代码：
```bash
npm run build
```
启动编译后的代码：
```bash
npm start
```

## 🔌 API 概览

所有 API 均以 `/webhook/api` 为前缀 (为兼容现有 N8N 调用习惯)。

| 模块 | 方法 | 路径 | 描述 |
|------|------|------|------|
| **文档** | POST | `/generate-docx` | 生成 Word 文档 |
| **图像** | POST | `/analyze-slide-for-image` | 分析幻灯片生成 Prompt |
| **图像** | POST | `/generate-images` | 调用 ComfyUI/Gemini 生成图片 |
| **视频** | POST | `/generate-video` | 生成单页或全量视频 |
| **文章** | POST | `/generate-article` | 生成文章 |
| **文章** | POST | `/regenerate-article` | 文章润色与重写 |

## 📦 依赖说明

*   **FFmpeg**: 视频生成功能依赖系统安装的 `ffmpeg`。请确保服务器已安装并加入了 PATH。
*   **LibreOffice** (可选): 部分文档转换功能可能依赖。
*   **Poppler-utils** (可选): PDF 处理依赖。
