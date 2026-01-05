# ArcherDoc AI - 企业级智能文档处理平台

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![React](https://img.shields.io/badge/React-19.2.0-61dafb.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg) ![Vite](https://img.shields.io/badge/Vite-6.2.0-646cff.svg) ![PWA](https://img.shields.io/badge/PWA-Ready-5a0fc3.svg)

**ArcherDoc AI** 是一款功能强大的企业级智能文档处理工具，集翻译、视频生成、文章创作与AI配图于一体。它能够在保留 PowerPoint 原始格式、颜色、图像和布局的前提下，将文档翻译成指定语言，并可进一步生成带有 AI 语音讲解的视频、AI 撰写的文章或 AI 生成的配图。

---

## 🌟 核心产品特色

### 1. 🎨 智能翻译排版保护引擎 (Smart Layout Preservation)
传统的机器翻译往往会导致文字溢出文本框（爆框），因为翻译后的文本长度往往不可控。本项目内置了独创的 **视觉宽度计算与自适应缩放算法**：

*   **视觉宽度量化**：不仅仅是计算字符数，算法会根据字符类型（CJK 表意文字权重 2.0，大写字母 1.2，标准 ASCII 1.0）计算文本在屏幕上的真实视觉宽度。
*   **动态字号缩放**：计算译文与原文的"膨胀率"。如果译文导致溢出风险，系统会自动计算最佳字号（Font Size），并修改 PPT XML 中的 `sz` 属性。
*   **样式完美继承**：精准保留原文档的字体颜色、加粗、斜体、下划线、超链接以及段落间距。

### 2. 🎬 智能视频生成系统 (AI Video Generation)
将静态 PPT 转换为带有 AI 语音讲解的动态视频：

*   **AI 讲稿生成**：自动为每张幻灯片生成专业的演讲文稿，支持用户配置AI模型和参数。
*   **多语音合成支持**：
    - **MiniMax**：专业中文语音合成，支持多种高质量音色
    - **Coqui TTS**：开源本地语音合成，支持自定义扬声器声音
    - **Qwen TTS**：阿里云语音合成服务
*   **智能音频控制**：支持语速调节、自动停顿、音色选择
*   **单页视频生成**：为每张幻灯片生成独立视频，便于预览和修改
*   **视频合并导出**：将所有单页视频合并为完整MP4视频

### 3. 📝 智能文章生成系统 (AI Article Generation)
将 PPT 转换为专业的多平台文章：

*   **AI 文章生成**：基于 PPT 内容自动生成专业文章，支持多种文章风格和类型
*   **多平台风格支持**：
  - **微信公众号**：专业深度，适合长文阅读
  - **小红书**：生活化，图文并茂，种草推荐
  - **微博**：简洁有力，话题性强，易传播
  - **知乎**：理性分析，专业解答，深度思考
  - **抖音**：短视频脚本，节奏紧凑，吸引眼球
  - **B站**：年轻化，互动性强，知识分享
*   **文章类型配置**：支持综合文章、摘要文章、详细文章和营销文章
*   **AI 辅助编辑**：支持重新生成、微调优化、自定义提示词
*   **Markdown支持**：生成的文章支持 Markdown 格式，并自动转换为精美的 HTML 显示

### 4. 🎨 AI智能配图系统 (AI Image Generation)
为PPT生成专业的AI配图：

*   **双模型支持**：
  - **ComfyUI**：本地图像生成，支持多种模型和高级参数配置
  - **NanoBanana**：基于Google Gemini的云端图像生成
*   **智能内容分析**：AI自动分析幻灯片内容，生成图片描述和优化提示词
*   **多样化宽高比**：支持10种宽高比选项（1:1、16:9、9:16、4:3、3:4等）
*   **质量控制**：支持标准质量和高清质量选项
*   **批量生成审核**：支持批量生成和逐页审核修改

### 5. 🛡️ 零信任隐私架构 (Zero-Trust Privacy)
我们采用了 **Client-side Only + Hybrid Cloud** 的处理逻辑，确保您的敏感商业数据获得最佳保护：

*   **浏览器端处理**：利用 WebAssembly 和 JSZip，PPTX 文件的解压、文本提取、XML 重组和重新打包全部在用户的浏览器内存中完成
*   **本地模型支持**：原生支持连接局域网内的 **Ollama** 或 **vLLM**，支持完全物理隔离环境
*   **混合云架构**：翻译和基础处理可在本地完成，高级功能（如视频生成）可选择云端服务

### 6. 🧠 多元化 AI 模型生态
不绑定单一供应商，提供灵活的模型选择策略：

#### AI翻译提供商
*   **Google Gemini**：集成最新的 Gemini 2.5 Flash 模型，拥有超长上下文窗口，适合处理长文档
*   **OpenRouter 聚合**：支持通过 OpenRouter 接入 GPT-4o, Claude 3.5 Sonnet, DeepSeek V3 等顶级模型
*   **Ollama 本地**：支持本地部署的开源模型，如 Llama 3, Qwen 2.5, Mistral 等
*   **VLLM 本地**：高性能本地推理服务，支持大规模模型部署

#### 图片生成提供商
*   **ComfyUI**：本地图像生成，支持z-image_turbo等高性能模型
*   **NanoBanana**：Google Gemini云端图像生成，支持多种宽高比和质量选项

### 7. 📚 专业术语管理 (Glossary System)
针对垂直领域（医疗、法律、IT）的翻译需求，内置了持久化的术语表功能：

*   **Prompt 注入**：术语表不是简单的查找替换，而是通过 System Prompt 注入到 AI 的上下文理解中
*   **智能上下文理解**：确保 AI 在翻译句子时就能正确使用术语，保证语法的连贯性
*   **浏览器缓存**：配置自动保存，一次配置，永久生效

### 8. ⚡ 极速流式交互与可视化
*   **Magic Text Display**：翻译和视频生成过程中，界面会实时通过动画展示正在被处理的文本内容
*   **实时数据看板**：通过 Recharts 实时渲染"原文 vs 译文"字符数量对比图
*   **智能流控**：内置指数退避（Exponential Backoff）重试机制，自动处理 API 限流和网络抖动
*   **实时进度反馈**：详细展示处理进度和当前状态

### 9. 🎯 智能字体管理
*   **20+中文字体支持**：提供丰富的中文字体选择
*   **智能字体替换**：支持一键统一PPT字体风格
*   **字体预览功能**：实时预览字体效果
*   **记忆用户选择**：记住用户上次选择的字体

---

## 🛠️ 技术架构

### 前端技术栈
*   **前端框架**: React 19.2.0 + TypeScript 5.0 + Vite 6.2.0
*   **UI组件**: 原生React组件 + Tailwind CSS (Dark Mode 深度适配)
*   **文件处理**: JSZip (PPTX解析) + DOMParser
*   **可视化**: Recharts (统计图表)
*   **PWA支持**: 支持离线安装和使用

### AI集成
*   **AI 客户端**: Google GenAI SDK, OpenAI Compatible API
*   **多模型支持**: Gemini, OpenRouter, Ollama, VLLM
*   **图像生成**: ComfyUI + Google Gemini
*   **语音合成**: MiniMax, Coqui TTS, Qwen TTS

### 后端服务
*   **核心服务**: Node.js + Express (替代原 n8n 工作流)
*   **视频处理**: FFmpeg + MediaRecorder API
*   **文件服务**: 静态文件服务 + CDN支持

---

## 📁 项目结构

```
ArcherDoc-AI/
├── frontend/                  # 前端 Electron + React 项目
│   ├── public/                # 静态资源与 Electron 入口
│   │   ├── electron.cjs       # Electron 主进程入口
│   │   └── preload.js         # Electron 预加载脚本
│   ├── components/            # React 业务组件
│   ├── pages/                 # 路由页面组件
│   ├── services/              # 前端 API 服务
│   ├── utils/                 # 前端通用工具
│   ├── scripts/               # 开发辅助脚本 (Electron启动等)
│   ├── App.tsx                # 应用根组件 (路由配置)
│   ├── vite.config.ts         # Vite 构建配置
│   ├── electron-builder.config.js # Electron 打包配置
│   └── package.json           # 前端依赖配置
├── backend/                   # 后端 Node.js 服务
│   ├── src/                   # 后端核心源码
│   │   ├── routes/            # API 路由定义 (Upload, Generate, etc.)
│   │   ├── services/          # 核心业务逻辑 (AI, Video, TTS)
│   │   ├── middleware/        # Express 中间件 (Logger, ErrorHandler)
│   │   └── utils/             # 后端通用工具 (Prompt解析等)
│   ├── jobs/                  # 任务数据存储 (生成的文章/视频/JSON)
│   ├── uploads/               # 临时上传文件存储
│   └── package.json           # 后端依赖配置
├── AIStudio/                  # Python 算法与工作流
│   ├── n8n_workflows/         # n8n 自动化工作流 JSON
│   ├── scripts/               # Python 辅助脚本 (图像处理等)
│   └── Coqui/                 # Coqui TTS 模型相关
├── landingpage/               # 产品官网 (独立静态站)
├── README.md                  # 项目说明文档
└── ...
```

---

## 🌐 产品官网 (Landing Page)
项目包含一个独立设计的高性能产品官网，位于根目录的 `landingpage/` 文件夹中。

### 核心页面
*   **首页 (`index.html`)**: 沉浸式产品介绍，展示核心功能、技术优势和使用场景，包含动态演示效果。
*   **下载页 (`download.html`)**: 自动检测用户系统 (macOS/Windows/Linux)，提供对应版本的客户端下载链接。

### 技术特点
*   **纯静态架构**: 无需后端数据库，HTML5 + CSS3 + Vanilla JS 原生开发，加载极快。
*   **独立部署**: 与核心应用完全解耦，可直接部署至 GitHub Pages, Vercel, Netlify 或 Nginx 服务器。

### 🎨 现代化交互界面
*   **Glassmorphism 设计**: 全新毛玻璃风格上传组件，提供细腻的视觉体验。
*   **智能交互**: 拖拽上传、动态反馈、格式自动识别。
*   **格式支持**: 全面支持 PPTX, DOCX, PDF, Markdown, TXT 及多种图片格式。

### 🔊 高性能语音合成
*   **独立 Python 服务**: 集成 Coqui TTS (XTTS v2)，支持 GPU 加速。
*   **流式响应**: 实时音频流传输，显著降低首字延迟。
*   **多语言支持**: 完美支持中英混合朗读，情感丰富自然。


---

## 🚀 主要功能流程

### PPT翻译流程
1. **文件上传** → JSZip解析PPTX结构
2. **文本提取** → 提取所有幻灯片文本内容
3. **AI翻译** → 调用选定AI提供商进行批量翻译
4. **自适应排版** → 智能调整字号防止溢出
5. **文件重组** → 保持原始排版结构重新打包

### 视频生成流程
1. **PPT分析** → AI生成每页讲解稿
2. **语音合成** → 调用本地 Python TTS 服务 (GPU加速) 或 Minimax 云端模型
3. **视频合成** → 幻灯片+音频合成为视频
4. **质量审核** → 用户审核修改讲稿和语音
5. **导出下载** → 生成完整MP4视频

### 文章生成流程
1. **内容分析** → AI分析PPT核心内容
2. **平台适配** → 根据目标平台调整写作风格
3. **AI创作** → 生成对应平台格式的文章
4. **编辑优化** → 支持用户编辑和重新生成

### AI配图流程
1. **幻灯片分析** → AI分析内容生成图片描述
2. **提示词优化** → 智能优化生成提示词
3. **双模型生成** → ComfyUI本地 + NanoBanana云端
4. **批量审核** → 支持批量生成和逐页审核

### 字体统一流程
1. **字体选择** → 用户选择目标中文字体 (支持20+种常用字体)
2. **全局扫描** → 扫描所有幻灯片及母版页
3. **智能替换** → 批量更新文本框字体属性
4. **格式保持** → 保持原有字号和样式输出

---

## 🎯 核心使用场景

### 企业应用场景
*   **企业培训** → 快速将中文培训材料翻译为多语言版本
*   **产品发布** → 生成多语言产品介绍视频和文章
*   **国际展会** → 制作多语言演示材料和宣传内容
*   **技术文档** → 翻译技术文档并保持格式完整性

### 内容创作场景
*   **公众号运营** → 将PPT转化为公众号文章和视频
*   **知识付费** → 将培训PPT制作成在线课程视频
*   **营销推广** → 生成产品介绍的图文和视频内容
*   **品牌宣传** → 制作多语言品牌宣传材料

### 设计优化场景
*   **文档标准化** → 批量统一文档字体和风格
*   **视觉升级** → 为PPT生成专业配图和插图
*   **格式转换** → PPT转视频、转文章等多种格式

---

## 🔌 本地模型跨域配置 (CORS)

### Ollama 配置
1. **Linux (Systemd 方式)**:
   ```bash
   sudo systemctl edit ollama.service
   # 添加：
   [Service]
   Environment="OLLAMA_ORIGINS=*"
   sudo systemctl restart ollama
   ```

2. **macOS / 手动运行**:
   ```bash
   launchctl setenv OLLAMA_ORIGINS "*"
   export OLLAMA_ORIGINS="*"
   ollama serve
   ```

### VLLM 配置
在启动命令中添加参数：
```bash
python -m vllm.entrypoints.openai.api_server --allowed-origins "*" ...
```

---

## 🚀 部署指南

### 🖥️ Electron 桌面应用 (推荐)
我们提供跨平台桌面应用，无需任何技术配置即可使用：

#### 最新构建版本 (v1.0.0)
- **macOS**:
  - Intel x64: `ArcherDoc AI-1.0.0.dmg` (129MB)
  - Apple Silicon: `ArcherDoc AI-1.0.0-arm64.dmg` (125MB)
- **Windows**:
  - 通用安装包: `ArcherDoc AI Setup 1.0.0.exe` (207MB) - 支持x64/ARM64
- **Linux**:
  - 通用AppImage: `ArcherDoc AI-1.0.0.AppImage` (129MB)

#### 安装说明
1. **macOS**: 下载对应架构的DMG文件，双击拖拽到Applications文件夹
2. **Windows**: 下载EXE安装包，双击安装
3. **Linux**: 下载AppImage文件，添加执行权限后直接运行

### 🌐 Web版本部署
适合企业内网部署或多用户使用场景：

#### 1. 环境准备
*   **Node.js** (v18 LTS 或更高)
*   **NPM**
*   **后端服务** (本仓库 backend 目录)

#### 2. 获取代码并构建

```bash
cd /opt/archerdoc-ai

# 2.1 构建后端
cd backend
npm install
npm run build
cp .env.example .env

# 2.2 构建前端
cd ../frontend
npm install
npm run build
```

#### 4. 配置Systemd服务 (Web Backend)
(请参考 backend/README.md 配置PM2或Systemd守护 backend 和 frontend dist)

...

### 🔧 开发环境构建

#### 1. 前端开发环境
```bash
cd ArcherDoc-AI/frontend
npm install
npm run dev
```

#### 2. 后端开发环境
```bash
cd ArcherDoc-AI/backend
npm install
npm run dev
```

#### 3. 构建Electron应用
```bash
cd ArcherDoc-AI/frontend
npm run build

# 构建 macOS 版本 (.dmg)
npm run electron-pack-mac

# 构建 Windows 版本 (.exe)
npm run electron-pack-win

# 构建 Linux 版本 (.AppImage)
npm run electron-pack-linux

# 使用镜像源加速构建 (推荐中国用户)
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run electron-pack-mac
```

---

## 📄 许可证
MIT License

---

## 🤝 贡献指南
欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📞 技术支持
如有技术问题，请通过 GitHub Issues 联系我们。