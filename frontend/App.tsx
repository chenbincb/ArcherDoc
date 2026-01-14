import React, { useState, useEffect, useRef } from 'react';
import { SettingsModal } from './components/SettingsModal';
import { Navbar } from './components/Navbar';
import { FileUploadArea } from './components/FileUploadArea';
import { ActionButtons } from './components/ActionButtons';
import { ProcessStatus } from './components/ProcessStatus';
import { ResultArea } from './components/ResultArea';
import { DashboardStats } from './components/DashboardStats';
import ArticleSettingsModal from './components/ArticleSettingsModal';
import FontSelectionModal from './components/FontSelectionModal';
import FeatureIntro from './components/FeatureIntro';
import { AIProvider } from './types';
import { useSettings } from './contexts/SettingsContext';
import { useProcess } from './contexts/ProcessContext';
import { useFileHandler } from './hooks/useFileHandler';
import { useTranslation } from './hooks/useTranslation';
import { useVideoGeneration } from './hooks/useVideoGeneration';
import { useImageGeneration } from './hooks/useImageGeneration';
import { useArticleGeneration } from './hooks/useArticleGeneration';
import { useFontReplacement } from './hooks/useFontReplacement';


declare global {
  interface Window {
    electronAPI?: {
      setTitle: (title: string) => void;
    };
  }
}

const App: React.FC = () => {
  const { file, handleFileChange, handleDrop, clearFile } = useFileHandler();
  const { startTranslation } = useTranslation();
  const { startVideoGeneration } = useVideoGeneration();
  const { startImageGeneration } = useImageGeneration();
  const { startArticleGeneration } = useArticleGeneration();
  const { startFontReplacement, selectedFont, getFontDisplayName } = useFontReplacement();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'ai' | 'translation' | 'video' | 'image'>('ai');
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Track button hover state for dynamic feature text
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(0);

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

  const { settings, saveSettings: setSettings } = useSettings();

  // Use Global Process Context
  const {
    isProcessing,
    progress,
    statusMessage,
    processingDetail,
    error, setError,
    logs,
    resultBlob,
    downloadName,
    stats,
    videoStats,
  } = useProcess();

  // Ref for logs auto-scroll
  const logsEndRef = useRef<HTMLDivElement>(null);



  // Article generation settings state
  const [isArticleSettingsOpen, setIsArticleSettingsOpen] = useState(false);
  // Font selection state
  const [isFontSelectionOpen, setIsFontSelectionOpen] = useState(false);

  /* REMOVED: Local addLog
     Using addLog from ProcessContext
  */

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

  const handleStartTranslation = () => {
    if (file) {
      startTranslation(file, () => setIsSettingsOpen(true));
    }
  };

  // New function for Font Replacement
  const handleFontReplacement = async () => {
    if (!file) return;

    // 打开字体选择模态框
    setIsFontSelectionOpen(true);
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

      <Navbar
        currentPage={currentPage}
        installPrompt={installPrompt}
        handleInstallApp={handleInstallApp}
        setIsSettingsOpen={setIsSettingsOpen}
        hasApiKey={hasApiKey}
        isOllama={isOllama}
      />

      {/* Article Generation Settings Modal */}
      <ArticleSettingsModal
        isOpen={isArticleSettingsOpen}
        onClose={() => setIsArticleSettingsOpen(false)}
        onGenerate={async (articleSettings) => {
          if (file) {
            startArticleGeneration(file, articleSettings);
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
            <FeatureIntro isHovering={isHovering} hoveredIndex={hoveredIndex} />
          </div>
        </div>

        <div className="space-y-8">

          {/* File Upload Area - Hide when processing or completed */}
          {!isProcessing && !resultBlob && (
            <FileUploadArea
              file={file}
              handleFileChange={handleFileChange}
              handleDrop={handleDrop}
              clearFile={clearFile}
            />
          )}

          {/* MAIN ACTION BUTTONS - Show only when file is selected */}
          {!isProcessing && file && !resultBlob && (
            <ActionButtons
              file={file}
              startVideoGeneration={startVideoGeneration}
              startImageGeneration={startImageGeneration}
              setIsArticleSettingsOpen={setIsArticleSettingsOpen}
              startTranslation={handleStartTranslation}
              handleFontReplacement={handleFontReplacement}
              selectedFont={selectedFont}
              getFontDisplayName={getFontDisplayName}
              setIsHovering={setIsHovering}
              setHoveredIndex={setHoveredIndex}
              startError={setError}
            />
          )}

          {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-center gap-2">⚠️ {error}</div>}

          <ProcessStatus
            isProcessing={isProcessing}
            progress={progress}
            statusMessage={statusMessage}
            processingDetail={processingDetail}
            logs={logs}
            logsEndRef={logsEndRef}
          />

          <ResultArea
            resultBlob={resultBlob}
            clearFile={clearFile}
            setIsFontSelectionOpen={setIsFontSelectionOpen}
            downloadResult={downloadResult}
          />

          {/* Show Stats Chart for translation */}
          <DashboardStats
            stats={stats}
            videoStats={videoStats}
            settings={settings}
            setIsSettingsOpen={setIsSettingsOpen}
          />
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={setSettings} initialTab={settingsInitialTab} />
      <FontSelectionModal
        isOpen={isFontSelectionOpen}
        onClose={() => setIsFontSelectionOpen(false)}
        onConfirm={(fontName) => file && startFontReplacement(file, fontName)}
        defaultFont={selectedFont}
      />
    </div>
  );
};

export default App;