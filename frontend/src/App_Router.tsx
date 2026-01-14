import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SettingsModal } from './components/SettingsModal';
import { StatsChart } from './components/StatsChart';
import { MagicTextDisplay } from './components/MagicTextDisplay';
import ArticleSettingsModal, { ArticleSettings } from './components/ArticleSettingsModal';
import FontSelectionModal from './components/FontSelectionModal';
import VideoReviewPage from './pages/VideoReviewPage';
import ImageReviewPage from './pages/ImageReviewPage';
import ArticleReviewPage from './pages/ArticleReviewPage';
import { AppSettings, AIProvider, TranslationStats, VideoResult, VideoGenerationStats, ArticleResult, ArticleGenerationStats, ImageGenerationStats, ImageResult } from './types';
import { DEFAULT_SETTINGS, API_CONFIG } from './constants';
import { processPPTX, replaceGlobalFonts } from './services/pptxService';

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

/**
 * 主应用组件 - 包含路由逻辑
 */
function MainAppComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isArticleSettingsOpen, setIsArticleSettingsOpen] = useState(false);
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  const [stats, setStats] = useState<TranslationStats>({ totalChars: 0, translatedChars: 0, processingTime: 0 });
  const [showStats, setShowStats] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<ImageResult[]>([]);
  const [imageStats, setImageStats] = useState<ImageGenerationStats>({ total: 0, success: 0, failed: 0 });
  const [magicText, setMagicText] = useState<string>('');
  const [articleSettings, setArticleSettings] = useState<ArticleSettings>({
    theme: 'technology',
    style: 'professional',
    wordCount: 'medium',
    targetAudience: 'professionals'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  // 页面状态：'home', 'image', 'video', 'article'
  const [currentPage, setCurrentPage] = useState<'home' | 'image' | 'video' | 'article'>('home');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentImageJobId, setCurrentImageJobId] = useState<string | null>(null);
  const [currentArticleJobId, setCurrentArticleJobId] = useState<string | null>(null);

  // 从URL参数获取jobId并设置页面状态
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobId = params.get('jobId');
    const imageJobId = params.get('imageJobId');
    const articleJobId = params.get('articleJobId');

    if (imageJobId) {
      setCurrentPage('image');
      setCurrentImageJobId(imageJobId);
    } else if (articleJobId) {
      setCurrentPage('article');
      setCurrentArticleJobId(articleJobId);
    } else if (jobId) {
      setCurrentPage('video');
      setCurrentJobId(jobId);
    }
  }, [location.search]);

  // 获取当前页面的jobId
  const getCurrentJobId = () => {
    switch (currentPage) {
      case 'image': return currentImageJobId;
      case 'video': return currentJobId;
      case 'article': return currentArticleJobId;
      default: return null;
    }
  };

  // 重写navigateToUrl函数，使用状态管理而不是页面跳转
  const navigateToUrl = useCallback((url: string) => {
    const urlObj = new URL(url, window.location.origin);
    const params = urlObj.searchParams;

    const jobId = params.get('jobId');
    const imageJobId = params.get('imageJobId');
    const articleJobId = params.get('articleJobId');

    if (imageJobId) {
      setCurrentPage('image');
      setCurrentImageJobId(imageJobId);
    } else if (articleJobId) {
      setCurrentPage('article');
      setCurrentArticleJobId(articleJobId);
    } else if (jobId) {
      setCurrentPage('video');
      setCurrentJobId(jobId);
    } else {
      // 返回首页
      setCurrentPage('home');
      setCurrentJobId(null);
      setCurrentImageJobId(null);
      setCurrentArticleJobId(null);
    }
  }, []);

  // 渲染导航按钮
  const renderNavigationButtons = () => (
    <div className="flex justify-center space-x-4 mb-6">
      <button
        onClick={() => {
          setCurrentPage('home');
          setCurrentJobId(null);
          setCurrentImageJobId(null);
          setCurrentArticleJobId(null);
        }}
        className={`px-6 py-3 rounded-lg font-medium transition-all ${currentPage === 'home'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
      >
        首页
      </button>

      {(currentJobId || currentImageJobId || currentArticleJobId) && (
        <button
          onClick={() => {
            setCurrentPage('home');
            setCurrentJobId(null);
            setCurrentImageJobId(null);
            setCurrentArticleJobId(null);
          }}
          className="px-6 py-3 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
        >
          返回首页
        </button>
      )}
    </div>
  );

  // 渲染主页面内容
  const renderHomePage = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ArcherDoc AI
          </h1>
          <p className="text-xl text-gray-600">
            智能PPT处理与内容生成平台
          </p>
        </div>

        <MagicTextDisplay />

        {/* 错误显示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* 统计信息 */}
        {showStats && (
          <StatsChart stats={stats} onClose={() => setShowStats(false)} />
        )}

        {/* 上传区域 */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div
            className={`border-4 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              } ${isGenerating ? 'pointer-events-none opacity-50' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              dragCounterRef.current--;
              if (dragCounterRef.current === 0) {
                setIsDragging(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              dragCounterRef.current = 0;
              const droppedFiles = Array.from(e.dataTransfer.files);
              if (droppedFiles.length > 0) {
                setFile(droppedFiles[0]);
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx,.ppt"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  setFile(selectedFile);
                }
              }}
              className="hidden"
            />

            {isGenerating ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent animate-spin"></div>
                <p className="mt-4 text-lg font-medium text-gray-700">{uploadProgress}%</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <svg className="mx-auto w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.904A4 4 0 0113.78 4.785m-7.78 0A4 4 0 017.72-4.785M12 13.5a4 4 0 004.472 4.47M9 13.5l-.268-4.768M14.532 9.896a4 4 0 00-4.904 2.664m7.644-8.995l5.5.5m-7.644-2.544a4 4 0 11.76-2.544" />
                  </svg>
                </div>
                <p className="text-xl font-medium text-gray-700 mb-2">
                  拖拽PPT文件到此处，或点击选择文件
                </p>
                <p className="text-sm text-gray-500">
                  支持 .pptx 格式
                </p>
              </>
            )}
          </div>

          {/* 文件信息 */}
          {file && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-700">已选择文件: {file.name}</p>
              <p className="text-sm text-gray-500">
                大小: {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>

        {/* 操作按钮组 */}
        {file && (
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button
              onClick={handleTranslation}
              disabled={isGenerating}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? '翻译中...' : '🔄 智能翻译'}
            </button>

            <button
              onClick={() => handleImageGeneration()}
              disabled={isGenerating}
              className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? '生成中...' : '🎨 配图生成'}
            </button>

            <button
              onClick={() => handleVideoGeneration()}
              disabled={isGenerating}
              className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? '生成中...' : '🎬 视频配音'}
            </button>

            <button
              onClick={() => handleArticleGeneration()}
              disabled={isGenerating}
              className="px-8 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? '生成中...' : '📄 文章撰写'}
            </button>
          </div>
        )}

        {/* 统计按钮 */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
          >
            {showStats ? '隐藏统计' : '显示统计'}
          </button>
        </div>

        {/* 设置按钮 */}
        <div className="fixed top-4 right-4">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
          >
            ⚙️
          </button>
        </div>
      </div>
    </div>
  );

  // 延迟函数
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 处理翻译
  const handleTranslation = async () => {
    if (!file) {
      setError('请先选择PPT文件');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setUploadProgress(10);

      // Step 1: 处理PPT文件
      const processMsg = "正在处理PPT文件...";
      setStatusMessage(processMsg);
      setProcessingDetail('分析文档结构和内容...');
      await delay(1000);
      setUploadProgress(20);

      const translationResult = await processPPTX(file, appSettings);

      if (!translationResult.success) {
        throw new Error(translationResult.error || '处理PPT文件失败');
      }

      setUploadProgress(60);
      setProcessingDetail('完成智能翻译，正在生成结果...');
      await delay(2000);

      // 保存翻译结果
      const saveResult = await window.electronAPI?.saveFile(
        `translated_${file.name.replace(/\.(pptx)$/i, '.txt')}`,
        [{ name: 'text/plain', extensions: ['txt'] }]
      );

      if (saveResult && !saveResult.canceled) {
        await window.electronAPI.writeFile(
          saveResult.filePath,
          translationResult.translatedContent || '翻译结果'
        );
      }

      // 更新统计
      setStats({
        totalChars: translationResult.totalChars,
        translatedChars: translationResult.translatedChars,
        processingTime: translationResult.processingTime
      });

      setUploadProgress(100);
      setShowStats(true);

      // 5秒后重置进度
      setTimeout(() => {
        setUploadProgress(0);
        setIsGenerating(false);
        setFile(null);
        setProcessingDetail('');
        setStatusMessage('');
      }, 5000);

    } catch (err) {
      console.error('翻译错误:', err);
      setError(err instanceof Error ? err.message : '翻译过程中发生错误');
      setIsGenerating(false);
      setUploadProgress(0);
      setProcessingDetail('');
      setStatusMessage('');
    }
  };

  // 处理图片生成
  const handleImageGeneration = async () => {
    if (!file) {
      setError('请先选择PPT文件');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setUploadProgress(10);

      // Step 1: 生成图片提示词
      const promptMsg = "正在生成图片提示词...";
      setStatusMessage(promptMsg);
      setProcessingDetail(`分析第1页内容...`);
      await delay(1000);

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appId: appSettings.appId,
          slideCount: 10, // 临时假设10页
          style: appSettings.imageSettings.defaultStyle,
          theme: appSettings.imageSettings.defaultTheme,
          targetAudience: 'students'
        })
      });

      if (!response.ok) {
        throw new Error('生成提示词失败');
      }

      const promptData = await response.json();
      setUploadProgress(20);
      setProcessingDetail('准备AI图片生成...');
      await delay(1000);

      // Step 2: 上传PPT到服务器
      const uploadMsg = "正在上传PPT文件到服务器...";
      setStatusMessage(uploadMsg);
      setProcessingDetail(`正在上传 ${file.name}...`);
      setUploadProgress(40);
      await delay(1000);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('appId', appSettings.appId);
      formData.append('imageProvider', settings.imageSettings.defaultProvider);
      formData.append('comfyuiBaseUrl', settings.imageSettings.comfyuiSettings.baseUrl);
      formData.append('comfyuiModel', settings.imageSettings.comfyuiSettings.model);
      formData.append('nanobananaApiKey', settings.imageSettings.nanobananaSettings.apiKey);
      formData.append('nanobananaModel', settings.imageSettings.nanobananaSettings.model);

      const uploadResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/upload-ppt`, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('上传PPT失败');
      }

      setUploadProgress(70);
      setProcessingDetail('AI正在生成图片...');
      await delay(3000);

      // Step 3: 生成图片
      const generateResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appId: appSettings.appId,
          jobId: uploadResponse.data.jobId,
          prompts: promptData.prompts || []
        })
      });

      if (!generateResponse.ok) {
        throw new Error('生成图片失败');
      }

      const imageResult = await generateResponse.json();
      setCurrentImageJobId(imageResult.jobId);
      setCurrentPage('image');

      // 更新统计
      setImageStats({
        total: imageResult.stats?.total || 1,
        success: imageResult.stats?.success || 0,
        failed: imageResult.stats?.failed || 0
      });

      setUploadProgress(100);
      setIsGenerating(false);
      setFile(null);
      setProcessingDetail('');
      setStatusMessage('');

    } catch (err) {
      console.error('图片生成错误:', err);
      setError(err instanceof Error ? err.message : '图片生成过程中发生错误');
      setIsGenerating(false);
      setUploadProgress(0);
      setProcessingDetail('');
      setStatusMessage('');
    }
  };

  // 处理视频生成
  const handleVideoGeneration = async () => {
    if (!file) {
      setError('请先选择PPT文件');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setUploadProgress(10);

      const videoMsg = "正在生成视频...";
      setStatusMessage(videoMsg);
      setProcessingDetail('分析PPT结构和内容...');
      await delay(1000);

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appId: appSettings.appId,
          videoProvider: appSettings.videoSettings.defaultProvider,
          voiceModel: appSettings.videoSettings.voiceModel,
          voiceStyle: appSettings.videoSettings.voiceStyle,
          backgroundMusic: appSettings.videoSettings.backgroundMusic,
          animationDuration: appSettings.videoSettings.animationDuration
        })
      });

      if (!response.ok) {
        throw new Error('生成视频失败');
      }

      const videoResult = await response.json();
      setCurrentJobId(videoResult.jobId);
      setCurrentPage('video');

      setUploadProgress(100);
      setIsGenerating(false);
      setFile(null);
      setProcessingDetail('');
      setStatusMessage('');

    } catch (err) {
      console.error('视频生成错误:', err);
      setError(err instanceof Error ? err.message : '视频生成过程中发生错误');
      setIsGenerating(false);
      setUploadProgress(0);
      setProcessingDetail('');
      setStatusMessage('');
    }
  };

  // 处理文章生成
  const handleArticleGeneration = async () => {
    if (!file) {
      setError('请先选择PPT文件');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setUploadProgress(10);

      setIsArticleSettingsOpen(true);

    } catch (err) {
      console.error('文章生成错误:', err);
      setError(err instanceof Error ? err.message : '文章生成过程中发生错误');
      setIsGenerating(false);
    }
  };

  // 确认文章设置后继续生成
  const confirmArticleSettings = async () => {
    if (!file) return;

    try {
      setUploadProgress(30);

      const articleMsg = "正在生成文章...";
      setStatusMessage(articleMsg);
      setProcessingDetail('分析PPT内容和主题...');
      await delay(1000);

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-article`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appId: appSettings.appId,
          theme: articleSettings.theme,
          style: articleSettings.style,
          wordCount: articleSettings.wordCount,
          targetAudience: articleSettings.targetAudience,
          articleProvider: appSettings.articleSettings.defaultProvider,
          claudeModel: appSettings.articleSettings.claudeModel
        })
      });

      if (!response.ok) {
        throw new Error('生成文章失败');
      }

      const articleResult = await response.json();
      setCurrentArticleJobId(articleResult.jobId);
      setCurrentPage('article');
      setIsArticleSettingsOpen(false);

      setUploadProgress(100);
      setIsGenerating(false);
      setFile(null);
      setProcessingDetail('');
      setStatusMessage('');

    } catch (err) {
      console.error('文章生成错误:', err);
      setError(err instanceof Error ? err.message : '文章生成过程中发生错误');
      setIsGenerating(false);
      setUploadProgress(0);
      setIsArticleSettingsOpen(false);
      setProcessingDetail('');
      setStatusMessage('');
    }
  };

  // 辅助函数：设置状态信息
  const setStatusMessage = (message: string) => {
    // 这里可以添加状态管理
    console.log('状态:', message);
  };

  const setProcessingDetail = (detail: string) => {
    // 这里可以添加详细信息显示
    console.log('详情:', detail);
  };

  // 返回当前页面内容
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'image':
        return (
          <ImageReviewPage
            imageJobId={currentImageJobId}
            onBack={() => {
              setCurrentPage('home');
              setCurrentImageJobId(null);
            }}
            navigateToUrl={navigateToUrl}
          />
        );
      case 'video':
        return (
          <VideoReviewPage
            jobId={currentJobId}
            onBack={() => {
              setCurrentPage('home');
              setCurrentJobId(null);
            }}
            navigateToUrl={navigateToUrl}
          />
        );
      case 'article':
        return (
          <ArticleReviewPage
            articleJobId={currentArticleJobId}
            onBack={() => {
              setCurrentPage('home');
              setCurrentArticleJobId(null);
            }}
            navigateToUrl={navigateToUrl}
          />
        );
      default:
        return renderHomePage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {renderNavigationButtons()}
      {renderCurrentPage()}

      {/* 模态框 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={appSettings}
        onSettingsChange={setAppSettings}
      />

      <ArticleSettingsModal
        isOpen={isArticleSettingsOpen}
        onClose={() => setIsArticleSettingsOpen(false)}
        settings={articleSettings}
        onSettingsChange={setArticleSettings}
        onConfirm={confirmArticleSettings}
        onCancel={() => {
          setIsGenerating(false);
          setUploadProgress(0);
        }}
      />

      <FontSelectionModal
        isOpen={isFontModalOpen}
        onClose={() => setIsFontModalOpen(false)}
      />

      {/* 拖拽指示器 */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-10 z-50 pointer-events-none" />
      )}
    </div>
  );
}

// 包装Router组件
const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainAppComponent />} />
        <Route path="/image/:imageJobId" element={<MainAppComponent />} />
        <Route path="/video/:jobId" element={<MainAppComponent />} />
        <Route path="/article/:articleJobId" element={<MainAppComponent />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;