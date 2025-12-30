# ArcherDoc AI Backend

ArcherDoc AI的后端服务,用于替代n8n,提供PPT处理、AI生成等功能。

## 技术栈

- **Node.js** + **TypeScript**
- **Express.js** - Web框架
- **内存存储** - 无需数据库
- **LibreOffice** - PPT转PDF
- **pdftoppm** - PDF转PNG

## 环境依赖

### 系统工具

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y libreoffice poppler-utils ffmpeg
```

**macOS:**
```bash
brew install libreoffice poppler ffmpeg
```

### Node.js版本

- Node.js >= 18.0.0
- npm >= 9.0.0

## 安装步骤

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑.env文件,根据需要修改配置

# 3. 开发模式运行
npm run dev

# 4. 生产环境运行
npm run build
npm start
```

## API接口

### 健康检查
```
GET /health
```

### 文件上传
```
### 文章生成 (优化版)
```
POST /webhook/regenerate-article
Content-Type: application/json

字段:
- jobId:以此为基础重新生成
- customPrompt: 自定义提示词 (支持 {{PPT_TITLE}} 等占位符)
- articleType, articleStyle, aiConfiguration...
```

### 文件上传
```
POST /webhook/api/upload-ppt
Content-Type: multipart/form-data

字段:
- pptFile: PPT文件
- processingType: article | video | image
  - article: 仅提取文本，自动跳过图片转换(高速)
  - video/image: 包含完整幻灯片图片生成
- aiProvider, aiModel...
```

### 获取Job数据
```
GET /webhook/api/get-job-data?jobId={jobId}
GET /webhook/api/get-article-data?jobId={jobId}
```

### 静态文件服务
```
GET /webhook/servefiles/api/slides-data/{jobId}/images/{filename}
GET /webhook/servefiles/api/slides-data/{jobId}/audio/{filename}
GET /webhook/servefiles/api/slides-data/{jobId}/video/{filename}
```

## 项目结构

```
backend/
├── src/
│   ├── app.ts                 # Express应用配置
│   ├── server.ts              # 入口文件
│   ├── routes/                # 路由
│   │   ├── upload.ts          # 上传API (含文章模式优化)
│   │   ├── generate.ts        # 生成API (含占位符引擎)
│   │   └── data.ts            # 数据获取API
│   ├── services/              # 服务
│   │   ├── jobManager.ts      # Job管理
│   │   ├── aiService.ts       # AI服务 (含5分钟超时/重试)
│   │   └── pptConverter.ts    # PPT转换
│   ├── utils/                 # 工具库
│   │   └── promptUtils.ts     # 核心提示词解析引擎
│   ├── middleware/            # 中间件
...
```

## 开发说明

### 启动开发服务器

```bash
npm run dev
```

服务器将自动重启(使用nodemon)。

### 构建生产版本

```bash
npm run build
```

输出到`dist/`目录。

### 运行生产版本

```bash
npm start
```

## 配置说明

环境变量(.env):

```env
PORT=4567                      # 服务端口 (默认4567)
NODE_ENV=development           # 运行环境
JOBS_DIR=./jobs                # Job存储目录
RETENTION_DAYS=7               # Job保留天数
GEMINI_API_KEY=                # Gemini API密钥(可选)
LOG_LEVEL=info                 # 日志级别
LOG_DIR=./logs                 # 日志目录
AI_TIMEOUT=300000              # AI请求超时时间(毫秒), 默认5分钟
```

## 前端配置

修改前端`constants.ts`:

```typescript
export const N8N_CONFIG = {
  BASE_URL: 'http://localhost:5678',  // 修改为后端地址
  API_PATH: '/webhook/api',
  WEBHOOK_PATH: '/webhook'
};
```

## 监控和日志

日志输出到控制台,包含:
- 请求日志(方法、路径、状态码、耗时)
- 错误日志
- 任务处理日志

## 故障排查

### LibreOffice转换失败

**问题**: LibreOffice命令未找到

**解决**:
```bash
# 检查LibreOffice是否安装
libreoffice --version

# macOS: 检查路径
ls -la /Applications/LibreOffice.app/Contents/MacOS/soffice
```

### pdftoppm转换失败

**问题**: pdftoppm命令未找到

**解决**:
```bash
# Ubuntu/Debian
sudo apt-get install poppler-utils

# macOS
brew install poppler

# 验证安装
pdftoppm -h
```

### 端口被占用

**问题**: Error: listen EADDRINUSE: address already in use :::5678

**解决**:
```bash
# 查找占用端口的进程
lsof -i :5678

# 杀死进程
kill -9 <PID>

# 或修改.env中的PORT
PORT=3000
```

## 后续优化

- [ ] 添加WebSocket实时进度推送
- [ ] 实现API文档(Swagger)
- [ ] 添加Prometheus监控
- [ ] 实现Redis缓存层
- [ ] 添加用户认证系统
- [ ] 支持分布式部署

## License

ISC
