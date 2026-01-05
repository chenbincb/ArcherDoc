import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs/promises';
import path from 'path';
import { getPPTConverter } from './pptConverter.js';
import { AIService } from './aiService.js';
import { logger } from '../middleware/logger.js';

/**
 * PDF 内容提取服务
 * 策略：全视觉识别 -> HTML 结构化 -> 样式还原
 */
export class PdfExtractor {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  /**
   * 提取 PDF 内容（包含样式信息）
   */
  async extractContent(pdfPath: string, jobDir: string): Promise<Array<{
    id: number;
    title: string;
    content: string; 
    items: Array<{   
      text: string;
      fontSize: number;
      isHeader: boolean;
      tagName: string; // 保留标签名以便后续处理
    }>;
  }>> {
    const pptConverter = getPPTConverter();
    const imagesDir = path.join(jobDir, 'slides');
    
    // 确保图片目录存在
    await fs.mkdir(imagesDir, { recursive: true });

    // 1. 预处理：将 PDF 转换为图片序列
    console.log(`[PdfExtractor] Rendering PDF to images: ${pdfPath}`);
    await pptConverter.convertPdfToImages(pdfPath, imagesDir);

    // 2. 获取 PDF 页数 (仅用于循环控制)
    const buffer = await fs.readFile(pdfPath);
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true 
    });
    const pdfDocument = await loadingTask.promise;
    const results: Array<any> = [];
    const pdfBaseName = path.basename(pdfPath, path.extname(pdfPath));

    // 3. 逐页视觉识别
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      console.log(`[PdfExtractor] Visual recognizing page ${i}/${pdfDocument.numPages}...`);
      const imagePath = await this.findImagePath(imagesDir, i);
      
      let pageHtml = '';
      let pageItems: any[] = [];
      let rawText = '';

      if (imagePath) {
        try {
          const imageBuffer = await fs.readFile(imagePath);
          const base64 = imageBuffer.toString('base64');
          
          // HTML 提取 Prompt
          const prompt = `
请仔细阅读这张图片，将其内容转换为简单的 HTML 格式。
规则：
1. 标题使用 <h1> (大标题) 或 <h2> (副标题)。
2. 正文段落使用 <p>。
3. 列表使用 <ul><li>。
4. 如果有表格，保留文本内容即可，用 <p> 分隔。
5. 不要包含 <html>, <body>, <head> 等外层标签，直接输出内容标签。
6. 不要添加任何解释性文字，只输出 HTML 代码。
`;
          const htmlResult = await this.aiService.recognizeImageWithQwenVL(base64, prompt);
          console.log(`[PdfExtractor] Raw Qwen-VL Output for page ${i}:`, htmlResult); // DEBUG LOG
          pageHtml = htmlResult || '';

          // 解析 HTML 为结构化 Items
          pageItems = this.parseHtmlToItems(pageHtml);
          console.log(`[PdfExtractor] Parsed ${pageItems.length} items for page ${i}`); // DEBUG LOG
          rawText = pageItems.map(it => it.text).join('\n');

        } catch (err) {
          console.error(`[PdfExtractor] Vision failed for page ${i}:`, err);
          rawText = "识别失败";
        }
      }

      results.push({
        id: i,
        title: rawText.substring(0, 50).replace(/\r?\n|\r/g, " ") || `Page ${i}`,
        content: rawText, // 用于纯文本摘要
        items: pageItems  // 用于前端逐段翻译和样式还原
      });
    }

    return results;
  }

  /**
   * 简单的 HTML 解析器 (Regex)
   * 将 HTML 字符串转换为带样式的 Items (支持结构化表格)
   */
  private parseHtmlToItems(html: string): Array<any> {
    const items: any[] = [];
    
    // 1. 处理表格 (Table) - 保留二维结构
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let htmlWithoutTables = html;

    let tableMatch;
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableContent = tableMatch[1];
      const rows: string[][] = [];
      
      // 解析行 tr
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch;
      while ((trMatch = trRegex.exec(tableContent)) !== null) {
        const rowContent = trMatch[1];
        const cells: string[] = [];
        
        // 解析列 td/th
        const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          const cellText = cellMatch[2].replace(/<[^>]+>/g, '').trim();
          cells.push(cellText); // 即使是空单元格也保留，以维持结构
        }
        if (cells.length > 0) {
          rows.push(cells);
        }
      }

      if (rows.length > 0) {
        items.push({
          type: 'table',
          rows: rows, // 二维数组 [[A, B], [C, D]]
          fontSize: 10,
          isHeader: false
        });
      }
      
      // 占位替换，避免后续正则重复匹配（虽然位置会变，但能提取出来就行）
      // 注意：这种简单的替换会丢失表格在文档流中的原始位置。
      // 为了保持顺序，更好的做法是按 index 切分字符串，但正则迭代比较复杂。
      // 鉴于 Qwen-VL 输出的稳定性，我们假设它顺序输出。为了简单起见，我们先提取表格，再提取文本，这会导致表格被挪到列表前面（或后面）。
      // **修正策略**：为了保持阅读顺序，我们需要一个能够按顺序扫描的解析器。
      // 但现在为了不引入重型 parser，我们接受“先提取表格，再提取文本”的妥协，或者...
      // 我们可以用一个通用的正则同时匹配 table 和其他标签？
      // 让我们尝试用一个大正则来按顺序匹配。
    }

    // 重写解析逻辑：按顺序匹配所有块级元素
    const blockRegex = /<(h[1-6]|p|li|div|table)[^>]*>([\s\S]*?)<\/\1>/gi;
    const orderedItems: any[] = [];
    
    let match;
    // 重置正则索引
    const cleanHtml = html.replace(/\n/g, ''); // 简单清洗换行，防正则卡死

    while ((match = blockRegex.exec(html)) !== null) {
      const tagName = match[1].toLowerCase();
      const content = match[2];

      if (tagName === 'table') {
        // 解析表格内部
        const rows: string[][] = [];
        const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let trMatch;
        while ((trMatch = trRegex.exec(content)) !== null) {
          const cells: string[] = [];
          const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
          let cellMatch;
          while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
            cells.push(cellMatch[2].replace(/<[^>]+>/g, '').trim());
          }
          if (cells.length > 0) rows.push(cells);
        }
        if (rows.length > 0) {
          orderedItems.push({
            type: 'table',
            rows: rows,
            fontSize: 10,
            isHeader: false
          });
        }
      } else {
        // 普通文本
        const text = content.replace(/<[^>]+>/g, '').trim();
        if (!text) continue;

        let fontSize = 12;
        let isHeader = false;
        if (tagName === 'h1') { fontSize = 24; isHeader = true; }
        else if (tagName === 'h2') { fontSize = 18; isHeader = true; }
        else if (tagName === 'h3') { fontSize = 14; isHeader = true; }

        orderedItems.push({
          type: 'text', // 明确类型
          text: text,
          fontSize,
          isHeader,
          tagName
        });
      }
    }

    // 兜底：如果正则没匹配到，且有内容
    if (orderedItems.length === 0 && html.trim()) {
       orderedItems.push({
        type: 'text',
        text: html.replace(/<[^>]+>/g, '').trim(),
        fontSize: 12,
        isHeader: false,
        tagName: 'p'
      });
    }

    return orderedItems;
  }

  /**
   * 匹配 PPTConverter 生成的图片命名规则 (slide_0.png, slide_1.png...)
   */
  private async findImagePath(dir: string, index: number): Promise<string | null> {
    const fileName = `slide_${index - 1}.png`;
    const fullPath = path.join(dir, fileName);
    
    try {
      await fs.access(fullPath);
      return fullPath;
    } catch {
      logger.warn(`Could not find image for page ${index} at ${fullPath}`);
      return null;
    }
  }
}

export default PdfExtractor;