import { useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useProcess } from '../contexts/ProcessContext';
import { API_CONFIG } from '../constants';
import { safeNavigate } from '../utils/navigationHelper';

const buildMediaUrl = (baseUrl: string, jobId: string, mediaType: string, fileName: string): string => {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/webhook/servefiles/api/slides-data/${jobId}/${mediaType}/${fileName}`;
};

export const useVideoGeneration = () => {
    const { settings } = useSettings();
    const {
        setIsProcessing,
        setProgress,
        setStatusMessage,
        setProcessingDetail,
        addLog,
        clearLogs,
        setError,
        setVideoStats,
        setSlideImages,
        setSlideScripts
    } = useProcess();

    const startVideoGeneration = useCallback(async (file: File) => {
        if (!file) {
            setError("请先选择一个文件");
            return;
        }

        // Start processing
        setIsProcessing(true);
        setProgress(10);
        setStatusMessage("初始化中...");
        clearLogs();
        addLog("启动视频生成引擎...");
        setError(null);
        setVideoStats(null);

        let jobId: string | null = null;
        try {
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
            await delay(1000);

            // Step 1: Create FormData with PPT file and API settings
            const step1Msg = "正在准备上传数据...";
            addLog(step1Msg);
            setStatusMessage(step1Msg);
            setProcessingDetail("正在准备文件和API配置...");
            setProgress(20);
            await delay(1000);

            const formData = new FormData();
            formData.append('auditorEmail', '');
            formData.append('groupId', settings.videoSettings.minimaxGroupId);
            formData.append('accessToken', settings.videoSettings.minimaxAccessToken);
            formData.append('voiceId', settings.videoSettings.voiceId);
            formData.append('aiProvider', settings.activeProvider);
            formData.append('aiModel', settings.configs[settings.activeProvider].model);
            formData.append('aiApiKey', settings.configs[settings.activeProvider].apiKey);
            formData.append('aiBaseUrl', settings.configs[settings.activeProvider].baseUrl || '');
            formData.append('pptFile0', file);
            formData.append('processingType', 'video');

            // Step 2: Upload to n8n backend
            const step2Msg = "正在上传文件到服务器...";
            addLog(step2Msg);
            setStatusMessage(step2Msg);
            setProcessingDetail(`正在上传 ${file.name}...`);
            setProgress(30);
            await delay(1000);

            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/upload-ppt`, {
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
            setProcessingDetail("文件上传成功，正在处理...");
            setProgress(50);
            await delay(1000);

            // Step 3: Extract jobId
            const urlParams = new URLSearchParams(new URL(result.redirectUrl).search);
            jobId = urlParams.get('jobId');
            if (!jobId) throw new Error("无法从响应中提取Job ID");

            const step3Msg = `提取到Job ID: ${jobId}`;
            addLog(step3Msg);
            setStatusMessage(step3Msg);
            setProcessingDetail("正在获取处理结果...");
            setProgress(60);
            await delay(1000);

            // Step 4: Get job data
            addLog("正在获取处理结果...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            const jobDataResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/get-job-data?jobId=${jobId}`);
            if (!jobDataResponse.ok) throw new Error(`获取数据失败: ${jobDataResponse.statusText}`);
            const jobData = await jobDataResponse.json();

            const step4Msg = `获取到 ${jobData.notes.length} 张幻灯片的讲稿`;
            addLog(step4Msg);
            setStatusMessage(step4Msg);
            setProcessingDetail("正在准备讲稿和幻灯片数据...");
            setProgress(80);
            await delay(1000);

            // Step 5: Set data
            const images = jobData.slides.map((slide: string) =>
                buildMediaUrl(API_CONFIG.BASE_URL, jobId!, 'images', slide)
            );
            setSlideImages(images);
            const scripts = jobData.notes.map((note: any) => note.note);
            setSlideScripts(scripts);

            const step5Msg = "讲稿生成完成，准备进入审核页面...";
            addLog(step5Msg);
            setStatusMessage(step5Msg);
            setProcessingDetail("所有数据准备就绪，即将进入审核页面...");
            setProgress(100);
            await delay(1000);

        } catch (err: any) {
            setError(err.message || "发生意外错误。");
            setStatusMessage("失败");
            addLog(`错误: ${err.message}`);
            setIsProcessing(false);
        } finally {
            setIsProcessing(false);
            // Only navigate if we have a jobId and didn't error out completely?
            // The original code navigated in finally if jobId exists
            if (jobId) safeNavigate(`/?jobId=${jobId}`);
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
        setVideoStats,
        setSlideImages,
        setSlideScripts
    ]);

    return { startVideoGeneration };
};
