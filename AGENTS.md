# AGENTS.md - ArcherDoc AI 代码库指南

本文档为 AI 编码代理提供项目结构、构建命令和代码风格指南。

---

## 项目概述

ArcherDoc AI 是企业级智能文档处理平台，采用前后端分离架构：
- **Frontend**: React 19 + Vite + TypeScript + TailwindCSS + Electron
- **Backend**: Node.js + Express + TypeScript
- **AI Services**: Gemini, vLLM, ComfyUI, MiniMax 等

---

## 构建命令

### 后端 (backend/)

```bash
# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 生产运行
npm start

# 测试（当前未配置）
npm test  # 返回错误提示
```

### 前端 (frontend/)

```bash
# Web 开发模式
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview

# Electron 开发模式
npm run electron-dev

# 桌面端打包
npm run electron-pack-mac    # macOS (DMG)
npm run electron-pack-win    # Windows (NSIS)
npm run electron-pack-linux  # Linux (AppImage)
```

### 完整启动流程

```bash
# 终端 1: 启动后端
cd backend && npm install && npm run dev

# 终端 2: 启动前端
cd frontend && npm install && npm run dev
```

后端默认端口: `4567`，前端默认端口: `3000`

---

## 代码风格指南

### TypeScript 配置

**后端** (`backend/tsconfig.json`):
- Target: ES2022
- Module: ESNext
- ModuleResolution: Node
- Strict mode: 启用
- ESM 模块，带 `.js` 扩展名

**前端** (`frontend/tsconfig.json`):
- Target: ES2022
- Module: ESNext
- ModuleResolution: Bundler
- 路径别名: `@/*` → `src/*`
- JSX: react-jsx

### 导入规范

```typescript
// ✅ 后端导入顺序（带 .js 扩展名）
import express from 'express';                    // 1. 第三方库
import { AppError } from './middleware/error.js'; // 2. 本地模块（带 .js）
import { logger } from './middleware/logger.js';

// ✅ 前端导入顺序（使用别名）
import { useCallback } from 'react';              // 1. 第三方库
import { useSettings } from '@/contexts/SettingsContext';  // 2. 本地模块
import { API_CONFIG } from '@/constants';
```

### 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 文件名 | camelCase | `aiService.ts`, `jobManager.ts` |
| React 组件 | PascalCase | `Navbar.tsx`, `SettingsModal.tsx` |
| 类名 | PascalCase | `AIService`, `AppError` |
| 接口 | PascalCase | `AIConfig`, `SlideNote` |
| 类型别名 | PascalCase | `JobType`, `JobStatus` |
| 枚举 | PascalCase | `AIProvider`, `ArticleType` |
| 函数/变量 | camelCase | `getAIService`, `processPPTX` |
| 常量 | UPPER_SNAKE_CASE | `API_CONFIG` |

### 类型定义

```typescript
// ✅ 使用 interface 定义对象结构
export interface JobData {
  id: string;
  type: JobType;
  status: JobStatus;
}

// ✅ 使用 type 定义联合类型
export type JobType = 'article' | 'video' | 'image' | 'translation';

// ✅ 使用 enum 定义枚举
export enum AIProvider {
  GEMINI = 'Gemini',
  OPENROUTER = 'OpenRouter',
}
```

### 错误处理

```typescript
// ✅ 使用自定义 AppError 类
import { AppError, asyncHandler } from './middleware/error.js';

// 抛出业务错误
throw new AppError('Job not found', 404);

// 使用 asyncHandler 包装异步路由
router.post('/endpoint', asyncHandler(async (req, res) => {
  // 业务逻辑
}));

// ✅ 统一错误响应格式
res.status(500).json({
  success: false,
  error: 'Error message'
});
```

### API 响应格式

```typescript
// ✅ 成功响应
res.json({
  success: true,
  data: { /* ... */ }
});

// ✅ 错误响应
res.status(400).json({
  success: false,
  error: 'Validation failed'
});
```

### 函数文档

```typescript
/**
 * 使用内置 Qwen-VL 模型识别图片内容
 * @param imageBase64 图片的 Base64 编码 (不带前缀)
 * @param prompt (可选) 识别提示词
 */
async recognizeImageWithQwenVL(imageBase64: string, prompt?: string): Promise<string | null>
```

---

## 目录结构

```
ArcherDoc/
├── backend/
│   ├── src/
│   │   ├── routes/       # 路由控制器
│   │   ├── services/     # 业务逻辑层
│   │   ├── middleware/   # 中间件 (error, logger)
│   │   ├── types/        # 类型定义 (与 frontend 同步)
│   │   ├── constants/    # 常量 (visualFrameworks, visualThemes)
│   │   ├── utils/        # 工具函数
│   │   ├── app.ts        # Express 应用配置
│   │   └── server.ts     # 服务入口
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # UI 组件
│   │   ├── contexts/     # React Context (Settings, Process)
│   │   ├── hooks/        # 自定义 Hooks
│   │   ├── services/     # API 服务层
│   │   ├── types.ts      # 类型定义
│   │   └── constants.ts  # 常量配置
│   └── package.json
└── landingpage/          # 落地页 (纯 HTML/JS)
```

---

## 关键约定

1. **类型同步**: `frontend/src/types.ts` 与 `backend/src/types/index.ts` 保持同步
2. **API 前缀**: 所有后端 API 以 `/webhook/api` 为前缀
3. **健康检查**: `GET /health` 返回服务状态
4. **静态文件**: `/webhook/servefiles` 提供文件下载
5. **开发代理**: 前端 Vite 代理 `/webhook` 到后端

---

## 环境配置

### 后端 `.env`

```properties
PORT=4567
GEMINI_API_KEY=your_key
MINIMAX_GROUP_ID=...
MINIMAX_ACCESS_TOKEN=...
```

### 前端 `.env`

```properties
VITE_API_BASE_URL=http://localhost:4567
```

---

## 注意事项

- 后端使用 ESM 模块，导入必须带 `.js` 扩展名
- 前端使用 `@/` 路径别名，不要使用相对路径跨目录导入
- 错误处理必须使用 `asyncHandler` 包装，确保错误被正确捕获
- 所有 API 响应必须包含 `success` 字段
- 新增类型定义需同时更新前后端 types 文件