import 'dotenv/config';
import { createApp } from './app.js';
import { getJobManager } from './services/jobManager.js';
import { getPPTConverter } from './services/pptConverter.js';
import { logger } from './middleware/logger.js';

const PORT = process.env.PORT || 4567;

/**
 * 启动服务器
 */
async function startServer() {
  try {
    logger.info('Starting ArcherDoc AI Backend...');

    // 调试: 打印环境变量
    console.log('Environment variables:', {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      JOBS_DIR: process.env.JOBS_DIR,
      RETENTION_DAYS: process.env.RETENTION_DAYS
    });

    // 验证依赖
    logger.info('Checking dependencies...');
    const pptConverter = getPPTConverter();
    const deps = await pptConverter.validateDependencies();

    if (!deps.libreOffice || !deps.pdftoppm) {
      logger.warn('Some dependencies are missing. PPT conversion may not work properly.');
      logger.warn('Please install:');
      if (!deps.libreOffice) logger.warn('  - LibreOffice: https://www.libreoffice.org/');
      if (!deps.pdftoppm) logger.warn('  - poppler-utils: apt-get install poppler-utils (Ubuntu) or brew install poppler (macOS)');
    }

    // 初始化JobManager
    logger.info('Initializing JobManager...');
    const jobManager = getJobManager();
    logger.success('JobManager initialized successfully');

    // 创建应用
    const app = createApp();

    // 启动服务器
    app.listen(PORT, () => {
      logger.success(`✓ Server is running on port ${PORT}`);
      logger.info(`✓ Health check: http://localhost:${PORT}/health`);
      logger.info(`✓ API endpoint: http://localhost:${PORT}/webhook/api`);
      logger.info('Ready to accept requests!');
    });
  } catch (error: unknown) {
    console.error('=== CRITICAL ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error:', error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : undefined);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
