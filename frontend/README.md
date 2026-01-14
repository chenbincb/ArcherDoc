# ArcherDoc AI - Frontend

ArcherDoc AI 前端基于现代 React 技术栈构建，支持 Web 访问与 Electron 桌面应用模式。

## 🛠 技术栈

- **核心框架**: React 19, TypeScript
- **构建工具**: Vite
- **UI 样式**: Tailwind CSS (原生 CSS 变量系统)
- **桌面包装**: Electron
- **路由**: React Router v7
- **图标**: Lucide React

## 📂 目录结构

```text
frontend/
├── dist/                # 构建产物
├── public/              # 静态资源 (manifest, sw.js)
├── src/
│   ├── components/      # UI 组件 (Navbar, SettingsModal...)
│   ├── contexts/        # 全局状态 (SettingsContext, ProcessContext)
│   ├── hooks/           # 自定义 Hooks (useTranslation, useSettings...)
│   ├── pages/           # 页面级组件 (App, ArticleReviewPage...)
│   ├── services/        # API 服务 (aiService, videoService...)
│   ├── utils/           # 工具函数
│   ├── constants.ts     # 常量配置 (AI_SERVER_HOST)
│   ├── types.ts         # 类型定义
│   └── index.css        # 全局样式
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
└── .env.example         # 环境变量示例
```

## 🚀 快速开始

### 1. 安装依赖

在 `frontend` 目录下运行：
```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：
```bash
cp .env.example .env
```
编辑 `.env` 文件，设置后端 API 地址：
```properties
VITE_API_BASE_URL=http://localhost:4567  # 开发环境后端地址
```

### 3. 启动开发服务器

**Web 模式 (推荐)**:
```bash
npm run dev
```
访问: `http://localhost:3000` (或终端显示的端口)

**Electron 桌面模式**:
```bash
npm run electron-dev
```

## 🏗 构建部署

### Web 构建
```bash
npm run build
```
构建产物位于 `dist/` 目录，可直接部署到 Nginx 或静态托管服务。

### 桌面端打包 (React + Electron)
*Mac*:
```bash
npm run electron-pack-mac
```
*Windows*:
```bash
npm run electron-pack-win
```

## 🧩 关键配置

*   **API 代理**: 开发环境下，`/webhook` 开头的请求会被代理到后端（详见 `vite.config.ts`）。
*   **AI 服务地址**: 所有 AI 服务的基础地址统一在 `src/constants.ts` 中的 `AI_SERVER_HOST` 定义。
