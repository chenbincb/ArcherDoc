import { useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useProcess } from '../contexts/ProcessContext';
import { API_CONFIG } from '../constants';
import { safeNavigate } from '../utils/navigationHelper';

// Helper function
const buildMediaUrl = (baseUrl: string, jobId: string, mediaType: string, fileName: string): string => {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/webhook/servefiles/api/slides-data/${jobId}/${mediaType}/${fileName}`;
};

export const useImageGeneration = () => {
    const { settings } = useSettings();
    const {
        setIsProcessing,
        setProgress,
        setStatusMessage,
        setProcessingDetail,
        addLog,
        clearLogs,
        setError,
        setImageStats,
        setSlideImages,
        setSlideScripts
    } = useProcess();

    const startImageGeneration = useCallback(async (file: File) => {
        if (!file) {
            setError("请先选择一个文件");
            return;
        }

        // Start processing to generate slides for image generation
        setIsProcessing(true);
        setProgress(10);
        setStatusMessage("初始化中...");
        clearLogs();
        addLog("启动AI配图引擎...");
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
            setProcessingDetail("正在准备文件和AI配置...");
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
            const step2Msg = "正在上传文件到服务器...";
            addLog(step2Msg);
            setStatusMessage(step2Msg);
            setProcessingDetail(`正在上传 ${file.name}...`);
            setProgress(40);
            await delay(1000);

            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/upload-ppt`, {
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
            setProcessingDetail("文件上传成功，正在处理...");
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
    }, [
        settings,
        setIsProcessing,
        setProgress,
        setStatusMessage,
        setProcessingDetail,
        addLog,
        clearLogs,
        setError,
        setImageStats,
        setSlideImages
    ]);

    return { startImageGeneration };
};
