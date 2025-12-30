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
   * 分析幻灯片内容,生成图片描述和提示词（和n8n Python脚本保持一致）
   */
  async analyzeSlideForImage(
    slideTitle: string,
    slideContent: string,
    provider: string
  ): Promise<{
    description: string;
    suggestedPrompt: string;
    keywords: string[];
    style: string;
  }> {
    // 定义不同类型的专属强指令（和Python脚本保持一致）
    const typeInstructions = `
1. **逻辑架构图 (Logical Architecture)**
   - 构图：2.5D等轴测 (Isometric View)，模块化堆叠。
   - 适用：系统分层、模块组成、架构设计。
   - 视觉：底部基础设施，中间平台服务，顶部应用场景。

2. **业务流程图 (Business Process)**
   - 构图：2D扁平化，严格从左到右 (Left-to-Right)。
   - 适用：操作步骤、数据流转、业务闭环。
   - 视觉：输入源 -> 处理引擎 -> 输出结果，用箭头连接。

3. **网络拓扑图 (Network Topology)**
   - 构图：广角俯视 (Top-down)，星系分布或网状。
   - 适用：节点部署、多地多中心、互联互通。
   - 视觉：核心节点向周边辐射，强调连接线。

4. **数据可视化 (Data Visualization)**
   - 构图：正视UI界面 (Screen Mockup)，仪表盘布局。
   - 适用：数据统计、趋势分析、监控大屏。
   - 视觉：柱状图、折线图、KPI卡片，不要画实物。

5. **产品路线图 (Roadmap)**
   - 构图：2D水平时间轴 (Timeline)。
   - 适用：版本规划、发展历程、演进阶段。
   - 视觉：主轴线上分布里程碑节点。

6. **封面/通用页 (Cover/General)**
   - 构图：极简留白，抽象几何背景，中心化排版。
   - 适用：封面、目录、过渡页、纯文字总结。
   - 视觉：大气的主题背景 (Key Visual)，品牌色光影，无具体技术细节。
`;

    const prompt = `
你是一位专注【私有云/B端软件产品】的资深技术分析师和视觉设计师。
你的任务是将PPT内容转化为**深度理解后的技术描述**和**结构化图解提示词**。

<slide_content>
<title>${slideTitle}</title>
<content>${slideContent}</content>
</slide_content>

<task>
【步骤 1：判断页面性质与内容理解】
请先判断这张PPT的性质（是封面？目录？还是正文？）。
- **如果是封面/目录/过渡页**：请侧重描述**视觉氛围**和**品牌调性**。严禁脑补具体的技术架构细节！不要因为标题里有"存算分离"就去画存储架构图，这只是一张封面。
- **如果是正文内容页**：请像分析师一样拆解逻辑，识别技术实体（组件）、逻辑行为（关系）和核心诉求（价值）。

【步骤 2：智能分类】
根据页面性质，从以下6种类型中选择最匹配的一种：
${typeInstructions}

【步骤 3：生成结构化提示词】
基于你的深度理解，进行视觉建模，严格执行以下要求。
</task>

<design_guidelines>
<composition_principles>
- 根据内容自动设计最完美的构图
- 重点突出核心概念，避免信息过载
- 使用装饰性元素填补空白，保持画面平衡
- 避免过度拥挤或过度留白
</composition_principles>

<text_rendering_rules>
【核心原则】
- 如需渲染文字，不重不漏地包含所有关键信息
- 保持原文的逻辑层次和重点强调

【格式规范】
- 禁止使用markdown格式符号（如 # * - 等）
- 标题使用字号和粗细区分，不添加符号
- 列表项使用缩进组织，不添加项目符号

【内容限制】
- 保留技术缩写的英文形式（API、HTTP、JSON、Cloud、DB、SaaS、PaaS、IaaS等）
- 其他标签和说明文字使用中文
- 如果无法保证汉字清晰，生成空白文本框，不要生成乱码英文
</text_rendering_rules>

<quality_standards>
- 视觉重心突出，主体明确
- 元素分布均衡，有呼吸感
- 引导线清晰，逻辑流畅
- 符合阅读习惯（从左到右，从上到下）
- 专业商务PPT风格，简洁现代
</quality_standards>
</design_guidelines>

<output_format>
请返回一个标准的JSON对象：
{
  "description": "深度技术转译结果。如果是封面，请描述'大气、专业的开场视觉'；如果是正文，请详细描述业务逻辑",
  "identifiedType": "从上述6种类型中选择其一（如：封面/通用页）",
  "suggestedPrompt": "结构化提示词，包含：1.场景构图 2.核心组件 3.逻辑交互 4.文本标签 5.视觉风格"
}
`;

    const response = await this.generateText(prompt);

    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          description: result.description || slideContent,
          suggestedPrompt: result.suggestedPrompt || `${slideTitle}, flat vector illustration, minimalist design`,
          keywords: [slideTitle],
          style: result.identifiedType || 'flat'
        };
      }
      throw new Error('No JSON found in response');
    } catch (error: any) {
      // 如果解析失败,返回默认值
      return {
        description: slideContent,
        suggestedPrompt: `关于 ${slideTitle} 的逻辑图表, 科技风格, 结构化信息图表, 专业产品文档插图, 扁平化设计, 几何构图, 清晰的逻辑线条, 商务色调, 适合PPT展示, 无文字标签`,
        keywords: [slideTitle],
        style: 'flat'
      };
    }
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
