/**
 * 任务类型
 */
export type JobType = 'article' | 'video' | 'image';

/**
 * 任务状态
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'error';

/**
 * Job数据结构
 */
export interface JobData {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  metadata: {
    originalFilename: string;
    processingType?: string;
    articleType?: string;
    articleStyle?: string;
    customPrompt?: string;
    aiProvider?: string;
    aiModel?: string;
    aiApiKey?: string;
    aiBaseUrl?: string;
    imageProvider?: string;
    [key: string]: any;
  };
}

/**
 * 幻灯片笔记数据
 */
export interface SlideNote {
  id: number;
  note?: string;
  title?: string;
  content?: string;
  description?: string;
  suggestedPrompt?: string;
  userPrompt?: string;
}

/**
 * 文章数据
 */
export interface ArticleData {
  content: string;
  wordCount: number;
  generationTime: string;
}

/**
 * API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 上传请求体
 */
export interface UploadRequestBody {
  processingType: JobType;
  articleType?: string;
  articleStyle?: string;
  customPrompt?: string;
  aiProvider?: string;
  aiModel?: string;
  aiApiKey?: string;
  aiBaseUrl?: string;
  imageProvider?: string;
  [key: string]: any;
}
