
// --- Common Enums ---

export enum AIProvider {
  GEMINI = 'Gemini',
  OPENROUTER = 'OpenRouter',
  OLLAMA = 'Ollama',
  VLLM = 'vLLM',
}

export type JobType = 'article' | 'video' | 'image' | 'translation';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'error';

export enum SpeechModelType {
  MINIMAX = 'minimax',
  COQUI_TTS = 'coqui_tts',
  QWEN_TTS = 'qwen_tts'
}

export enum ArticleType {
  GENERAL = 'general',
  SUMMARY = 'summary',
  DETAILED = 'detailed',
  MARKETING = 'marketing'
}

export enum ImageProvider {
  COMFYUI = 'ComfyUI',
  NANO_BANANA = 'NanoBanana'
}

// --- Data Structures ---

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

export interface SlideNote {
  id: number;
  note?: string;           // Merged: optional to satisfy backend strictness, frontend needs check
  title?: string;          // Backend specific
  content?: string;        // Backend specific
  description?: string;    // Backend specific
  suggestedPrompt?: string;// Backend specific
  userPrompt?: string;     // Backend specific
  audioUrl?: string;       // Frontend specific
  audioDuration?: number;  // Frontend specific
}

export interface ArticleData {
  id?: string;             // Frontend specific
  title?: string;          // Frontend specific
  content: string;         // Common
  type?: ArticleType;      // Frontend specific
  wordCount: number;       // Common
  generationTime?: string | number; // Merged type
  createdAt?: string;      // Frontend specific
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

export interface ImageVersionMetadata {
  prompt: string;
  negativePrompt?: string;
  provider: string;
  width: number;
  height: number;
  generationTime: number;
  createdAt: string;
}

export interface ImageVersion {
  url: string;
  filename: string;
  metadata: ImageVersionMetadata;
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
  generatedImageVersions?: ImageVersion[]; // 所有生成的图片版本
}

export interface SlideData {
  id: string;
  textMap: Map<string, string>; // Path/Index reference to original text
}

// --- Settings Interfaces ---

export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface GlossaryItem {
  term: string;
  translation: string;
}

export interface CoquiTTSSettings {
  url: string;
  speakerWav: string;
  gpuThresholdGb: number;
}

export interface QwenTTSSettings {
  apiKey: string;
  model: string;
  voiceId: string;
}

export interface VideoSettings {
  aiProvider: AIProvider;
  speechModelType: SpeechModelType;
  minimaxGroupId: string;
  minimaxAccessToken: string;
  voiceId: string;
  speechRate: number;
  autoPause: boolean;
  coquiSettings: CoquiTTSSettings;
  qwenApiKey: string;
  qwenModel: string;
  qwenVoiceId: string;
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

// --- Visual Style Types ---

export interface VisualFramework {
  id: string;
  name: string;
  englishName: string;
  category: 'contrast' | 'flow' | 'structure' | 'hierarchy' | 'scene';
  description: string;
  compositionInstruction: string;
}

export interface VisualTheme {
  id: string;
  name: string;
  englishName: string;
  promptModifiers: string;
  negativePrompt: string;
}

export interface NanoBananaSettings {
  apiKey: string;
  model: string;
  quality: 'standard' | 'hd';
  aspectRatio: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  width: number;
  height: number;
}

export interface ImageGenerationSettings {
  comfyuiSettings: ComfyUISettings;
  nanobananaSettings: NanoBananaSettings;
  defaultProvider: ImageProvider;
  autoRetry: boolean;
  maxRetries: number;
  negativePrompt: string;
  imageFormat: 'png' | 'jpg';
  // New visual settings
  visualThemeId?: string; // Optional to maintain compatibility
}

export interface AppSettings {
  activeProvider: AIProvider;
  targetLanguage: string;
  configs: Record<AIProvider, ProviderConfig>;
  glossary: GlossaryItem[];
  videoSettings: VideoSettings;
  imageSettings: ImageGenerationSettings;
}

export interface ArticleSettings {
  articleType: ArticleType;
  customPrompt: string;
  includeImages: boolean;
  includeNotes: boolean;
}

// --- API & Stats Types ---

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

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

export interface VideoGenerationStats {
  slidesProcessed: number;
  totalSlides: number;
  originalChars: number;
  translatedChars: number;
  audioGenerated: number;
  totalAudio: number;
  videoDuration: number;
}

export interface ArticleGenerationStats {
  totalSlides: number;
  slidesProcessed: number;
  wordCount: number;
  generationTime: number;
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

// --- Callbacks & Results ---

export interface ProgressCallback {
  (current: number, total: number, status: string, detail?: string, currentStats?: TranslationStats): void;
}

export interface VideoProgressCallback {
  (current: number, total: number, status: string, detail?: string, currentStats?: VideoGenerationStats): void;
}

export interface ImageProgressCallback {
  (current: number, total: number, status: string, detail?: string, currentStats?: ImageGenerationStats): void;
}

export interface VideoResult {
  blob: Blob;
  stats: VideoGenerationStats;
  fileName: string;
}

export interface ArticleResult {
  blob?: Blob;
  text?: string;
  stats: ArticleGenerationStats;
  fileName: string;
}

export interface ImageResult {
  images: GeneratedImage[];
  stats: ImageGenerationStats;
  fileName: string;
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

export interface SpeechVoice {
  id: string;
  name: string;
  description: string;
}
