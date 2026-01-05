
import { AppSettings, ProgressCallback } from '../types';
import { translateText } from './aiService';

/**
 * 纯文本和 Markdown 翻译服务
 * 支持按段落分块翻译，以驱动实时交互 UI
 */
export const processTextFile = async (
  file: File,
  settings: AppSettings,
  onProgress: ProgressCallback
): Promise<{ blob: Blob; stats: { original: number; translated: number } }> => {
  const isMarkdown = file.name.toLowerCase().endsWith('.md');
  onProgress(0, 100, "正在读取文件...", isMarkdown ? "解析 Markdown 结构" : "解析纯文本内容");

  const rawContent = await file.text();
  
  // 按双换行符切分段落，以实现平滑的进度显示
  const chunks = rawContent.split(/\n\n+/).filter(c => c.trim());

  if (chunks.length === 0) {
      throw new Error("文件中未找到有效文本内容。");
  }

  let totalOriginalChars = 0;
  let totalTranslatedChars = 0;
  const translatedChunks: string[] = [];

  onProgress(0, chunks.length, `准备处理文档`, `发现 ${chunks.length} 个文本块`, {
      originalChars: 0,
      translatedChars: 0,
      slidesProcessed: 0,
      totalSlides: 100
  });

  // 逐块翻译
  for (let i = 0; i < chunks.length; i++) {
    const originalText = chunks[i];
    const granularProgress = Math.floor((i / chunks.length) * 100);

    // 发送翻译开始事件，触发 MagicTextDisplay 显示原文
    onProgress(i, chunks.length, "TRANSLATING_START", originalText, {
        originalChars: totalOriginalChars,
        translatedChars: totalTranslatedChars,
        slidesProcessed: granularProgress,
        totalSlides: 100
    });

    let translatedText = originalText;
    try {
        // 如果是 Markdown，可以考虑在 settings 中动态注入提示词（此处复用通用 translateText）
        translatedText = await translateText(originalText, settings);
    } catch (e) {
        console.warn(`Failed to translate chunk ${i}. Keeping original.`);
    }

    translatedChunks.push(translatedText);
    totalOriginalChars += originalText.length;
    totalTranslatedChars += translatedText.length;

    // 发送翻译完成事件，触发 MagicTextDisplay 显示译文
    onProgress(i, chunks.length, "TRANSLATING_END", translatedText, {
        originalChars: totalOriginalChars,
        translatedChars: totalTranslatedChars,
        slidesProcessed: granularProgress,
        totalSlides: 100
    });

    // 稍微延迟，让用户能看清交互效果
    await new Promise(r => setTimeout(r, 300));
  }

  onProgress(100, 100, "正在完成...", "正在生成结果文件...", {
      originalChars: totalOriginalChars,
      translatedChars: totalTranslatedChars,
      slidesProcessed: 100,
      totalSlides: 100
  });

  const finalContent = translatedChunks.join('\n\n');
  const blob = new Blob([finalContent], { type: isMarkdown ? 'text/markdown' : 'text/plain' });

  return {
    blob,
    stats: {
      original: totalOriginalChars,
      translated: totalTranslatedChars
    }
  };
};
