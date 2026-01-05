import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { staticFileRewrite } from './middleware/staticRewrite.js';
import uploadRouter from './routes/upload.js';
import dataRouter from './routes/data.js';
import generateRouter from './routes/generate.js';
import mediaRouter from './routes/media.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 创建Express应用
 */
export const createApp = () => {
  const app = express();

  // 中间件
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLogger);

  // 静态文件路径重写(处理 /webhook/servefiles/api/slides-data/{jobId}/...)
  app.use('/webhook/servefiles', staticFileRewrite);

  // 直接的静态文件服务(备用)
  app.use('/webhook/servefiles', express.static(path.join(__dirname, '../jobs')));

  // API路由
  app.use('/webhook/api', uploadRouter);
  app.use('/webhook/api', dataRouter);
  app.use('/webhook/api', generateRouter);
  app.use('/webhook/api', mediaRouter);
  app.use('/webhook', generateRouter); // /webhook/regenerate-article

  // ✅ 兼容前端硬编码的下载路径逻辑
  app.use('/webhook/download-file-webhook/api', mediaRouter);

  // 健康检查
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // 根路径
  app.get('/', (req, res) => {
    res.json({
      name: 'ArcherDoc AI Backend',
      version: '1.0.0',
      status: 'running'
    });
  });

  // 404处理
  app.use(notFoundHandler);

  // 错误处理
  app.use(errorHandler);

  return app;
};
