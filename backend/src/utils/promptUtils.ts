
import { logger } from '../middleware/logger.js';

/**
 * 占位符解析引擎 (对齐 n8n generate_article.py 逻辑)
 * 统一处理文章生成时的模板变量替换
 */
export async function parseArticlePrompt(
    prompt: string,
    jobMetadata: any,
    contentData: any,
    existingArticle: string = ''
): Promise<string> {
    // 1. 提取元数据 (核心对齐点)
    const meta = contentData?.metadata || contentData?.structure?.master_info || {};
    const summary = contentData?.summary || {};
    const slides = contentData?.slides || (Array.isArray(contentData) ? contentData : []);

    // 标题：优先用提取出的内容中的标题，其次用文件名
    const title = meta.title || jobMetadata?.originalFilename?.replace(/\.[^/.]+$/, "") || '未命名演示文稿';
    // 作者
    const author = meta.author || jobMetadata?.auditorEmail?.split('@')[0] || 'AI助手';
    // 页数逻辑
    const totalSlides = summary.total_slides || slides.length || 0;
    const contentSlides = summary.slides_with_content || slides.filter((s: any) => (s.content || s.note)?.trim()?.length > 0).length;

    // 2. 构建内容摘要 (取前10页，防止提示词溢出，对齐n8n)
    const contentSummary = slides.slice(0, 10).map((slide: any) =>
        `第${slide.slideId || slide.slide_number || slide.id || '?'}页: ${slide.title || '无标题'}\n${(slide.content || slide.text_content?.join(' ') || slide.note || '').substring(0, 500)}`
    ).join('\n\n');

    logger.info(`[Prompt Engine] Parsing placeholders for Job: ${jobMetadata?.id || 'unknown'}`);
    logger.info(`[Prompt Engine] Job Metadata: ${JSON.stringify(jobMetadata)}`);
    logger.info(`[Prompt Engine] Context: Title="${title}", Slides=${totalSlides}/${contentSlides}`);

    // 风格与平台的动态映射
    const styleMap: Record<string, { platform: string, style: string }> = {
        'wechat': { platform: '微信公众号', style: '专业深度' },
        'xiaohongshu': { platform: '小红书', style: '生活化，种草推荐' },
        'weibo': { platform: '微博', style: '简洁有力，话题性强' },
        'zhihu': { platform: '知乎', style: '理性分析，专业解答' },
        'douyin': { platform: '抖音', style: '短视频脚本，节奏紧凑' },
        'bilibili': { platform: 'B站', style: '年轻化，知识分享' }
    };

    const currentStyle = styleMap[jobMetadata?.articleStyle] || styleMap['wechat'];

    const replacements: Record<string, string> = {
        'PPT_TITLE': title,
        'PPT_AUTHOR': author,
        'TOTAL_SLIDES': totalSlides.toString(),
        'CONTENT_SLIDES': contentSlides.toString(),
        'CONTENT_SUMMARY': contentSummary,
        'EXISTING_ARTICLE': existingArticle,
        'PLATFORM_NAME': currentStyle.platform,
        'WRITING_STYLE': currentStyle.style
    };

    let result = prompt;
    for (const [key, value] of Object.entries(replacements)) {
        // 鲁棒正则：允许 {{ PPT_TITLE }} 这种带空格的写法，不区分大小写
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        result = result.replace(regex, value);
    }

    // 3. 微调逻辑对齐：如果是微调且没有占位符，则在末尾追加 (对齐n8n脚本52行)
    if (existingArticle && !prompt.includes('{{EXISTING_ARTICLE}}')) {
        result += `\n\n以下是已生成的文章内容，请基于此进行优化和微调：\n\n${existingArticle}`;
    }

    // Debug: 检查是否还有残留占位符
    const remaining = result.match(/\{\{.*?\}\}/g);
    if (remaining) {
        logger.warn(`Prompt still contains placeholders after parsing: ${remaining.join(', ')}`);
    }

    return result;
}
