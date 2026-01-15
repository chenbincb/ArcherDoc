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
   * 分析幻灯片内容,生成图片描述和提示词（统一前后端逻辑）
   * 完整迁移自前端 generateSmartPrompt 函数
   */
  async analyzeSlideForImage(
    slideTitle: string,
    slideContent: string,
    provider: string,
    imageStyle?: string,
    contentType?: string
  ): Promise<{
    description: string;
    suggestedPrompt: string;
    keywords: string[];
    style: string;
  }> {
    // 【终极重构】不同内容类型的专属构图指令库
    // 结合了：私有云背景、严格的视角锁定、具体的IT隐喻
    const typeInstructions: Record<string, string> = {
      '逻辑架构图': `
【强制构图：逻辑架构 (Logical Architecture)】
1. **核心视角**：**2.5D等轴测 (Isometric View)**。
2. **布局隐喻**：**模块化堆叠 (Modular Stacking)**。
   - 就像搭建精密的主板或城市建筑。
   - **底部**：IaaS层（服务器机柜、存储阵列）。
   - **中间**：PaaS层（六边形服务模块、API网关）。
   - **顶部**：SaaS层（悬浮的应用窗口、用户终端）。
3. **逻辑表现**：用半透明的玻璃层板区分不同层级，模块之间要有垂直的连接线。
4. **🚫 禁止**：禁止画成平面的流程图，禁止画成球体。`,

      '业务流程图': `
【强制构图：业务流程 (Business Process)】
1. **核心视角**：**2D 扁平化 (Flat Vector)** 或 **微倾斜视角**。
2. **布局隐喻**：**工业流水线 (Pipeline)** 或 **泳道图 (Swimlane)**。
   - **布局方向**：严格的**从左到右 (Left-to-Right)**。
   - **左侧**：输入源（文件图标、原始数据块）。
   - **中间**：处理引擎（齿轮、漏斗、芯片）。
   - **右侧**：输出物（报表、成品图标）。
3. **逻辑表现**：必须有明显的**指引箭头 (Directional Arrows)** 连接各环节。
4. **🚫 禁止**：禁止画成循环的圆圈，禁止画成复杂的3D建筑。`,

      '网络拓扑图': `
【强制构图：网络拓扑 (Network Topology)】
1. **核心视角**：**广角俯视 (Top-down Wide Angle)**。
2. **布局隐喻**：**星系分布 (Constellation)** 或 **城市交通网**。
   - **中心**：核心数据中心（大型主机图标）。
   - **周边**：边缘节点、终端设备、云资源池。
3. **逻辑表现**：强调**连接线 (Connectivity)**，用发光的线条连接分散的节点。
4. **🚫 禁止**：禁止画成单一的物体，必须是分散的、多节点的。`,

      '数据可视化': `
【强制构图：数据可视化 (Data Visualization)】
1. **核心视角**：**正视 UI 界面 (Front-facing UI)**。
2. **布局隐喻**：**管理驾驶舱 (Management Dashboard)**。
   - 画面主体必须是一个**高保真的屏幕界面 (Screen Mockup)**。
   - 包含：动态折线图、环形占比图、关键指标卡片(KPI Cards)。
3. **逻辑表现**：通过图表的高低起伏体现数据的变化趋势。
4. **🚫 禁止**：禁止画实物场景，必须是屏幕上的软件界面。`,

      '产品路线图': `
【强制构图：产品路线图 (Roadmap)】
1. **核心视角**：**2D 水平展开 (Horizontal)**。
2. **布局隐喻**：**时间轴 (Timeline) 或 甘特图**。
   - 一条清晰的主轴线贯穿画面左右。
   - 轴线上分布着里程碑节点 (Milestones) 和旗帜标记。
3. **逻辑表现**：用颜色的深浅或节点的点亮状态表示"已完成"和"规划中"。
4. **🚫 禁止**：禁止画成复杂的网络结构。`,

      '功能对比图': `
【强制构图：对比分析 (Comparison)】
1. **核心视角**：**分屏对比 (Split Screen)**。
2. **布局隐喻**：**天平 (Scale)** 或 **镜像 (Mirror)**。
   - 画面被垂直分割为左右两部分。
   - **左侧**：传统模式（灰暗、复杂、杂乱）。
   - **右侧**：新产品模式（明亮、整洁、高效）。
3. **逻辑表现**：通过强烈的视觉反差（颜色、繁简）来突显产品优势。`,

      '封面/通用页': `
【强制构图：封面/通用 (Cover/General)】
1. **核心视角**：**正视平面设计 (Flat Graphic Design)**。
2. **布局隐喻**：**极简主义海报 (Minimalist Poster)**。
   - **背景**：深色科技感渐变、抽象几何线条、品牌色光影。
   - **主体**：留白为主，**中心区域**预留给标题文字（AI生成空白文本框）。
3. **逻辑表现**：不展示具体技术细节，只传达"大气、专业、信赖"的品牌调性。
4. **🚫 禁止**：禁止画具体的服务器、架构图或流程图！`,

      '自动识别': `
【智能判断模式】
请先阅读PPT内容，分析其最核心的逻辑，然后**必须**从上述6种模式中选择一种最匹配的：
- 讲架构/层级 -> 选"逻辑架构图"
- 讲流程/步骤 -> 选"业务流程图"
- 讲节点/连接 -> 选"网络拓扑图"
- 讲数据/监控 -> 选"数据可视化"
- 讲规划/时间 -> 选"产品路线图"
- 封面/目录/纯文字 -> 选"封面/通用页"`
    };

    // 获取当前类型的专属指令，如果没有匹配则默认使用自动识别
    const selectedInstruction = typeInstructions[contentType || ''] || typeInstructions['自动识别'];
    const effectiveStyle = imageStyle || '科技风格';

    const prompt = `你是一位专注【私有云/B端软件产品】的资深视觉设计师。
你的任务是将PPT文字转化为**功能性、结构化、符合行业标准的图解**。

<slide_content>
<title>${slideTitle}</title>
<content>${slideContent}</content>
</slide_content>

<business_context>
<industry>请根据文档内容自动识别所属行业领域</industry>
<purpose>专业文档配图</purpose>
<style>${effectiveStyle} (保持专业、干净、高信噪比)</style>
</business_context>

<task>
【步骤 1：判断页面性质与内容理解】
请先判断这张PPT的性质（是封面？目录？还是正文？）。
- **如果是封面/目录/过渡页**：请侧重描述**视觉氛围**和**品牌调性**。严禁脑补具体的技术架构细节！不要因为标题里有关键词就去画复杂的架构图，这只是一张封面，需要的是大气、简约的背景。
- **如果是正文内容页**：请像分析师一样拆解逻辑，识别技术实体（组件）、逻辑行为（关系）和核心诉求（价值）。

【步骤 2：智能分类】
${selectedInstruction}

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

<visual_translation_strategy>
- （仅针对正文页）不能只画通用的方块，必须根据文档实际内容提取关键概念，并转化为与之匹配的具象化视觉元素
- （如果是封面页）保持背景的简洁与留白
</visual_translation_strategy>

<text_rendering_rules>
【核心原则】
- 如需渲染文字，不重不漏地包含所有关键信息
- 保持原文的逻辑层次和重点强调

【格式规范】
- 禁止使用markdown格式符号（如 # * - 等）
- 标题使用字号和粗细区分，不添加符号
- 列表项使用缩进组织，不添加项目符号

【内容限制】
- 保留技术缩写的英文形式（API、CPU、Cloud、DB、SaaS、PaaS、IaaS等）
- 其他标签和说明文字使用中文
- 如果无法保证汉字清晰，生成空白文本框，不要生成乱码英文

【质量标准】
- 视觉重心突出，主体明确
- 元素分布均衡，有呼吸感
- 引导线清晰，逻辑流畅
- 符合阅读习惯（从左到右，从上到下）
- 专业商务PPT风格，简洁现代
</text_rendering_rules>
</design_guidelines>

<output_format>
以下5个模块供参考，请根据内容选择适合的模块输出（不必全部填写，只输出有意义的部分）：

1. **[场景构图]**：(如果是封面，描述大气背景和留白；如果是正文，描述视角和布局)
2. **[核心元素]**：描述画面中的主体视觉元素
3. **[逻辑交互]**：如有需要，描述元素之间的关系和连接
4. **[文本标签]**：如有需要，指定中文标签内容
5. **[视觉风格]**：${effectiveStyle}相关的风格描述

请直接输出画面描述，不要包含JSON格式。
</output_format>`;

    const response = await this.generateText(prompt);

    // 直接返回AI生成的提示词，不再尝试解析JSON
    const generatedPrompt = response.trim();
    
    if (generatedPrompt && generatedPrompt.length > 10) {
      return {
        description: slideContent,
        suggestedPrompt: generatedPrompt,
        keywords: [slideTitle],
        style: contentType || 'flat'
      };
    }

    // 如果生成失败，返回默认值
    return {
      description: slideContent,
      suggestedPrompt: `关于 ${slideTitle} 的逻辑图表, ${effectiveStyle}, 结构化信息图表, 专业产品文档插图, 扁平化设计, 几何构图, 清晰的逻辑线条, 商务色调, 适合PPT展示, 无文字标签`,
      keywords: [slideTitle],
      style: 'flat'
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
