import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Provider类型
 */
export enum AIProvider {
  GEMINI = 'gemini',
  OPENROUTER = 'openrouter',
  OLLAMA = 'ollama',
  VLLM = 'vllm'
}

/**
 * AI配置接口
 */
interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/**
 * AI服务
 * 支持多种AI提供商: Gemini, vLLM, OpenRouter, Ollama
 */
export class AIService {
  private config: AIConfig;
  private genAI?: GoogleGenerativeAI;
  private geminiModel?: any;

  constructor(config: AIConfig) {
    this.config = config;

    // 如果是Gemini,初始化Gemini客户端
    if (config.provider === AIProvider.GEMINI) {
      const key = config.apiKey || process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error('GEMINI_API_KEY is required for Gemini provider');
      }
      this.genAI = new GoogleGenerativeAI(key);
      this.geminiModel = this.genAI.getGenerativeModel({
        model: config.model || 'gemini-2.5-flash'
      });
    }
  }

  /**
   * 生成文本内容
   */
  async generateText(prompt: string): Promise<string> {
    if (this.config.provider === AIProvider.GEMINI) {
      return await this.generateWithGemini(prompt);
    } else {
      // vLLM, OpenRouter, Ollama都使用OpenAI-compatible API
      return await this.generateWithOpenAI(prompt);
    }
  }

  /**
   * 使用Gemini生成文本
   */
  private async generateWithGemini(prompt: string): Promise<string> {
    try {
      const result = await this.geminiModel!.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }

  /**
   * 使用OpenAI-compatible API生成文本 (vLLM, OpenRouter, Ollama)
   */
  private async generateWithOpenAI(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

    try {
      const baseUrl = this.config.baseUrl;
      if (!baseUrl) {
        throw new Error('baseUrl is required for OpenAI-compatible API');
      }

      const url = `${baseUrl}/chat/completions`;
      console.log(`[AIService] Sending request to: ${url}`); // Debug log

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000 // Increased token limit
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      const data: any = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('OpenAI-compatible API generation timed out after 300s');
      }
      // Log inner cause if available
      if (error.cause) {
        console.error('[AIService] Fetch failure cause:', error.cause);
      }
      throw new Error(`OpenAI-compatible API generation failed: ${error.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 使用内置 Qwen-VL 模型识别图片内容 (完全复刻 Python 脚本逻辑)
   * @param imageBase64 图片的 Base64 编码 (不带前缀)
   * @param prompt (可选) 识别提示词，默认使用幻灯片识别提示词
   */
  async recognizeImageWithQwenVL(imageBase64: string, prompt?: string): Promise<string | null> {
    const config = {
      baseUrl: "http://178.109.129.11:8008/v1",
      model: "/home/n8n/Qwen3-VL/Qwen3-VL-4B-Instruct",
      apiKey: "EMPTY"
    };

    const defaultPrompt = "请详细描述这张幻灯片的内容，包括标题、正文、图表、图片等所有元素。输出简洁明了，直接给出描述结果。";

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt || defaultPrompt },
              { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
            ]
          }],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`Qwen-VL API error: ${response.status}`);
      }

      const data: any = await response.json();
      if (data && data.choices && data.choices.length > 0) {
        return data.choices[0].message.content.trim();
      }
      return null;
    } catch (error) {
      console.error('[AIService] Built-in Qwen-VL recognition failed:', error);
      return null;
    }
  }

  /**
   * 分析幻灯片内容,生成图片描述和提示词
   * 使用视觉框架和主题系统
   */
  async analyzeSlideForImage(
    slideTitle: string,
    slideContent: string,
    provider: string,
    visualFrameworkId: string = 'auto',
    visualThemeId: string = 'tech_blue_glass'
  ): Promise<{
    description: string;
    suggestedPrompt: string;
    keywords: string[];
    style: string;
    selectedFrameworkId?: string;
  }> {
    // 导入视觉框架和主题常量
    const { VISUAL_FRAMEWORKS } = await import('../constants/visualFrameworks.js');
    const { VISUAL_THEMES } = await import('../constants/visualThemes.js');

    // 获取选中的主题
    const selectedTheme = VISUAL_THEMES.find((t: any) => t.id === visualThemeId) || VISUAL_THEMES[0];
    const selectedFramework = visualFrameworkId !== 'auto' ? VISUAL_FRAMEWORKS.find((f: any) => f.id === visualFrameworkId) : null;

    // --- 步骤 1: 让 AI 分析内容，提取核心实体与文字标签 ---
    const isAutoMode = visualFrameworkId === 'auto';
    
    // 构建框架相关的信息
    let frameworkSection = '';
    let frameworkSelectionTask = '';
    let outputIdLine = '';
    
    if (isAutoMode) {
      // 自动模式：提供框架列表让 AI 选择
      const frameworkList = VISUAL_FRAMEWORKS.map((f: any) => 
        `### ${f.id}\n- 名称: ${f.name} (${f.englishName})\n- 类别: ${f.category}\n- 适用场景: ${f.description}\n- 构图指令 (Composition Instruction): ${f.compositionInstruction}`
      ).join('\n\n');
      
      frameworkSection = `## 可用视觉框架列表\n\n${frameworkList}`;
      frameworkSelectionTask = '2. **选择视觉框架**：从下方的可用框架列表中选择最适合表达该内容的框架。\n';
      outputIdLine = '[ID]: 选中的框架ID\n';
    } else {
      // 指定模式：直接告知框架信息
      const frameworkName = selectedFramework ? `${selectedFramework.name} (${selectedFramework.englishName})` : visualFrameworkId;
      const compositionInstruction = selectedFramework ? selectedFramework.compositionInstruction : '';
      
      frameworkSection = `## 指定的视觉框架\n\n用户已指定使用以下视觉框架，你必须严格遵循：\n- **框架名称**: ${frameworkName}\n- **构图指令**: ${compositionInstruction}`;
    }
    
    // 统一的提示词模板
    const systemPrompt = `你是一位专业的视觉构图专家。请分析文档内容，并完成以下任务：

${frameworkSection}

## 任务要求

1. **提取核心内容**：识别文档中的关键技术实体、流程步骤和核心价值。
${frameworkSelectionTask}${isAutoMode ? '3' : '2'}. **生成内容概括 [SUMMARY]**：用 1-2 句话精炼概括原文的核心主题和要点，这将作为图片生成的内容指引。
${isAutoMode ? '4' : '3'}. **生成画面描述 [DESCRIPTION]**：
   - **【重要】你的描述必须严格遵循${isAutoMode ? '所选' : '指定'}框架的构图指令（Composition Instruction）**
   - 描述中的空间布局、元素位置、视角必须与框架的构图指令一致
   - 将文档中的抽象概念转化为符合框架结构的具体视觉元素
${isAutoMode ? '5' : '4'}. **设计文字标签 [LABELS]**：
   - **核心目标：完整、准确地表达原文的核心内容**
   - 标签数量不固定，根据内容复杂度和框架类型灵活决定（可以是 2-10 个或更多）
   - 标签内容应涵盖原文中的关键概念、步骤名称、技术术语等
   - 如果是流程类框架，需要包含完整的步骤标签
   - 如果是对比类框架，需要包含对比双方的完整标签
   - 如果是层级类框架，需要包含各层级的完整名称
   - **语言要求：必须使用中文**（除 API、AI、CPU 等极其通用的技术缩写外）
   - 为每个标签指定在画面中的位置（位置应符合框架的空间结构）

## 输出格式（严格执行）

${outputIdLine}[SUMMARY]: 用 1-2 句话概括原文的核心主题和要点。
[DESCRIPTION]: 具体的画面描述。**必须严格遵循框架的"构图指令"中描述的空间布局、视角和元素组织方式。**
[LABELS]: 图片中需要出现的文字标签及其位置（位置应根据框架的构图指令和内容逻辑灵活安排）`;

    const userPrompt = `文档标题: ${slideTitle}\n文档内容: ${slideContent}`;
    const aiResponse = await this.generateText(`${systemPrompt}\n\n${userPrompt}`);

    // --- 步骤 2: 解析 AI 响应 ---
    let baseSummary = '';
    let baseDescription = '';
    let baseLabels = '';
    let frameworkId = visualFrameworkId;

    if (visualFrameworkId === 'auto') {
      const matchId = aiResponse.match(/\[ID\]:\s*(.*)/i);
      const matchSummary = aiResponse.match(/\[SUMMARY\]:\s*([\s\S]*?)(?=\[DESCRIPTION\]|$)/i);
      const matchDesc = aiResponse.match(/\[DESCRIPTION\]:\s*([\s\S]*?)(?=\[LABELS\]|$)/i);
      const matchLabels = aiResponse.match(/\[LABELS\]:\s*([\s\S]*)/i);
      if (matchId) frameworkId = matchId[1].trim();
      if (matchSummary) baseSummary = matchSummary[1].trim();
      if (matchDesc) baseDescription = matchDesc[1].trim();
      if (matchLabels) baseLabels = matchLabels[1].trim();
    } else {
      const matchSummary = aiResponse.match(/\[SUMMARY\]:\s*([\s\S]*?)(?=\[DESCRIPTION\]|$)/i);
      const matchDesc = aiResponse.match(/\[DESCRIPTION\]:\s*([\s\S]*?)(?=\[LABELS\]|$)/i);
      const matchLabels = aiResponse.match(/\[LABELS\]:\s*([\s\S]*)/i);
      if (matchSummary) baseSummary = matchSummary[1].trim();
      baseDescription = matchDesc ? matchDesc[1].trim() : aiResponse.trim();
      if (matchLabels) baseLabels = matchLabels[1].trim();
    }

    // 重新获取选中的框架（如果是自动匹配的话）
    const finalFramework = VISUAL_FRAMEWORKS.find((f: any) => f.id === frameworkId) || selectedFramework || VISUAL_FRAMEWORKS[0];

    // --- 步骤 3: 强制追加视觉指令 ---
    const finalPrompt = `
[CONTENT SUMMARY]:
${baseSummary || slideTitle}

[CONTENT SCENE]: 
${baseDescription}

[TEXT LABELS]:
${baseLabels}

[VISUAL FRAMEWORK]: 
${finalFramework.compositionInstruction}

[VISUAL THEME]: 
 Style: ${selectedTheme.promptModifiers}
Negative: ${selectedTheme.negativePrompt}
`.trim();

    return {
      description: baseDescription || slideContent,
      suggestedPrompt: finalPrompt,
      keywords: [slideTitle],
      style: visualThemeId,
      selectedFrameworkId: finalFramework.id
    };
  }

  /**
   * 生成文章
   * customPrompt是前端传入的完整提示词，直接使用
   */
  async generateArticle(
    content: string,
    articleType: string,
    articleStyle: string,
    customPrompt?: string
  ): Promise<string> {
    // 直接使用customPrompt（前端已经构建好完整提示词，包含了{{PPT_TITLE}}等变量）
    if (!customPrompt) {
      throw new Error('customPrompt is required for article generation');
    }

    return await this.generateText(customPrompt);
  }

  /**
   * 生成演讲稿（和n8n Python脚本保持一致）
   */
  async generateSpeech(
    title: string,
    content: string,
    notes: string
  ): Promise<string> {
    const prompt = `
你是一位顶级的演讲文稿撰写专家。
这是PPT第 1 页上的所有文字内容，由不同文本框和表格单元格拼接而成：
---
${content}
---
请根据这些内容，为这一页生成一段大约100-150字的、自然流畅、专业且引人入胜的演讲稿（内容较多的字数最多可以到300字）。
请直接输出演讲稿文本，不要包含"好的，这是您的演讲稿："等多余的前言或结语。
`;

    return await this.generateText(prompt);
  }

  /**
   * 从长文中提炼可视化场景 (Scene Extraction)
   */

}

/**
 * 获取AI服务实例
 */
export const getAIService = (
  provider: string,
  apiKey: string,
  model: string,
  baseUrl?: string
): AIService => {
  return new AIService({
    provider: provider as AIProvider,
    apiKey,
    model,
    baseUrl
  });
};
