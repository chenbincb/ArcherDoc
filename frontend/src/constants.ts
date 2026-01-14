
import { AIProvider, AppSettings, SpeechModelType, VideoSettings, ImageProvider, ImageGenerationSettings } from './types';

// The centralized host for all AI services (Ollama, vLLM, Coqui, ComfyUI)
export const AI_SERVER_HOST = 'http://178.109.129.11';

export const DEFAULT_PROVIDER_CONFIGS = {
  [AIProvider.GEMINI]: {
    apiKey: '',
    model: 'gemini-2.5-flash',
    baseUrl: ''
  },
  [AIProvider.OPENROUTER]: {
    apiKey: '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',
    model: 'qwen/qwen3-235b-a22b:free',
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  [AIProvider.OLLAMA]: {
    apiKey: 'EMPTY',
    model: 'qwen3-vl:235b-cloud',
    baseUrl: `${AI_SERVER_HOST}:11434/v1`
  },
  [AIProvider.VLLM]: {
    apiKey: 'EMPTY',
    model: '/home/n8n/Qwen3-VL/Qwen3-VL-4B-Instruct',
    baseUrl: `${AI_SERVER_HOST}:8008/v1`
  }
};

// --- Video Generation Constants ---

// Available speech voices from MiniMax
export const AVAILABLE_VOICES = [
  { id: 'Chinese (Mandarin)_Gentleman', name: '温润男声', description: '温和、专业的男声' },
  { id: 'hunyin_6', name: '舒朗男声', description: '清晰、明亮的男声' },
  { id: 'Chinese (Mandarin)_Male_Announcer', name: '播报男声', description: '正式、庄重的播报男声' },
  { id: 'Chinese (Mandarin)_News_Anchor', name: '新闻女声', description: '专业、清晰的新闻女声' },
  { id: 'Chinese (Mandarin)_Sweet_Lady', name: '甜美女声', description: '甜美、亲切的女声' }
];

// Available speaker voices for Coqui TTS
export const COQUI_TTS_SPEAKERS = [
  { id: 'default_speaker.wav', name: '默认语音', description: 'Coqui TTS 默认语音' },
  { id: 'speaker_1.wav', name: '示例语音1', description: 'Coqui TTS 示例语音1' },
  { id: 'speaker_2.wav', name: '示例语音2', description: 'Coqui TTS 示例语音2' },
  { id: 'speaker_3.wav', name: '示例语音3', description: 'Coqui TTS 示例语音3' }
];

// Available voices for Qwen TTS
export const QWEN_TTS_VOICES = [
  { id: 'Ethan', name: 'Ethan', description: '男声 - 专业稳重' },
  { id: 'Chelsie', name: 'Chelsie', description: '女声 - 自然流畅' },
  { id: 'Cherry', name: 'Cherry', description: '女声 - 温柔甜美' },
  { id: 'Serena', name: 'Serena', description: '女声 - 知性优雅' },
  { id: 'Dylan', name: 'Dylan', description: '男声 - 北京话' },
  { id: 'Jada', name: 'Jada', description: '女声 - 吴语' },
  { id: 'Sunny', name: 'Sunny', description: '女声 - 四川话' }
];

// Available models for Qwen TTS
export const QWEN_TTS_MODELS = [
  { id: 'qwen3-tts-flash', name: 'qwen3-tts-flash (推荐)', description: '最新旗舰模型' },
  { id: 'qwen3-tts-flash-2025-11-27', name: 'qwen3-tts-flash-2025-11-27', description: '25/11快照版' },
  { id: 'qwen3-tts-flash-2025-09-18', name: 'qwen3-tts-flash-2025-09-18', description: '25/09快照版' }
];



// Default video settings
export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  aiProvider: AIProvider.VLLM,
  speechModelType: SpeechModelType.MINIMAX, // Default to MiniMax
  minimaxGroupId: '',
  minimaxAccessToken: '',
  voiceId: 'Chinese (Mandarin)_News_Anchor',
  speechRate: 1.0,
  autoPause: true,

  // Coqui TTS Settings
  coquiSettings: {
    url: `${AI_SERVER_HOST}:8001/generate`,
    speakerWav: 'default_speaker.wav',
    gpuThresholdGb: 4.0
  },

  // Qwen TTS Settings
  qwenApiKey: '',
  qwenModel: 'qwen3-tts-flash',
  qwenVoiceId: 'Chelsie'
};

// --- Image Generation Constants ---

// Default image settings
export const DEFAULT_IMAGE_SETTINGS: ImageGenerationSettings = {
  // ComfyUI settings
  comfyuiSettings: {
    baseUrl: `${AI_SERVER_HOST}:8188`,
    model: 'z-image',
    workflowId: 'default',
    steps: 20,
    cfgScale: 7.5,
    width: 1024,
    height: 768,
    sampler: 'dpmpp_2m',
    scheduler: 'karras'
  },

  // Nano Banana (Google Gemini) settings
  nanobananaSettings: {
    apiKey: '',
    model: 'gemini-3-pro-image-preview',
    quality: 'standard',
    aspectRatio: '1:1',
    width: 1024,
    height: 1024
  },

  // Common settings
  defaultProvider: ImageProvider.COMFYUI,
  autoRetry: true,
  maxRetries: 3,
  negativePrompt: '人物, 写实, 照片, 复杂背景, 杂乱, 艺术纹理, 油画, 水彩, 阴影过重, 乱线, 模糊, 噪声, 歪曲, 比例失调',
  imageFormat: 'png'
};

export const DEFAULT_SETTINGS: AppSettings = {
  activeProvider: AIProvider.VLLM,
  targetLanguage: '英语',
  configs: DEFAULT_PROVIDER_CONFIGS,
  glossary: [
    { term: '安超云', translation: 'archeros' }
  ],
  videoSettings: DEFAULT_VIDEO_SETTINGS,
  imageSettings: DEFAULT_IMAGE_SETTINGS
};

export const PROVIDER_OPTIONS = [
  { value: AIProvider.VLLM, label: 'vLLM (本地)' },
  { value: AIProvider.OLLAMA, label: 'Ollama (本地)' },
  { value: AIProvider.GEMINI, label: 'Google Gemini' },
  { value: AIProvider.OPENROUTER, label: 'OpenRouter' },
];

export const POPULAR_LANGUAGES = [
  '英语',
  '繁体中文',
  '西班牙语',
  '法语',
  '德语',
  '日语',
  '韩语',
  '俄语',
  '葡萄牙语',
  '阿拉伯语'
];

// 后端API配置
export const API_CONFIG = {
  // 优先使用环境变量，否则在开发模式下使用代理(空字符串)，生产模式下使用默认地址
  BASE_URL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://ai.archeros.cn:4567'),
  API_PATH: '/webhook/api',
  WEBHOOK_PATH: '/webhook'
};

// API端点
export const API_ENDPOINTS = {
  // 保存和导出端点
  SAVE_CONTENT: '/save-content',      // 保存功能 - SaveWorkflow
  EXPORT_CONTENT: '/export-content',  // 导出功能 - ExportWorkflow

  // 生成功能端点
  GENERATE_ARTICLE: '/generate-article',
  GENERATE_VIDEO: '/generate-video',
  GENERATE_IMAGES: '/generate-images',

  // 数据获取端点
  GET_ARTICLE_DATA: '/get-article-data',
  GET_JOB_DATA: '/get-job-data',
  GET_IMAGE_DATA: '/get-image-data',

  // 审批功能端点
  HANDLE_APPROVAL: '/handle-approval',

  // 文件下载端点（前端直接访问）
  DOWNLOAD_FILE: '/api/download'      // 格式: /api/download/{jobId}/{filename}
};

// --- Image Generation Constants ---

// Available image models for ComfyUI
export const COMFYUI_MODELS = [
  { id: 'z-image', name: 'z-image', description: '高质量图像生成模型' },
  { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', description: 'SDXL 1.0 基础模型' },
  { id: 'stable-diffusion-1.5', name: 'Stable Diffusion 1.5', description: 'SD 1.5 经典模型' }
];

// Available image models for Nano Banana
export const NANO_BANANA_MODELS = [
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image Preview', description: 'Google Gemini 3 Pro Image预览版' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', description: 'Google Gemini 2.5 Flash Image' }
];

// Available image styles
export const IMAGE_STYLES = [
  { id: 'flat', name: '扁平矢量', description: '极简扁平化设计，适合流程图' },
  { id: 'business', name: '企业商务', description: '专业商务蓝白风格' },
  { id: 'isometric', name: '2.5D等轴测', description: '立体几何透视，适合架构图' },
  { id: 'sketch', name: '线框手绘', description: '产品早期草图感' },
  { id: 'blueprint', name: '科技蓝图', description: '技术规范感，带发光线条' }
];

// Available image sizes
export const IMAGE_SIZES = [
  { id: '1024x768', name: '标准PPT (4:3)', width: 1024, height: 768 },
  { id: '1920x1080', name: '高清 (16:9)', width: 1920, height: 1080 },
  { id: '1280x720', name: '标清 (16:9)', width: 1280, height: 720 },
  { id: '1080x1080', name: '正方形 (1:1)', width: 1080, height: 1080 },
  { id: '1080x1920', name: '竖版 (9:16)', width: 1080, height: 1920 }
];


// Nano Banana aspect ratio options (根据Gemini API文档) - 按逻辑排序
export const NANOBANANA_ASPECT_RATIOS = [
  { id: '1:1', name: '正方形 (1:1)', description: '适合头像、图标，1024×1024' },
  { id: '5:4', name: '横版 (5:4)', description: '适合横版图片，1152×896' },
  { id: '4:3', name: '横版 (4:3)', description: '适合横版图片，1184×864' },
  { id: '3:2', name: '横版 (3:2)', description: '适合横版图片，1248×832' },
  { id: '16:9', name: '横版 (16:9)', description: '适合横幅、背景，1344×768' },
  { id: '21:9', name: '超宽屏 (21:9)', description: '适合宽幅背景，1536×672' },
  { id: '4:5', name: '竖版 (4:5)', description: '适合竖版图片，896×1152' },
  { id: '3:4', name: '竖版 (3:4)', description: '适合竖版图片，864×1184' },
  { id: '2:3', name: '竖版 (2:3)', description: '适合竖版图片，832×1248' },
  { id: '9:16', name: '竖版 (9:16)', description: '适合手机壁纸，768×1344' }
];
