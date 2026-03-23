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
  title?: string; // ✅ 新增
  content?: string; // ✅ 新增
  audioUrl?: string;
  videoUrl?: string; // ✅ 新增
  hasAudio: boolean; // ✅ 新增
  hasVideo: boolean; // ✅ 新增
  isPlaying: boolean;
  audioBlob?: Blob;
  pageGap?: number; // ✅ 新增：当前幻灯片的语音停顿间隔
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

  // 一键全量自动生成状态
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoSkipEmpty, setAutoSkipEmpty] = useState(true);
  const [autoDefaultGap, setAutoDefaultGap] = useState(0.5);
  const [autoRebuildAll, setAutoRebuildAll] = useState(false);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [autoTotalSlides, setAutoTotalSlides] = useState(0);
  const [autoCurrentSlide, setAutoCurrentSlide] = useState(0);

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

      // 提取预先探测到的已合成大视频
      if (jobData.hasFinalVideo && jobData.finalVideoUrl) {
        setMergedVideoUrl(jobData.finalVideoUrl);
      }

      // 使用后端返回的 slides 数组 (增强版结构)
      if (jobData.slides && Array.isArray(jobData.slides)) {
        const timestamp = Date.now();
        const mappedData: SlideReviewData[] = jobData.slides.map((slide: any) => ({
          id: slide.slideId, // 1-based
          imageUrl: buildMediaUrl(API_CONFIG.BASE_URL, jobId, 'images', `slide_${slide.index}.png`),
          script: slide.note || '',
          pageGap: slide.pageGap ?? 0.5,
          title: slide.title || '', // ✅ 保留标题
          content: slide.content || '', // ✅ 保留内容 (注意：后端 slides 数组中可能需要从原始 notes 匹配，或者后端已经注入)
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

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || `生成语音失败: ${response.statusText}`);
      }

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
          slideId: slide.id - 1,
          settings: { pageGap: slide.pageGap ?? 0.5 }
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
        id: item.id,      // 以原始的幻灯片业务编号（1-based）存储，不要随意减一
        slideId: item.id, // 冗余下发显式的 slideId，后续如有新需求可作双重兼容
        note: item.script,
        pageGap: item.pageGap ?? 0.5
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

  // 执行全自动生成逻辑
  const handleConfirmAutoGeneration = async () => {
    if (!jobId) {
      showNotification('无法获取任务ID');
      return;
    }

    setShowAutoModal(false);
    setIsAutoProcessing(true);
    setAutoCurrentSlide(0);
    setAutoTotalSlides(reviewData.length);

    try {
      // 组装所有必要的设置（包含 TTS 设置和自动化参数）
      const settings = {
        ...localVideoSettings,
        // TTS 设置
        minimaxGroupId: appSettings.minimaxGroupId,
        minimaxAccessToken: appSettings.minimaxAccessToken,
        minimaxVoiceId: appSettings.minimaxVoiceId,
        qwenApiKey: appSettings.qwenApiKey,
        qwenModel: appSettings.qwenModel,
        qwenVoiceId: appSettings.qwenVoiceId,
        // 自动化参数
        skipEmptyNotes: autoSkipEmpty,
        defaultGap: autoDefaultGap,
        rebuildAll: autoRebuildAll
      };

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, mode: 'auto_full', settings })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `全自动生成请求失败: ${response.statusText}`);
      }

      showNotification('全自动视频生成已完成', 'success');
      
      // 成功后刷新数据以反映最新的音视频状态
      await fetchSlideData(true);
      
      // 如果生成成功，自动呼出合并预览弹窗
      const finalUrl = buildMediaUrl(API_CONFIG.BASE_URL, jobId, 'video', 'final_video.mp4', Date.now());
      setMergedVideoUrl(finalUrl);
      setShowMergeModal(true);

    } catch (error: any) {
      console.error('Auto generation failed:', error);
      showNotification(`全自动生成失败: ${error.message}`);
    } finally {
      setIsAutoProcessing(false);
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

  const executeFinalVideoMerge = async () => {
    try {
      setIsMergingVideos(true);
      setMergeProgress(0);
      setMergedVideoUrl(null);
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, mode: 'final' })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || `合并视频失败: ${response.statusText}`);
      }
      
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

  const handleSubmitForVideoGeneration = async () => {
    if (!jobId) {
      showNotification('无法获取任务ID');
      return;
    }
    setShowMergeModal(true);
    
    // ✅ 如果已经生成过，并且已存有视频地址，那么仅弹出弹框，不重新生成
    if (mergedVideoUrl) {
      return;
    }
    await executeFinalVideoMerge();
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
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-300">视频生成</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">停顿(秒):</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    className="w-16 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center focus:ring-1 focus:ring-primary focus:outline-none"
                    value={currentData.pageGap ?? 0.5}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setReviewData(prev => prev.map((item, i) =>
                        i === currentSlide ? { ...item, pageGap: isNaN(val) ? 0.5 : val } : item
                      ));
                    }}
                  />
                </div>
              </div>
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
          <button 
            onClick={() => setShowAutoModal(true)} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded font-bold transition-all active:scale-95 flex items-center gap-2"
          >
            🚀 一键全自动生成
          </button>
          <button onClick={handleSaveNotes} className="px-4 py-2 bg-secondary hover:bg-emerald-600 rounded font-bold transition-colors">保存讲稿</button>
          <button onClick={handleExportNotes} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold transition-colors">导出讲稿</button>
          <button onClick={handleSubmitForVideoGeneration} className="px-4 py-2 bg-primary hover:bg-blue-600 rounded font-bold transition-colors">合并生成视频</button>
        </div>

        {/* Merge Modal */}
        {showMergeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 w-full max-w-7xl">
              <h2 className="text-2xl font-bold mb-6">视频合并预览</h2>
              {isMergingVideos && <MagicTextDisplay status="MERGING_VIDEO" text="正在合并全量视频..." />}
              {(!isMergingVideos && mergedVideoUrl) && (
                <div className="mb-6 bg-gray-700 rounded-xl p-6">
                  <video src={mergedVideoUrl} controls className="w-full max-h-[600px] mb-4 bg-black rounded" />
                  <div className="flex gap-4">
                    <button
                      onClick={async () => {
                        const response = await fetch(mergedVideoUrl);
                        const blob = await response.blob();
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = 'final_video.mp4';
                        a.click();
                      }}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded font-bold transition-colors"
                    >
                      📥 下载完整视频
                    </button>
                    <button
                      onClick={executeFinalVideoMerge}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors"
                    >
                      🔄 重新生成
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button onClick={() => setShowMergeModal(false)} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded font-bold transition-colors">关闭</button>
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

      {/* 🚀 一键全自动生成配置弹窗 */}
      {showAutoModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex items-center gap-3 mb-6 text-indigo-400">
              <span className="text-3xl">🚀</span>
              <h3 className="text-2xl font-bold text-white">一键全自动生成配置</h3>
            </div>

            <div className="space-y-6">
              {/* 停顿设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">默认单页停顿 (秒)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" min="0" max="3" step="0.1" 
                    value={autoDefaultGap} 
                    onChange={(e) => setAutoDefaultGap(parseFloat(e.target.value))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="text-white font-mono w-10 text-right">{autoDefaultGap}s</span>
                </div>
              </div>

              {/* 空讲稿处理 */}
              <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                <div>
                  <div className="text-sm font-bold text-gray-200">跳过空讲稿页面</div>
                  <div className="text-xs text-gray-500">开启后将不为内容为空的幻灯片生成音视频</div>
                </div>
                <button 
                  onClick={() => setAutoSkipEmpty(!autoSkipEmpty)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${autoSkipEmpty ? 'bg-indigo-600' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoSkipEmpty ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              {/* 资源覆盖策略 */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">生成策略</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setAutoRebuildAll(false)}
                    className={`p-3 rounded-lg border text-sm font-bold transition-all ${!autoRebuildAll ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-gray-700 border-transparent text-gray-400'}`}
                  >
                    仅补全缺失资源
                  </button>
                  <button 
                    onClick={() => setAutoRebuildAll(true)}
                    className={`p-3 rounded-lg border text-sm font-bold transition-all ${autoRebuildAll ? 'bg-orange-600/20 border-orange-500 text-orange-300' : 'bg-gray-700 border-transparent text-gray-400'}`}
                  >
                    全部强制重做
                  </button>
                </div>
              </div>

              {/* 风险告知 */}
              <div className="bg-amber-900/20 border border-amber-900/50 rounded-lg p-4 text-xs text-amber-200/80 leading-relaxed">
                <p className="font-bold mb-1 text-amber-400">⚠️ 注意事项：</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>此操作将批量调用配音 API，请确保账户额度充足。</li>
                  <li>视幻灯片数量，生成过程可能需要 **3-10分钟**，请勿关闭页面。</li>
                  <li>一旦开始，除刷新页面外无法中途取消。</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setShowAutoModal(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleConfirmAutoGeneration}
                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
              >
                我知道了，开始生成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Loading */}
      {(showGlobalLoading || isAutoProcessing) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-10 max-w-2xl w-full mx-4 text-center shadow-2xl">
            <MagicTextDisplay
              status={isAutoProcessing ? 'MERGING_VIDEO' : (globalLoadingType === 'AUDIO' ? 'GENERATING_AUDIO' : 'GENERATING_VIDEO')}
              text={isAutoProcessing 
                ? `🚀 全自动批量处理中... (当前进度取决于资源量)`
                : (currentSlideTexts.length > 0 ? currentSlideTexts[currentTextIndex % currentSlideTexts.length] : "正在处理...")
              }
            />
            {isAutoProcessing && (
              <div className="mt-8">
                <div className="flex justify-between text-xs text-indigo-400 mb-2 font-mono">
                  <span>SYSTEM_BATCH_PROCESSING</span>
                  <span>DO_NOT_REFRESH</span>
                </div>
                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 animate-pulse relative" style={{ width: '100%' }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>
                </div>
                <p className="mt-4 text-gray-500 text-sm">正在调度 AI 算力补全所有音视频片段，请耐心等待完成...</p>
              </div>
            )}
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