
import { AppSettings, ProgressCallback, TranslationStats } from '../types';
import { translateText } from './aiService';
import JSZip from 'jszip';

// Helper to process items in batches to avoid rate limiting
async function processInBatches<T>(
  items: T[],
  batchSize: number,
  processor: (item: T, index: number) => Promise<void>,
  delayMs: number = 0
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map((item, batchIndex) => processor(item, i + batchIndex)));
    if (delayMs > 0 && (i + batchSize) < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

export const processDOCX = async (
  file: File,
  settings: AppSettings,
  onProgress: ProgressCallback
): Promise<{ blob: Blob; stats: { original: number; translated: number } }> => {
  // Update progress immediately
  onProgress(0, 100, "正在读取文件...", "解析 DOCX 结构");

  const zip = new JSZip();
  let loadedZip;
  
  try {
      loadedZip = await zip.loadAsync(file);
  } catch (e) {
      throw new Error("无法读取文件，请确认是有效的 .docx 文件");
  }

  // Word documents store main content in word/document.xml
  const documentXmlPath = "word/document.xml";
  const documentFile = loadedZip.file(documentXmlPath);

  if (!documentFile) {
      throw new Error("未找到文档内容 (word/document.xml)，文件可能损坏。");
  }

  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  let totalOriginalChars = 0;
  let totalTranslatedChars = 0;

  const xmlString = await documentFile.async("string");
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  
  // Find all paragraphs <w:p>
  const paragraphs = Array.from(xmlDoc.getElementsByTagName("w:p"));

  // Filter paragraphs that actually have text
  const textParagraphs = paragraphs.filter(p => {
    const texts = p.getElementsByTagName("w:t");
    return texts.length > 0 && Array.from(texts).some(t => t.textContent?.trim());
  });

  if (textParagraphs.length === 0) {
      throw new Error("文档中未找到文本内容。");
  }

  onProgress(0, textParagraphs.length, `准备处理文档`, `发现 ${textParagraphs.length} 个段落`, {
      originalChars: 0,
      translatedChars: 0,
      slidesProcessed: 0,
      totalSlides: 100 // Simulate 100% progress scale
  });

  // Process paragraphs
  // We treat paragraphs like "slides" for the progress bar logic
  const processParagraph = async (p: Element, index: number) => {
    const textNodes = Array.from(p.getElementsByTagName("w:t"));
    
    // 1. Extract full text from paragraph (merge all runs)
    const fullText = textNodes.map(node => node.textContent).join("").trim();
    
    if (!fullText) return;

    // EMIT EVENT: Start Translating
    onProgress(index, textParagraphs.length, "TRANSLATING_START", fullText, {
        originalChars: totalOriginalChars,
        translatedChars: totalTranslatedChars,
        slidesProcessed: Math.floor((index / textParagraphs.length) * 100),
        totalSlides: 100
    });

    // 2. Translate
    let translatedText = fullText;
    try {
        // Automatically uses settings (including glossary)
        translatedText = await translateText(fullText, settings);
    } catch (e) {
        console.warn(`Failed to translate paragraph. Keeping original.`);
    }
    
    // Update stats atomicity
    totalOriginalChars += fullText.length;
    totalTranslatedChars += translatedText.length;

    // EMIT EVENT: End Translating
    onProgress(index, textParagraphs.length, "TRANSLATING_END", translatedText, {
        originalChars: totalOriginalChars,
        translatedChars: totalTranslatedChars,
        slidesProcessed: Math.floor((index / textParagraphs.length) * 100),
        totalSlides: 100
    });

    // 3. Update XML (Perfect Format Preservation Strategy)
    // We put all translated text into the FIRST text node, and empty the rest.
    // This preserves the paragraph-level formatting (w:pPr) and the font style of the start (w:rPr).
    if (textNodes.length > 0) {
      textNodes[0].textContent = translatedText;
      // Ensure xml:space="preserve" is set to avoid whitespace collapsing
      textNodes[0].setAttribute("xml:space", "preserve");
      
      for (let j = 1; j < textNodes.length; j++) {
        textNodes[j].textContent = "";
      }
    }
  };

  // Process sequentially to allow UI animation to shine
  // Batch size 1, delay 200ms to mimic the "typing" flow
  await processInBatches(textParagraphs, 1, processParagraph, 200);

  // Serialize back to string and update zip
  const newXmlString = serializer.serializeToString(xmlDoc);
  loadedZip.file(documentXmlPath, newXmlString);

  onProgress(100, 100, "正在完成...", "正在重新打包 DOCX 文件...", {
      originalChars: totalOriginalChars,
      translatedChars: totalTranslatedChars,
      slidesProcessed: 100,
      totalSlides: 100
  });
  
  const blob = await loadedZip.generateAsync({ 
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  
  return { 
    blob, 
    stats: { 
      original: totalOriginalChars, 
      translated: totalTranslatedChars 
    } 
  };
};
