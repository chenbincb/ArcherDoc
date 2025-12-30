
export enum AIProvider {
  GEMINI = 'Gemini',
  OPENROUTER = 'OpenRouter',
  OLLAMA = 'Ollama',
  VLLM = 'vLLM',
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface GlossaryItem {
  term: string;
  translation: string;
}

export interface AppSettings {
  activeProvider: AIProvider;
  targetLanguage: string;
  // Store settings for each provider separately so they don't get mixed up
  configs: Record<AIProvider, ProviderConfig>;
  glossary: GlossaryItem[];

  // Video Generation Settings
  videoSettings: VideoSettings;

  // Image Generation Settings
  imageSettings: ImageGenerationSettings;
}

export interface ProcessStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  details?: string;
}

export interface TranslationStats {
  originalChars: number;
  translatedChars: number;
  slidesProcessed: number;
  totalSlides: number;
}

export interface SlideData {
  id: string;
  textMap: Map<string, string>; // Path/Index reference to original text
}

export interface ProgressCallback {
  (current: number, total: number, status: string, detail?: string, currentStats?: TranslationStats): void;
}

// --- Video Generation Types ---

// Speech Model Types
export enum SpeechModelType {
  MINIMAX = 'minimax',
  COQUI_TTS = 'coqui_tts',
  QWEN_TTS = 'qwen_tts'
}

export interface CoquiTTSSettings {
  speakerWav: string; // Path to speaker reference audio file
  gpuThresholdGb: number; // Minimum GPU memory required to use GPU
}

export interface QwenTTSSettings {
  apiKey: string; // Qwen TTS API Key
  model: string; // Qwen TTS model name
  voiceId: string; // Qwen TTS voice ID
}

export interface VideoSettings {
  // AI Settings
  aiProvider: AIProvider;

  // Speech Settings
  speechModelType: SpeechModelType; // Default speech model to use
  minimaxGroupId: string;
  minimaxAccessToken: string;
  voiceId: string;
  speechRate: number;
  autoPause: boolean;

  // Coqui TTS Settings
  coquiSettings: CoquiTTSSettings;

  // Qwen TTS Settings
  qwenApiKey: string;
  qwenModel: string;
  qwenVoiceId: string;
}

export interface SlideNote {
  id: number;
  note: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface SpeechVoice {
  id: string;
  name: string;
  description: string;
}

export interface VideoGenerationStats {
  slidesProcessed: number;
  totalSlides: number;
  originalChars: number;
  translatedChars: number;
  audioGenerated: number;
  totalAudio: number;
  videoDuration: number;
}

export interface VideoProgressCallback {
  (current: number, total: number, status: string, detail?: string, currentStats?: VideoGenerationStats): void;
}

export interface VideoResult {
  blob: Blob;
  stats: VideoGenerationStats;
  fileName: string;
}

// --- Article Generation Types ---

export enum ArticleType {
  GENERAL = 'general',
  SUMMARY = 'summary',
  DETAILED = 'detailed',
  MARKETING = 'marketing'
}

export interface ArticleGenerationStats {
  totalSlides: number;
  slidesProcessed: number;
  wordCount: number;
  generationTime: number;
}

export interface ArticleResult {
  blob?: Blob;
  text?: string;
  stats: ArticleGenerationStats;
  fileName: string;
}

export interface ArticleData {
  id: string;
  title: string;
  content: string;
  type: ArticleType;
  wordCount: number;
  createdAt: string;
}

export interface ArticleSettings {
  articleType: ArticleType;
  customPrompt: string;
  includeImages: boolean;
  includeNotes: boolean;
}

// --- Image Generation Types ---

export enum ImageProvider {
  COMFYUI = 'ComfyUI',
  NANO_BANANA = 'NanoBanana'
}

export interface ComfyUISettings {
  baseUrl: string;
  model: string;
  workflowId: string;
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  sampler: string;
  scheduler: string;
}

export interface NanoBananaSettings {
  // Google AI API Key (获取: https://ai.google.dev/api)
  apiKey: string;
  // Gemini模型: gemini-2.5-flash-image 或 gemini-2.0-flash-preview-image-generation
  model: string;
  // 图像质量: standard 或 hd
  quality: 'standard' | 'hd';
  // 图像宽高比: 根据Gemini API文档支持的所有宽高比
  aspectRatio: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  // 保持向后兼容性的字段
  width: number;
  height: number;
}

export interface ImageGenerationSettings {
  // ComfyUI settings
  comfyuiSettings: ComfyUISettings;

  // Nano Banana settings
  nanobananaSettings: NanoBananaSettings;

  // Common settings
  defaultProvider: ImageProvider;
  autoRetry: boolean;
  maxRetries: number;
  negativePrompt: string;
  imageFormat: 'png' | 'jpg';
}

export interface SlideImageData {
  id: number;
  slideTitle: string;
  slideContent: string;
  imageUrl: string; // Original slide image URL
  description: string; // AI-generated content description for image generation
  suggestedPrompt: string; // AI-suggested image generation prompt
  userPrompt: string; // User-edited prompt
  negativePrompt: string;
  generatedImage?: GeneratedImage;
  generationStatus: 'pending' | 'generating' | 'completed' | 'error';
  errorMessage?: string;
}

export interface GeneratedImage {
  id: string;
  slideId: number;
  url: string;
  thumbnailUrl: string;
  prompt: string;
  negativePrompt?: string;
  generationTime: number;
  provider: ImageProvider;
  width: number;
  height: number;
  fileSize: number;
  createdAt: string;
}

export interface ImageGenerationStats {
  totalSlides: number;
  slidesAnalyzed: number;
  imagesGenerated: number;
  totalGenerationTime: number;
  successRate: number;
  averageTime: number;
  fileSize: number;
}

export interface ImageGenerationRequest {
  slideId: number;
  slideTitle: string;
  slideContent: string;
  description: string;
  prompt: string;
  negativePrompt?: string;
  provider: ImageProvider;
  settings: ImageGenerationSettings;
  width: number;
  height: number;
}

export interface ImageProgressCallback {
  (current: number, total: number, status: string, detail?: string, currentStats?: ImageGenerationStats): void;
}

export interface ImageResult {
  images: GeneratedImage[];
  stats: ImageGenerationStats;
  fileName: string;
}
