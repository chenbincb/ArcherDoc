import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';

/**
 * PPT内容提取服务
 * 使用JSZip解析PPTX文件,提取文本内容
 */
export class PPTExtractor {
  /**
   * 从PPTX文件中提取所有幻灯片的文本内容
   */
  async extractSlidesContent(pptPath: string): Promise<Array<{
    slideId: number;
    title: string;
    content: string;
    notes: string;
  }>> {
    // 读取PPTX文件
    const buffer = await fs.readFile(pptPath);
    const zip = await JSZip.loadAsync(buffer);

    const slides: Array<{
      slideId: number;
      title: string;
      content: string;
      notes: string;
    }> = [];

    // 遍历所有幻灯片 (slide1.xml, slide2.xml, ...)
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.match(/^ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
        const bNum = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
        return aNum - bNum;
      });

    for (const slideFile of slideFiles) {
      const slideId = parseInt(slideFile.match(/slide(\d+)\.xml/)?.[1] || '0');

      // 1. 读取幻灯片内容
      const slideXml = await zip.file(slideFile)?.async('string') || '';

      // 2. 提取备注 (通过 .rels 文件精确定位)
      const notes = await this.extractNotes(zip, slideFile);

      // 3. 提取标题和正文
      const title = this.extractTitleFromXML(slideXml) || '';
      const texts = this.extractTextsFromXML(slideXml);

      slides.push({
        slideId,
        title,
        content: texts.join('\n'),
        notes
      });
    }

    return slides;
  }

  /**
   * 通过解析 .rels 文件精确定位备注文件
   */
  private async extractNotes(zip: JSZip, slideFile: string): Promise<string> {
    try {
      const slideDir = path.dirname(slideFile);
      const slideName = path.basename(slideFile);
      const relsFile = path.join(slideDir, '_rels', `${slideName}.rels`);

      const relsXml = await zip.file(relsFile)?.async('string');
      if (!relsXml) return '';

      // 查找类型为 notesSlide 的关系
      const match = relsXml.match(/Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/notesSlide" Target="([^"]+)"/);
      if (!match) return '';

      // 计算备注文件的绝对路径 (Target 通常是相对路径，如 "../notesSlides/notesSlide1.xml")
      const targetRelPath = match[1];
      const notesPath = path.normalize(path.join(slideDir, targetRelPath)).replace(/\\/g, '/');
      
      const notesXml = await zip.file(notesPath)?.async('string');
      if (!notesXml) return '';

      return this.extractTextsFromXML(notesXml).join('\n');
    } catch (err) {
      return '';
    }
  }

  /**
   * 尝试从 XML 中提取标题
   * 优先寻找带 type="title" 或 type="ctrTitle" 的占位符
   */
  private extractTitleFromXML(xml: string): string | null {
    // 匹配带有标题性质占位符的形状
    // 逻辑：找到包含 <p:ph type="title".../> 或 type="ctrTitle" 的形状块，然后提取其文本
    const spRegex = /<p:sp>([\s\S]*?)<\/p:sp>/g;
    let match;
    
    while ((match = spRegex.exec(xml)) !== null) {
      const spContent = match[1];
      if (spContent.includes('type="title"') || spContent.includes('type="ctrTitle"')) {
        const texts = this.extractTextsFromXML(spContent);
        if (texts.length > 0) return texts.join(' ');
      }
    }
    
    // 如果没找到显式标记，返回第一个非空文本（备选方案）
    const allTexts = this.extractTextsFromXML(xml);
    return allTexts[0] || null;
  }

  /**
   * 从XML中提取所有文本并处理转义字符
   */
  private extractTextsFromXML(xml: string): string[] {
    const texts: string[] = [];

    // 匹配 <a:t>标签中的文本
    const textRegex = /<a:t[^>]*>([^<]+)<\/a:t>/g;
    let match;

    while ((match = textRegex.exec(xml)) !== null) {
      let text = match[1].trim();
      if (text) {
        // 简单的 XML 实体解码
        text = text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        texts.push(text);
      }
    }

    return texts;
  }

  /**
   * 提取PPT元数据
   */
  async extractMetadata(pptPath: string): Promise<{
    title: string;
    author: string;
    slideCount: number;
  }> {
    const buffer = await fs.readFile(pptPath);
    const zip = await JSZip.loadAsync(buffer);

    // 读取核心属性
    const coreFile = zip.file('docProps/core.xml');
    let title = '未命名演示文稿';
    let author = '未知作者';

    if (coreFile) {
      const coreXml = await coreFile.async('string');

      // 提取标题
      const titleMatch = coreXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
      if (titleMatch) {
        title = titleMatch[1];
      }

      // 提取作者
      const authorMatch = coreXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/);
      if (authorMatch) {
        author = authorMatch[1];
      }
    }

    // 计算幻灯片数量
    const slideFiles = Object.keys(zip.files).filter(name =>
      name.match(/^ppt\/slides\/slide\d+\.xml$/)
    );

    return {
      title,
      author,
      slideCount: slideFiles.length
    };
  }
}

export default PPTExtractor;
