import fs from 'fs/promises';
import { AIService } from './aiService';

/**
 * 图片提取器
 * 使用 AI 视觉模型分析图片内容，并将其转换为结构化的 Markdown 文档
 */
export class ImageExtractor {
    private aiService: AIService;

    constructor(aiService: AIService) {
        this.aiService = aiService;
    }

    /**
     * 处理图片并提取内容
     * @param filePath 图片文件路径
     * @returns 包含单一 Slide 对象的数组，内容为 Markdown 格式
     */
    async extractContent(filePath: string): Promise<Array<{
        id: number;
        title: string;
        content: string;
        notes: string;
        imageExtension?: string;
    }>> {
        try {
            // 1. 读取图片并转换为 Base64
            const imageBuffer = await fs.readFile(filePath);
            const base64 = imageBuffer.toString('base64');

            // 2. 构建 Prompt 指导 AI 处理三种场景（纯图、纯文、混排）
            // 目标是输出统一的 Markdown 格式
            const prompt = `
你是一个智能文档助手。请分析这张图片的内容，并将其转换为一份 **Markdown 格式** 的文档。

请根据图片内容的性质，自动采用以下策略之一：

1. **如果有大量文字（纯文档/截图）**：
   - 请精准识别所有文字（OCR）。
   - 保留原有的标题层级（# 标题, ## 副标题）。
   - 保持段落结构。

2. **如果是纯图片（照片/插画/无文字图表）**：
   - 请对画面进行详细的视觉描述。
   - 描述内容包括：主体是什么、环境背景、视觉风格、颜色氛围等。
   - 使用引用块（> 引用）来包裹这些描述性文字，以示区别。

3. **如果是图文混排（幻灯片/海报/带图文章）**：
   - 优先提取所有可见的文字内容。
   - 在适当的位置（通常是文字提及处或开始/结尾），插入对图片的简要视觉描述（使用 *斜体* 或 > 引用）。

**输出要求**：
- 直接输出 Markdown 内容，不要包含 "好的"、"这是结果" 等废话。
- 不要使用代码块包裹整个输出，直接返回 Markdown 文本。
`;

            // 3. 调用 AI 视觉模型
            // 假设 recognizeImageWithQwenVL 内部已经处理了 API 调用细节
            const result = await this.aiService.recognizeImageWithQwenVL(base64, prompt);

            // 4. 处理结果
            // 如果识别失败，给一个默认提示
            const content = result || "> [AI 提示] 无法识别该图片的内容。";

            // 提取标题（尝试取第一行作为标题，如果第一行太长或者没内容，就用默认标题）
            let title = "Image Document";
            const lines = content.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length > 0) {
                // 去掉 markdown 符号 (#) 取纯文本
                const firstLine = lines[0].replace(/^[#\s]+/, '');
                if (firstLine.length > 0 && firstLine.length < 50) {
                    title = firstLine;
                }
            }

            // 5. 封装为标准 Slide 结构
            // 图片本身就是个单页内容，所以我们返回一个单页 Slide
            const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
            return [{
                id: 1,
                title: title,
                content: content,
                notes: "Generated from Image via AI Vision",
                imageExtension: `.${ext}`
            }];

        } catch (error: any) {
            console.error('[ImageExtractor] Extraction failed:', error);
            throw new Error(`无法处理图片: ${error.message}`);
        }
    }
}
