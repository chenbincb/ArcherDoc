import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * 静态文件路径重写中间件
 * 将 /webhook/servefiles/api/slides-data/{jobId}/... 重写为实际的文件路径
 */
export const staticFileRewrite = (req: Request, res: Response, next: NextFunction): void => {
  console.log('staticFileRewrite called:', req.method, req.path, req.originalUrl);

  if (req.path.startsWith('/api/slides-data/')) {
    // 提取jobId和剩余路径
    const pathMatch = req.path.match(/\/api\/slides-data\/([^\/]+)\/(.+)/);
    console.log('pathMatch:', pathMatch);

    if (pathMatch) {
      const jobId = pathMatch[1];
      let relativePath = pathMatch[2];

      if (relativePath.startsWith('images/')) {
        relativePath = relativePath.replace('images/', 'slides/');
      }

      const actualPath = path.join(process.cwd(), 'jobs', jobId, relativePath);
      console.log('Serving:', actualPath);

      // 检查文件是否存在
      fs.access(actualPath, fs.constants.F_OK, (err) => {
        if (err) {
          console.warn('File not found in staticRewrite:', actualPath);
          return next(); // 让后续的 express.static 或 404 处理程序接管，避免返回 JSON
        }

        // 发送文件
        res.sendFile(actualPath);
      });

      return;
    }
  }

  next();
};
