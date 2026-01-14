import { useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useProcess } from '../contexts/ProcessContext';
import { processPPTX } from '../services/pptxService';
import { processDOCX } from '../services/docxService';
import { processTextFile } from '../services/textService';
import { translateText } from '../services/aiService';
import { N8N_CONFIG } from '../constants';
import { AIProvider } from '../types';

export const useTranslation = () => {
    const { settings } = useSettings();
    const {
        setIsProcessing,
        setProgress,
        setStatusMessage,
        setProcessingDetail,
        addLog,
        clearLogs,
        setError,
        setStats,
        setResultBlob,
        setDownloadName
    } = useProcess();

    const startTranslation = useCallback(async (file: File, onOpenSettings?: () => void) => {
        if (!file) return;

        try {
            const activeConfig = settings.configs[settings.activeProvider];

            if (settings.activeProvider === AIProvider.GEMINI && !activeConfig.apiKey && !process.env.API_KEY) {
                setError("Gemini 需要 API Key。请在设置中配置。");
                onOpenSettings?.();
                return;
            }
            if ((settings.activeProvider === AIProvider.OPENROUTER) && !activeConfig.apiKey) {
                setError("OpenRouter 需要 API Key。");
                onOpenSettings?.();
                return;
            }

            // Start Processing
            setIsProcessing(true);
            setProgress(1);
            setStatusMessage("初始化中...");
            clearLogs();
            addLog("启动翻译引擎...");
            setError(null);

            // Initialize empty stats
            setStats({
                originalChars: 0,
                translatedChars: 0,
                slidesProcessed: 0,
                totalSlides: 100
            });

            // Define progress callback
            const progressHandler = (original: number, translated: number, status: string, detail?: string, statsObj?: any) => {
                if (statsObj) {
                    setStats({
                        originalChars: statsObj.originalChars,
                        translatedChars: statsObj.translatedChars,
                        slidesProcessed: statsObj.slidesProcessed,
                        totalSlides: statsObj.totalSlides
                    });

                    // Calculate overall progress based on slides processed
                    const currentProgress = (statsObj.slidesProcessed / (statsObj.totalSlides || 1)) * 100;
                    setProgress(Math.min(99, Math.max(1, currentProgress)));
                }

                if (status === "TRANSLATING_START" || status === "TRANSLATING_END") {
                    setStatusMessage(status);
                    if (detail) setProcessingDetail(detail);
                } else if (status) {
                    setStatusMessage(status);
                    if (detail) addLog(detail);
                }
            };

            let blob: Blob;
            let finalStats: { original: number; translated: number };

            const lowerName = file.name.toLowerCase();
            if (lowerName.endsWith('.docx')) {
                const result = await processDOCX(file, settings, progressHandler);
                blob = result.blob;
                finalStats = result.stats;
                setDownloadName(`${file.name.replace(/\.docx$/i, '')}_${settings.targetLanguage}.docx`);
            } else if (lowerName.endsWith('.pdf') || lowerName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                // PDF & Image SPECIAL FLOW: Backend Extraction -> Frontend Translation
                setStatusMessage("UPLOAD_START");
                addLog("正在上传文件到服务器进行内容提取...");

                const formData = new FormData();
                formData.append('file', file);
                formData.append('aiProvider', settings.activeProvider);
                formData.append('aiModel', settings.configs[settings.activeProvider].model);
                formData.append('aiApiKey', settings.configs[settings.activeProvider].apiKey);
                formData.append('aiBaseUrl', settings.configs[settings.activeProvider].baseUrl || '');
                formData.append('processingType', 'translation'); // Use translation mode to only extract

                const uploadRes = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/upload-ppt`, {
                    method: 'POST',
                    body: formData
                });

                if (!uploadRes.ok) throw new Error("文件上传失败");
                const { jobId } = await uploadRes.json();

                // Wait for extraction (simplified polling)
                addLog("内容提取中，这可能需要几十秒...");
                let extractedData = null;
                for (let i = 0; i < 60; i++) { // Max 5 mins
                    await new Promise(r => setTimeout(r, 5000));
                    const statusRes = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/get-doc-content?jobId=${jobId}`);
                    if (statusRes.ok) {
                        const res = await statusRes.json();
                        extractedData = res.data;
                        break;
                    }
                    setProgress(5 + (i * 1.5)); // Fake progress during extraction
                }

                if (!extractedData) throw new Error("内容提取超时或失败");

                // Now translate items on frontend (Magic Interaction)
                addLog(`成功提取内容，开始翻译...`);
                let pdfOriginalChars = 0;
                let pdfTranslatedChars = 0;

                // 我们需要把翻译后的结果存回 items 结构中
                for (const slide of extractedData.slides) {
                    // 如果 slide 没有 items (比如 ImageExtractor 返回的是纯 content), 我们需要构造一个 dummy item
                    if (!slide.items || slide.items.length === 0) {
                        slide.items = [{
                            type: 'text',
                            text: slide.content, // ImageExtractor puts markdown in content
                            fontSize: 12,
                            isHeader: false
                        }];
                    }

                    const items = slide.items || [];
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        const progress = (pdfOriginalChars / 1000); // 粗略进度估算

                        if (item.type === 'table') {
                            // 翻译表格：遍历二维数组
                            const translatedRows = [];
                            for (let r = 0; r < item.rows.length; r++) {
                                const row = item.rows[r];
                                const translatedRow = [];
                                for (let c = 0; c < row.length; c++) {
                                    const cellText = row[c];
                                    if (!cellText || !cellText.trim()) {
                                        translatedRow.push(cellText);
                                        continue;
                                    }

                                    progressHandler(pdfOriginalChars, 10000, "TRANSLATING_START", cellText, {
                                        originalChars: pdfOriginalChars,
                                        translatedChars: pdfTranslatedChars,
                                        slidesProcessed: Math.min(99, Math.floor(progress)),
                                        totalSlides: 100
                                    });

                                    const translated = await translateText(cellText, settings);
                                    pdfOriginalChars += cellText.length;
                                    pdfTranslatedChars += translated.length;
                                    translatedRow.push(translated);

                                    progressHandler(pdfOriginalChars, 10000, "TRANSLATING_END", translated, {
                                        originalChars: pdfOriginalChars,
                                        translatedChars: pdfTranslatedChars,
                                        slidesProcessed: Math.min(99, Math.floor(progress)),
                                        totalSlides: 100
                                    });
                                }
                                translatedRows.push(translatedRow);
                            }
                            item.translatedRows = translatedRows; // 存储翻译后的表格
                        } else {
                            // 翻译普通文本
                            if (!item.text || !item.text.trim()) continue;

                            progressHandler(pdfOriginalChars, 10000, "TRANSLATING_START", item.text, {
                                originalChars: pdfOriginalChars,
                                translatedChars: pdfTranslatedChars,
                                slidesProcessed: Math.min(99, Math.floor(progress)),
                                totalSlides: 100
                            });

                            const translated = await translateText(item.text, settings);
                            pdfOriginalChars += item.text.length;
                            pdfTranslatedChars += translated.length;
                            item.translatedText = translated;

                            progressHandler(pdfOriginalChars, 10000, "TRANSLATING_END", translated, {
                                originalChars: pdfOriginalChars,
                                translatedChars: pdfTranslatedChars,
                                slidesProcessed: Math.min(99, Math.floor(progress)),
                                totalSlides: 100
                            });
                            await new Promise(r => setTimeout(r, 100)); // Small delay to avoid rate limits
                        }
                    }
                }

                finalStats = { original: pdfOriginalChars, translated: pdfTranslatedChars };

                // Final step: Generate output file
                if (lowerName.endsWith('.pdf')) {
                    addLog("正在生成带格式的 Word 文档...");
                    const generateRes = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/generate-docx`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            slides: extractedData.slides,
                            filename: `${file.name.replace(/\.pdf$/i, '')}_${settings.targetLanguage}.docx`
                        })
                    });

                    if (!generateRes.ok) throw new Error("Word 文档生成失败");

                    blob = await generateRes.blob();
                    setDownloadName(`${file.name.replace(/\.pdf$/i, '')}_${settings.targetLanguage}.docx`);
                } else {
                    // For Images, generate Markdown file
                    addLog("正在生成 Markdown 文档...");
                    let fullTranslatedText = "";
                    for (const slide of extractedData.slides) {
                        if (slide.items) {
                            for (const item of slide.items) {
                                if (item.translatedText) {
                                    fullTranslatedText += item.translatedText + "\n\n";
                                } else {
                                    fullTranslatedText += (item.text || "") + "\n\n";
                                }
                            }
                        }
                    }
                    blob = new Blob([fullTranslatedText], { type: 'text/markdown;charset=utf-8' });
                    setDownloadName(`${file.name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')}_${settings.targetLanguage}.md`);
                }

            } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
                const result = await processTextFile(file, settings, progressHandler);
                blob = result.blob;
                finalStats = result.stats;
                const ext = lowerName.endsWith('.md') ? '.md' : '.txt';
                setDownloadName(`${file.name.replace(new RegExp(`\\${ext}$`, 'i'), '')}_${settings.targetLanguage}${ext}`);
            } else {
                const result = await processPPTX(file, settings, progressHandler);
                blob = result.blob;
                finalStats = result.stats;
                setDownloadName(`${file.name.replace(/\.pptx$/i, '')}_${settings.targetLanguage}.pptx`);
            }

            if (finalStats.original === 0) {
                throw new Error("未找到文本内容。请检查文件是否只包含图片。");
            }

            setResultBlob(blob);

            // Final safety update
            setStats({
                originalChars: finalStats.original,
                translatedChars: finalStats.translated,
                slidesProcessed: 100,
                totalSlides: 100
            });
            setStatusMessage("完成");
            setProcessingDetail("");
            addLog("文档处理完成。");
        } catch (err: any) {
            setError(err.message || "发生意外错误。");
            setStatusMessage("失败");
            addLog(`错误: ${err.message}`);
        } finally {
            setIsProcessing(false);
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
        setStats,
        setResultBlob,
        setDownloadName
    ]);

    return { startTranslation };
};
