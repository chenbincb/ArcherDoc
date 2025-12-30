import React, { useState, useEffect, useRef } from 'react';
import { ImageGenerationSettings, ImageProvider, AppSettings, SlideImageData, GeneratedImage } from '../types';
import { MagicTextDisplay } from '../components/MagicTextDisplay';
import { SlidePreview } from '../components/SlidePreview';
import { DEFAULT_SETTINGS, N8N_CONFIG, API_ENDPOINTS } from '../constants';
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

  // Update localImageSettings when appSettings changes
  useEffect(() => {
    setLocalImageSettings(appSettings.imageSettings);
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

  // Set all slides to default display PPT image initially
  useEffect(() => {
    if (slideDataList.length > 0 && Object.keys(slideImageDisplayStates).length === 0) {
      // Initialize all slides to show PPT image by default
      const initialStates: Record<number, boolean> = {};
      for (let i = 0; i < slideDataList.length; i++) {
        initialStates[i] = false; // false means show PPT image
      }
      setSlideImageDisplayStates(initialStates);
    }
  }, [slideDataList.length]);

  // Reset to show PPT image when switching slides
  useEffect(() => {
    // Whenever currentSlide changes, set current slide to show PPT image
    setSlideImageDisplayStates(prev => ({
      ...prev,
      [currentSlide]: false // false means show PPT image
    }));
  }, [currentSlide]);

  // Fetch slide data from backend
  const fetchSlideData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setProcessingDetail('正在获取幻灯片数据...');
      addLog('正在获取幻灯片数据...');

      const response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/get-job-data?jobId=${imageJobId}&type=image`);

      if (!response.ok) {
        throw new Error(`获取幻灯片数据失败: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('完整返回数据:', responseData);
      const data = responseData.data || responseData;
      console.log('实际数据:', data);

      // 解析API返回的image_data.json格式数据
      let imageData: SlideImageData[] = [];

      // 检查是否是image_data.json格式的数据（包含description和suggestedPrompt）
      if (data.notes && Array.isArray(data.notes)) {
        const hasImageData = data.notes.some((item: any) => item.description && item.suggestedPrompt);

        if (hasImageData) {
          // Image模式数据 - 直接根据notes生成图片路径
          imageData = data.notes.map((item: any, index: number) => {
            // 根据notes索引生成预期的图片文件名
            const slideFileName = `slide_${index}.png`;
            const imageUrl = buildMediaUrl(N8N_CONFIG.BASE_URL, imageJobId, 'images', slideFileName);
            console.log(`幻灯片 ${index + 1} 图片URL:`, imageUrl);

            return {
              id: item.id || index + 1,
              slideTitle: item.title || `幻灯片 ${index + 1}`,
              slideContent: item.content || '',
              imageUrl: imageUrl,
              description: item.description || `第${index + 1}页PPT内容`,
              suggestedPrompt: item.suggestedPrompt || `专业PPT插图，主题：${item.title || '未命名幻灯片'}，商务风格，高质量，清晰明亮`,
              userPrompt: item.suggestedPrompt || `专业PPT插图，主题：${item.title || '未命名幻灯片'}，商务风格，高质量，清晰明亮`,
              negativePrompt: localImageSettings.negativePrompt,
              generationStatus: 'pending' as const,
              errorMessage: undefined
            };
          });
          console.log('使用API返回的image模式数据');
        }
      }

      // 设置处理状态
      setProcessingDetail('幻灯片数据加载完成');
      addLog(`成功加载 ${imageData.length} 张幻灯片数据`);

      setSlideDataList(imageData);

    } catch (err: any) {
      console.error('获取幻灯片数据失败:', err);
      setError(err.message || '获取幻灯片数据失败');
      showNotification(err.message || '获取幻灯片数据失败', 'error');
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

      const response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/analyze-slide-for-image`, {
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

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${nanobananaSettings.model}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': nanobananaSettings.apiKey,
          },
          body: JSON.stringify(geminiRequest),
        });

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
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

        response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/generate-images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId: imageJobId,
            slideId: slideId,
            provider: 'nanobanana',
            nanobananaResponseData: JSON.stringify(geminiResult)
          }),
        });
      } else {
        // ComfyUI: 直接调用n8n工作流
        response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/generate-images`, {
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
            provider: 'comfyui',
            nanobananaApiKey: undefined
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
      // 使用统一的slideId变量
      const imageUrl = `${N8N_CONFIG.BASE_URL}/webhook/servefiles/api/slides-data/${imageJobId}/generated_images/slide_${slideId}.png${cacheBust}`;

      const generatedImage: GeneratedImage = {
        id: `${provider}_${timestamp}`,
        slideId: slideId,
        url: imageUrl,
        thumbnailUrl: imageUrl,
        prompt: currentSlideData.userPrompt,
        negativePrompt: currentSlideData.negativePrompt,
        generationTime: result.generationTime || 5.0,
        provider: provider,
        width: provider === 'comfyui' ? localImageSettings.comfyuiSettings.width : 1024,
        height: provider === 'comfyui' ? localImageSettings.comfyuiSettings.height : 1024,
        fileSize: result.fileSize || 512000,
        createdAt: new Date().toISOString()
      };

      // Update slide data with generated image
      const finalSlideData = [...slideDataList];
      finalSlideData[currentSlide] = {
        ...currentSlideData,
        generatedImage: generatedImage,
        generationStatus: 'completed' as const
      };
      setSlideDataList(finalSlideData);

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
      const response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/optimize-prompt`, {
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

  // Generate smart prompt for current slide
  const generateSmartPromptForCurrentSlide = async () => {
    try {
      setIsGeneratingPrompt(true);
      const currentSlideData = slideDataList[currentSlide];
      if (!currentSlideData) return;

      setProcessingDetail('正在生成智能提示词...');
      addLog('正在使用AI生成智能提示词...');

      const enhancedPrompt = await generateSmartPrompt(
        currentSlideData.description || '',
        imageGenParams.imageStyle,
        imageGenParams.contentType,
        currentSlideData.slideTitle
      );

      // Update the current slide's userPrompt with the AI-generated prompt
      const updatedSlideData = [...slideDataList];
      updatedSlideData[currentSlide] = {
        ...currentSlideData,
        userPrompt: enhancedPrompt
      };
      setSlideDataList(updatedSlideData);

      showNotification('智能提示词生成完成', 'success');
      addLog(`第 ${currentSlide + 1} 页智能提示词生成完成`);
    } catch (err: any) {
      console.error('生成智能提示词失败:', err);
      showNotification(err.message || '生成智能提示词失败', 'error');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Generate smart prompt using AI
  const generateSmartPrompt = async (
    description: string,
    imageStyle: string,
    contentType: string,
    slideTitle: string
  ): Promise<string> => {
    // Get user's AI model configuration
    const activeProvider = appSettings.activeProvider;
    const aiConfig = appSettings.configs[activeProvider];

    console.log('=== 开始AI生成提示词 ===');
    console.log('AI Provider:', activeProvider);
    console.log('AI Config:', aiConfig);

    // 【终极重构】不同内容类型的专属构图指令库
    // 结合了：私有云背景、严格的视角锁定、具体的IT隐喻
    const typeInstructions: Record<string, string> = {
      '逻辑架构图': `
【强制构图：逻辑架构 (Logical Architecture)】
1. **核心视角**：**2.5D等轴测 (Isometric View)**。
2. **布局隐喻**：**模块化堆叠 (Modular Stacking)**。
   - 就像搭建精密的主板或城市建筑。
   - **底部**：IaaS层（服务器机柜、存储阵列）。
   - **中间**：PaaS层（六边形服务模块、API网关）。
   - **顶部**：SaaS层（悬浮的应用窗口、用户终端）。
3. **逻辑表现**：用半透明的玻璃层板区分不同层级，模块之间要有垂直的连接线。
4. **🚫 禁止**：禁止画成平面的流程图，禁止画成球体。`,

      '业务流程图': `
【强制构图：业务流程 (Business Process)】
1. **核心视角**：**2D 扁平化 (Flat Vector)** 或 **微倾斜视角**。
2. **布局隐喻**：**工业流水线 (Pipeline)** 或 **泳道图 (Swimlane)**。
   - **布局方向**：严格的**从左到右 (Left-to-Right)**。
   - **左侧**：输入源（文件图标、原始数据块）。
   - **中间**：处理引擎（齿轮、漏斗、芯片）。
   - **右侧**：输出物（报表、成品图标）。
3. **逻辑表现**：必须有明显的**指引箭头 (Directional Arrows)** 连接各环节。
4. **🚫 禁止**：禁止画成循环的圆圈，禁止画成复杂的3D建筑。`,

      '网络拓扑图': `
【强制构图：网络拓扑 (Network Topology)】
1. **核心视角**：**广角俯视 (Top-down Wide Angle)**。
2. **布局隐喻**：**星系分布 (Constellation)** 或 **城市交通网**。
   - **中心**：核心数据中心（大型主机图标）。
   - **周边**：边缘节点、终端设备、云资源池。
3. **逻辑表现**：强调**连接线 (Connectivity)**，用发光的线条连接分散的节点。
4. **🚫 禁止**：禁止画成单一的物体，必须是分散的、多节点的。`,

      '数据可视化': `
【强制构图：数据可视化 (Data Visualization)】
1. **核心视角**：**正视 UI 界面 (Front-facing UI)**。
2. **布局隐喻**：**管理驾驶舱 (Management Dashboard)**。
   - 画面主体必须是一个**高保真的屏幕界面 (Screen Mockup)**。
   - 包含：动态折线图、环形占比图、关键指标卡片(KPI Cards)。
3. **逻辑表现**：通过图表的高低起伏体现数据的变化趋势。
4. **🚫 禁止**：禁止画实物场景，必须是屏幕上的软件界面。`,

      '产品路线图': `
【强制构图：产品路线图 (Roadmap)】
1. **核心视角**：**2D 水平展开 (Horizontal)**。
2. **布局隐喻**：**时间轴 (Timeline) 或 甘特图**。
   - 一条清晰的主轴线贯穿画面左右。
   - 轴线上分布着里程碑节点 (Milestones) 和旗帜标记。
3. **逻辑表现**：用颜色的深浅或节点的点亮状态表示"已完成"和"规划中"。
4. **🚫 禁止**：禁止画成复杂的网络结构。`,

      '功能功能对比图': `
【强制构图：对比分析 (Comparison)】
1. **核心视角**：**分屏对比 (Split Screen)**。
2. **布局隐喻**：**天平 (Scale)** 或 **镜像 (Mirror)**。
   - 画面被垂直分割为左右两部分。
   - **左侧**：传统模式（灰暗、复杂、杂乱）。
   - **右侧**：新产品模式（明亮、整洁、高效）。
3. **逻辑表现**：通过强烈的视觉反差（颜色、繁简）来突显产品优势。`,

      '封面/通用页': `
【强制构图：封面/通用 (Cover/General)】
1. **核心视角**：**正视平面设计 (Flat Graphic Design)**。
2. **布局隐喻**：**极简主义海报 (Minimalist Poster)**。
   - **背景**：深色科技感渐变、抽象几何线条、品牌色光影。
   - **主体**：留白为主，**中心区域**预留给标题文字（AI生成空白文本框）。
3. **逻辑表现**：不展示具体技术细节，只传达"大气、专业、信赖"的品牌调性。
4. **🚫 禁止**：禁止画具体的服务器、架构图或流程图！`,

      '自动识别': `
【智能判断模式】
请先阅读PPT内容，分析其最核心的逻辑，然后**必须**从上述5种模式中选择一种最匹配的：
- 讲架构/层级 -> 选"逻辑架构图"
- 讲流程/步骤 -> 选"业务流程图"
- 讲节点/连接 -> 选"网络拓扑图"
- 讲数据/监控 -> 选"数据可视化"
- 讲规划/时间 -> 选"产品路线图"
- 封面/目录/纯文字 -> 选"封面/通用页"`
    };

    // 获取当前类型的专属指令，如果没有匹配则默认使用自动识别
    const selectedInstruction = typeInstructions[contentType] || typeInstructions['自动识别'];

    // 构建结构化提示词（借鉴 Banana Slides 的 XML 标签风格）
    const aiPrompt = `你是一位专注【私有云/B端软件产品】的资深视觉设计师。
你的任务是将PPT文字转化为**功能性、结构化、符合行业标准的图解**。

<slide_content>
<title>${slideTitle}</title>
<content>${description}</content>
</slide_content>

<business_context>
<industry>云计算、企业级软件、数字化转型</industry>
<purpose>产品定义文档、技术白皮书配图</purpose>
<style>${imageStyle} (保持专业、干净、高信噪比)</style>
</business_context>

<task>
【步骤 1：判断页面性质与内容理解】
请先判断这张PPT的性质（是封面？目录？还是正文？）。
- **如果是封面/目录/过渡页**：请侧重描述**视觉氛围**和**品牌调性**。严禁脑补具体的技术架构细节！不要因为标题里有关键词就去画复杂的架构图，这只是一张封面，需要的是大气、简约的背景。
- **如果是正文内容页**：请像分析师一样拆解逻辑，识别技术实体（组件）、逻辑行为（关系）和核心诉求（价值）。

【步骤 2：智能分类】
${selectedInstruction}

【步骤 3：生成结构化提示词】
基于你的深度理解，进行视觉建模，严格执行以下要求。
</task>

<design_guidelines>
<composition_principles>
- 根据内容自动设计最完美的构图
- 重点突出核心概念，避免信息过载
- 使用装饰性元素填补空白，保持画面平衡
- 避免过度拥挤或过度留白
</composition_principles>

<visual_translation_strategy>
- （仅针对正文页）不能只画通用的方块，必须根据内容填充有意义的IT实体（如盾牌、数据库、芯片等）
- （如果是封面页）保持背景的简洁与留白
</visual_translation_strategy>

<text_rendering_rules>
【核心原则】
- 如需渲染文字，不重不漏地包含所有关键信息
- 保持原文的逻辑层次和重点强调

【格式规范】
- 禁止使用markdown格式符号（如 # * - 等）
- 标题使用字号和粗细区分，不添加符号
- 列表项使用缩进组织，不添加项目符号

【内容限制】
- 保留技术缩写的英文形式（API、CPU、Cloud、DB、SaaS、PaaS、IaaS等）
- 其他标签和说明文字使用中文
- 如果无法保证汉字清晰，生成空白文本框，不要生成乱码英文

【质量标准】
- 视觉重心突出，主体明确
- 元素分布均衡，有呼吸感
- 引导线清晰，逻辑流畅
- 符合阅读习惯（从左到右，从上到下）
- 专业商务PPT风格，简洁现代
</text_rendering_rules>
</design_guidelines>

<output_format>
请严格按照以下5个模块输出（模块间换行，内部逗号分隔）：

1. **[场景构图]**：(如果是封面，描述大气背景和留白；如果是正文，描述视角和布局)
2. **[核心技术组件]**：(如果是封面，填"品牌主视觉背景"；如果是正文，填具体的IT实体细节)
3. **[逻辑交互细节]**：(如果是封面，填"无"；如果是正文，描述连接线、箭头流向)
4. **[文本与标签]**：(指定中文标签内容，或声明留白位置)
5. **[视觉风格后缀]**：(${imageStyle}相关词汇, 材质描述: Glassmorphism, Matte Metal, Tech Blue light)

请直接输出上述5个模块内容。
</output_format>`;

    try {
      console.log('准备调用AI模型:', aiConfig?.model);
      console.log('API地址:', aiConfig?.baseUrl);

      // Call AI model directly
      // 确保baseUrl没有重复的/v1路径
      let apiUrl = aiConfig.baseUrl;
      if (apiUrl.endsWith('/v1')) {
        apiUrl = apiUrl.slice(0, -3); // 移除末尾的/v1
      }
      const fullUrl = `${apiUrl}/v1/chat/completions`;

      console.log('最终API URL:', fullUrl);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [
            {
              role: 'user',
              content: aiPrompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      console.log('AI响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI调用失败:', errorText);
        throw new Error(`AI调用失败: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('AI响应结果:', result);

      const aiGeneratedPrompt = result.choices?.[0]?.message?.content?.trim();

      if (aiGeneratedPrompt && aiGeneratedPrompt.length > 10) {
        console.log('✅ AI生成的提示词:', aiGeneratedPrompt);
        return aiGeneratedPrompt;
      } else {
        console.log('⚠️ AI返回的提示词太短，使用备用方案');
        // Fallback to template-based prompt
        return generateTemplatePrompt(description, imageStyle, slideTitle);
      }
    } catch (error) {
      console.error('❌ AI调用失败，使用模板生成:', error);
      // Fallback to template-based prompt
      return generateTemplatePrompt(description, imageStyle, slideTitle);
    }
  };

  // Generate template-based prompt as fallback
  const generateTemplatePrompt = (
    description: string,
    imageStyle: string,
    slideTitle: string
  ): string => {
    const basePrompt = description || `关于 ${slideTitle} 的逻辑图表`;

    // 结构化信息图表模板
    const templatePrompt = `${basePrompt}, ${imageStyle}风格, 结构化信息图表, 专业产品文档插图, 扁平化设计, 几何构图, 清晰的逻辑线条, 商务色调, 适合PPT展示, 无文字标签`;

    console.log('🔄 使用备用模板生成的提示词:', templatePrompt);
    return templatePrompt;
  };

  // Download single image
  const downloadImage = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.url);
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
        const response = await fetch(image.url);
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

  // Initialize data on component mount
  useEffect(() => {
    fetchSlideData();
  }, [imageJobId]);

  // Auto-generate smart prompts when data is loaded
  useEffect(() => {
    if (slideDataList.length > 0 && !isLoading) {
      // Generate smart prompts for slides that don't have them yet
      const generateInitialPrompts = async () => {
        for (let i = 0; i < slideDataList.length; i++) {
          const slideData = slideDataList[i];
          // Only generate if userPrompt is empty or a default template
          if (!slideData.userPrompt || slideData.userPrompt.includes('未命名幻灯片') || slideData.userPrompt.length < 20) {
            try {
              setProcessingDetail(`正在为第 ${i + 1} 页生成智能提示词...`);
              const enhancedPrompt = await generateSmartPrompt(
                slideData.description || '',
                imageGenParams.imageStyle,
                imageGenParams.contentType,
                slideData.slideTitle
              );

              const updatedSlideData = [...slideDataList];
              updatedSlideData[i] = {
                ...slideData,
                userPrompt: enhancedPrompt
              };
              setSlideDataList(updatedSlideData);

              // Small delay to avoid overwhelming the AI
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`为第 ${i + 1} 页生成智能提示词失败:`, error);
            }
          }
        }
        setProcessingDetail('智能提示词生成完成');
      };

      generateInitialPrompts();
    }
  }, [slideDataList.length, isLoading]);

  const [processingDetail, setProcessingDetail] = useState<string>('');

  // Auto-analyze current slide when it changes and has no description
  useEffect(() => {
    const currentSlideData = slideDataList[currentSlide];
    if (currentSlideData && !currentSlideData.description && !isLoading) {
      analyzeSlideContent(currentSlide);
    }
  }, [currentSlide, slideDataList.length, isLoading]);

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

  // Check if AI-generated images exist on server when slide data loads or changes
  useEffect(() => {
    if (slideDataList.length === 0 || isLoading) return;

    const slideId = currentSlide + 1;
    // Build the URL for the AI-generated image
    const aiImageUrl = `${N8N_CONFIG.BASE_URL}/webhook/servefiles/api/slides-data/${imageJobId}/generated_images/slide_${slideId}.png`;

    const currentSlideData = slideDataList[currentSlide];
    if (currentSlideData) {
      checkImageExists(
        aiImageUrl,
        () => {
          // Image exists, update slideDataList with generated image info
          const updatedSlideData = [...slideDataList];
          // Only update if generatedImage doesn't exist yet
          if (!updatedSlideData[currentSlide].generatedImage) {
            updatedSlideData[currentSlide] = {
              ...currentSlideData,
              generatedImage: {
                id: `server_${Date.now()}`,
                slideId: slideId,
                url: aiImageUrl,
                thumbnailUrl: aiImageUrl,
                prompt: currentSlideData.userPrompt,
                negativePrompt: currentSlideData.negativePrompt,
                generationTime: 0, // Server-generated images don't have this info in our implementation
                provider: 'server',
                width: localImageSettings.comfyuiSettings.width,
                height: localImageSettings.comfyuiSettings.height,
                fileSize: 0,
                createdAt: new Date().toISOString()
              },
              generationStatus: 'completed'
            };
            setSlideDataList(updatedSlideData);
          }
          // Ensure display state is set to show PPT image by default
          if (slideImageDisplayStates[currentSlide] === undefined) {
            setSlideImageDisplayStates(prev => ({
              ...prev,
              [currentSlide]: false // false means show PPT image
            }));
          }
        },
        () => {
          // Image doesn't exist, ensure generatedImage is undefined
          const updatedSlideData = [...slideDataList];
          if (updatedSlideData[currentSlide].generatedImage) {
            updatedSlideData[currentSlide] = {
              ...currentSlideData,
              generatedImage: undefined,
              generationStatus: 'pending'
            };
            setSlideDataList(updatedSlideData);
          }
          // Ensure display state is set to show PPT image by default
          if (slideImageDisplayStates[currentSlide] === undefined) {
            setSlideImageDisplayStates(prev => ({
              ...prev,
              [currentSlide]: false // false means show PPT image
            }));
          }
        }
      );
    }
  }, [currentSlide, slideDataList.length, imageJobId, isLoading]);

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
        {/* Left: Slide Preview */}
        <div className="space-y-4">
          <SlidePreview
            currentSlide={currentSlide}
            totalSlides={slideDataList.length}
            slideNumber={currentSlide + 1}
            imageUrl={slideImageDisplayStates[currentSlide] ? currentSlideData?.generatedImage?.url : currentSlideData?.imageUrl}
            originalImageUrl={currentSlideData?.imageUrl}
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
            generatedImageInfo={currentSlideData?.generatedImage ? {
              prompt: currentSlideData.generatedImage.prompt,
              generationTime: currentSlideData.generatedImage.generationTime,
              width: currentSlideData.generatedImage.width,
              height: currentSlideData.generatedImage.height,
              provider: currentSlideData.generatedImage.provider
            } : undefined}
            showGeneratedImage={slideImageDisplayStates[currentSlide] ?? false}
            onToggleImage={() => toggleSlideImageDisplay(currentSlide)}
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
              placeholder="AI正在生成智能提示词..."
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
            className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30"
          >
            ✕
          </button>
          <img
            src={fullscreenImage.url}
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