import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, HeadingLevel, WidthType, AlignmentType } from 'docx';

/**
 * Word 文档生成服务
 * 将结构化内容转换为带样式的 .docx 文件
 */
export class DocxGenerator {
  
  /**
   * 根据提取并翻译后的内容生成 Word 文档
   * @param slides 包含 items 的页面数据数组
   */
  async generateFromContent(slides: any[]): Promise<Buffer> {
    const sections = [];

    // 展平所有 items
    const allItems = slides.flatMap(slide => slide.items || []);

    const children: any[] = [];

    for (const item of allItems) {
      if (item.type === 'table') {
        // 构建表格 (使用翻译后的行 translatedRows)
        const tableRows = (item.translatedRows || item.rows).map((row: string[]) => {
          return new TableRow({
            children: row.map(cellText => 
              new TableCell({
                width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
                children: [new Paragraph({
                  children: [new TextRun({ text: cellText, size: 20 })] // 10pt
                })],
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                }
              })
            ),
          });
        });

        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
          margins: { top: 100, bottom: 100, left: 100, right: 100 }
        }));
        
        // 表格后加空行
        children.push(new Paragraph({ text: "", spacing: { after: 200 } }));

      } else {
        // 处理普通文本 (h1, h2, p)
        const text = item.translatedText || item.text;
        if (!text) continue;

        let heading = undefined;
        let bold = false;
        let size = item.fontSize * 2; // docx 库使用的是 half-points (24pt = 48)

        if (item.tagName === 'h1') {
          heading = HeadingLevel.HEADING_1;
          bold = true;
          size = 36; // 18pt
        } else if (item.tagName === 'h2') {
          heading = HeadingLevel.HEADING_2;
          bold = true;
          size = 32; // 16pt
        } else if (item.tagName === 'h3') {
          heading = HeadingLevel.HEADING_3;
          bold = true;
          size = 28; // 14pt
        }

        children.push(new Paragraph({
          heading: heading,
          spacing: { before: 200, after: 120 },
          children: [
            new TextRun({
              text: text,
              size: size,
              bold: bold,
              color: item.isHeader ? "2E74B5" : "000000" // 标题使用蓝色，正文黑色
            })
          ]
        }));
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    return await Packer.toBuffer(doc);
  }
}

export default DocxGenerator;
