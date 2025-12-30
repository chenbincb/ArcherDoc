import { Request, Response, NextFunction } from 'express';

/**
 * 请求日志中间件
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // 记录请求开始
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);

  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';

    console.log(
      `${statusEmoji} [${new Date().toISOString()}] ${req.method} ${req.url} ${status} ${duration}ms`
    );
  });

  next();
};

/**
 * 控制台日志工具
 */
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`ℹ️ [${new Date().toISOString()}] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`⚠️ [${new Date().toISOString()}] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`❌ [${new Date().toISOString()}] ${message}`, ...args);
  },
  success: (message: string, ...args: any[]) => {
    console.log(`✅ [${new Date().toISOString()}] ${message}`, ...args);
  }
};
