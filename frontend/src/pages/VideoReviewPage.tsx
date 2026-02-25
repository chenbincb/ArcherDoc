import React, { useState, useEffect, useCallback } from 'react';
import { VideoSettings, SpeechModelType, AppSettings } from '../types';
import { MagicTextDisplay } from '../components/MagicTextDisplay';
import { SlidePreview } from '../components/SlidePreview';
import { DEFAULT_SETTINGS, API_CONFIG, API_ENDPOINTS } from '../constants';
import JSZip from 'jszip';

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
 * 构建媒体文件URL (增加防缓存支持)
 */
function buildMediaUrl(baseUrl: string, jobId: string, mediaType: string, fileName: string, timestamp?: number): string {
  // 确保baseUrl不以斜杠结尾
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const url = `${cleanBaseUrl}/webhook/servefiles/api/slides-data/${jobId}/${mediaType}/${fileName}`;
  return timestamp ? `${url}?t=${timestamp}` : url;
}

interface SlideReviewData {
  id: number;
  imageUrl: string;
  script: string;
  audioUrl?: string;
  videoUrl?: string; // ✅ 新增
  hasAudio: boolean; // ✅ 新增
  hasVideo: boolean; // ✅ 新增
  isPlaying: boolean;
  audioBlob?: Blob;
}

interface VideoReviewPageProps {
  jobId: string;
  videoSettings: VideoSettings;
  onOpenSettings?: (options?: { tab?: 'ai' | 'translation' | 'video' | 'image'; subTab?: string }) => void;
  settings?: AppSettings;
  onSaveSettings?: (newSettings: AppSettings) => void;
}

export const VideoReviewPage: React.FC<VideoReviewPageProps> = ({
  jobId,
  videoSettings,
  onOpenSettings,
  settings: externalSettings,
  onSaveSettings: externalSaveSettings
}) => {
  // Use external settings if provided, otherwise use local state
  const [internalSettings, setInternalSettings] = useState<AppSettings>(() => {
    const savedSettings = localStorage.getItem('archerdoc-ai-settings-v1');
    return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
  });

  const appSettings = externalSettings || internalSettings;

  // Update videoSettings when appSettings changes
  const [localVideoSettings, setLocalVideoSettings] = useState<VideoSettings>(appSettings.videoSettings);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [reviewData, setReviewData] = useState<SlideReviewData[]>([]);
  const [savedScripts, setSavedScripts] = useState<string[]>([]); // ✅ 记录已保存的讲稿镜像
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false); // ✅ 保存确认弹窗
  const [pendingSlideIndex, setPendingSlideIndex] = useState<number | null>(null); // ✅ 待切换的目标索引
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isMergingVideos, setIsMergingVideos] = useState(false);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [showGlobalLoading, setShowGlobalLoading] = useState(false);
  const [globalLoadingType, setGlobalLoadingType] = useState<'AUDIO' | 'VIDEO' | null>(null);
  const [currentProcessingSlide, setCurrentProcessingSlide] = useState(0);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);

  // 预览状态
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  // Export dialog states
  const [showExportDialog, setShowExportDialog] = useState<boolean>(false);
  const [exportData, setExportData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // State for audio playback control
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number | null>(null);

  // Update localVideoSettings when appSettings changes
  useEffect(() => {
    setLocalVideoSettings(appSettings.videoSettings);
  }, [appSettings]);

  // Handle settings save
  const handleSaveSettings = (newSettings: AppSettings) => {
    if (externalSaveSettings) {
      externalSaveSettings(newSettings);
    } else {
      setInternalSettings(newSettings);
      localStorage.setItem('archerdoc-ai-settings-v1', JSON.stringify(newSettings));
    }
  };

  // Extract all text from slides for animation
  const allSlideTexts = reviewData.map(slide => slide.script).filter(text => text.trim()).flatMap(text => text.split(/[。！？；；]+/).filter(sentence => sentence.trim()));

  // Extract text from current slide for animation
  const currentSlideTexts = reviewData[currentSlide]?.script?.split(/[。！？；；]+/).filter(sentence => sentence.trim()) || [];

  // Cycle through texts for different states
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isMergingVideos && allSlideTexts.length > 0) {
      // For merging videos, cycle through all slide texts
      interval = setInterval(() => {
        setCurrentTextIndex(prev => (prev + 1) % allSlideTexts.length);
      }, 1000);
    } else if (showGlobalLoading && currentSlideTexts.length > 0) {
      // For current slide audio/video generation, cycle through current slide texts
      interval = setInterval(() => {
        setCurrentTextIndex(prev => (prev + 1) % currentSlideTexts.length);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMergingVideos, showGlobalLoading, allSlideTexts.length, currentSlideTexts.length, currentSlide]);

  // Show notification
  const showNotification = (message: string, type: 'success' | 'error' = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch slide data from backend (Authoritative)
  const fetchSlideData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setIsLoading(true);
    setError(null);

    try {
      // Get job data from backend
      const jobDataResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/get-job-data?jobId=${jobId}`);

      if (!jobDataResponse.ok) {
        throw new Error(`获取数据失败: ${jobDataResponse.statusText}`);
      }

      const responseData = await jobDataResponse.json();
      const jobData = responseData.data || responseData;

      // 使用后端返回的 slides 数组 (增强版结构)
      if (jobData.slides && Array.isArray(jobData.slides)) {
        const timestamp = Date.now();
        const mappedData: SlideReviewData[] = jobData.slides.map((slide: any) => ({
          id: slide.slideId, // 1-based
          imageUrl: buildMediaUrl(API_CONFIG.BASE_URL, jobId, 'images', `slide_${slide.index}.png`),
          script: slide.note || '',
          hasAudio: slide.resources?.audio?.exists || false,
          hasVideo: slide.resources?.video?.exists || false,
          audioUrl: slide.resources?.audio?.exists ? buildMediaUrl(API_CONFIG.BASE_URL, jobId, 'audio', `slide_${slide.index}.mp3`, timestamp) : undefined,
          videoUrl: slide.resources?.video?.exists ? buildMediaUrl(API_CONFIG.BASE_URL, jobId, 'video', `slide_${slide.index}.mp4`, timestamp) : undefined,
          isPlaying: false
        }));

        setReviewData(mappedData);
        setSavedScripts(mappedData.map(s => s.script)); // ✅ 同步保存镜像
      } else {
        // Fallback for old API structure
        const slideCount = jobData.notes?.length || 0;
        const initialData: SlideReviewData[] = [];
        const initialScripts: string[] = [];
        for (let i = 0; i < slideCount; i++) {
          const script = jobData.notes?.[i]?.note || '';
          initialData.push({
            id: i + 1,
            imageUrl: buildMediaUrl(API_CONFIG.BASE_URL, jobId, 'images', `slide_${i}.png`),
            script,
            hasAudio: false,
            hasVideo: false,
            isPlaying: false
          });
          initialScripts.push(script);
        }
        setReviewData(initialData);
        setSavedScripts(initialScripts);
      }

      if (!isBackgroundRefresh) setCurrentSlide(0);
    } catch (err: any) {
      console.error("Fetch data error:", err);
      if (!isBackgroundRefresh) {
        setError(err.message || "获取幻灯片数据失败");
        showNotification(err.message || "获取幻灯片数据失败");
      }
    } finally {
      if (!isBackgroundRefresh) setIsLoading(false);
    }
  }, [jobId]);

  // Initial fetch
  useEffect(() => {
    if (jobId) {
      fetchSlideData();
    }
  }, [jobId, fetchSlideData]);

  const handleScriptChange = (index: number, newScript: string) => {
    setReviewData(prev => prev.map((item, i) =>
      i === index ? { ...item, script: newScript } : item
    ));
  };

  // 导航逻辑拦截：检查讲稿是否变更
  const checkDirtyAndNavigate = (targetIndex: number) => {
    const isDirty = reviewData[currentSlide].script !== savedScripts[currentSlide];
    if (isDirty) {
      setPendingSlideIndex(targetIndex);
      setShowSaveConfirmDialog(true);
    } else {
      setCurrentSlide(targetIndex);
      setShowVideoPreview(false);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      checkDirtyAndNavigate(currentSlide - 1);
    }
  };

  const handleNextSlide = () => {
    if (currentSlide < reviewData.length - 1) {
      checkDirtyAndNavigate(currentSlide + 1);
    }
  };

  const onSlideSelect = (idx: number) => {
    checkDirtyAndNavigate(idx);
  };

  // 播放音频逻辑
  const handlePreviewAudio = async (index: number) => {
    const slide = reviewData[index];
    if (!slide.hasAudio || !slide.audioUrl) {
      showNotification('请先生成当前页面的AI语音');
      return;
    }

    console.log('Previewing audio for slide', index + 1);

    const isCurrentAudio = currentAudioIndex === index && currentAudio;

    if (isCurrentAudio && !slide.isPlaying) {
      try {
        await currentAudio.play();
        setReviewData(prev => prev.map((item, i) => i === index ? { ...item, isPlaying: true } : item));
      } catch (error) {
        console.error('Failed to resume audio:', error);
        showNotification('播放音频失败');
      }
      return;
    }

    if (isCurrentAudio && slide.isPlaying) {
      currentAudio.pause();
      setReviewData(prev => prev.map((item, i) => i === index ? { ...item, isPlaying: false } : item));
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
    }

    const newAudio = new Audio(slide.audioUrl);
    newAudio.onended = () => {
      setReviewData(prev => prev.map(item => ({ ...item, isPlaying: false })));
      setCurrentAudio(null);
      setCurrentAudioIndex(null);
    };
    newAudio.onerror = (e) => {
      console.error("Audio playback error:", e);
      showNotification("音频加载失败，请尝试重新生成");
      setReviewData(prev => prev.map(item => ({ ...item, isPlaying: false })));
    };

    setCurrentAudio(newAudio);
    setCurrentAudioIndex(index);
    setReviewData(prev => prev.map((item, i) => i === index ? { ...item, isPlaying: true } : { ...item, isPlaying: false }));

    try {
      await newAudio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      showNotification('播放音频失败');
      setReviewData(prev => prev.map(item => ({ ...item, isPlaying: false })));
      setCurrentAudio(null);
      setCurrentAudioIndex(null);
    }
  };

  const handleGenerateAudio = async (modelType: SpeechModelType = SpeechModelType.MINIMAX) => {
    const slide = reviewData[currentSlide];
    if (!slide.script.trim()) {
      showNotification('请先输入讲稿内容');
      return;
    }

    // Check MiniMax parameters if using MiniMax model
    if (modelType === SpeechModelType.MINIMAX) {
      if (!localVideoSettings.minimaxGroupId || !localVideoSettings.minimaxAccessToken) {
        showNotification('缺少MiniMax必要参数，请在设置中配置Group ID和Access Token');
        onOpenSettings?.();
        return;
      }
    } else if (modelType === SpeechModelType.COQUI_TTS) {
      showNotification('Coqui TTS模型生成音频需要5-6分钟，请耐心等待...', 'success');
    } else if (modelType === SpeechModelType.QWEN_TTS) {
      if (!localVideoSettings.qwenApiKey) {
        showNotification('缺少Qwen TTS必要参数，请在设置中配置API Key');
        onOpenSettings?.({ tab: 'video', subTab: 'qwen-tts' });
        return;
      }
      showNotification('Qwen TTS模型生成音频通常需要1-3秒...', 'success');
    }

    setShowGlobalLoading(true);
    setGlobalLoadingType('AUDIO');
    setIsGeneratingAudio(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-single-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          slideId: slide.id - 1, // 0-based
          noteText: slide.script,
          modelType,
          minimaxGroupId: localVideoSettings.minimaxGroupId,
          minimaxAccessToken: localVideoSettings.minimaxAccessToken,
          minimaxVoiceId: localVideoSettings.voiceId,
          // Coqui TTS Params
          speakerWav: localVideoSettings.coquiSettings.speakerWav,
          gpuThresholdGb: localVideoSettings.coquiSettings.gpuThresholdGb,
          // ✅ 增加空值合并，防止旧版缓存导致 url 为空
          url: localVideoSettings.coquiSettings.url || 'http://178.109.129.11:8001/generate',
          qwenApiKey: localVideoSettings.qwenApiKey,
          qwenModel: localVideoSettings.qwenModel,
          qwenVoiceId: localVideoSettings.qwenVoiceId
        })
      });

      if (!response.ok) throw new Error(`生成语音失败: ${response.statusText}`);
      const result = await response.json();

      if (result.status === 'success') {
        // ✅ 局部更新状态，避免全量 fetch 覆盖用户未保存的 script 修改
        setReviewData(prev => prev.map((item, i) => {
          if (i === currentSlide) {
            const timestamp = Date.now();
            return {
              ...item,
              hasAudio: true,
              audioUrl: buildMediaUrl(API_CONFIG.BASE_URL, jobId, 'audio', `slide_${i}.mp3`, timestamp)
            };
          }
          return item;
        }));
        showNotification('语音生成成功', 'success');
      } else {
        throw new Error(result.message || '生成语音失败');
      }
    } catch (error: any) {
      console.error('Failed to generate audio:', error);
      showNotification(`生成语音失败: ${error.message}`);
    } finally {
      setIsGeneratingAudio(false);
      setShowGlobalLoading(false);
      setGlobalLoadingType(null);
    }
  };

  const handleGenerateCurrentVideo = async () => {
    const slide = reviewData[currentSlide];
    if (!slide.script.trim()) {
      showNotification('请先输入讲稿内容');
      return;
    }

    if (!slide.hasAudio) {
      showNotification('请先生成当前页面的AI语音');
      return;
    }

    setShowGlobalLoading(true);
    setGlobalLoadingType('VIDEO');
    setIsGeneratingVideo(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          mode: 'single',
          slideId: slide.id - 1
        })
      });

      if (!response.ok) throw new Error(`生成视频失败: ${response.statusText}`);
      const result = await response.json();

      if (result.success) {
        // ✅ 局部更新状态，避免覆盖用户讲稿
        // 增加延迟到 800ms，确保文件系统完全同步并可读取
        await new Promise(resolve => setTimeout(resolve, 800));

        setReviewData(prev => prev.map((item, i) => {
          if (i === currentSlide) {
            const timestamp = Date.now();
            return {
              ...item,
              hasVideo: true,
              videoUrl: buildMediaUrl(API_CONFIG.BASE_URL, jobId, 'video', `slide_${i}.mp4`, timestamp)
            };
          }
          return item;
        }));

        setShowVideoPreview(true);
        showNotification('视频生成成功', 'success');
      } else {
        throw new Error(result.message || '生成视频失败');
      }
    } catch (error: any) {
      console.error('Failed to generate video:', error);
      showNotification(`生成视频失败: ${error.message}`);
    } finally {
      setIsGeneratingVideo(false);
      setShowGlobalLoading(false);
      setGlobalLoadingType(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!jobId) {
      showNotification('无法获取任务ID');
      return;
    }
    try {
      const notes = reviewData.map(item => ({
        id: item.id - 1,
        note: item.script
      }));
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}${API_ENDPOINTS.SAVE_CONTENT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'video_notes',
          jobId,
          content: notes
        })
      });
      if (!response.ok) throw new Error(`保存失败: ${response.statusText}`);

      // ✅ 保存成功后更新镜像
      setSavedScripts(reviewData.map(s => s.script));
      showNotification('讲稿保存成功', 'success');
      return true; // 返回成功标志
    } catch (error: any) {
      showNotification(`保存讲稿失败: ${error.message}`);
      return false;
    }
  };

  const handleGenerateNarration = async (slideIndex: number) => {
    const slide = reviewData[slideIndex];
    if (!slide) {
      showNotification('当前幻灯片不存在');
      return;
    }

    setIsGeneratingNarration(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-narration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          slideId: slide.id,
          slideTitle: slide.title || '',
          slideContent: slide.content || '',
          slideNotes: slide.script || ''
        })
      });

      if (!response.ok) throw new Error(`AI解说词生成失败: ${response.statusText}`);
      const result = await response.json();

      if (result.success && result.data?.narration) {
        // Update the specific slide's script with the generated narration
        setReviewData(prev => prev.map((item, i) =>
          i === slideIndex ? { ...item, script: result.data.narration } : item
        ));
        showNotification('AI解说词生成成功', 'success');
      } else {
        throw new Error(result.message || 'AI解说词生成失败');
      }
    } catch (error: any) {
      console.error('Failed to generate narration:', error);
      showNotification(`AI解说词生成失败: ${error.message}`);
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  const handleExportNotes = async () => {
    if (!jobId) {
      showNotification('无法获取任务ID');
      return;
    }
    try {
      const notes = reviewData.map(item => ({
        id: item.id - 1,
        note: item.script
      }));
      setIsExporting(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}${API_ENDPOINTS.EXPORT_CONTENT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'video_notes',
          jobId,
          content: notes
        })
      });
      if (!response.ok) throw new Error(`导出失败: ${response.statusText}`);
      const result = await response.json();
      if (result.success) {
        setExportData(result);
        setShowExportDialog(true);
        showNotification('讲稿导出成功', 'success');
      } else {
        throw new Error(result.message || '导出失败');
      }
    } catch (error: any) {
      showNotification(`导出讲稿失败: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFormat = async (format: string) => {
    if (!exportData || !jobId) return;
    try {
      let fileName = exportData.contentType === 'article' ? `article.${format}` : `notes.${format}`;
      const fullUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.WEBHOOK_PATH}/download-file-webhook/api/download-file/${jobId}/${fileName}`;
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error(`下载失败: ${response.statusText}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_notes.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showNotification(`下载失败: ${error.message}`, 'error');
    }
  };

  const closeExportDialog = () => {
    setShowExportDialog(false);
    setExportData(null);
  };

  const handleSubmitForVideoGeneration = async () => {
    if (!jobId) {
      showNotification('无法获取任务ID');
      return;
    }
    setShowMergeModal(true);
    try {
      setIsMergingVideos(true);
      setMergeProgress(0);
      setMergedVideoUrl(null);
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, mode: 'final' })
      });
      if (!response.ok) throw new Error(`合并视频失败: ${response.statusText}`);
      const result = await response.json();
      if (result.success) {
        setMergeProgress(100);
        const url = buildMediaUrl(API_CONFIG.BASE_URL, jobId, 'video', 'final_video.mp4', Date.now());
        setMergedVideoUrl(url);
        showNotification('视频合并成功', 'success');
      } else {
        throw new Error(result.message || '合并视频失败');
      }
    } catch (error: any) {
      console.error('Failed to merge videos:', error);
      showNotification(`合并视频失败: ${error.message}`);
    } finally {
      setIsMergingVideos(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 w-full max-w-2xl text-white text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-300">正在加载数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 w-full max-w-2xl text-white text-center">
          <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto text-2xl">⚠️</div>
          <p className="text-gray-300 mb-4">{error}</p>
          <button onClick={() => window.location.href = '/'} className="px-4 py-2 bg-primary hover:bg-blue-600 rounded transition-colors">返回首页</button>
        </div>
      </div>
    );
  }

  if (reviewData.length === 0) return null;

  const currentData = reviewData[currentSlide];
  const previewVideoUrlToUse = (currentData.hasVideo && currentData.videoUrl) ? currentData.videoUrl : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="container mx-auto p-4 pt-10">
        {notification && (
          <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-[9999] ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
            <p>{notification.message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          <SlidePreview
            currentSlide={currentSlide}
            totalSlides={reviewData.length}
            slideNumber={currentData.id}
            imageUrl={currentData.imageUrl}
            videoUrl={previewVideoUrlToUse}
            showVideoToggle={currentData.hasVideo}
            showVideoPreview={showVideoPreview}
            onToggleVideo={() => setShowVideoPreview(!showVideoPreview)}
            isGenerating={isGeneratingVideo}
            onPreviousSlide={handlePrevSlide}
            onNextSlide={handleNextSlide}
            onSlideSelect={onSlideSelect}
            showSlideSelector={true}
          />

          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-sm font-bold text-gray-300 mb-2">讲稿编辑</h3>
              <textarea
                value={currentData.script}
                onChange={(e) => handleScriptChange(currentSlide, e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-3 h-96 text-sm resize-y"
                placeholder="输入或编辑讲稿..."
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleGenerateNarration(currentSlide)}
                  disabled={isGeneratingNarration}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors disabled:opacity-50"
                >
                  {isGeneratingNarration ? '生成中...' : '🤖 AI生成解说词'}
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-sm font-bold text-gray-300 mb-3">语音生成</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleGenerateAudio(SpeechModelType.MINIMAX)} disabled={isGeneratingAudio} className="px-4 py-2 bg-secondary hover:bg-emerald-600 rounded text-sm transition-colors disabled:opacity-50">MiniMax</button>
                  <button onClick={() => handleGenerateAudio(SpeechModelType.QWEN_TTS)} disabled={isGeneratingAudio} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm transition-colors disabled:opacity-50">Qwen</button>
                  <button onClick={() => handleGenerateAudio(SpeechModelType.COQUI_TTS)} disabled={isGeneratingAudio} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors disabled:opacity-50">Coqui</button>
                </div>
                <button
                  onClick={() => handlePreviewAudio(currentSlide)}
                  disabled={!currentData.hasAudio || isGeneratingAudio}
                  className={`w-full px-4 py-2 rounded transition-colors flex items-center justify-center gap-2 ${currentData.hasAudio ? 'bg-primary' : 'bg-gray-700 cursor-not-allowed text-gray-500'}`}
                >
                  {currentData.isPlaying ? '⏸️ 播放中...' : '🔊 预览语音'}
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-sm font-bold text-gray-300 mb-3">视频生成</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateCurrentVideo}
                  disabled={isGeneratingAudio || !currentData.hasAudio}
                  className={`flex-1 px-4 py-2 rounded transition-colors font-bold ${currentData.hasAudio ? 'bg-purple-600' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                >
                  🎬 生成视频
                </button>
                <button
                  onClick={() => {
                    // ✅ 强制刷新时间戳，确保 key 发生变化从而触发重新播放
                    setReviewData(prev => prev.map((item, i) =>
                      i === currentSlide ? {
                        ...item,
                        videoUrl: buildMediaUrl(API_CONFIG.BASE_URL, jobId, 'video', `slide_${i}.mp4`, Date.now())
                      } : item
                    ));
                    setShowVideoPreview(true);
                  }}
                  disabled={!currentData.hasVideo}
                  className={`flex-1 px-4 py-2 rounded transition-colors font-bold ${currentData.hasVideo ? 'bg-blue-600' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                >
                  ▶️ 预览视频
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-700 pt-4 flex justify-end gap-2">
          <button onClick={handleSaveNotes} className="px-4 py-2 bg-secondary hover:bg-emerald-600 rounded font-bold transition-colors">保存讲稿</button>
          <button onClick={handleExportNotes} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold transition-colors">导出讲稿</button>
          <button onClick={handleSubmitForVideoGeneration} className="px-4 py-2 bg-primary hover:bg-blue-600 rounded font-bold transition-colors">合并生成视频</button>
        </div>

        {/* Merge Modal */}
        {showMergeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 w-full max-w-7xl">
              <h2 className="text-2xl font-bold mb-6">视频合并</h2>
              {isMergingVideos && <MagicTextDisplay status="MERGING_VIDEO" text="正在合并全量视频..." />}
              {mergedVideoUrl && (
                <div className="mb-6 bg-gray-700 rounded-xl p-6">
                  <video src={mergedVideoUrl} controls className="w-full max-h-[600px] mb-4" />
                  <button
                    onClick={async () => {
                      const response = await fetch(mergedVideoUrl);
                      const blob = await response.blob();
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = 'final_video.mp4';
                      a.click();
                    }}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 rounded font-bold"
                  >
                    📥 下载完整视频
                  </button>
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button onClick={() => setShowMergeModal(false)} className="px-6 py-2 bg-gray-700 rounded">关闭</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Export Dialog */}
      {showExportDialog && exportData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 max-w-xl w-full mx-4 text-center">
            <h2 className="text-2xl font-bold mb-6">📤 导出讲稿</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => downloadFormat('txt')}
                className="p-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white font-bold transition-all active:scale-95">
                <div className="text-3xl mb-2">📄</div>
                <div>TXT 格式</div>
                <div className="text-sm text-gray-400 mt-1">讲稿文本</div>
              </button>
              <button
                onClick={() => downloadFormat('json')}
                className="p-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white font-bold transition-all active:scale-95">
                <div className="text-3xl mb-2">🔧</div>
                <div>JSON 格式</div>
                <div className="text-sm text-gray-400 mt-1">结构化数据</div>
              </button>             </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                导出时间: {exportData.exportedAt}
              </div>
              <button
                onClick={closeExportDialog}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Loading */}
      {showGlobalLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 max-w-2xl w-full mx-4 text-center">
            <MagicTextDisplay
              status={globalLoadingType === 'AUDIO' ? 'GENERATING_AUDIO' : 'GENERATING_VIDEO'}
              text={currentSlideTexts.length > 0 ? currentSlideTexts[currentTextIndex % currentSlideTexts.length] : "正在处理..."}
            />
          </div>
        </div>
      )}

      {/* 💾 保存确认弹窗 */}
      {showSaveConfirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-orange-400">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-xl font-bold text-white">讲稿已修改</h3>
            </div>
            <p className="text-gray-300 mb-6 px-1">
              当前幻灯片的讲稿已被编辑，是否在切换前保存修改？
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  const success = await handleSaveNotes();
                  if (success && pendingSlideIndex !== null) {
                    setCurrentSlide(pendingSlideIndex);
                    setShowVideoPreview(false);
                    setShowSaveConfirmDialog(false);
                  }
                }}
                className="w-full py-2 bg-primary hover:bg-blue-600 text-white rounded font-bold transition-colors"
              >
                💾 保存并继续
              </button>
              <button
                onClick={() => {
                  if (pendingSlideIndex !== null) {
                    // ✅ 忽略并跳转时，将当前页还原为已保存的版本
                    setReviewData(prev => prev.map((item, i) =>
                      i === currentSlide ? { ...item, script: savedScripts[currentSlide] } : item
                    ));
                    setCurrentSlide(pendingSlideIndex);
                    setShowVideoPreview(false);
                    setShowSaveConfirmDialog(false);
                  }
                }}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold transition-colors"
              >
                ⏩ 忽略修改并继续
              </button>
              <button
                onClick={() => setShowSaveConfirmDialog(false)}
                className="w-full py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoReviewPage;