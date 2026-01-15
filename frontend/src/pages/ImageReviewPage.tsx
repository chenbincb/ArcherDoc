import React, { useState, useEffect, useRef } from 'react';
import { ImageGenerationSettings, ImageProvider, AppSettings, SlideImageData, GeneratedImage } from '../types';
import { MagicTextDisplay } from '../components/MagicTextDisplay';
import { SlidePreview } from '../components/SlidePreview';
import { SceneTextPreview } from '../components/SceneTextPreview';
import { DEFAULT_SETTINGS, API_CONFIG, API_ENDPOINTS } from '../constants';
import * as JSZip from 'jszip';

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

interface ImageReviewPageProps {
  imageJobId: string;
  onOpenSettings?: (options?: { tab?: 'ai' | 'translation' | 'video' | 'image'; subTab?: string }) => void;
  settings?: AppSettings;
  onSaveSettings?: (newSettings: AppSettings) => void;
}

export const ImageReviewPage: React.FC<ImageReviewPageProps> = ({
  imageJobId,
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

  // Update imageSettings when appSettings changes
  const [localImageSettings, setLocalImageSettings] = useState<ImageGenerationSettings>(appSettings.imageSettings);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDataList, setSlideDataList] = useState<SlideImageData[]>([]);
  // 管理每个幻灯片的图片显示状态：true显示AI图片，false显示PPT图片
  const [slideImageDisplayStates, setSlideImageDisplayStates] = useState<Record<number, boolean>>({});

  // 图片生成参数状态
  const [imageGenParams, setImageGenParams] = useState({
    imageStyle: '科技',
    contentType: '自动识别'
  });

  // 图片风格选项
  const imageStyles = ['扁平矢量', '企业商务', '2.5D等轴测', '线框手绘', '科技蓝图'];

  // 内容类型选项
  const contentTypes = ['自动识别', '逻辑架构图', '业务流程图', '网络拓扑图', '数据可视化', '产品路线图', '功能功能对比图', '封面/通用页'];
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingComfyUI, setIsGeneratingComfyUI] = useState(false);
  const [isGeneratingNanoBanana, setIsGeneratingNanoBanana] = useState(false);
  const [showGlobalLoading, setShowGlobalLoading] = useState(false);
  const [globalLoadingType, setGlobalLoadingType] = useState<'COMFYUI' | 'NANOBANANA' | null>(null);
  const [currentProcessingSlide, setCurrentProcessingSlide] = useState(0);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  // Export dialog states
  const [showExportDialog, setShowExportDialog] = useState<boolean>(false);
  const [exportData, setExportData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Image display states
  const [showImageFullscreen, setShowImageFullscreen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<GeneratedImage | null>(null);

  // Loading state for prompt generation
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  // 文本文档模式相关状态
  const [isTextMode, setIsTextMode] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [processingDetail, setProcessingDetail] = useState<string>('');

  // 图片版本切换状态：记录每个 slide 当前显示的版本索引
  const [slideVersionIndexes, setSlideVersionIndexes] = useState<Record<number, number>>({});

  // update localImageSettings when appSettings changes
  useEffect(() => {
    setLocalImageSettings(appSettings.imageSettings);
  }, [appSettings]);

  // 全屏模式下的键盘事件监听
  useEffect(() => {
    if (!showImageFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const versions = slideDataList[currentSlide]?.generatedImageVersions || [];
      const currentVersionIndex = slideVersionIndexes[currentSlide] || 0;

      if (e.key === 'Escape') {
        setShowImageFullscreen(false);
      } else if (e.key === 'ArrowLeft' && versions.length > 1) {
        const newIndex = currentVersionIndex === 0 ? versions.length - 1 : currentVersionIndex - 1;
        setSlideVersionIndexes(prev => ({ ...prev, [currentSlide]: newIndex }));
        const newVersion = versions[newIndex];
        if (newVersion) {
          setFullscreenImage({
            id: `version_${newIndex}`,
            slideId: currentSlide + 1,
            url: newVersion.url.startsWith('http') ? newVersion.url : `${API_CONFIG.BASE_URL}${newVersion.url}`,
            thumbnailUrl: newVersion.url,
            prompt: newVersion.metadata?.prompt || '',
            negativePrompt: newVersion.metadata?.negativePrompt,
            generationTime: newVersion.metadata?.generationTime || 0,
            provider: newVersion.metadata?.provider as any,
            width: newVersion.metadata?.width || 1024,
            height: newVersion.metadata?.height || 1024,
            fileSize: 0,
            createdAt: newVersion.metadata?.createdAt || ''
          });
        }
      } else if (e.key === 'ArrowRight' && versions.length > 1) {
        const newIndex = currentVersionIndex >= versions.length - 1 ? 0 : currentVersionIndex + 1;
        setSlideVersionIndexes(prev => ({ ...prev, [currentSlide]: newIndex }));
        const newVersion = versions[newIndex];
        if (newVersion) {
          setFullscreenImage({
            id: `version_${newIndex}`,
            slideId: currentSlide + 1,
            url: newVersion.url.startsWith('http') ? newVersion.url : `${API_CONFIG.BASE_URL}${newVersion.url}`,
            thumbnailUrl: newVersion.url,
            prompt: newVersion.metadata?.prompt || '',
            negativePrompt: newVersion.metadata?.negativePrompt,
            generationTime: newVersion.metadata?.generationTime || 0,
            provider: newVersion.metadata?.provider as any,
            width: newVersion.metadata?.width || 1024,
            height: newVersion.metadata?.height || 1024,
            fileSize: 0,
            createdAt: newVersion.metadata?.createdAt || ''
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImageFullscreen, currentSlide, slideDataList, slideVersionIndexes]);



  // Handle settings save
  const handleSaveSettings = (newSettings: AppSettings) => {
    if (externalSaveSettings) {
      externalSaveSettings(newSettings);
    } else {
      setInternalSettings(newSettings);
      localStorage.setItem('archerdoc-ai-settings-v1', JSON.stringify(newSettings));
    }
  };

  // Add log message
  const addLog = (msg: string) => {
    console.log(msg); // For now, just log to console
  };

  // Show notification
  const showNotification = (message: string, type: 'success' | 'error' = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Check if AI-generated image exists on server
  const checkImageExists = (url: string, onExists: () => void, onError: () => void) => {
    // Create a new image element
    const img = new Image();
    img.crossOrigin = 'anonymous';

    // Use a flag to prevent multiple calls
    let existsCalled = false;

    const handleLoad = () => {
      if (!existsCalled) {
        existsCalled = true;
        onExists();
      }
    };

    const handleError = () => {
      if (!existsCalled) {
        existsCalled = true;
        onError();
      }
    };

    // Set up event listeners
    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    // Set image source to trigger loading
    img.src = url;
  };

  // Toggle image display state for a specific slide
  const toggleSlideImageDisplay = (slideIndex: number) => {
    setSlideImageDisplayStates(prev => ({
      ...prev,
      [slideIndex]: !prev[slideIndex]
    }));
  };


  // Fetch slide data from backend
  const fetchSlideData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setProcessingDetail('正在获取任务数据...');
      addLog('正在获取任务数据...');

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/get-job-data?jobId=${imageJobId}&type=image`);

      if (!response.ok) {
        throw new Error(`获取数据失败: ${response.statusText}`);
      }

      const responseData = await response.json();
      const data = responseData.data || responseData;

      // 识别是否为文本文档模式
      const originalFilename = data.metadata?.originalFilename || '';
      const isText = originalFilename.match(/\.(docx|pdf|txt|md)$/i);
      setIsTextMode(!!isText);

      // 获取文档内容 (如果是文本模式)
      let initialDescription = '基于文档内容或选划文字生成配图';
      if (isText) {
        try {
          const docResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/get-doc-content?jobId=${imageJobId}`);
          if (docResponse.ok) {
            const docData = await docResponse.json();
            const content = docData.data?.content || docData.data?.slides?.[0]?.content || '';
            setDocumentContent(content);
            initialDescription = content.substring(0, 1000);
          }
        } catch (e) {
          console.error('获取文档内容失败:', e);
        }
      }

      // 解析场景/幻灯片数据
      let imageData: SlideImageData[] = [];

      if (isText) {
        // 文本模式下，检查后端是否已生成提示词
        const notes = data.notes || [];
        if (notes.length > 0) {
          // 文本模式下，尝试从 slides 获取版本
          const slideInfo = data.slides?.[0];
          imageData = notes.map((itemNode: any, index: number) => {
            const versions = slideInfo?.generatedImageVersions || [];
            const latestVersion = versions[0];
            return {
              id: itemNode.id || 1,
              slideTitle: itemNode.title || '文本文档配图',
              slideContent: itemNode.content || '',
              imageUrl: null,
              description: itemNode.description || itemNode.visual_concept || initialDescription,
              suggestedPrompt: itemNode.suggestedPrompt || '',
              userPrompt: itemNode.suggestedPrompt || '',
              negativePrompt: localImageSettings.negativePrompt,
              generationStatus: (latestVersion ? 'completed' : 'pending') as any,
              generatedImageVersions: versions,
              generatedImage: latestVersion ? {
                id: `persisted_${index}_${Date.now()}`,
                slideId: itemNode.id || 1,
                url: latestVersion.url.startsWith('http') ? latestVersion.url : `${API_CONFIG.BASE_URL}${latestVersion.url}`,
                thumbnailUrl: latestVersion.url.startsWith('http') ? latestVersion.url : `${API_CONFIG.BASE_URL}${latestVersion.url}`,
                prompt: latestVersion.metadata.prompt,
                negativePrompt: latestVersion.metadata.negativePrompt,
                generationTime: latestVersion.metadata.generationTime,
                provider: latestVersion.metadata.provider as ImageProvider,
                width: latestVersion.metadata.width,
                height: latestVersion.metadata.height,
                fileSize: 0,
                createdAt: latestVersion.metadata.createdAt
              } : undefined
            };
          });
        } else {
          // 后端尚未生成提示词数据，使用默认值
          const slideInfo = data.slides?.[0];
          imageData = [{
            id: 1,
            slideTitle: '文本文档配图',
            slideContent: '',
            imageUrl: null,
            description: initialDescription,
            suggestedPrompt: '',
            userPrompt: '',
            negativePrompt: localImageSettings.negativePrompt,
            generationStatus: 'pending' as const,
            generatedImageVersions: slideInfo?.generatedImageVersions || []
          }];
        }
      } else {
        const notes = data.notes || [];
        if (notes.length > 0) {
          imageData = notes.map((item: any, index: number) => {
            const slideId = item.id || index + 1;
            const slideInfo = data.slides?.[index] || data.slides?.find((s: any) => s.id === (item.id || index + 1));
            const extension = slideInfo?.imageExtension || '.png';
            const slideFileName = `slide_${index}${extension}`; // 图片文件名从 0 开始
            const imageUrl = buildMediaUrl(API_CONFIG.BASE_URL, imageJobId, 'images', slideFileName);

            const versions = slideInfo?.generatedImageVersions || [];
            const latestVersion = versions[0];

            return {
              id: slideId,
              slideTitle: item.title || `幻灯片 ${index + 1}`,
              slideContent: item.content || '',
              imageUrl: imageUrl,
              description: item.visual_concept || item.description || item.content || '',
              suggestedPrompt: item.suggestedPrompt || `Professional illustration, theme: ${item.title}, tech style`,
              userPrompt: item.suggestedPrompt || `Professional illustration, theme: ${item.title}, tech style`,
              negativePrompt: localImageSettings.negativePrompt,
              generationStatus: (latestVersion ? 'completed' : 'pending') as any,
              generatedImageVersions: versions,
              generatedImage: latestVersion ? {
                id: `persisted_${index}_${Date.now()}`,
                slideId: slideId,
                url: latestVersion.url.startsWith('http') ? latestVersion.url : `${API_CONFIG.BASE_URL}${latestVersion.url}`,
                thumbnailUrl: latestVersion.url.startsWith('http') ? latestVersion.url : `${API_CONFIG.BASE_URL}${latestVersion.url}`,
                prompt: latestVersion.metadata.prompt,
                negativePrompt: latestVersion.metadata.negativePrompt,
                generationTime: latestVersion.metadata.generationTime,
                provider: latestVersion.metadata.provider as ImageProvider,
                width: latestVersion.metadata.width,
                height: latestVersion.metadata.height,
                fileSize: 0,
                createdAt: latestVersion.metadata.createdAt
              } : undefined
            };
          });
        }
      }

      setSlideDataList(imageData);

      // 初始化每个幻灯片的显示状态：如果有 AI 图片则显示 AI 图片，否则显示 PPT 原图
      const initialDisplayStates: Record<number, boolean> = {};
      imageData.forEach((slide, idx) => {
        initialDisplayStates[idx] = !!slide.generatedImage;
      });
      setSlideImageDisplayStates(initialDisplayStates);

      setProcessingDetail('数据加载完成');
    } catch (err: any) {
      console.error('获取任务数据失败:', err);
      setError(err.message || '获取数据失败');
    } finally {
      setIsLoading(false);
    }
  };


  // Analyze slide content for image generation
  const analyzeSlideContent = async (slideIndex: number) => {
    try {
      const slideData = slideDataList[slideIndex];
      if (!slideData) return;

      setProcessingDetail('正在分析幻灯片内容...');
      addLog(`正在分析第 ${slideIndex + 1} 页幻灯片内容...`);

      // 如果已经有描述和提示词，不需要重新分析
      if (slideData.description && slideData.suggestedPrompt) {
        addLog(`第 ${slideIndex + 1} 页已有内容分析结果`);
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/analyze-slide-for-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slideId: slideData.id,
          slideTitle: slideData.slideTitle,
          slideContent: slideData.slideContent,
          provider: localImageSettings.defaultProvider
        }),
      });

      if (!response.ok) {
        throw new Error(`分析失败: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const updatedSlideData = [...slideDataList];
        updatedSlideData[slideIndex] = {
          ...slideData,
          description: result.data.description || slideData.description,
          suggestedPrompt: result.data.suggestedPrompt || slideData.suggestedPrompt,
          userPrompt: result.data.suggestedPrompt || slideData.userPrompt
        };

        setSlideDataList(updatedSlideData);
        showNotification('内容分析完成', 'success');
        addLog(`第 ${slideIndex + 1} 页内容分析完成`);
      } else {
        throw new Error(result.message || '分析失败');
      }

    } catch (err: any) {
      console.error('分析幻灯片内容失败:', err);
      showNotification('内容分析失败，使用默认提示词', 'error');

      // 设置默认提示词
      const defaultPrompt = `专业PPT插图，主题：${slideDataList[slideIndex].slideTitle}，商务风格，高质量，清晰明亮`;
      const updatedSlideData = [...slideDataList];
      updatedSlideData[slideIndex] = {
        ...slideDataList[slideIndex],
        userPrompt: defaultPrompt,
        suggestedPrompt: defaultPrompt,
        description: slideDataList[slideIndex].description || `第${slideIndex + 1}页PPT内容：${slideDataList[slideIndex].slideTitle}`
      };
      setSlideDataList(updatedSlideData);
    }
  };

  // Generate image using selected provider
  const generateImage = async (provider: ImageProvider) => {
    try {
      const currentSlideData = slideDataList[currentSlide];
      if (!currentSlideData) return;

      if (provider === ImageProvider.COMFYUI) {
        setIsGeneratingComfyUI(true);
        setGlobalLoadingType('COMFYUI');
      } else {
        setIsGeneratingNanoBanana(true);
        setGlobalLoadingType('NANOBANANA');
      }

      // Show global loading modal
      setShowGlobalLoading(true);
      setCurrentProcessingSlide(currentSlide);

      // Update slide status
      const updatedSlideData = [...slideDataList];
      updatedSlideData[currentSlide] = {
        ...currentSlideData,
        generationStatus: 'generating' as const,
        errorMessage: undefined
      };
      setSlideDataList(updatedSlideData);

      // 设置状态文字，包含提供商和页码信息
      const providerName = provider === ImageProvider.COMFYUI ? 'ComfyUI' : 'NanoBanana';
      setProcessingDetail(`正在使用 ${providerName} 为第 ${currentSlide + 1} 页生成图片...`);
      addLog(`正在使用 ${provider} 生成图片: ${currentSlideData.userPrompt}`);

      const slideId = currentSlide + 1;

      // 调用图片生成API
      // slideId已在上面定义为 currentSlide + 1

      let response;

      if (provider === ImageProvider.NANO_BANANA) {
        // NanoBanana: 先调用Google Gemini API，再传给n8n保存
        const nanobananaSettings = localImageSettings.nanobananaSettings;

        // 检查API密钥是否配置
        if (!nanobananaSettings.apiKey || nanobananaSettings.apiKey.trim() === '') {
          showNotification('缺少Nano Banana必要参数，请在设置中配置Google AI API Key');
          // 直接打开设置弹窗到image标签页的Nano Banana子标签页
          onOpenSettings?.({ tab: 'image', subTab: 'nanobanana' });
          // 重置加载状态
          setIsGeneratingNanoBanana(false);
          setGlobalLoadingType('');
          setShowGlobalLoading(false);
          setCurrentProcessingSlide(-1);
          // 重置幻灯片状态
          const updatedSlideData = [...slideDataList];
          updatedSlideData[currentSlide] = {
            ...currentSlideData,
            generationStatus: 'pending' as const,
            errorMessage: undefined
          };
          setSlideDataList(updatedSlideData);
          return;
        }

        setProcessingDetail('正在调用Google Gemini API生成图片...');
        addLog('开始调用Google Gemini API');

        // 调用Google Gemini API
        const geminiRequest = {
          contents: [{
            parts: [{
              text: currentSlideData.userPrompt
            }]
          }],
          generationConfig: {
            responseModalities: ["Image"],
            imageConfig: {
              aspectRatio: nanobananaSettings.aspectRatio,
              imageSize: nanobananaSettings.quality === 'hd' ? '2K' : '1K'
            }
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ]
        };

        setProcessingDetail('Google Gemini API正在生成图片，请耐心等待（约15-30秒）...');

        // ========== 调试代码开始 ==========
        const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${nanobananaSettings.model}:generateContent`;
        const apiKeyPreview = nanobananaSettings.apiKey ? 
          `${nanobananaSettings.apiKey.substring(0, 10)}...${nanobananaSettings.apiKey.substring(nanobananaSettings.apiKey.length - 4)}` : 
          '(未设置)';
        
        console.log('=== NanoBanana 调试信息 ===');
        console.log('请求时间:', new Date().toISOString());
        console.log('API URL:', requestUrl);
        console.log('API Key (预览):', apiKeyPreview);
        console.log('Model:', nanobananaSettings.model);
        console.log('Aspect Ratio:', nanobananaSettings.aspectRatio);
        console.log('Quality:', nanobananaSettings.quality);
        console.log('Prompt:', currentSlideData.userPrompt);
        console.log('完整请求体:', JSON.stringify(geminiRequest, null, 2));
        
        // 添加超时控制 (2分钟)
        const controller = new AbortController();
        const timeoutMs = 120000; // 2分钟
        const timeoutId = setTimeout(() => {
          console.error(`=== 请求超时 (${timeoutMs / 1000}秒) ===`);
          controller.abort();
        }, timeoutMs);
        
        const fetchStartTime = Date.now();
        console.log('开始发送请求...');
        // ========== 调试代码结束 ==========

        let geminiResponse: Response;
        try {
          geminiResponse = await fetch(requestUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': nanobananaSettings.apiKey,
            },
            body: JSON.stringify(geminiRequest),
            signal: controller.signal,
          });
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          const elapsed = (Date.now() - fetchStartTime) / 1000;
          console.error('=== Fetch 错误详情 ===');
          console.error('耗时:', elapsed.toFixed(2), '秒');
          console.error('错误类型:', fetchError.name);
          console.error('错误消息:', fetchError.message);
          console.error('完整错误对象:', fetchError);
          
          if (fetchError.name === 'AbortError') {
            throw new Error(`请求超时（${timeoutMs / 1000}秒），请检查网络连接或考虑使用代理`);
          }
          throw new Error(`网络请求失败: ${fetchError.message}。可能原因：1) 网络连接问题 2) 需要配置代理 3) API 地址被阻断`);
        } finally {
          clearTimeout(timeoutId);
        }

        // 调试：打印响应信息
        const fetchEndTime = Date.now();
        console.log('=== 响应信息 ===');
        console.log('请求耗时:', ((fetchEndTime - fetchStartTime) / 1000).toFixed(2), '秒');
        console.log('响应状态:', geminiResponse.status, geminiResponse.statusText);
        console.log('响应头:', Object.fromEntries(geminiResponse.headers.entries()));

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error('=== API 错误响应 ===');
          console.error('状态码:', geminiResponse.status);
          console.error('错误内容:', errorText);
          throw new Error(`Google Gemini API调用失败: ${geminiResponse.statusText} - ${errorText}`);
        }

        const geminiResult = await geminiResponse.json();
        addLog('Google Gemini API调用成功，检查生成结果');

        if (!geminiResult.candidates || geminiResult.candidates.length === 0) {
          throw new Error('Google Gemini未返回生成的图片');
        }

        const candidate = geminiResult.candidates[0];

        // 检查是否有finishReason，如果是NO_IMAGE则直接报错
        if (candidate.finishReason) {
          console.log('生成状态:', candidate.finishReason);
          if (candidate.finishReason === 'NO_IMAGE') {
            throw new Error('Google Gemini未生成图片，可能是因为提示词不符合政策要求或其他原因');
          }
        }

        // 检查是否有图片数据
        if (!candidate.content || !candidate.content.parts) {
          throw new Error('Google Gemini未返回图片内容');
        }

        const imagePart = candidate.content.parts.find((part: any) => part.inlineData);
        if (!imagePart || !imagePart.inlineData) {
          throw new Error('Google Gemini未生成有效的图片数据');
        }

        // 调用n8n保存响应数据
        setProcessingDetail('正在保存生成的图片到服务器...');

        response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId: imageJobId,
            slideId: slideId,
            provider: 'nanobanana',
            nanobananaResponseData: JSON.stringify(geminiResult),
            isTextMode: isTextMode,
            prompt: currentSlideData.userPrompt,
            negativePrompt: currentSlideData.negativePrompt || localImageSettings.negativePrompt,
            width: localImageSettings.comfyuiSettings.width,
            height: localImageSettings.comfyuiSettings.height
          }),
        });
      } else {
        // ComfyUI: 直接调用n8n工作流
        response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/generate-images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId: imageJobId,
            slideId: slideId,
            prompt: currentSlideData.userPrompt,
            negativePrompt: currentSlideData.negativePrompt || localImageSettings.negativePrompt,
            width: localImageSettings.comfyuiSettings.width,
            height: localImageSettings.comfyuiSettings.height,
            provider: ImageProvider.COMFYUI,
            isTextMode: isTextMode
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`图片生成失败: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '图片生成失败');
      }

      // 构建生成的图片信息（添加时间戳防止缓存）
      const timestamp = Date.now();
      const cacheBust = `?t=${timestamp}`;
      // 使用后端返回的特定文件名 URL，如果缺失则不显示
      const serverImageUrl = result.data?.imageUrl
        ? (result.data.imageUrl.startsWith('http') ? result.data.imageUrl : `${API_CONFIG.BASE_URL}${result.data.imageUrl}`)
        : '';

      if (!serverImageUrl) {
        throw new Error('未获取到生成的图片地址');
      }

      const imageUrl = `${serverImageUrl}${cacheBust}`;

      const generatedImage: GeneratedImage = {
        id: `${provider}_${timestamp}`,
        slideId: slideId,
        url: imageUrl,
        thumbnailUrl: imageUrl,
        prompt: currentSlideData.userPrompt,
        negativePrompt: currentSlideData.negativePrompt,
        generationTime: result.data?.generationTime || result.generationTime || 5.0,
        provider: provider,
        width: provider === ImageProvider.COMFYUI ? localImageSettings.comfyuiSettings.width : 1024,
        height: provider === ImageProvider.COMFYUI ? localImageSettings.comfyuiSettings.height : 1024,
        fileSize: result.data?.fileSize || result.fileSize || 512000,
        createdAt: new Date().toISOString()
      };

      // Update slide data with generated image
      const finalSlideData = [...slideDataList];
      const newVersions = [...(currentSlideData.generatedImageVersions || [])];

      // 添加新生成的版本到版本历史
      newVersions.unshift({
        url: imageUrl,
        filename: result.data?.fileName || `slide_${slideId}.png`,
        metadata: {
          prompt: generatedImage.prompt,
          negativePrompt: generatedImage.negativePrompt,
          provider: generatedImage.provider,
          width: generatedImage.width,
          height: generatedImage.height,
          generationTime: generatedImage.generationTime,
          createdAt: generatedImage.createdAt
        }
      });

      finalSlideData[currentSlide] = {
        ...currentSlideData,
        generatedImage: generatedImage,
        generatedImageVersions: newVersions as any,
        generationStatus: 'completed' as const
      };
      setSlideDataList(finalSlideData);

      // 生成成功后，重置当前幻灯片的版本索引为最新（0）
      setSlideVersionIndexes(prev => ({
        ...prev,
        [currentSlide]: 0
      }));

      // 生成成功后，自动切换到显示AI图片
      setSlideImageDisplayStates(prev => ({
        ...prev,
        [currentSlide]: true
      }));

      showNotification('图片生成成功', 'success');
      addLog(`图片生成成功: ${generatedImage.url}`);

    } catch (err: any) {
      console.error('生成图片失败:', err);

      // Update slide status with error
      const errorSlideData = [...slideDataList];
      errorSlideData[currentSlide] = {
        ...currentSlideData,
        generationStatus: 'error' as const,
        errorMessage: err.message
      };
      setSlideDataList(errorSlideData);

      showNotification(err.message || '生成失败', 'error');
    } finally {
      setIsGeneratingComfyUI(false);
      setIsGeneratingNanoBanana(false);
      setShowGlobalLoading(false);
      setGlobalLoadingType(null);
      setCurrentProcessingSlide(-1);
    }
  };

  // Optimize prompt with AI
  const optimizePrompt = async () => {
    try {
      const currentSlideData = slideDataList[currentSlide];
      if (!currentSlideData) return;

      setProcessingDetail('正在优化提示词...');
      addLog('正在使用AI优化提示词...');

      // 调用真实的提示词优化API
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/optimize-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalPrompt: currentSlideData.userPrompt,
          description: currentSlideData.description,
          slideTitle: currentSlideData.slideTitle
        }),
      });

      if (!response.ok) {
        throw new Error(`提示词优化失败: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '提示词优化失败');
      }

      const optimizedPrompt = result.optimizedPrompt || currentSlideData.userPrompt;

      const updatedSlideData = [...slideDataList];
      updatedSlideData[currentSlide] = {
        ...currentSlideData,
        userPrompt: optimizedPrompt,
        suggestedPrompt: optimizedPrompt
      };

      setSlideDataList(updatedSlideData);
      showNotification('提示词优化完成', 'success');

    } catch (err: any) {
      console.error('优化提示词失败:', err);
      showNotification(err.message || '优化失败', 'error');
    }
  };

  // Generate smart prompt for current slide (调用后端 API)
  const generateSmartPromptForCurrentSlide = async () => {
    try {
      setIsGeneratingPrompt(true);
      const currentSlideData = slideDataList[currentSlide];
      if (!currentSlideData) return;

      const slideContent = isTextMode && selectedText
        ? `用户划选的原文片段: ${selectedText}`
        : (currentSlideData.slideContent || currentSlideData.description || documentContent || '');

      setProcessingDetail(isTextMode && selectedText ? '正在基于划选文字生成提示词...' : '正在生成智能提示词...');
      addLog(isTextMode && selectedText ? '正在基于划选文字生成智能提示词...' : '正在使用AI生成智能提示词...');

      // 获取用户的 AI 配置
      const activeProvider = appSettings.activeProvider;
      const aiConfig = appSettings.configs[activeProvider];

      // 调用后端 API 生成提示词
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/analyze-slide-for-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slideId: currentSlideData.id,
          slideTitle: currentSlideData.slideTitle || '',
          slideContent: slideContent,
          provider: localImageSettings.defaultProvider,
          imageStyle: imageGenParams.imageStyle,
          contentType: imageGenParams.contentType,
          // 传递 AI 配置
          aiProvider: activeProvider,
          aiApiKey: aiConfig?.apiKey,
          aiModel: aiConfig?.model,
          aiBaseUrl: aiConfig?.baseUrl
        }),
      });

      if (!response.ok) {
        throw new Error(`生成失败: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data?.suggestedPrompt) {
        const enhancedPrompt = result.data.suggestedPrompt;

        // Update the current slide's userPrompt with the AI-generated prompt
        const updatedSlideData = [...slideDataList];
        updatedSlideData[currentSlide] = {
          ...currentSlideData,
          userPrompt: enhancedPrompt,
          suggestedPrompt: enhancedPrompt
        };
        setSlideDataList(updatedSlideData);

        // 保存提示词到服务器（持久化）
        try {
          await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/save-slide-prompt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jobId: imageJobId,
              slideId: currentSlideData.id,
              prompt: enhancedPrompt
            }),
          });
          addLog(`提示词已保存到服务器`);
        } catch (saveErr) {
          console.warn('保存提示词失败:', saveErr);
        }

        showNotification('智能提示词生成完成', 'success');
        addLog(`第 ${currentSlide + 1} 页智能提示词生成完成`);
      } else {
        throw new Error(result.message || '生成失败');
      }
    } catch (err: any) {
      console.error('生成智能提示词失败:', err);
      showNotification(err.message || '生成智能提示词失败', 'error');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };


  // Download single image
  const downloadImage = async (image: GeneratedImage) => {
    try {
      const absoluteUrl = image.url.startsWith('http') || image.url.startsWith('blob:')
        ? image.url
        : `${API_CONFIG.BASE_URL}${image.url}`;

      const response = await fetch(absoluteUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slide_${image.slideId}_generated.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification('图片下载成功', 'success');
    } catch (err: any) {
      console.error('下载图片失败:', err);
      showNotification(err.message || '下载失败', 'error');
    }
  };

  // Download all generated images
  const downloadAllImages = async () => {
    const generatedImages = slideDataList
      .filter(slide => slide.generatedImage)
      .map(slide => slide.generatedImage!);

    if (generatedImages.length === 0) {
      showNotification('没有已生成的图片', 'error');
      return;
    }

    setIsExporting(true);
    setExportData({
      message: `正在准备下载 ${generatedImages.length} 张图片...`,
      type: 'info'
    });

    try {
      const zip = new JSZip();

      for (let i = 0; i < generatedImages.length; i++) {
        const image = generatedImages[i];
        const absoluteUrl = image.url.startsWith('http') || image.url.startsWith('blob:')
          ? image.url
          : `${API_CONFIG.BASE_URL}${image.url}`;

        const response = await fetch(absoluteUrl);
        const blob = await response.blob();
        zip.file(`slide_${image.slideId}_generated.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated_images_${imageJobId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportData({
        message: `成功导出 ${generatedImages.length} 张图片`,
        type: 'success'
      });
      showNotification('图片包下载成功', 'success');

    } catch (err: any) {
      console.error('导出图片失败:', err);
      setExportData({
        message: err.message || '导出失败',
        type: 'error'
      });
      showNotification(err.message || '导出失败', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Show image fullscreen
  const showImageFullscreenView = (image: GeneratedImage) => {
    setFullscreenImage(image);
    setShowImageFullscreen(true);
  };

  // Update slide data when current slide changes
  const updateSlideData = (field: keyof SlideImageData, value: any) => {
    const updatedSlideData = [...slideDataList];
    updatedSlideData[currentSlide] = {
      ...updatedSlideData[currentSlide],
      [field]: value
    };

    // 如果用户修改了description，同步更新userPrompt
    if (field === 'description') {
      updatedSlideData[currentSlide].userPrompt = value;
    }

    setSlideDataList(updatedSlideData);
  };

  // Handle image version change
  const handleVersionChange = (slideIndex: number, versionIndex: number) => {
    setSlideVersionIndexes(prev => ({
      ...prev,
      [slideIndex]: versionIndex
    }));

    // 同步更新当前显示的图片信息（供全屏和下载使用）
    const slide = slideDataList[slideIndex];
    if (slide.generatedImageVersions && slide.generatedImageVersions[versionIndex]) {
      const version = slide.generatedImageVersions[versionIndex];
      const updatedSlideData = [...slideDataList];
      const absoluteUrl = version.url.startsWith('http') ? version.url : `${API_CONFIG.BASE_URL}${version.url}`;

      updatedSlideData[slideIndex] = {
        ...slide,
        generatedImage: {
          id: `version_${versionIndex}_${Date.now()}`,
          slideId: slide.id,
          url: absoluteUrl,
          thumbnailUrl: absoluteUrl,
          prompt: version.metadata.prompt,
          negativePrompt: version.metadata.negativePrompt,
          generationTime: version.metadata.generationTime,
          provider: version.metadata.provider as ImageProvider,
          width: version.metadata.width,
          height: version.metadata.height,
          fileSize: 0,
          createdAt: version.metadata.createdAt
        }
      };
      setSlideDataList(updatedSlideData);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchSlideData();
  }, [imageJobId]);



  // Cycle through prompt texts during image generation
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (showGlobalLoading) {
      const currentSlideData = slideDataList[currentProcessingSlide];
      if (currentSlideData?.userPrompt) {
        // 获取当前幻灯片的提示词
        const prompt = currentSlideData.userPrompt;
        let currentSlideTexts: string[] = [];

        // 1. 尝试使用中英文标点符号分割句子
        const punctuationSplit = prompt.split(/[。！？；；.!?;:]+/).filter(sentence => sentence.trim());

        if (punctuationSplit.length > 1) {
          // 如果能分割出多个句子，使用分割后的句子
          currentSlideTexts = punctuationSplit;
        } else {
          // 2. 如果只有一个句子，尝试按逗号分割
          const commaSplit = prompt.split(/[,，]+/).filter(sentence => sentence.trim());
          if (commaSplit.length > 1) {
            currentSlideTexts = commaSplit;
          } else {
            // 3. 如果还是只有一个句子，按固定长度分割（每50个字符一段）
            const longSentence = prompt.trim();
            const maxLength = 50;

            for (let i = 0; i < longSentence.length; i += maxLength) {
              currentSlideTexts.push(longSentence.substring(i, i + maxLength));
            }
          }
        }

        // 确保至少有一个句子
        if (currentSlideTexts.length === 0) {
          currentSlideTexts = [prompt];
        }

        // 设置定时器，每秒更新currentTextIndex
        if (currentSlideTexts.length > 0) {
          interval = setInterval(() => {
            setCurrentTextIndex(prev => (prev + 1) % currentSlideTexts.length);
          }, 1000);
        }
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showGlobalLoading, currentProcessingSlide, slideDataList]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">正在加载幻灯片数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const currentSlideData = slideDataList[currentSlide];

  return (
    <div className="container mx-auto p-4 pt-10">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-[9999] ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
          {notification.message}
        </div>
      )}
      {/*<h2 className="text-xl font-bold mb-4">图片生成</h2>*/}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Left: Unified Preview Arena */}
        <div className={`flex flex-col ${isTextMode ? 'h-[80vh] min-h-[600px]' : ''}`}>
          <SlidePreview
            currentSlide={currentSlide}
            totalSlides={slideDataList.length}
            slideNumber={currentSlide + 1}
            isTextMode={isTextMode}
            headerTitle={isTextMode ? '划选生图模式' : undefined}
            documentContent={documentContent}
            highlightText={selectedText}
            onTextSelect={(text) => setSelectedText(text)}
            imageUrl={(() => {
              const baseImgUrl = slideImageDisplayStates[currentSlide]
                ? (currentSlideData?.generatedImageVersions && currentSlideData.generatedImageVersions.length > 1
                  ? currentSlideData.generatedImageVersions[slideVersionIndexes[currentSlide] || 0].url
                  : (currentSlideData?.generatedImage?.url || ''))
                : (isTextMode
                  ? (currentSlideData?.generatedImage?.url || '')
                  : currentSlideData?.imageUrl);

              if (!baseImgUrl) return '';
              return baseImgUrl.startsWith('http') || baseImgUrl.startsWith('blob:')
                ? baseImgUrl
                : `${API_CONFIG.BASE_URL}${baseImgUrl}`;
            })()}
            originalImageUrl={isTextMode ? undefined : currentSlideData?.imageUrl}
            title={currentSlideData?.slideTitle}
            onPreviousSlide={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            onNextSlide={() => setCurrentSlide(Math.min(slideDataList.length - 1, currentSlide + 1))}
            onSlideSelect={(slideIndex) => setCurrentSlide(slideIndex)}
            showSlideSelector={true}
            isGenerating={isGeneratingImages}
            showImageControls={!!currentSlideData?.generatedImage}
            onImageFullscreen={() => showImageFullscreenView(currentSlideData!.generatedImage!)}
            onImageDownload={() => downloadImage(currentSlideData!.generatedImage!)}
            hasGeneratedImage={!!currentSlideData?.generatedImage}
            generatedImageInfo={(() => {
              const versionIndex = slideVersionIndexes[currentSlide] || 0;
              const version = currentSlideData?.generatedImageVersions?.[versionIndex];
              const displayImage = version ? {
                prompt: version.metadata.prompt,
                generationTime: version.metadata.generationTime,
                width: version.metadata.width,
                height: version.metadata.height,
                provider: version.metadata.provider
              } : (currentSlideData?.generatedImage ? {
                prompt: currentSlideData.generatedImage.prompt,
                generationTime: currentSlideData.generatedImage.generationTime,
                width: currentSlideData.generatedImage.width,
                height: currentSlideData.generatedImage.height,
                provider: currentSlideData.generatedImage.provider
              } : undefined);
              return displayImage;
            })()}
            showGeneratedImage={slideImageDisplayStates[currentSlide] ?? false}
            onToggleImage={() => toggleSlideImageDisplay(currentSlide)}
            imageVersions={currentSlideData?.generatedImageVersions}
            currentVersionIndex={slideVersionIndexes[currentSlide] || 0}
            onVersionChange={(vIdx) => handleVersionChange(currentSlide, vIdx)}
            className="flex-1"
          />
        </div>

        {/* Right: Control Panel */}
        <div className="space-y-4">
          {/* Image Generation Parameters */}
          <div className="bg-card border border-gray-700 rounded-xl p-4 shadow-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-4">图片生成参数</h3>

            {/* Basic Parameters */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Image Style */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">图片风格</label>
                <select
                  value={imageGenParams.imageStyle}
                  onChange={(e) => setImageGenParams(prev => ({ ...prev, imageStyle: e.target.value }))}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-orange-500 focus:outline-none"
                >
                  {imageStyles.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>

              {/* Content Type */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">内容类型</label>
                <select
                  value={imageGenParams.contentType}
                  onChange={(e) => setImageGenParams(prev => ({ ...prev, contentType: e.target.value }))}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-orange-500 focus:outline-none"
                >
                  {contentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Image Generation Prompt */}
          <div className="bg-card border border-gray-700 rounded-xl p-4 shadow-lg">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-gray-300">编辑生图提示词</h3>
            </div>
            <textarea
              value={currentSlideData?.userPrompt || ''}
              onChange={(e) => updateSlideData('userPrompt', e.target.value)}
              className="w-full h-96 bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 resize-none focus:border-orange-500 focus:outline-none"
              placeholder="请点击下方按钮生成提示词，或直接输入您的描述..."
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => generateSmartPromptForCurrentSlide()}
                disabled={isGeneratingPrompt}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-500 text-sm font-medium rounded-lg transition-all flex items-center gap-2"
              >
                {isGeneratingPrompt ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>重新生成提示词</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generation Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => generateImage(ImageProvider.COMFYUI)}
              disabled={isGeneratingComfyUI}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
            >
              {isGeneratingComfyUI ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>ComfyUI生成中...</span>
                </>
              ) : (
                <>
                  <span>🎨</span>
                  <span>ComfyUI生成</span>
                </>
              )}
            </button>

            <button
              onClick={() => generateImage(ImageProvider.NANO_BANANA)}
              disabled={isGeneratingNanoBanana}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
            >
              {isGeneratingNanoBanana ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>NanoBanana生成中...</span>
                </>
              ) : (
                <>
                  <span>🍌</span>
                  <span>NanoBanana生成</span>
                </>
              )}
            </button>
          </div>


          {/* Status Message */}
          {(isGeneratingComfyUI || isGeneratingNanoBanana) && (
            <div className="bg-card border border-gray-700 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <div>
                  <p className="text-sm font-medium text-white">正在生成图片</p>
                  <p className="text-xs text-gray-400">{processingDetail}</p>
                </div>
              </div>
            </div>
          )}

          {/* Export Options - Hidden */}
          {/* <div className="grid grid-cols-2 gap-3">
            <button
              onClick={downloadAllImages}
              disabled={isExporting || slideDataList.filter(s => s.generatedImage).length === 0}
              className="py-2 px-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-gray-300 text-sm font-medium rounded-lg transition-all"
            >
              {isExporting ? '导出中...' : '📁 下载全部图片'}
            </button>
            <button className="py-2 px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-all">
              📄 替换PPTX图片
            </button>
          </div> */}
        </div>
      </div>

      {/* Global Loading Modal for Image Generation */}
      {showGlobalLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 max-w-2xl w-full mx-4 text-center">
            {(() => {
              // 获取当前幻灯片的提示词并分割成句子数组
              const currentSlideData = slideDataList[currentProcessingSlide];
              let displayText = "正在准备提示词...";

              if (currentSlideData?.userPrompt) {
                const prompt = currentSlideData.userPrompt;
                let currentSlideTexts: string[] = [];

                // 1. 尝试使用中英文标点符号分割句子
                const punctuationSplit = prompt.split(/[。！？；；.!?;:]+/).filter(sentence => sentence.trim());

                if (punctuationSplit.length > 1) {
                  // 如果能分割出多个句子，使用分割后的句子
                  currentSlideTexts = punctuationSplit;
                } else {
                  // 2. 如果只有一个句子，尝试按逗号分割
                  const commaSplit = prompt.split(/[,，]+/).filter(sentence => sentence.trim());
                  if (commaSplit.length > 1) {
                    currentSlideTexts = commaSplit;
                  } else {
                    // 3. 如果还是只有一个句子，按固定长度分割（每50个字符一段）
                    const longSentence = prompt.trim();
                    const maxLength = 50;

                    for (let i = 0; i < longSentence.length; i += maxLength) {
                      currentSlideTexts.push(longSentence.substring(i, i + maxLength));
                    }
                  }
                }

                // 确保至少有一个句子
                if (currentSlideTexts.length === 0) {
                  currentSlideTexts = [prompt];
                }

                // 循环显示句子
                displayText = currentSlideTexts[currentTextIndex % currentSlideTexts.length];
              }

              return (
                <MagicTextDisplay
                  status="GENERATING_IMAGE"
                  text={displayText}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {showExportDialog && exportData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-gray-700 rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <div className={`text-center mb-4 ${exportData.type === 'success' ? 'text-green-400' :
              exportData.type === 'error' ? 'text-red-400' : 'text-blue-400'
              }`}>
              <div className="text-2xl mb-2">
                {exportData.type === 'success' ? '✓' :
                  exportData.type === 'error' ? '✗' : 'ℹ'}
              </div>
              <p>{exportData.message}</p>
            </div>
            <button
              onClick={() => {
                setShowExportDialog(false);
                setExportData(null);
              }}
              className="w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
            >
              确定
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {showImageFullscreen && fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowImageFullscreen(false)}
            className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 z-10"
          >
            ✕
          </button>
          
          {/* 左右切换按钮 - 仅当有多个版本时显示 */}
          {(() => {
            const versions = slideDataList[currentSlide]?.generatedImageVersions || [];
            const currentVersionIndex = slideVersionIndexes[currentSlide] || 0;
            
            if (versions.length > 1) {
              return (
                <>
                  {/* 左箭头 */}
                  <button
                    onClick={() => {
                      const newIndex = currentVersionIndex === 0 ? versions.length - 1 : currentVersionIndex - 1;
                      setSlideVersionIndexes(prev => ({ ...prev, [currentSlide]: newIndex }));
                      // 更新全屏显示的图片
                      const newVersion = versions[newIndex];
                      if (newVersion) {
                        setFullscreenImage({
                          id: `version_${newIndex}`,
                          slideId: currentSlide + 1,
                          url: newVersion.url.startsWith('http') ? newVersion.url : `${API_CONFIG.BASE_URL}${newVersion.url}`,
                          thumbnailUrl: newVersion.url,
                          prompt: newVersion.metadata?.prompt || '',
                          negativePrompt: newVersion.metadata?.negativePrompt,
                          generationTime: newVersion.metadata?.generationTime || 0,
                          provider: newVersion.metadata?.provider as any,
                          width: newVersion.metadata?.width || 1024,
                          height: newVersion.metadata?.height || 1024,
                          fileSize: 0,
                          createdAt: newVersion.metadata?.createdAt || ''
                        });
                      }
                    }}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-2xl transition-all z-10"
                  >
                    ‹
                  </button>
                  {/* 右箭头 */}
                  <button
                    onClick={() => {
                      const newIndex = currentVersionIndex >= versions.length - 1 ? 0 : currentVersionIndex + 1;
                      setSlideVersionIndexes(prev => ({ ...prev, [currentSlide]: newIndex }));
                      // 更新全屏显示的图片
                      const newVersion = versions[newIndex];
                      if (newVersion) {
                        setFullscreenImage({
                          id: `version_${newIndex}`,
                          slideId: currentSlide + 1,
                          url: newVersion.url.startsWith('http') ? newVersion.url : `${API_CONFIG.BASE_URL}${newVersion.url}`,
                          thumbnailUrl: newVersion.url,
                          prompt: newVersion.metadata?.prompt || '',
                          negativePrompt: newVersion.metadata?.negativePrompt,
                          generationTime: newVersion.metadata?.generationTime || 0,
                          provider: newVersion.metadata?.provider as any,
                          width: newVersion.metadata?.width || 1024,
                          height: newVersion.metadata?.height || 1024,
                          fileSize: 0,
                          createdAt: newVersion.metadata?.createdAt || ''
                        });
                      }
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-2xl transition-all z-10"
                  >
                    ›
                  </button>
                  {/* 版本指示器 */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-2 rounded-full z-10">
                    {currentVersionIndex + 1} / {versions.length}
                  </div>
                </>
              );
            }
            return null;
          })()}

          <img
            src={fullscreenImage.url.startsWith('http') || fullscreenImage.url.startsWith('blob:')
              ? fullscreenImage.url
              : `${API_CONFIG.BASE_URL}${fullscreenImage.url}`}
            alt="全屏图片预览"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
            <div className="text-white text-sm space-y-1">
              <div>提示词: {fullscreenImage.prompt}</div>
              <div className="text-gray-400 text-xs">
                尺寸: {fullscreenImage.width}×{fullscreenImage.height} |
                模型: {fullscreenImage.provider} |
                耗时: {fullscreenImage.generationTime}秒
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 添加默认导出
export default ImageReviewPage;