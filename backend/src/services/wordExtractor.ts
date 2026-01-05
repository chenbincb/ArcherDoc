import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';

/**
 * 通用文本提取器
 * 支持 .docx, .txt, .md
 */
export class TextDocumentExtractor {
  
  /**
   * 提取文档纯文本内容
   * @param filePath 文件路径
   */
  async extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    try {
      if (ext === '.docx') {
        return await this.extractFromDocx(filePath);
      } else if (ext === '.txt' || ext === '.md') {
        return await this.extractFromTextFile(filePath);
      }
      throw new Error(`Unsupported text document format: ${ext}`);
    } catch (error: any) {
      console.error(`[TextDocumentExtractor] Error extracting from ${ext}:`, error);
      throw new Error(`无法从 ${ext} 文件提取内容: ${error.message}`);
    }
  }

  /**
   * 从 Word (.docx) 提取文本
   */
  private async extractFromDocx(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    
    if (result.messages.length > 0) {
      // 记录警告但不中断
      console.warn('[TextDocumentExtractor] Mammoth warnings:', result.messages);
    }
    
    return result.value.trim();
  }

  /**
   * 从纯文本文件 (.txt, .md) 提取内容
   */
  private async extractFromTextFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.trim();
  }
}

export default TextDocumentExtractor;
