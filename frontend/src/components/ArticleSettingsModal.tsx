import React, { useState, useEffect } from 'react';
import { promptTemplates } from '../utils/promptTemplates';

interface ArticleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (settings: ArticleSettings) => void;
  defaultSettings?: Partial<ArticleSettings>;
}

export interface ArticleSettings {
  articleType: string;
  articleStyle: string;
  customPrompt: string;
}



const ArticleSettingsModal: React.FC<ArticleSettingsModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  defaultSettings = {} as Partial<ArticleSettings>
}) => {
  const [articleType, setArticleType] = useState<string>(defaultSettings.articleType || 'comprehensive');
  const [articleStyle, setArticleStyle] = useState<string>(defaultSettings.articleStyle || 'wechat');
  const [customPrompt, setCustomPrompt] = useState<string>(defaultSettings.customPrompt || '');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  // 帮助提示状态管理
  const [showStyleTooltip, setShowStyleTooltip] = useState<boolean>(false);
  const [showTypeTooltip, setShowTypeTooltip] = useState<boolean>(false);
  const [showPromptTooltip, setShowPromptTooltip] = useState<boolean>(false);

  // 更新提示词模板
  const updatePromptTemplate = () => {
    if (promptTemplates[articleStyle] && promptTemplates[articleStyle][articleType]) {
      setCustomPrompt(promptTemplates[articleStyle][articleType]);
    }
  };

  // 当文章风格或类型变化时更新提示词
  useEffect(() => {
    updatePromptTemplate();
  }, [articleType, articleStyle, promptTemplates]);

  // Reset form when modal opens with new default settings
  useEffect(() => {
    if (isOpen) {
      setArticleType(defaultSettings.articleType || 'comprehensive');
      setArticleStyle(defaultSettings.articleStyle || 'wechat');
      setIsGenerating(false);
    }
  }, [isOpen, defaultSettings]);

  // 当初始值设置完成后更新提示词
  useEffect(() => {
    updatePromptTemplate();
  }, [defaultSettings.articleType, defaultSettings.articleStyle]);

  // Handle generate button click
  const handleGenerate = () => {
    setIsGenerating(true);
    onGenerate({
      articleType,
      articleStyle,
      customPrompt
    });
    onClose();
  };

  // If modal is not open, render nothing
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-3xl text-white">
        <h2 className="text-2xl font-bold mb-6">文章生成设置</h2>
        
        <div className="space-y-6">
          {/* Article Style */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
              文章风格
              <div className="help-icon ml-2 relative inline-block">
                <span 
                  className="cursor-help flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold ml-2 transition-all duration-300 hover:bg-blue-700 hover:scale-110"
                  onMouseEnter={() => setShowStyleTooltip(true)}
                  onMouseLeave={() => setShowStyleTooltip(false)}
                >
                  ?
                </span>
                <div className={`tooltip absolute right-0 bottom-full mb-2 w-64 bg-gray-900 text-gray-200 text-xs rounded p-2 shadow-lg transition-all duration-200 z-10 ${
                  showStyleTooltip ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}>
                  选择文章发布平台的风格，不同平台有不同的写作规范和语言风格
                </div>
              </div>
            </label>
            <div className="custom-select-wrapper">
              <select 
                value={articleStyle} 
                onChange={(e) => setArticleStyle(e.target.value)} 
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white custom-select"
              >
                <option value="wechat">微信公众号 - 专业深度，适合长文阅读</option>
                <option value="xiaohongshu">小红书 - 生活化，图文并茂，种草推荐</option>
                <option value="weibo">微博 - 简洁有力，话题性强，易传播</option>
                <option value="zhihu">知乎 - 理性分析，专业解答，深度思考</option>
                <option value="douyin">抖音 - 短视频脚本，节奏紧凑，吸引眼球</option>
                <option value="bilibili">B站 - 年轻化，互动性强，知识分享</option>
              </select>
            </div>
          </div>

          {/* Article Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
              文章类型
              <div className="help-icon ml-2 relative inline-block">
                <span 
                  className="cursor-help flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold ml-2 transition-all duration-300 hover:bg-blue-700 hover:scale-110"
                  onMouseEnter={() => setShowTypeTooltip(true)}
                  onMouseLeave={() => setShowTypeTooltip(false)}
                >
                  ?
                </span>
                <div className={`tooltip absolute right-0 bottom-full mb-2 w-64 bg-gray-900 text-gray-200 text-xs rounded p-2 shadow-lg transition-all duration-200 z-10 ${
                  showTypeTooltip ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}>
                  选择文章类型，不同类型的字数和深度要求不同
                </div>
              </div>
            </label>
            <div className="custom-select-wrapper">
              <select 
                value={articleType} 
                onChange={(e) => setArticleType(e.target.value)} 
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white custom-select"
              >
                <option value="comprehensive">综合文章 - 平衡内容深度和可读性，适合大多数场景 (1500-2000字)</option>
                <option value="summary">摘要文章 - 简洁明了，适合快速阅读和分享 (800-1200字)</option>
                <option value="detailed">详细文章 - 深度分析，适合专业内容和技术文章 (2000-3000字)</option>
                <option value="marketing">营销文章 - 突出卖点，适合产品推广和营销 (1000-1500字)</option>
              </select>
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
              提示词编辑器
              <div className="help-icon ml-2 relative inline-block">
                <span 
                  className="cursor-help flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold ml-2 transition-all duration-300 hover:bg-blue-700 hover:scale-110"
                  onMouseEnter={() => setShowPromptTooltip(true)}
                  onMouseLeave={() => setShowPromptTooltip(false)}
                >
                  ?
                </span>
                <div className={`tooltip absolute right-0 bottom-full mb-2 w-64 bg-gray-900 text-gray-200 text-xs rounded p-2 shadow-lg transition-all duration-200 z-10 ${
                  showPromptTooltip ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}>
                  您可以在此编辑AI生成文章的提示词，修改后将按照您的要求生成文章
                </div>
              </div>
            </label>
            <textarea 
              value={customPrompt} 
              onChange={(e) => setCustomPrompt(e.target.value)} 
              className="w-full h-[600px] px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm resize-vertical font-mono"
              placeholder="选择文章类型后会自动填充默认提示词，您可以在此基础上修改..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
            disabled={isGenerating}
          >
            <span>❌ 取消</span>
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-3 bg-secondary hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
            disabled={isGenerating}
          >
            <span>{isGenerating ? '⏳ 生成中...' : '🚀 确认生成'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticleSettingsModal;