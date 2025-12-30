import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SettingsModal } from './components/SettingsModal';
import { StatsChart } from './components/StatsChart';
import { MagicTextDisplay } from './components/MagicTextDisplay';
import ArticleSettingsModal, { ArticleSettings } from './components/ArticleSettingsModal';
import FontSelectionModal from './components/FontSelectionModal';
import VideoReviewPage from './pages/VideoReviewPage';
import { AppSettings, AIProvider, TranslationStats, VideoResult, VideoGenerationStats, ArticleResult, ArticleGenerationStats, ImageGenerationStats, ImageResult } from './types';
import { DEFAULT_SETTINGS, N8N_CONFIG } from './constants';
import { processPPTX, replaceGlobalFonts } from './services/pptxService';
import { safeNavigate, safeGoHome } from './utils/navigationHelper';

/**
 * 根据文件名推断媒体类型
 */
function getMediaTypeFromFileName(fileName: string): string {
  if (fileName.includes('.mp4')) return 'video';
  if (fileName.includes('.mp3')) return 'audio';
  if (fileName.includes('.png') || fileName.includes('.jpg') || fileName.includes('.jpeg') || fileName.includes('.gif')) return 'images';
  return 'images';
}

/**
 * 构建媒体文件URL
 */
function buildMediaUrl(baseUrl: string, jobId: string, mediaType: string, fileName: string): string {
  // 确保baseUrl不以斜杠结尾
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/webhook/servefiles/api/slides-data/${jobId}/${mediaType}/${fileName}`;
}



const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'ai' | 'translation' | 'video' | 'image'>('ai');
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Track button hover state for dynamic feature text
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(0);

  // Track current page type for dynamic header content
  const [currentPage, setCurrentPage] = useState<'home' | 'video' | 'article' | 'image'>('home');
  // Force re-render when URL changes
  const [urlUpdateTrigger, setUrlUpdateTrigger] = useState(0);

  // Check current page based on URL
  useEffect(() => {
    const checkCurrentPage = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const jobIdParam = urlParams.get('jobId');
      const articleJobIdParam = urlParams.get('articleJobId');
      const imageJobIdParam = urlParams.get('imageJobId');

      let newPage: 'home' | 'video' | 'article' | 'image';
      if (jobIdParam) {
        newPage = 'video';
      } else if (articleJobIdParam) {
        newPage = 'article';
      } else if (imageJobIdParam) {
        newPage = 'image';
      } else {
        newPage = 'home';
      }

      setCurrentPage(newPage);

      // Force re-render to update URL-dependent rendering
      setUrlUpdateTrigger(prev => prev + 1);

      // Update window title with the new page
      updateWindowTitle(newPage);
    };

    // Update window title based on current page (Electron only)
    const updateWindowTitle = (page: 'home' | 'video' | 'article' | 'image') => {
      const titles = {
        home: 'ArcherDoc AI',
        video: '视频文案审核 - ArcherDoc AI',
        article: '文章预览 - ArcherDoc AI',
        image: 'AI生图审核 - ArcherDoc AI'
      };

      // Only update title in Electron environment
      if (window.electronAPI) {
        const electronAPI = window.electronAPI as any;
        if (electronAPI.setTitle) {
          electronAPI.setTitle(titles[page]);
        }
      }
    };

    // Check initial URL
    checkCurrentPage();

    // Listen for URL changes
    window.addEventListener('popstate', checkCurrentPage);

    // Also listen for our custom navigation events
    window.addEventListener('urlchange', checkCurrentPage);

    return () => {
      window.removeEventListener('popstate', checkCurrentPage);
      window.removeEventListener('urlchange', checkCurrentPage);
    };
  }, []);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      // Updated key to v5 to ensure new default glossary is loaded
      const saved = localStorage.getItem('archerdoc-ai-settings-v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          configs: {
            ...DEFAULT_SETTINGS.configs,
            ...parsed.configs
          }
        };
      }
    } catch (e) {
      console.warn("Failed to load settings", e);
    }
    return DEFAULT_SETTINGS;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [processingDetail, setProcessingDetail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [downloadName, setDownloadName] = useState<string>('');
  const [stats, setStats] = useState<TranslationStats | null>(null);
  const [videoStats, setVideoStats] = useState<VideoGenerationStats | null>(null);

  // History Logs
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Video generation state
  const [slideImages, setSlideImages] = useState<string[]>([]);
  const [slideScripts, setSlideScripts] = useState<string[]>([]);
  const [audioBlobs, setAudioBlobs] = useState<Blob[]>([]);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);

  // Article generation state
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [articleStats, setArticleStats] = useState<ArticleGenerationStats | null>(null);
  const [articleResult, setArticleResult] = useState<ArticleResult | null>(null);

  // Image generation state
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageStats, setImageStats] = useState<ImageGenerationStats | null>(null);
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);

  // Article generation settings state
  const [isArticleSettingsOpen, setIsArticleSettingsOpen] = useState(false);
  const [selectedArticleType, setSelectedArticleType] = useState<string>("comprehensive");
  const [selectedArticleStyle, setSelectedArticleStyle] = useState<string>("wechat");
  const [articleCustomPrompt, setArticleCustomPrompt] = useState<string>("");

  // Font selection state
  const [isFontSelectionOpen, setIsFontSelectionOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState<string>(() => {
    // 从localStorage中获取上次选择的字体，默认为思源黑体
    return localStorage.getItem('archerdoc-ai-last-font') || 'Source Han Sans CN';
  });

  // 根据字体名称获取显示名称
  const getFontDisplayName = (fontName: string): string => {
    const commonChineseFonts = [
      { name: 'Source Han Sans CN', displayName: '思源黑体' },
      { name: 'Microsoft YaHei', displayName: '微软雅黑' },
      { name: 'SimSun', displayName: '宋体' },
      { name: 'SimHei', displayName: '黑体' },
      { name: 'KaiTi', displayName: '楷体' },
      { name: 'FangSong', displayName: '仿宋' },
      { name: 'NSimSun', displayName: '新宋体' },
      { name: 'PingFang SC', displayName: '苹方' },
      { name: 'Heiti SC', displayName: '黑体-简' },
      { name: 'Songti SC', displayName: '宋体-简' },
      { name: 'Kaiti SC', displayName: '楷体-简' },
      { name: 'Hiragino Sans GB', displayName: '冬青黑体' },
      { name: 'STXihei', displayName: '华文黑体' },
      { name: 'STKaiti', displayName: '华文楷体' },
      { name: 'STSong', displayName: '华文宋体' },
      { name: 'STFangsong', displayName: '华文仿宋' },
      { name: 'STZhongsong', displayName: '华文中宋' }
    ];

    const font = commonChineseFonts.find(f => f.name === fontName);
    return font ? font.displayName : fontName;
  };

  const addLog = (msg: string) => {
    setLogs(prev => {
      const newLogs = [...prev, msg];
      if (newLogs.length > 8) newLogs.shift();
      return newLogs;
    });
  };

  // Show notification to user
  const showNotification = (message: string, type: 'success' | 'error' = 'error') => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-[9999] ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`;
    notification.textContent = message;

    // Append to body
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('archerdoc-ai-settings-v1', JSON.stringify(newSettings));
  };

  // Function to open settings with specific tab and subTab
  const handleOpenSettings = (options?: { tab?: 'ai' | 'translation' | 'video' | 'image'; subTab?: string }) => {
    if (options?.tab) {
      setSettingsInitialTab(options.tab);
    }
    // Store subTab info in localStorage for SettingsModal to use
    if (options?.subTab) {
      localStorage.setItem('settings-subtab', options.subTab);
    }
    setIsSettingsOpen(true);
  };

  const startVideoGeneration = async () => {
    // This function is now deprecated as video generation is handled by n8n backend
    // The actual video generation is triggered from VideoReviewModal when user submits the notes
    console.warn('startVideoGeneration is deprecated. Video generation is now handled by n8n backend.');
    showNotification('视频生成功能已迁移到后端，请在审核页面点击"提交并生成视频"按钮。');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (selectedFile.name.endsWith('.pptx')) {
        setFile(selectedFile);
        setError(null);
        setResultBlob(null);
        setStats(null);
        setLogs([]);
        setProgress(0);
        setStatusMessage('');
        setProcessingDetail('');
      } else {
        setError("请上传有效的 .pptx 文件。");
      }
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files[0];
    if (selectedFile && selectedFile.name.endsWith('.pptx')) {
      setFile(selectedFile);
      setError(null);
      setResultBlob(null);
      setStats(null);
      setLogs([]);
      setProgress(0);
      setStatusMessage('');
      setProcessingDetail('');
    } else {
      setError("请上传有效的 .pptx 文件。");
    }
  }, []);

  const startTranslation = async () => {
    if (!file) return;

    const activeConfig = settings.configs[settings.activeProvider];

    if (settings.activeProvider === AIProvider.GEMINI && !activeConfig.apiKey && !process.env.API_KEY) {
      setError("Gemini 需要 API Key。请在设置中配置。");
      setIsSettingsOpen(true);
      return;
    }
    if ((settings.activeProvider === AIProvider.OPENROUTER) && !activeConfig.apiKey) {
      setError("OpenRouter 需要 API Key。");
      setIsSettingsOpen(true);
      return;
    }

    setIsProcessing(true);
    setProgress(1);
    setStatusMessage("初始化中...");
    setLogs(["启动翻译引擎..."]);
    setError(null);

    // Initialize empty stats
    setStats({
      originalChars: 0,
      translatedChars: 0,
      slidesProcessed: 0,
      totalSlides: 0
    });

    try {
      const { blob, stats: finalStats } = await processPPTX(file, settings, (current, total, msg, detail, currentStats) => {
        const percentage = Math.min(100, (current / Math.max(total, 1)) * 100);
        setProgress(percentage);

        // Update real-time stats if available
        if (currentStats) {
          setStats(currentStats);
        }

        // Handle special events for magic text, otherwise standard logging
        if (msg === 'TRANSLATING_START' || msg === 'TRANSLATING_END') {
          setStatusMessage(msg); // Pass event type to magic component
          if (detail) setProcessingDetail(detail); // Pass content

          // Only log completion to keep log clean
          if (msg === 'TRANSLATING_END') {
            const snippet = detail && detail.length > 40 ? detail.substring(0, 40) + '...' : detail;
            addLog(`✓ ${snippet}`);
          }
        } else {
          setStatusMessage(msg); // Normal status like "Processing Slide 1"
          if (detail) addLog(detail);
        }
      });

      if (finalStats.original === 0) {
        throw new Error("未找到文本内容。请检查文件是否只包含图片。");
      }

      setResultBlob(blob);
      setDownloadName(`${file.name.replace('.pptx', '')}_${settings.targetLanguage}.pptx`);

      // Final safety update
      setStats({
        originalChars: finalStats.original,
        translatedChars: finalStats.translated,
        slidesProcessed: 100,
        totalSlides: 100
      });
      setStatusMessage("完成");
      setProcessingDetail("");
      addLog("所有幻灯片处理完成。");
    } catch (err: any) {
      setError(err.message || "发生意外错误。");
      setStatusMessage("失败");
      addLog(`错误: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // New function for Font Replacement
  const handleFontReplacement = async () => {
    if (!file) return;

    // 打开字体选择模态框
    setIsFontSelectionOpen(true);
  };

  // 处理字体选择确认
  const handleFontSelectionConfirm = async (fontName: string) => {
    if (!file) return;

    setSelectedFont(fontName);
    // 将选择的字体保存到localStorage
    localStorage.setItem('archerdoc-ai-last-font', fontName);

    setIsProcessing(true);
    setProgress(5);
    setStatusMessage("FONT_REPLACE"); // Custom status for magic text
    setProcessingDetail(fontName);
    setLogs([`正在扫描所有幻灯片和母版，准备替换为${fontName}...`]);
    setError(null);
    setStats(null); // Clear stats as this isn't translation
    setResultBlob(null);

    try {
      const blob = await replaceGlobalFonts(file, fontName, (msg, prog) => {
        setProgress(prog);
        addLog(msg);
      });

      setResultBlob(blob);
      setDownloadName(`${file.name.replace('.pptx', '')}_${fontName.replace(/\s+/g, '')}.pptx`);

      setStatusMessage("完成");
      setProcessingDetail("字体替换成功");
      addLog(`所有页面和母版字体已更新为${fontName}。`);
    } catch (err: any) {
      setError(err.message || "字体替换失败");
      setStatusMessage("失败");
      addLog(`错误: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultBlob) {
      setError("没有可下载的文件。");
      return;
    }
    try {
      const url = URL.createObjectURL(resultBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = downloadName || 'presentation.pptx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      setError(`下载失败: ${e.message}`);
    }
  };

  const activeConfig = settings.configs[settings.activeProvider];
  const hasApiKey = !!activeConfig.apiKey || (settings.activeProvider === AIProvider.GEMINI && !!process.env.API_KEY);
  const isOllama = settings.activeProvider === AIProvider.OLLAMA;

  return (
    <div className="min-h-screen bg-dark text-gray-100 font-sans selection:bg-primary selection:text-white">

      <nav className="border-b border-gray-800 bg-dark/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
              AI
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg tracking-tight">ArcherDoc AI</span>
              {currentPage !== 'home' && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="text-sm text-gray-300">
                    {currentPage === 'video' && '视频文案审核'}
                    {currentPage === 'article' && '文章预览'}
                    {currentPage === 'image' && 'AI生图审核'}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentPage !== 'home' && (
              <button
                onClick={safeGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                <span>🏠</span>
                <span>返回首页</span>
              </button>
            )}
            {currentPage === 'home' && installPrompt && (
              <button onClick={handleInstallApp} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-primary hover:text-white transition-all text-sm font-medium border border-primary/50">
                <span>⬇️ 安装应用</span>
              </button>
            )}
            <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-sm font-medium border border-gray-700">
              <span>⚙️ 设置</span>
              {currentPage === 'home' && (!hasApiKey && !isOllama) && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            </button>
          </div>
        </div>
      </nav>

      {/* Article Generation Settings Modal */}
      <ArticleSettingsModal
        isOpen={isArticleSettingsOpen}
        onClose={() => setIsArticleSettingsOpen(false)}
        onGenerate={async (articleSettings) => {
          // Start processing to generate article with selected settings
          setIsProcessing(true);
          setProgress(10);
          setStatusMessage("初始化中...");
          setLogs(["启动文章生成引擎..."]);
          setError(null);
          setArticleStats(null);

          let jobId: string | null = null;

          try {
            // Helper function to add delay
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

            // Wait at least 1 second for the initial status to be displayed
            await delay(1000);

            // Step 1: Create FormData with PPT file and API settings
            const step1Msg = "正在准备上传数据...";
            addLog(step1Msg);
            setStatusMessage(step1Msg);
            setProcessingDetail("正在准备PPT文件和API配置...");
            setProgress(20);
            await delay(1000); // Wait at least 1 second for this step

            const formData = new FormData();
            formData.append('pptFile', file!); // 使用pptFile匹配n8n工作流的binaryPropertyName设置
            formData.append('articleType', articleSettings.articleType);
            formData.append('articleStyle', articleSettings.articleStyle);
            formData.append('customPrompt', articleSettings.customPrompt);
            formData.append('aiProvider', settings.activeProvider);
            formData.append('aiModel', settings.configs[settings.activeProvider].model);
            formData.append('aiApiKey', settings.configs[settings.activeProvider].apiKey);
            formData.append('aiBaseUrl', settings.configs[settings.activeProvider].baseUrl || '');
            formData.append('processingType', 'article'); // 添加processingType参数

            // Step 2: Upload to n8n backend for article generation
            const step2Msg = "正在上传PPT文件到服务器...";
            addLog(step2Msg);
            setStatusMessage(step2Msg);
            setProcessingDetail(`正在上传 ${file.name}...`);
            setProgress(30);
            await delay(1000); // Wait at least 1 second for this step

            const n8nUrl = N8N_CONFIG.BASE_URL;
            const response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/upload-ppt`, {
              method: 'POST',
              body: formData
            });

            if (!response.ok) {
              throw new Error(`上传失败: ${response.statusText}`);
            }

            const result = await response.json();
            const step2CompleteMsg = `上传成功，文章生成中...`;
            addLog(step2CompleteMsg);
            setStatusMessage(step2CompleteMsg);
            setProcessingDetail("PPT文件上传成功，正在生成文章...");
            setProgress(50);
            await delay(1000); // Wait at least 1 second for this step

            // Step 3: Extract jobId from response
            jobId = result.jobId;

            if (!jobId) {
              throw new Error("无法从响应中提取Job ID");
            }

            const step3Msg = `提取到Job ID: ${jobId}`;
            addLog(step3Msg);
            setStatusMessage(step3Msg);
            setProcessingDetail("正在生成文章内容...");
            setProgress(60);
            await delay(1000); // Wait at least 1 second for this step

            // Step 4: Get article data from backend
            addLog("正在获取文章生成结果...");
            // Wait for article generation to complete
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Use the correct endpoint to get article data
            const articleDataResponse = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/get-article-data?jobId=${jobId}`);

            if (!articleDataResponse.ok) {
              throw new Error(`获取文章数据失败: ${articleDataResponse.statusText}`);
            }

            const articleData = await articleDataResponse.json();
            const step4Msg = `文章生成完成，共 ${articleData.wordCount} 字`;
            addLog(step4Msg);
            setStatusMessage(step4Msg);
            setProcessingDetail("正在准备文章数据...");
            setProgress(80);
            await delay(1000); // Wait at least 1 second for this step

            // Step 5: Redirect to article review page with jobId
            const step5Msg = "文章生成完成，准备进入预览页面...";
            addLog(step5Msg);
            setStatusMessage(step5Msg);
            setProcessingDetail("所有数据准备就绪，即将进入预览页面...");
            setProgress(100);
            await delay(1000); // Wait at least 1 second for this step

          } catch (err: any) {
            setError(err.message || "发生意外错误。");
            setStatusMessage("失败");
            addLog(`错误: ${err.message}`);
            setIsProcessing(false);
          } finally {
            setIsProcessing(false);
            // Redirect to article review page with jobId
            if (jobId) {
              safeNavigate(`/?articleJobId=${jobId}`);
            }
          }
        }}
      />

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        {/* Page Title */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 pb-2">
            AI 驱动的企业级智能文档处理平台
          </h1>
          {/* Dynamic Feature Introduction */}
          <div className="relative max-w-3xl mx-auto h-16">
            {(() => {
              // Create a dynamic text component for feature introduction
              const FeatureIntro: React.FC<{ isHovering: boolean; hoveredIndex: number }> = ({ isHovering, hoveredIndex }) => {
                const [currentIndex, setCurrentIndex] = useState(0);
                const [nextIndex, setNextIndex] = useState(1);
                const [currentOpacity, setCurrentOpacity] = useState(1);
                const [nextOpacity, setNextOpacity] = useState(0);

                // Extended feature descriptions with ~50 characters each
                const features = [
                  "AI技术精准翻译PPT内容，保持原文件的排版、字体和风格不变，无需手动调整格式",
                  "自动为PPT生成专业演讲文稿，结合AI语音合成技术，快速生成高质量动态讲解视频",
                  "将PPT内容转换为适合公众号、小红书、微博等平台的专业文章，节省内容创作时间",
                  "批量统一PPT中所有文字的字体，支持自定义字体，确保文档风格一致，提升专业感",
                  "基于PPT内容智能生成相关配图，支持多种AI模型，一键提升PPT视觉效果和专业度"
                ];

                useEffect(() => {
                  if (isHovering) {
                    // If hovering, immediately show the hovered feature
                    setCurrentIndex(hoveredIndex);
                    setCurrentOpacity(1);
                    setNextOpacity(0);
                    return;
                  }

                  // Configuration
                  const holdDuration = 3000; // Hold fully visible text for 3 seconds
                  const fadeDuration = 1000; // Fade transition takes 1 second
                  const overlapDuration = 500; // Overlap between fades is 0.5 seconds

                  const startCycle = () => {
                    // Reset opacities for new cycle
                    setCurrentOpacity(1);
                    setNextOpacity(0);

                    // Set next index
                    const newNextIndex = (currentIndex + 1) % features.length;
                    setNextIndex(newNextIndex);

                    // Hold current text fully visible for holdDuration
                    const holdTimer = setTimeout(() => {
                      // Start cross fade animation
                      const startTime = Date.now();

                      const animate = () => {
                        const elapsed = Date.now() - startTime;
                        const progress = Math.min(elapsed / fadeDuration, 1);

                        // Calculate opacities with overlap
                        if (elapsed <= overlapDuration) {
                          // First half: both texts fading with overlap
                          setCurrentOpacity(1 - (progress * 2)); // Current fades out faster
                          setNextOpacity(progress * 2); // Next fades in faster
                        } else {
                          // Second half: continue fade
                          setCurrentOpacity(0); // Current fully faded out
                          setNextOpacity(0.5 + (progress - 0.5) * 2); // Next continues to full opacity
                        }

                        if (progress < 1) {
                          requestAnimationFrame(animate);
                        } else {
                          // Fade complete, update index and start next cycle
                          setCurrentIndex(newNextIndex);
                          clearTimeout(holdTimer);
                          startCycle();
                        }
                      };

                      animate();
                    }, holdDuration);

                    return () => clearTimeout(holdTimer);
                  };

                  // Initial cycle
                  startCycle();
                }, [currentIndex, isHovering, hoveredIndex]);

                return (
                  <div className="relative text-center">
                    {/* Current feature text */}
                    <div
                      className="absolute inset-0 transition-opacity duration-1000 ease-in-out text-gray-400 text-lg"
                      style={{ opacity: currentOpacity, zIndex: 1 }}
                    >
                      <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-gray-400 via-white to-gray-400 animate-shimmer">
                        {isHovering ? features[hoveredIndex] : features[currentIndex]}
                      </span>
                    </div>

                    {/* Next feature text (only for cycling, not for hover) */}
                    {!isHovering && (
                      <div
                        className="absolute inset-0 transition-opacity duration-1000 ease-in-out text-gray-400 text-lg"
                        style={{ opacity: nextOpacity, zIndex: 2 }}
                      >
                        <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-gray-400 via-white to-gray-400 animate-shimmer">
                          {features[nextIndex]}
                        </span>
                      </div>
                    )}
                  </div>
                );
              };
              return <FeatureIntro isHovering={isHovering} hoveredIndex={hoveredIndex} />;
            })()}
          </div>
        </div>

        <div className="space-y-8">

          {/* File Upload Area - Hide when processing or completed */}
          {!isProcessing && !resultBlob && (
            <div
              className={`relative border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center transition-all
                    hover:border-primary/50 hover:bg-gray-800/50 cursor-pointer border-gray-700 bg-card
                    `}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {!file ? (
                <>
                  <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 text-5xl shadow-inner">📂</div>
                  <h3 className="text-2xl font-semibold text-white mb-4">拖放 PPTX 文件到这里</h3>
                  <input type="file" accept=".pptx" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </>
              ) : (
                <div className="space-y-4 w-full">
                  <div className="w-24 h-24 mx-auto bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4 text-4xl border border-primary/30">PPT</div>
                  <div><h3 className="text-2xl font-semibold text-white truncate px-4">{file.name}</h3></div>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); setError(null); setLogs([]); setSlideImages([]); setSlideScripts([]); setAudioBlobs([]); setVideoResult(null); setImageStats(null); setImageResult(null); }} className="text-sm text-red-400 hover:text-red-300 underline">移除文件</button>
                </div>
              )}
            </div>
          )}

          {/* MAIN ACTION BUTTONS - Show only when file is selected */}
          {!isProcessing && file && !resultBlob && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={startTranslation}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-blue-600 p-5 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-95 text-left flex items-center gap-4"
                onMouseEnter={() => { setIsHovering(true); setHoveredIndex(0); }}
                onMouseLeave={() => setIsHovering(false)}
              >
                <div className="relative z-10 bg-white/20 p-3 rounded-lg backdrop-blur-sm shrink-0">
                  <div className="text-2xl">🚀</div>
                </div>
                <div className="relative z-10 flex flex-col">
                  <div className="font-bold text-white text-lg">文本翻译</div>
                  <div className="text-xs text-blue-100 opacity-90">保持排版，智能翻译</div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
              </button>

              <button
                onClick={async () => {
                  if (!file) {
                    setError("请先选择一个PPTX文件");
                    return;
                  }

                  // Start processing to generate slides for image generation
                  setIsProcessing(true);
                  setProgress(10);
                  setStatusMessage("初始化中...");
                  setLogs(["启动AI配图引擎..."]);
                  setError(null);
                  setImageStats(null);
                  setSlideImages([]);

                  let result: any;
                  let jobId: string | null = null;

                  try {
                    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

                    // Step 1: Create FormData with PPT file and AI model settings
                    const step1Msg = "正在准备上传数据...";
                    addLog(step1Msg);
                    setStatusMessage(step1Msg);
                    setProcessingDetail("正在准备PPT文件和AI配置...");
                    setProgress(20);
                    await delay(1000);

                    const formData = new FormData();
                    formData.append('file', file);

                    // Add AI model configuration for content analysis
                    formData.append('aiProvider', settings.activeProvider);
                    formData.append('aiModel', settings.configs[settings.activeProvider].model);
                    formData.append('aiApiKey', settings.configs[settings.activeProvider].apiKey);
                    formData.append('aiBaseUrl', settings.configs[settings.activeProvider].baseUrl || '');
                    formData.append('processingType', 'image'); // 添加processingType参数

                    // Add image generation specific settings
                    formData.append('imageProvider', settings.imageSettings.defaultProvider);
                    formData.append('comfyuiBaseUrl', settings.imageSettings.comfyuiSettings.baseUrl);
                    formData.append('comfyuiModel', settings.imageSettings.comfyuiSettings.model);
                    formData.append('nanobananaApiKey', settings.imageSettings.nanobananaSettings.apiKey);
                    formData.append('nanobananaModel', settings.imageSettings.nanobananaSettings.model);

                    // Step 2: Upload to n8n backend for image generation
                    const step2Msg = "正在上传PPT文件到服务器...";
                    addLog(step2Msg);
                    setStatusMessage(step2Msg);
                    setProcessingDetail(`正在上传 ${file.name}...`);
                    setProgress(40);
                    await delay(1000);

                    const response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/upload-ppt`, {
                      method: 'POST',
                      body: formData
                    });

                    if (!response.ok) {
                      throw new Error(`上传失败: ${response.statusText}`);
                    }

                    result = await response.json();
                    const step2CompleteMsg = `上传成功，重定向URL: ${result.redirectUrl}`;
                    addLog(step2CompleteMsg);
                    setStatusMessage(step2CompleteMsg);
                    setProcessingDetail("PPT文件上传成功，正在处理...");
                    setProgress(50);
                    await delay(1000); // Wait at least 1 second for this step

                    // Step 3: Extract jobId from redirectUrl
                    const urlParams = new URLSearchParams(new URL(result.redirectUrl).search);
                    jobId = urlParams.get('jobId');

                    if (!jobId) {
                      throw new Error("无法从响应中提取Job ID");
                    }

                    const step3Msg = `提取到Job ID: ${jobId}`;
                    addLog(step3Msg);
                    setStatusMessage(step3Msg);
                    setProcessingDetail("正在初始化配图界面...");
                    setProgress(80);
                    await delay(1000);

                    const step4Msg = `图片生成准备完成，即将进入配图页面...`;
                    addLog(step4Msg);
                    setStatusMessage(step4Msg);
                    setProcessingDetail("所有数据准备就绪，即将进入配图页面...");
                    setProgress(100);
                    await delay(1000);

                  } catch (err: any) {
                    setError(err.message || "发生意外错误。");
                    setStatusMessage("失败");
                    addLog(`错误: ${err.message}`);
                    setIsProcessing(false);
                  } finally {
                    setIsProcessing(false);
                    // Redirect to image review page with jobId
                    if (jobId) {
                      safeNavigate(`/?imageJobId=${jobId}`);
                    }
                  }
                }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 p-5 transition-all hover:shadow-lg hover:shadow-orange-500/25 active:scale-95 text-left flex items-center gap-4"
                onMouseEnter={() => { setIsHovering(true); setHoveredIndex(4); }}
                onMouseLeave={() => setIsHovering(false)}
              >
                <div className="relative z-10 bg-white/20 p-3 rounded-lg backdrop-blur-sm shrink-0 flex items-center justify-center w-14 h-14">
                  <span className="font-serif font-bold text-white text-xl">🎨</span>
                </div>
                <div className="relative z-10 flex flex-col">
                  <div className="font-bold text-white text-lg">AI配图</div>
                  <div className="text-xs text-orange-100 opacity-90">智能插图生成</div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
              </button>

              <button
                onClick={() => {
                  if (!file) {
                    setError("请先选择一个PPTX文件");
                    return;
                  }
                  // Open article settings dialog instead of direct generation
                  setIsArticleSettingsOpen(true);
                }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 p-5 transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 text-left flex items-center gap-4"
                onMouseEnter={() => { setIsHovering(true); setHoveredIndex(2); }}
                onMouseLeave={() => setIsHovering(false)}
              >
                <div className="relative z-10 bg-white/20 p-3 rounded-lg backdrop-blur-sm shrink-0 flex items-center justify-center w-14 h-14">
                  <span className="font-serif font-bold text-white text-xl">📝</span>
                </div>
                <div className="relative z-10 flex flex-col">
                  <div className="font-bold text-white text-lg">文章撰写</div>
                  <div className="text-xs text-blue-100 opacity-90">AI软文生成</div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
              </button>

              <button
                onClick={async () => {
                  if (!file) {
                    setError("请先选择一个PPTX文件");
                    return;
                  }

                  // Start processing to generate slides and scripts for review
                  setIsProcessing(true);
                  setProgress(10);
                  setStatusMessage("初始化中...");
                  setLogs(["启动视频生成引擎..."]);
                  setError(null);
                  setVideoStats(null);

                  let jobId: string | null = null;

                  try {
                    // Helper function to add delay
                    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

                    // Wait at least 1 second for the initial status to be displayed
                    await delay(1000);

                    // Step 1: Create FormData with PPT file and API settings
                    const step1Msg = "正在准备上传数据...";
                    addLog(step1Msg);
                    setStatusMessage(step1Msg);
                    setProcessingDetail("正在准备PPT文件和API配置...");
                    setProgress(20);
                    await delay(1000); // Wait at least 1 second for this step

                    const formData = new FormData();
                    formData.append('auditorEmail', ''); // Default email
                    formData.append('groupId', settings.videoSettings.minimaxGroupId);
                    formData.append('accessToken', settings.videoSettings.minimaxAccessToken);
                    formData.append('voiceId', settings.videoSettings.voiceId);
                    // 添加AI讲稿生成参数
                    formData.append('aiProvider', settings.activeProvider);
                    formData.append('aiModel', settings.configs[settings.activeProvider].model);
                    formData.append('aiApiKey', settings.configs[settings.activeProvider].apiKey);
                    formData.append('aiBaseUrl', settings.configs[settings.activeProvider].baseUrl || '');
                    formData.append('pptFile0', file!); // Use pptFile0 as expected by the webhook
                    formData.append('processingType', 'video'); // 添加processingType参数

                    // Step 2: Upload to n8n backend with correct webhook path
                    const step2Msg = "正在上传PPT文件到服务器...";
                    addLog(step2Msg);
                    setStatusMessage(step2Msg);
                    setProcessingDetail(`正在上传 ${file.name}...`);
                    setProgress(30);
                    await delay(1000); // Wait at least 1 second for this step

                    const n8nUrl = N8N_CONFIG.BASE_URL;
                    const response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/upload-ppt`, {
                      method: 'POST',
                      body: formData
                    });

                    if (!response.ok) {
                      throw new Error(`上传失败: ${response.statusText}`);
                    }

                    const result = await response.json();
                    const step2CompleteMsg = `上传成功，重定向URL: ${result.redirectUrl}`;
                    addLog(step2CompleteMsg);
                    setStatusMessage(step2CompleteMsg);
                    setProcessingDetail("PPT文件上传成功，正在处理...");
                    setProgress(50);
                    await delay(1000); // Wait at least 1 second for this step

                    // Step 3: Extract jobId from redirectUrl
                    const urlParams = new URLSearchParams(new URL(result.redirectUrl).search);
                    jobId = urlParams.get('jobId');

                    if (!jobId) {
                      throw new Error("无法从响应中提取Job ID");
                    }

                    const step3Msg = `提取到Job ID: ${jobId}`;
                    addLog(step3Msg);
                    setStatusMessage(step3Msg);
                    setProcessingDetail("正在获取处理结果...");
                    setProgress(60);
                    await delay(1000); // Wait at least 1 second for this step

                    // Step 4: Get job data from backend
                    addLog("正在获取处理结果...");
                    // Wait a bit for the backend to process the PPT
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    // Use the correct endpoint to get job data
                    const jobDataResponse = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/get-job-data?jobId=${jobId}`);

                    if (!jobDataResponse.ok) {
                      throw new Error(`获取数据失败: ${jobDataResponse.statusText}`);
                    }

                    const jobData = await jobDataResponse.json();
                    const step4Msg = `获取到 ${jobData.notes.length} 张幻灯片的讲稿`;
                    addLog(step4Msg);
                    setStatusMessage(step4Msg);
                    setProcessingDetail("正在准备讲稿和幻灯片数据...");
                    setProgress(80);
                    await delay(1000); // Wait at least 1 second for this step

                    // Step 5: Set slide images and scripts from backend
                    const images = jobData.slides.map((slide: string) =>
                      buildMediaUrl(N8N_CONFIG.BASE_URL, jobId, 'images', slide)
                    );
                    setSlideImages(images);

                    const scripts = jobData.notes.map((note: any) => note.note);
                    setSlideScripts(scripts);

                    const step5Msg = "讲稿生成完成，准备进入审核页面...";
                    addLog(step5Msg);
                    setStatusMessage(step5Msg);
                    setProcessingDetail("所有数据准备就绪，即将进入审核页面...");
                    setProgress(100);
                    await delay(1000); // Wait at least 1 second for this step

                  } catch (err: any) {
                    setError(err.message || "发生意外错误。");
                    setStatusMessage("失败");
                    addLog(`错误: ${err.message}`);
                    setIsProcessing(false);
                  } finally {
                    setIsProcessing(false);
                    // Redirect to video review page with jobId
                    if (jobId) {
                      safeNavigate(`/?jobId=${jobId}`);
                    }
                  }
                }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 p-5 transition-all hover:shadow-lg hover:shadow-purple-500/25 active:scale-95 text-left flex items-center gap-4"
                onMouseEnter={() => { setIsHovering(true); setHoveredIndex(1); }}
                onMouseLeave={() => setIsHovering(false)}
              >
                <div className="relative z-10 bg-white/20 p-3 rounded-lg backdrop-blur-sm shrink-0 flex items-center justify-center w-14 h-14">
                  <span className="font-serif font-bold text-white text-xl">🎬</span>
                </div>
                <div className="relative z-10 flex flex-col">
                  <div className="font-bold text-white text-lg">视频配音</div>
                  <div className="text-xs text-purple-100 opacity-90">AI讲稿+语音合成</div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
              </button>

              <button
                onClick={handleFontReplacement}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-secondary to-emerald-600 p-5 transition-all hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95 text-left flex items-center gap-4"
                onMouseEnter={() => { setIsHovering(true); setHoveredIndex(3); }}
                onMouseLeave={() => setIsHovering(false)}
              >
                <div className="relative z-10 bg-white/20 p-3 rounded-lg backdrop-blur-sm shrink-0 flex items-center justify-center w-14 h-14">
                  <span className="font-serif font-bold text-white text-xl">Aa</span>
                </div>
                <div className="relative z-10 flex flex-col">
                  <div className="font-bold text-white text-lg">字体统一</div>
                  <div className="text-xs text-emerald-100 opacity-90">一键转为{getFontDisplayName(selectedFont)}</div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
              </button>
            </div>
          )}

          {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-center gap-2">⚠️ {error}</div>}

          {(isProcessing || logs.length > 0) && (
            <div className="bg-card border border-gray-700 rounded-xl overflow-hidden shadow-xl flex flex-col">
              {/* Magic Visualization Area */}
              <div className="p-6 border-b border-gray-700 bg-gray-800/50">
                <div className="flex justify-between text-sm font-medium text-gray-300 mb-4">
                  <span className="flex items-center gap-2">
                    {isProcessing && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>}
                    {isProcessing ? '处理中...' : '空闲'}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>

                <MagicTextDisplay status={statusMessage} text={processingDetail} />

                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-6 overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-secondary h-1.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              {/* History Log */}
              <div className="bg-gray-900 p-4 font-mono text-xs h-32 overflow-y-auto flex flex-col-reverse border-t border-black">
                <div ref={logsEndRef} />
                {logs.slice().reverse().map((log, i) => (
                  <div key={i} className="mb-1 text-gray-500 break-all">{log}</div>
                ))}
              </div>
            </div>
          )}

          {resultBlob && (
            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h3 className="text-lg font-bold text-white">处理完成！</h3>
                <p className="text-sm text-gray-400">您的文档已准备好下载。</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    // Reset all states and return to homepage
                    setFile(null);
                    setResultBlob(null);
                    setError(null);
                    setLogs([]);
                    setStats(null);
                    setVideoStats(null);
                    setSlideImages([]);
                    setSlideScripts([]);
                    setAudioBlobs([]);
                    setVideoResult(null);
                    setImageStats(null);
                    setImageResult(null);
                  }}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
                >
                  <span>🏠 返回首页</span>
                </button>
                <button
                  onClick={() => {
                    // Open font selection modal for re-generation
                    setIsFontSelectionOpen(true);
                  }}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
                >
                  <span>🔄 重新生成</span>
                </button>
                <button onClick={downloadResult} className="px-6 py-3 bg-secondary hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95">
                  <span>⬇️ 下载文件</span>
                </button>
              </div>
            </div>
          )}

          {/* Show Stats Chart for translation */}
          {(stats || videoStats) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                {/* Stats Chart for translation */}
                {stats && (
                  <div className="bg-card border border-gray-700 rounded-xl p-6 shadow-lg">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">实时数据</h3>
                    <StatsChart stats={stats} />
                  </div>
                )}

                {/* Video Stats */}
                {videoStats && (
                  <div className="bg-card border border-gray-700 rounded-xl p-6 shadow-lg">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">视频生成统计</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">幻灯片数量</span><span className="text-primary">{videoStats.slidesProcessed} / {videoStats.totalSlides}</span></div>
                      <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">视频时长</span><span className="text-primary">{videoStats.videoDuration.toFixed(1)} 秒</span></div>
                      <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">音频生成</span><span className="text-primary">{videoStats.audioGenerated} / {videoStats.totalAudio}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Config Overview - Only show for translation (when stats exist) */}
              {stats && (
                <div className="space-y-6">
                  <div className="bg-card border border-gray-700 rounded-xl p-6 shadow-lg flex flex-col">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">配置概览</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">目标语言</span><span className="text-primary">{settings.targetLanguage}</span></div>
                      <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">提供商</span><span className="text-white">{settings.activeProvider}</span></div>
                    </div>

                    {settings.glossary && settings.glossary.length > 0 && (
                      <div className="mt-4">
                        <div className="text-xs text-gray-400 mb-2 flex justify-between items-center">
                          <span>专有名词表</span>
                          <span className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px]">{settings.glossary.length}</span>
                        </div>
                        <div className="bg-gray-900/50 rounded border border-gray-800 p-2 max-h-[120px] overflow-y-auto custom-scrollbar space-y-1.5">
                          {settings.glossary.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs gap-2">
                              <span className="text-gray-300 truncate max-w-[80px]" title={item.term}>{item.term}</span>
                              <span className="text-gray-600 text-[10px]">➜</span>
                              <span className="text-green-400 truncate max-w-[80px]" title={item.translation}>{item.translation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button onClick={() => setIsSettingsOpen(true)} className="w-full mt-6 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-white font-medium">编辑配置</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={handleSaveSettings} initialTab={settingsInitialTab} />
      <FontSelectionModal
        isOpen={isFontSelectionOpen}
        onClose={() => setIsFontSelectionOpen(false)}
        onConfirm={handleFontSelectionConfirm}
        defaultFont={selectedFont}
      />
    </div>
  );
};

// Add routing logic to App component
const ArticleReviewPage = React.lazy(() => import('./pages/ArticleReviewPage'));
const ImageReviewPage = React.lazy(() => import('./pages/ImageReviewPage').then(module => ({ default: module.ImageReviewPage })));

const AppWithRouting: React.FC = () => {
  // Track current page type for dynamic header content
  const [currentPage, setCurrentPage] = useState<'home' | 'video' | 'article' | 'image'>('home');

  // Check current page based on URL
  useEffect(() => {
    const checkCurrentPage = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const jobIdParam = urlParams.get('jobId');
      const articleJobIdParam = urlParams.get('articleJobId');
      const imageJobIdParam = urlParams.get('imageJobId');

      let newPage: 'home' | 'video' | 'article' | 'image';
      if (jobIdParam) {
        newPage = 'video';
      } else if (articleJobIdParam) {
        newPage = 'article';
      } else if (imageJobIdParam) {
        newPage = 'image';
      } else {
        newPage = 'home';
      }

      setCurrentPage(newPage);
    };

    // Check initial URL
    checkCurrentPage();

    // Listen for URL changes
    window.addEventListener('popstate', checkCurrentPage);
    window.addEventListener('urlchange', checkCurrentPage);

    return () => {
      window.removeEventListener('popstate', checkCurrentPage);
      window.removeEventListener('urlchange', checkCurrentPage);
    };
  }, []);

  // Get settings to share across all pages
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('archerdoc-ai-settings-v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          configs: {
            ...DEFAULT_SETTINGS.configs,
            ...parsed.configs
          }
        };
      }
    } catch (e) {
      console.warn("Failed to load settings", e);
    }
    return DEFAULT_SETTINGS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'ai' | 'translation' | 'video' | 'image'>('ai');

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('archerdoc-ai-settings-v1', JSON.stringify(newSettings));
  };

  // Function to open settings with specific tab and subTab
  const handleOpenSettings = (options?: { tab?: 'ai' | 'translation' | 'video' | 'image'; subTab?: string }) => {
    if (options?.tab) {
      setSettingsInitialTab(options.tab);
    }
    // Store subTab info in localStorage for SettingsModal to use
    if (options?.subTab) {
      localStorage.setItem('settings-subtab', options.subTab);
    }
    setIsSettingsOpen(true);
  };

  // If URL has jobId parameter, show video review page
  if (currentPage === 'video') {
    return (
      <>
        <div className="min-h-screen bg-dark text-gray-100 font-sans selection:bg-primary selection:text-white">
          {/* Unified Navigation */}
          <nav className="border-b border-gray-800 bg-dark/50 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
                  AI
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg tracking-tight">ArcherDoc AI</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-sm text-gray-300">视频文案审核</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={safeGoHome}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  <span>🏠</span>
                  <span>返回首页</span>
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-sm font-medium border border-gray-700"
                >
                  <span>⚙️ 设置</span>
                </button>
              </div>
            </div>
          </nav>

          <React.Suspense fallback={<div className="text-center mt-20 text-gray-400">加载视频预览页面中...</div>}>
            <VideoReviewPage
              jobId={new URLSearchParams(window.location.search).get('jobId') || ''}
              videoSettings={settings.videoSettings}
              onOpenSettings={handleOpenSettings}
              settings={settings}
              onSaveSettings={handleSaveSettings}
            />
          </React.Suspense>
        </div>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={handleSaveSettings}
          initialTab={settingsInitialTab}
        />
      </>
    );
  }

  // If URL has articleJobId parameter, show article review page
  if (currentPage === 'article') {
    return (
      <>
        <div className="min-h-screen bg-dark text-gray-100 font-sans selection:bg-primary selection:text-white">
          {/* Unified Navigation */}
          <nav className="border-b border-gray-800 bg-dark/50 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
                  AI
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg tracking-tight">ArcherDoc AI</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-sm text-gray-300">文章预览</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={safeGoHome}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  <span>🏠</span>
                  <span>返回首页</span>
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-sm font-medium border border-gray-700"
                >
                  <span>⚙️ 设置</span>
                </button>
              </div>
            </div>
          </nav>

          <React.Suspense fallback={<div className="text-center mt-20 text-gray-400">加载文章预览页面中...</div>}>
            <ArticleReviewPage
              articleJobId={new URLSearchParams(window.location.search).get('articleJobId') || ''}
              onOpenSettings={handleOpenSettings}
              settings={settings}
              onSaveSettings={handleSaveSettings}
            />
          </React.Suspense>
        </div>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={handleSaveSettings}
          initialTab={settingsInitialTab}
        />
      </>
    );
  }

  // If URL has imageJobId parameter, show image review page
  if (currentPage === 'image') {
    return (
      <>
        <div className="min-h-screen bg-dark text-gray-100 font-sans selection:bg-primary selection:text-white">
          {/* Unified Navigation */}
          <nav className="border-b border-gray-800 bg-dark/50 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
                  AI
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg tracking-tight">ArcherDoc AI</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-sm text-gray-300">AI生图审核</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={safeGoHome}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  <span>🏠 返回首页</span>
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-sm font-medium border border-gray-700"
                >
                  <span>⚙️ 设置</span>
                </button>
              </div>
            </div>
          </nav>

          <React.Suspense fallback={<div className="text-center mt-20 text-gray-400">加载AI配图页面中...</div>}>
            <ImageReviewPage
              imageJobId={new URLSearchParams(window.location.search).get('imageJobId') || ''}
              onOpenSettings={handleOpenSettings}
              settings={settings}
              onSaveSettings={handleSaveSettings}
            />
          </React.Suspense>
        </div>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={handleSaveSettings}
          initialTab={settingsInitialTab}
        />
      </>
    );
  }

  // Otherwise, show main page
  return <App />;
};

export default AppWithRouting;