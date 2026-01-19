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
    let systemPrompt = '';
    const taskGuideline = `你是一位专业的视觉构图专家。请分析文档内容，并完成以下任务：
1. **提取核心内容**：识别文档中的关键技术实体、流程步骤和核心价值。
2. **设计文字标签 (Text Labels)**：从内容中选择 3-5 个最重要的关键词，并指定它们应该出现在画面中的哪个位置。
   - **语言要求：必须使用中文**（除 API、AI、CPU 等极其通用的技术缩写外）。
3. **转化为具体描述**：将文字转化为可被描绘的画面细节。`;

    if (visualFrameworkId === 'auto') {
      const frameworkList = VISUAL_FRAMEWORKS.map((f: any) => `- ${f.id}: ${f.name} - ${f.description}`).join('\n');
      systemPrompt = `${taskGuideline}

4. **选择视觉框架**：从以下列表中选择一个最适合的框架 ID。

可用框架列表：
${frameworkList}

输出格式（严格执行）：
[ID]: 选中的框架ID
[DESCRIPTION]: 具体的画面描述（视角、主体元素、逻辑交互）
[LABELS]: 图片中需要出现的中文/英文文字标签及其位置`;
    } else {
      systemPrompt = `${taskGuideline}

输出格式（严格执行）：
[DESCRIPTION]: 具体的画面描述（主体元素、逻辑交互）
[LABELS]: 图片中需要出现的中文/英文文字标签及其位置`;
    }

    const userPrompt = `文档标题: ${slideTitle}\n文档内容: ${slideContent}`;
    const aiResponse = await this.generateText(`${systemPrompt}\n\n${userPrompt}`);

    // --- 步骤 2: 解析 AI 响应 ---
    let baseDescription = '';
    let baseLabels = '';
    let frameworkId = visualFrameworkId;

    if (visualFrameworkId === 'auto') {
      const matchId = aiResponse.match(/\[ID\]:\s*(.*)/i);
      const matchDesc = aiResponse.match(/\[DESCRIPTION\]:\s*([\s\S]*?)(?=\[LABELS\]|$)/i);
      const matchLabels = aiResponse.match(/\[LABELS\]:\s*([\s\S]*)/i);
      if (matchId) frameworkId = matchId[1].trim();
      if (matchDesc) baseDescription = matchDesc[1].trim();
      if (matchLabels) baseLabels = matchLabels[1].trim();
    } else {
      const matchDesc = aiResponse.match(/\[DESCRIPTION\]:\s*([\s\S]*?)(?=\[LABELS\]|$)/i);
      const matchLabels = aiResponse.match(/\[LABELS\]:\s*([\s\S]*)/i);
      baseDescription = matchDesc ? matchDesc[1].trim() : aiResponse.trim();
      if (matchLabels) baseLabels = matchLabels[1].trim();
    }

    // 重新获取选中的框架（如果是自动匹配的话）
    const finalFramework = VISUAL_FRAMEWORKS.find((f: any) => f.id === frameworkId) || selectedFramework || VISUAL_FRAMEWORKS[0];

    // --- 步骤 3: 强制追加视觉指令 ---
    const finalPrompt = `
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
