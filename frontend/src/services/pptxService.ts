
import { AppSettings, ProgressCallback, TranslationStats } from '../types';
import { translateText } from './aiService';
import JSZip from 'jszip';

// Helper: Estimate visual width of text for layout calculations
// Chinese/Full-width chars ~ 2 units
// Uppercase ~ 1.2 units
// Lowercase/Standard ~ 1 unit
const getVisualWidth = (text: string): number => {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Common CJK ranges
    if (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
      (code >= 0x3000 && code <= 0x303f) || // CJK Symbols and Punctuation
      (code >= 0xff00 && code <= 0xffef)    // Halfwidth and Fullwidth Forms
    ) {
      width += 2.0;
    } else if (code >= 65 && code <= 90) {
      width += 1.2; // Uppercase
    } else {
      width += 1.0; // Standard ASCII
    }
  }
  return width;
};

// Helper to process items in batches to avoid rate limiting
async function processInBatches<T>(
  items: T[],
  batchSize: number,
  processor: (item: T, index: number) => Promise<void>,
  delayMs: number = 0
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    // Map batch to processor with correct index offset
    await Promise.all(batch.map((item, batchIndex) => processor(item, i + batchIndex)));
    
    // Add delay between batches if requested, but not after the last batch
    if (delayMs > 0 && (i + batchSize) < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

export const processPPTX = async (
  file: File,
  settings: AppSettings,
  onProgress: ProgressCallback
): Promise<{ blob: Blob; stats: { original: number; translated: number } }> => {
  // Update progress immediately to show activity
  onProgress(0, 100, "正在读取文件...", "解析 PPTX 结构");

  const zip = new JSZip();
  let loadedZip;
  
  try {
      loadedZip = await zip.loadAsync(file);
  } catch (e) {
      throw new Error("无法读取文件，请确认是有效的 .pptx 文件");
  }

  // Find all slide XML files using a more robust check
  const slideFiles: string[] = [];
  loadedZip.forEach((relativePath: string) => {
    // Standard paths are ppt/slides/slide1.xml, but check loosely for "slide" and ".xml" inside "ppt/slides"
    // Case insensitive check
    const lowerPath = relativePath.toLowerCase();
    if (lowerPath.includes('ppt/slides/slide') && lowerPath.endsWith('.xml')) {
      // Exclude "rels" or other metadata files that might match broadly
      if (!lowerPath.includes('_rels') && !lowerPath.includes('master') && !lowerPath.includes('layout')) {
          slideFiles.push(relativePath);
      }
    }
  });

  if (slideFiles.length === 0) {
      console.warn("Zip files found:", Object.keys(loadedZip.files));
      throw new Error("未找到幻灯片文件，PPT 结构可能不标准。");
  }

  // Sort to process in order (slide1, slide2, slide10...)
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/) ? a.match(/\d+/)![0] : "0");
    const numB = parseInt(b.match(/\d+/) ? b.match(/\d+/)![0] : "0");
    return numA - numB;
  });

  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  let totalOriginalChars = 0;
  let totalTranslatedChars = 0;
  let slidesProcessedCount = 0;

  // Process each slide
  for (let i = 0; i < slideFiles.length; i++) {
    const fileName = slideFiles[i];
    
    const xmlString = await loadedZip.file(fileName).async("string");
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    
    const paragraphs = Array.from(xmlDoc.getElementsByTagName("a:p"));

    // Filter paragraphs that actually have text
    const textParagraphs = paragraphs.filter(p => {
      const texts = p.getElementsByTagName("a:t");
      return texts.length > 0 && Array.from(texts).some(t => t.textContent?.trim());
    });

    // Report start of slide
    onProgress(i, slideFiles.length, `正在处理幻灯片 ${i + 1}/${slideFiles.length}`, `发现 ${textParagraphs.length} 个文本块`, {
          originalChars: totalOriginalChars,
          translatedChars: totalTranslatedChars,
          slidesProcessed: i,
          totalSlides: slideFiles.length
    });

    // Process paragraph logic
    const processParagraph = async (p: Element, pIndex: number) => {
      const runs = Array.from(p.getElementsByTagName("a:r"));
      const textNodes = Array.from(p.getElementsByTagName("a:t"));
      
      // 1. Extract full text from paragraph
      const fullText = textNodes.map(node => node.textContent).join("").trim();
      
      if (!fullText) return;

      const granularProgress = i + (pIndex / Math.max(textParagraphs.length, 1));
      
      // EMIT EVENT: Start Translating (For UI Shimmer)
      // Send current stats BEFORE this paragraph is added
      onProgress(granularProgress, slideFiles.length, "TRANSLATING_START", fullText, {
          originalChars: totalOriginalChars,
          translatedChars: totalTranslatedChars,
          slidesProcessed: i,
          totalSlides: slideFiles.length
      });

      // 2. Translate
      let translatedText = fullText;
      try {
          translatedText = await translateText(fullText, settings);
      } catch (e) {
          console.warn(`Failed to translate paragraph. Keeping original.`);
      }
      
      // Update stats atomicity
      totalOriginalChars += fullText.length;
      totalTranslatedChars += translatedText.length;

      // EMIT EVENT: End Translating (For UI Morph) AND Update Stats
      onProgress(granularProgress, slideFiles.length, "TRANSLATING_END", translatedText, {
          originalChars: totalOriginalChars,
          translatedChars: totalTranslatedChars,
          slidesProcessed: i,
          totalSlides: slideFiles.length
      });

      // 3. Update XML
      if (textNodes.length > 0) {
        textNodes[0].textContent = translatedText;
        for (let j = 1; j < textNodes.length; j++) {
          textNodes[j].textContent = "";
        }
      }

      // 4. Auto-resize font (Smart Visual Width Calculation)
      if (runs.length > 0) {
        const rPr = runs[0].getElementsByTagName("a:rPr")[0];
        
        // Only attempt resize if we have run properties to modify
        if (rPr) {
            const currentSzAttr = rPr.getAttribute("sz");
            // PPT size is in 1/100 points. 1800 = 18pt. Default to 18pt if missing.
            const currentSz = currentSzAttr ? parseInt(currentSzAttr) : 1800; 
            
            const originalWidth = getVisualWidth(fullText);
            const newWidth = getVisualWidth(translatedText);
            const ratio = newWidth / (originalWidth || 1);

            let newSz = currentSz;
            
            // Logic: If difference is large (>25%), reduce by ~2 sizes (approx 4pt / 400 units)
            // If difference is moderate (>10%), reduce by ~1 size (approx 2pt / 200 units)
            
            if (ratio > 1.25) {
                // Large difference -> Reduce by 4pt (400 units)
                // Example: 18pt -> 14pt
                newSz = Math.max(800, currentSz - 400);
            } else if (ratio > 1.1) {
                // Moderate difference -> Reduce by 2pt (200 units)
                // Example: 18pt -> 16pt
                newSz = Math.max(800, currentSz - 200);
            }

            // Apply changes if needed, but don't go below 8pt (800)
            if (newSz < currentSz) {
                rPr.setAttribute("sz", newSz.toString());
                rPr.setAttribute("dirty", "0"); // Hints PowerPoint to re-calculate layout
                console.debug(`Smart Resize: "${fullText.substring(0,10)}..." (Ratio: ${ratio.toFixed(2)}) resized ${currentSz} -> ${newSz}`);
            }
        }
      }
    };

    // Sequential processing with delay to allow UI animations to breathe and avoid rate limits
    if (textParagraphs.length > 0) {
        await processInBatches(textParagraphs, 1, processParagraph, 1200); 
    } else {
        // Just a small pause for empty slides so the user sees "Processing Slide X"
        await new Promise(r => setTimeout(r, 500));
    }

    // Serialize back to string and update zip
    const newXmlString = serializer.serializeToString(xmlDoc);
    loadedZip.file(fileName, newXmlString);
  }

  if (totalOriginalChars === 0) {
      throw new Error("幻灯片中未找到文本内容。该 PPT 可能仅包含图片。");
  }

  onProgress(slideFiles.length, slideFiles.length, "正在完成...", "正在重新打包 PPTX 文件...", {
      originalChars: totalOriginalChars,
      translatedChars: totalTranslatedChars,
      slidesProcessed: slideFiles.length,
      totalSlides: slideFiles.length
  });
  
  const blob = await loadedZip.generateAsync({ 
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  });
  
  return { 
    blob, 
    stats: { 
      original: totalOriginalChars, 
      translated: totalTranslatedChars 
    } 
  };
};

/**
 * Replaces all fonts in the PPTX with the specified target font.
 * This affects Slides, Masters, and Layouts.
 */
export const replaceGlobalFonts = async (
  file: File,
  targetFont: string,
  onProgress: (msg: string, progress: number) => void
): Promise<Blob> => {
  onProgress("正在解析 PPTX...", 10);

  const zip = new JSZip();
  let loadedZip;
  try {
    loadedZip = await zip.loadAsync(file);
  } catch (e) {
    throw new Error("无法读取文件，请确认是有效的 .pptx 文件");
  }

  // Identify all files that contain text styling
  const targetFiles: string[] = [];
  loadedZip.forEach((relativePath: string) => {
    const lower = relativePath.toLowerCase();
    // We want to hit slides, master slides, and slide layouts
    const isContentFile = 
        (lower.includes('ppt/slides/slide') && lower.endsWith('.xml')) ||
        (lower.includes('ppt/masters/slidemaster') && lower.endsWith('.xml')) ||
        (lower.includes('ppt/layouts/slidelayout') && lower.endsWith('.xml'));
    
    if (isContentFile) {
        targetFiles.push(relativePath);
    }
  });

  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  for (let i = 0; i < targetFiles.length; i++) {
    const fileName = targetFiles[i];
    const progress = 10 + Math.floor((i / targetFiles.length) * 80); // 10% -> 90%
    onProgress(`正在替换字体 ${i + 1}/${targetFiles.length}`, progress);

    const xmlString = await loadedZip.file(fileName).async("string");
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    // Function to update font face attributes
    const updateFontAttributes = (tagName: string) => {
        const elements = Array.from(xmlDoc.getElementsByTagName(tagName));
        elements.forEach((el: any) => {
            // Set Latin font
            el.setAttribute("typeface", targetFont);
            // Clean up other attributes that might conflict (optional, but safer to overwrite)
            // Note: Sometimes panose, pitch, charset are present, we leave them or remove them.
            // Usually just overwriting typeface is enough for PPT to render.
        });
    };

    // <a:latin> defines Western font
    updateFontAttributes("a:latin");
    // <a:ea> defines East Asian font (Chinese, etc.)
    updateFontAttributes("a:ea");
    // <a:cs> defines Complex Script font
    updateFontAttributes("a:cs");
    
    // Also check for <a:font> inside theme definitions if we were parsing themes, 
    // but modifying the slide/master content overrides the theme usually.

    const newXmlString = serializer.serializeToString(xmlDoc);
    loadedZip.file(fileName, newXmlString);
  }

  onProgress("正在重新打包...", 95);

  const blob = await loadedZip.generateAsync({ 
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  });

  onProgress("完成", 100);
  return blob;
};
