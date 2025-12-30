// 风格和类型组合的提示词模板

// 平台特定配置
const platformConfigs: Record<string, {
  name: string;
  writing_style: string;
  format_example: string;
}> = {
  wechat: {
    name: "微信公众号",
    writing_style: "专业深度，逻辑清晰",
    format_example: "# [文章标题]\n\n[文章正文内容]"
  },
  xiaohongshu: {
    name: "小红书",
    writing_style: "生活化、亲切、图文并茂",
    format_example: "# [文章标题] ✨\n\n[文章正文内容]"
  },
  weibo: {
    name: "微博",
    writing_style: "简洁有力，话题性强",
    format_example: "# [文章标题]\n\n[文章正文内容]\n\n#话题标签#"
  },
  zhihu: {
    name: "知乎",
    writing_style: "理性分析，专业解答",
    format_example: "# [文章标题]\n\n[文章正文内容]"
  },
  douyin: {
    name: "抖音",
    writing_style: "节奏紧凑，吸引眼球",
    format_example: "# [视频标题]\n\n[视频脚本内容]"
  },
  bilibili: {
    name: "B站",
    writing_style: "年轻化，互动性强",
    format_example: "# [视频标题]\n\n[视频脚本内容]"
  }
};

// 文章类型配置
const articleTypeConfigs: Record<string, {
  name: string;
  word_count: string;
  requirements: string[];
}> = {
  comprehensive: {
    name: "综合文章",
    word_count: "1500-2000字",
    requirements: [
      "采用{{PLATFORM_NAME}}的写作风格：{{WRITING_STYLE}}",
      "使用吸引人的标题和开头，增加阅读粘性",
      "适当使用小标题、列表、引用等格式增强可读性",
      "语言通俗易懂但保持专业性，符合{{PLATFORM_NAME}}读者习惯",
      "结尾要有总结和行动号召，引导读者互动",
      "确保文章逻辑连贯，层次分明"
    ]
  },
  summary: {
    name: "摘要文章",
    word_count: "800-1200字",
    requirements: [
      "采用{{PLATFORM_NAME}}的写作风格：{{WRITING_STYLE}}",
      "重点突出核心观点，简洁明了",
      "语言精炼，适合快速阅读和分享",
      "结构清晰，逻辑性强",
      "结尾要有简洁的总结和互动引导"
    ]
  },
  detailed: {
    name: "详细文章",
    word_count: "2000-3000字",
    requirements: [
      "采用{{PLATFORM_NAME}}的写作风格：{{WRITING_STYLE}}",
      "深入分析每个要点，提供详细解释",
      "包含丰富的案例和实例",
      "结构完整，层次分明",
      "语言专业但保持可读性",
      "结尾要有深度总结和思考引导"
    ]
  },
  marketing: {
    name: "营销文章",
    word_count: "1000-1500字",
    requirements: [
      "采用{{PLATFORM_NAME}}的写作风格：{{WRITING_STYLE}}",
      "突出产品/服务的卖点和优势",
      "使用吸引人的标题和开头",
      "包含客户案例和成功故事",
      "语言生动，富有感染力",
      "结尾要有强烈的行动号召和互动引导"
    ]
  }
};

// 基础模板结构
const baseTemplate = {
  system_prompt: `你是一位专业的{{PLATFORM_NAME}}内容创作专家，擅长将PPT演示内容转化为吸引人的{{PLATFORM_NAME}}内容。`,
  
  ppt_info: `**PPT基本信息:**
- 标题: {{PPT_TITLE}}
- 作者: {{PPT_AUTHOR}}
- 总页数: {{TOTAL_SLIDES}}
- 内容页数: {{CONTENT_SLIDES}}

**PPT内容摘要:**
{{CONTENT_SUMMARY}}`,
  
  output_format: `**输出格式:**
请直接输出文章内容，不要包含任何前言或说明文字。文章格式如下：

{{OUTPUT_FORMAT_EXAMPLE}}

---
*本文基于PPT演示内容整理而成*`
};

// 动态生成模板函数
export function generatePromptTemplate(platform: string, articleType: string): string {
  const platformConfig = platformConfigs[platform];
  const typeConfig = articleTypeConfigs[articleType];
  
  if (!platformConfig || !typeConfig) {
    throw new Error(`Invalid platform ${platform} or article type ${articleType}`);
  }
  
  // 替换系统提示中的占位符
  const systemPrompt = baseTemplate.system_prompt
    .replace(/\{\{PLATFORM_NAME\}\}/g, platformConfig.name);
  
  // 生成写作要求列表
  const requirementsList = typeConfig.requirements.map((req, index) => {
    const formattedReq = req
      .replace(/\{\{PLATFORM_NAME\}\}/g, platformConfig.name)
      .replace(/\{\{WRITING_STYLE\}\}/g, platformConfig.writing_style);
    return `${index + 1}. ${formattedReq}`;
  }).join('\n');
  
  // 替换输出格式中的占位符
  const outputFormat = baseTemplate.output_format
    .replace(/\{\{OUTPUT_FORMAT_EXAMPLE\}\}/g, platformConfig.format_example);
  
  return `${systemPrompt}

${baseTemplate.ppt_info}

**写作要求:**
${requirementsList}

${outputFormat}`;
}

// 预生成所有可能的模板组合，以便快速访问
export const promptTemplates: Record<string, Record<string, string>> = {
  wechat: {
    comprehensive: generatePromptTemplate('wechat', 'comprehensive'),
    summary: generatePromptTemplate('wechat', 'summary'),
    detailed: generatePromptTemplate('wechat', 'detailed'),
    marketing: generatePromptTemplate('wechat', 'marketing')
  },
  xiaohongshu: {
    comprehensive: generatePromptTemplate('xiaohongshu', 'comprehensive'),
    summary: generatePromptTemplate('xiaohongshu', 'summary'),
    detailed: generatePromptTemplate('xiaohongshu', 'detailed'),
    marketing: generatePromptTemplate('xiaohongshu', 'marketing')
  },
  weibo: {
    comprehensive: generatePromptTemplate('weibo', 'comprehensive'),
    summary: generatePromptTemplate('weibo', 'summary'),
    detailed: generatePromptTemplate('weibo', 'detailed'),
    marketing: generatePromptTemplate('weibo', 'marketing')
  },
  zhihu: {
    comprehensive: generatePromptTemplate('zhihu', 'comprehensive'),
    summary: generatePromptTemplate('zhihu', 'summary'),
    detailed: generatePromptTemplate('zhihu', 'detailed'),
    marketing: generatePromptTemplate('zhihu', 'marketing')
  },
  douyin: {
    comprehensive: generatePromptTemplate('douyin', 'comprehensive'),
    summary: generatePromptTemplate('douyin', 'summary'),
    detailed: generatePromptTemplate('douyin', 'detailed'),
    marketing: generatePromptTemplate('douyin', 'marketing')
  },
  bilibili: {
    comprehensive: generatePromptTemplate('bilibili', 'comprehensive'),
    summary: generatePromptTemplate('bilibili', 'summary'),
    detailed: generatePromptTemplate('bilibili', 'detailed'),
    marketing: generatePromptTemplate('bilibili', 'marketing')
  }
};

// 导出平台和文章类型选项，以便在UI中使用
export const articleStyleOptions = Object.entries(platformConfigs).map(([value, config]) => ({
  value,
  label: `${config.name} - ${config.writing_style}`
}));

export const articleTypeOptions = Object.entries(articleTypeConfigs).map(([value, config]) => ({
  value,
  label: `${config.name} - ${config.word_count}`
}));
