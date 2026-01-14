import { useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useProcess } from '../contexts/ProcessContext';
import { API_CONFIG } from '../constants';
import { safeNavigate } from '../utils/navigationHelper';
import { ArticleSettings } from '../components/ArticleSettingsModal';

export const useArticleGeneration = () => {
    const { settings } = useSettings();
    const {
        setIsProcessing,
        setProgress,
        setStatusMessage,
        setProcessingDetail,
        addLog,
        clearLogs,
        setError,
        setArticleStats
    } = useProcess();

    const startArticleGeneration = useCallback(async (file: File, articleSettings: ArticleSettings) => {
        // Start processing to generate article with selected settings
        setIsProcessing(true);
        setProgress(10);
        setStatusMessage("初始化中...");
        clearLogs();
        addLog("启动文章生成引擎...");
        setError(null);
        setArticleStats(null);

        let jobId: string | null = null;

        try {
            // Helper function to add delay
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

            // Wait at least 1 second for the initial status to be displayed
            await delay(1000);

            // Step 1: Create FormData with file and API settings
            const step1Msg = "正在准备上传数据...";
            addLog(step1Msg);
            setStatusMessage(step1Msg);
            setProcessingDetail("正在准备文档文件和API配置...");
            setProgress(20);
            await delay(1000); // Wait at least 1 second for this step

            const formData = new FormData();
            // 后端统一使用 pptFile 字段名接收
            formData.append('pptFile', file);
            formData.append('articleType', articleSettings.articleType);
            formData.append('articleStyle', articleSettings.articleStyle);
            formData.append('customPrompt', articleSettings.customPrompt);
            formData.append('aiProvider', settings.activeProvider);
            formData.append('aiModel', settings.configs[settings.activeProvider].model);
            formData.append('aiApiKey', settings.configs[settings.activeProvider].apiKey);
            formData.append('aiBaseUrl', settings.configs[settings.activeProvider].baseUrl || '');
            formData.append('processingType', 'article'); // 添加processingType参数

            // Step 2: Upload to backend for article generation
            const step2Msg = "正在上传文件到服务器...";
            addLog(step2Msg);
            setStatusMessage(step2Msg);
            setProcessingDetail(`正在上传 ${file.name}...`);
            setProgress(30);
            await delay(1000); // Wait at least 1 second for this step

            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/upload-ppt`, {
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
            setProcessingDetail("文档上传成功，正在生成文章...");
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
            const articleDataResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.API_PATH}/get-article-data?jobId=${jobId}`);

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
    }, [
        settings,
        setIsProcessing,
        setProgress,
        setStatusMessage,
        setProcessingDetail,
        addLog,
        clearLogs,
        setError,
        setArticleStats
    ]);

    return { startArticleGeneration };
};
