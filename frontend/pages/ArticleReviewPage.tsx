import React, { useState, useEffect, useRef } from 'react';
import { MagicTextDisplay } from '../components/MagicTextDisplay';
import { AppSettings } from '../types';
import { promptTemplates } from '../utils/promptTemplates';
import { marked } from 'marked';
import { DEFAULT_SETTINGS, N8N_CONFIG, API_ENDPOINTS } from '../constants';

interface ArticleReviewPageProps {
  articleJobId: string;
  onOpenSettings?: () => void;
  settings?: AppSettings;
  onSaveSettings?: (newSettings: AppSettings) => void;
}

const ArticleReviewPage: React.FC<ArticleReviewPageProps> = ({
  articleJobId,
  onOpenSettings,
  settings: externalSettings,
  onSaveSettings: externalSaveSettings
}) => {
  // Use external settings if provided, otherwise use local state
  const [internalSettings, setInternalSettings] = useState<AppSettings>(() => {
    const savedSettings = localStorage.getItem('archerdoc-ai-settings-v1');
    return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
  });

  const appSettings = externalSettings || internalSettings;

  const [articleData, setArticleData] = useState<any>(null);
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [articleContent, setArticleContent] = useState<string>('');
  const [articleHtml, setArticleHtml] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isGeneratingNew, setIsGeneratingNew] = useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<string>('loading');
  const [processingDetail, setProcessingDetail] = useState<string>('正在加载文章数据...');
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Article generation settings
  const [articleStyle, setArticleStyle] = useState<string>('wechat');
  const [articleType, setArticleType] = useState<string>('comprehensive');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [refinePrompt, setRefinePrompt] = useState<string>('');

  // Form visibility states
  const [showRegenerateForm, setShowRegenerateForm] = useState<boolean>(false);
  const [showRefineForm, setShowRefineForm] = useState<boolean>(false);
  const [showExportDialog, setShowExportDialog] = useState<boolean>(false);
  const [exportData, setExportData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [formStatusMessage, setFormStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add log message
  const addLog = (msg: string) => {
    setLogs(prev => {
      const newLogs = [...prev, msg];
      if (newLogs.length > 8) newLogs.shift();
      return newLogs;
    });
  };

  // Show notification
  const showNotification = (message: string, type: 'success' | 'error' = 'error') => {
    setFormStatusMessage({ text: message, type });
    setTimeout(() => setFormStatusMessage(null), 3000);
  };

  // Handle settings save
  const handleSaveSettings = (newSettings: AppSettings) => {
    if (externalSaveSettings) {
      externalSaveSettings(newSettings);
    } else {
      setInternalSettings(newSettings);
      localStorage.setItem('archerdoc-ai-settings-v1', JSON.stringify(newSettings));
    }
  };

  // Fetch article data from backend
  const fetchArticleData = async () => {
    try {
      setCurrentStatus('loading');
      setProcessingDetail('正在获取文章数据...');
      setProgress(20);
      addLog('正在获取文章数据...');

      const response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}/get-article-data?jobId=${articleJobId}`);

      if (!response.ok) {
        throw new Error(`获取文章数据失败: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('完整返回数据:', responseData);
      const data = responseData.data || responseData; // 处理双层data结构或直接data结构
      console.log('实际数据:', data);
      console.log('文章内容:', data.article?.content);

      const content = data.article?.content || '';
      const html = marked.parse(content);

      setArticleData(data);

      // 从文章内容中提取标题
      let extractedTitle = data.article?.title || '';

      // 如果没有标题字段，从文章内容中提取
      if (!extractedTitle && content) {
        // 查找Markdown格式的标题（如# 标题，## 标题等）
        const titleMatch = content.match(/^#{1,6}\s+(.+)$/m);
        if (titleMatch && titleMatch[1]) {
          extractedTitle = titleMatch[1].trim();
        } else {
          // 如果没有Markdown标题，使用第一行作为标题
          const firstLine = content.split('\n')[0].trim();
          if (firstLine) {
            extractedTitle = firstLine;
          }
        }
      }

      // 最后使用PPT标题或默认标题作为后备
      const finalTitle = extractedTitle || data.source?.ppt_title || '未命名文章';
      setArticleTitle(finalTitle);

      setArticleContent(content);
      setArticleHtml(html);
      setWordCount(data.article?.word_count || 0);
      setProcessingDetail('文章加载完成');
      setProgress(100);
      setCurrentStatus('loaded');
      addLog('文章数据加载成功');
      addLog(`文章内容长度: ${content.length} 字符`);

      // Initialize custom prompt with template based on article style and type
      updatePromptTemplate();
    } catch (error: any) {
      setCurrentStatus('error');
      setProcessingDetail(`加载失败: ${error.message}`);
      addLog(`错误: ${error.message}`);
      showNotification(`文章加载失败: ${error.message}`);
    }
  };

  // Update prompt template when article style or type changes
  const updatePromptTemplate = () => {
    if (promptTemplates[articleStyle] && promptTemplates[articleStyle][articleType]) {
      setCustomPrompt(promptTemplates[articleStyle][articleType]);
    }
  };

  // Generate new article with different settings
  const generateNewArticle = async () => {
    try {
      setIsGeneratingNew(true);
      setCurrentStatus('generating');
      setProcessingDetail('正在生成新文章...');
      setProgress(10);
      addLog('正在生成新文章...');

      // Get AI settings from localStorage
      const savedSettings = localStorage.getItem('archerdoc-ai-settings-v1');
      const settings = savedSettings ? JSON.parse(savedSettings) : {
        activeProvider: 'vLLM',
        configs: {
          'vLLM': {
            apiKey: 'EMPTY',
            model: '/home/n8n/Qwen3-VL/Qwen3-VL-4B-Instruct',
            baseUrl: 'http://178.109.129.11:8008/v1'
          }
        }
      };
      const activeProvider = settings.activeProvider;
      const aiConfig = settings.configs[activeProvider];

      const formData = new FormData();
      formData.append('jobId', articleJobId);
      formData.append('articleStyle', articleStyle);
      formData.append('articleType', articleType);
      formData.append('customPrompt', customPrompt);
      formData.append('aiProvider', activeProvider);
      formData.append('aiModel', aiConfig.model || '');
      formData.append('aiApiKey', aiConfig.apiKey || '');
      formData.append('aiBaseUrl', aiConfig.baseUrl || '');

      const response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.WEBHOOK_PATH}/regenerate-article`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`生成新文章失败: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // 重新获取文章数据，而不是跳转到n8n服务器的预览页面
        await fetchArticleData();
        setShowRegenerateForm(false);
        setIsGeneratingNew(false);
        showNotification('文章重新生成成功！', 'success');
      } else {
        throw new Error(result.message || '生成失败，请重试');
      }
    } catch (error: any) {
      setCurrentStatus('error');
      setProcessingDetail(`生成失败: ${error.message}`);
      setIsGeneratingNew(false);
      addLog(`错误: ${error.message}`);
      showNotification(`生成新文章失败: ${error.message}`);
    }
  };

  // Refine current article
  const refineArticle = async () => {
    try {
      setIsGeneratingNew(true);
      setCurrentStatus('generating');
      setProcessingDetail('正在微调文章...');
      setProgress(10);
      addLog('正在微调文章...');

      // Get AI settings from localStorage
      const savedSettings = localStorage.getItem('archerdoc-ai-settings-v1');
      const settings = savedSettings ? JSON.parse(savedSettings) : {
        activeProvider: 'vLLM',
        configs: {
          'vLLM': {
            apiKey: 'EMPTY',
            model: '/home/n8n/Qwen3-VL/Qwen3-VL-4B-Instruct',
            baseUrl: 'http://178.109.129.11:8008/v1'
          }
        }
      };
      const activeProvider = settings.activeProvider;
      const aiConfig = settings.configs[activeProvider];

      const formData = new FormData();
      formData.append('jobId', articleJobId);
      formData.append('customPrompt', refinePrompt); // 将refinePrompt作为customPrompt传递
      formData.append('existingArticle', articleContent);
      formData.append('aiProvider', activeProvider);
      formData.append('aiModel', aiConfig.model || '');
      formData.append('aiApiKey', aiConfig.apiKey || '');
      formData.append('aiBaseUrl', aiConfig.baseUrl || '');

      const response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.WEBHOOK_PATH}/regenerate-article`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`微调文章失败: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // 重新获取文章数据，而不是跳转到n8n服务器的预览页面
        await fetchArticleData();
        setShowRefineForm(false);
        setIsGeneratingNew(false);
        showNotification('文章微调成功！', 'success');
      } else {
        throw new Error(result.message || '微调失败，请重试');
      }
    } catch (error: any) {
      setCurrentStatus('error');
      setProcessingDetail(`微调失败: ${error.message}`);
      setIsGeneratingNew(false);
      addLog(`错误: ${error.message}`);
      showNotification(`微调文章失败: ${error.message}`);
    }
  };

  // Save edited article
  const saveEditedArticle = async () => {
    try {
      addLog('正在保存文章...');
      setIsEditing(false);

      const response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}${API_ENDPOINTS.SAVE_CONTENT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contentType: 'article',
          jobId: articleJobId,
          content: articleContent
        })
      });

      if (!response.ok) {
        throw new Error(`保存失败: ${response.statusText}`);
      }

      let result;
      const contentType = response.headers.get('content-type');

      // 先尝试获取文本响应，如果需要JSON再解析
      const textResponse = await response.text();
      console.log('服务器响应内容:', textResponse);

      if (textResponse.trim() === '') {
        throw new Error('服务器返回空响应');
      }

      try {
        result = JSON.parse(textResponse);
      } catch (jsonError) {
        console.error('JSON解析失败，原始响应:', textResponse);
        throw new Error(`服务器响应格式错误: ${textResponse.substring(0, 200)}...`);
      }

      addLog('文章已保存到服务器');
      showNotification('文章保存成功', 'success');
      console.log('Article saved successfully:', result);

    } catch (error: any) {
      setIsEditing(true); // 恢复编辑状态
      addLog(`保存失败: ${error.message}`);
      showNotification(`保存文章失败: ${error.message}`, 'error');
      console.error('Failed to save article:', error);
    }
  };

  // Export article
  const exportArticle = async () => {
    try {
      addLog('正在导出文章...');
      setIsExporting(true);

      const response = await fetch(`${N8N_CONFIG.BASE_URL}${N8N_CONFIG.API_PATH}${API_ENDPOINTS.EXPORT_CONTENT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contentType: 'article',
          jobId: articleJobId,
          content: articleContent
        })
      });

      if (!response.ok) {
        throw new Error(`导出失败: ${response.statusText}`);
      }

      let result;

      const textResponse = await response.text();
      console.log('服务器响应内容:', textResponse);

      if (textResponse.trim() === '') {
        throw new Error('服务器返回空响应');
      }

      try {
        result = JSON.parse(textResponse);
      } catch (jsonError) {
        console.error('JSON解析失败，原始响应:', textResponse);
        throw new Error(`服务器响应格式错误: ${textResponse.substring(0, 200)}...`);
      }

      if (result.success) {
        addLog('文章导出成功，显示下载选项...');
        showNotification('文章导出成功', 'success');
        setExportData(result);
        setShowExportDialog(true);
      } else {
        throw new Error(result.message || '导出失败');
      }

    } catch (error: any) {
      addLog(`导出失败: ${error.message}`);
      showNotification(`导出文章失败: ${error.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Download specific format
  const downloadFormat = async (format: string) => {
    if (!exportData || !articleJobId) return;

    try {
      // 根据内容类型和格式确定文件名
      let fileName;
      if (exportData.contentType === 'article') {
        fileName = `article.${format}`;
      } else {
        fileName = `notes.${format}`;
      }

      // 直接调用DownloadManager的webhook URL
      const fullUrl = `${N8N_CONFIG.BASE_URL}${N8N_CONFIG.WEBHOOK_PATH}/download-file-webhook/api/download-file/${articleJobId}/${fileName}`;

      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // 根据格式设置下载文件名
      const downloadFileName = `${articleTitle || 'article'}.${format}`;
      a.download = downloadFileName;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addLog(`已下载 ${format} 格式`);
    } catch (error: any) {
      showNotification(`下载失败: ${error.message}`, 'error');
    }
  };

  // Close export dialog
  const closeExportDialog = () => {
    setShowExportDialog(false);
    setExportData(null);
  };


  // Load article data on component mount
  useEffect(() => {
    fetchArticleData();
  }, [articleJobId]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Update prompt template when article style or type changes
  useEffect(() => {
    updatePromptTemplate();
  }, [articleStyle, articleType]);

  return (
    <div className="min-h-screen bg-dark text-gray-100 font-sans selection:bg-primary selection:text-white">
      <style>{`
        /* Markdown Styles */
        .article-content {
          & h1 {
            font-size: 2rem;
            font-weight: 800;
            margin: 1.5rem 0 1rem;
            color: #ffffff;
            line-height: 1.3;
          }
          
          & h2 {
            font-size: 1.75rem;
            font-weight: 700;
            margin: 1.25rem 0 0.75rem;
            color: #ffffff;
            line-height: 1.4;
          }
          
          & h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 1rem 0 0.5rem;
            color: #ffffff;
            line-height: 1.5;
          }
          
          & h4 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0.75rem 0 0.5rem;
            color: #ffffff;
            line-height: 1.6;
          }
          
          & p {
            margin: 0.75rem 0;
            color: #e0e0e0;
            line-height: 1.8;
          }
          
          & a {
            color: #4f46e5;
            text-decoration: none;
            transition: all 0.2s ease;
          }
          
          & a:hover {
            color: #4338ca;
            text-decoration: underline;
          }
          
          & ul, & ol {
            margin: 0.75rem 0;
            padding-left: 1.5rem;
          }
          
          & li {
            margin: 0.5rem 0;
            color: #e0e0e0;
            line-height: 1.8;
          }
          
          & blockquote {
            margin: 1rem 0;
            padding: 1rem 1.5rem;
            border-left: 4px solid #4f46e5;
            background-color: rgba(79, 70, 229, 0.1);
            border-radius: 0 0.5rem 0.5rem 0;
            color: #c0c0c0;
            font-style: italic;
          }
          
          & code {
            padding: 0.2rem 0.4rem;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 0.3rem;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.9em;
            color: #f8fafc;
          }
          
          & pre {
            margin: 1rem 0;
            padding: 1rem;
            background-color: rgba(0, 0, 0, 0.3);
            border-radius: 0.5rem;
            overflow-x: auto;
            font-family: 'Courier New', Courier, monospace;
          }
          
          & pre code {
            padding: 0;
            background-color: transparent;
            border-radius: 0;
          }
          
          & table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
          }
          
          & th, & td {
            padding: 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: left;
            color: #e0e0e0;
          }
          
          & th {
            background-color: rgba(79, 70, 229, 0.2);
            font-weight: 600;
          }
          
          & tr:nth-child(even) {
            background-color: rgba(255, 255, 255, 0.05);
          }
          
          & img {
            max-width: 100%;
            height: auto;
            margin: 1rem 0;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          }
          
          & hr {
            margin: 2rem 0;
            border: none;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
          }
        }
      `}</style>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 space-y-10"> {/* pt-24 to account for fixed header and spacing */}
        {/* Page Title */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 pb-2">
            文章预览与下载
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            审核、编辑并下载生成的推广文章
          </p>
        </div>

        {/* Processing Status Modal - Only show during generation (regenerate/refine) */}
        {currentStatus === 'generating' && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-card border border-gray-700 rounded-xl overflow-hidden shadow-xl flex flex-col w-full max-w-3xl mx-4">
              {/* Magic Visualization Area */}
              <div className="p-6 border-b border-gray-700 bg-gray-800/50">
                <div className="flex justify-between text-sm font-medium text-gray-300 mb-4">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    {currentStatus === 'generating' ? '生成中...' : '空闲'}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>

                <MagicTextDisplay status={currentStatus} text={processingDetail} />

                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-6 overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-secondary h-1.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              {/* History Log */}
              <div className="bg-gray-900 p-4 font-mono text-xs h-32 overflow-y-auto flex flex-col-reverse border-t border-black">
                <div ref={logsEndRef} />
                {logs.slice().reverse().map((log, i) => (
                  <div key={i} className="mb-1 text-gray-500 break-all">{log}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Article Review Section */}
        <div className="bg-card border border-gray-700 rounded-xl overflow-hidden shadow-xl">
          <div className="p-6">
            {/* Article Title */}
            <div className="mb-6">
              <input
                type="text"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
                className="w-full text-2xl font-bold text-white bg-transparent border-none outline-none"
                placeholder="文章标题"
              />
              <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                <span>字数: {wordCount}</span>
                <span>Job ID: {articleJobId}</span>
              </div>
              {articleData && (
                <div className="mt-2 text-sm text-gray-500">
                  基于PPT: {articleData.source?.ppt_title || '未命名演示文稿'} |
                  生成时间: {articleData.article?.generation_time}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-6">
              {isEditing ? (
                <>
                  <button
                    onClick={saveEditedArticle}
                    className="px-6 py-3 bg-secondary hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
                  >
                    <span>💾 保存</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
                  >
                    <span>❌ 取消</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
                  >
                    <span>✏️ 编辑文章</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowRegenerateForm(!showRegenerateForm);
                      if (showRefineForm) setShowRefineForm(false);
                    }}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
                  >
                    <span>🔄 {showRegenerateForm ? '收起' : '重新生成'}全新文章</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowRefineForm(!showRefineForm);
                      if (showRegenerateForm) setShowRegenerateForm(false);
                    }}
                    className="px-6 py-3 bg-secondary hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
                  >
                    <span>✏️ {showRefineForm ? '收起' : '微调'}当前文章</span>
                  </button>
                  <button
                    onClick={exportArticle}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
                  >
                    <span>📤 导出文章</span>
                  </button>
                </>
              )}
            </div>

            {/* Article Generation Forms */}
            <div className="space-y-6 mb-8">
              {/* Regenerate Article Form */}
              {showRegenerateForm && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">重新生成全新文章</h3>
                  {formStatusMessage && (
                    <div className={`p-4 mb-4 rounded-lg text-sm font-medium ${formStatusMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                      {formStatusMessage.text}
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">文章风格</label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">文章类型</label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">提示词编辑器</label>
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        className="w-full h-[200px] px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm resize-vertical prompt-editor"
                        placeholder="选择文章类型后会自动填充默认提示词，您可以在此基础上修改..."
                      />
                    </div>
                    <button
                      onClick={generateNewArticle}
                      disabled={isGeneratingNew}
                      className={`w-full px-6 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${isGeneratingNew ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                    >
                      <span>{isGeneratingNew ? '⏳ 生成中...' : '🚀 重新生成文章'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Refine Article Form */}
              {showRefineForm && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">微调当前文章</h3>
                  {formStatusMessage && (
                    <div className={`p-4 mb-4 rounded-lg text-sm font-medium ${formStatusMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                      {formStatusMessage.text}
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">微调提示词</label>
                      <textarea
                        value={refinePrompt}
                        onChange={(e) => setRefinePrompt(e.target.value)}
                        className="w-full h-[200px] px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm resize-vertical prompt-editor"
                        placeholder="请输入您希望如何微调当前文章的提示词，例如：\n- 让语言更加生动有趣\n- 增加更多实例和案例\n- 调整文章结构\n- 修改语气风格等..."
                      />
                    </div>
                    <button
                      onClick={refineArticle}
                      disabled={isGeneratingNew}
                      className={`w-full px-6 py-3 bg-secondary hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${isGeneratingNew ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                    >
                      <span>{isGeneratingNew ? '⏳ 微调中...' : '✏️ 微调文章'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Article Content */}
            <div className="mb-6">
              {isEditing ? (
                <textarea
                  value={articleContent}
                  onChange={(e) => {
                    setArticleContent(e.target.value);
                    setArticleHtml(marked.parse(e.target.value));
                  }}
                  className="w-full min-h-[400px] p-4 bg-gray-800 border border-gray-700 rounded-lg text-white font-sans text-base resize-vertical"
                  placeholder="文章内容..."
                />
              ) : (
                <div
                  className="w-full min-h-[400px] p-6 bg-gray-800 border border-gray-700 rounded-lg text-white font-sans article-content"
                  style={{
                    fontSize: '16px',
                    lineHeight: '1.8',
                    fontWeight: 'normal'
                  }}
                  dangerouslySetInnerHTML={{ __html: articleHtml || '文章内容加载中...' }}
                />
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <p className="text-gray-400 text-sm mb-4">
                <strong>说明:</strong> 本文由AI基于PPT内容自动生成，仅供参考。建议在发布前进行人工审核和编辑。
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Export Dialog */}
      {showExportDialog && exportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              📤 选择导出格式
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {exportData.contentType === 'article' ? (
                <>
                  <button
                    onClick={() => downloadFormat('html')}
                    className="p-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white font-bold transition-all active:scale-95"
                  >
                    <div className="text-3xl mb-2">🌐</div>
                    <div>HTML 格式</div>
                    <div className="text-sm text-gray-400 mt-1">适合网页浏览</div>
                  </button>
                  <button
                    onClick={() => downloadFormat('md')}
                    className="p-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white font-bold transition-all active:scale-95"
                  >
                    <div className="text-3xl mb-2">📝</div>
                    <div>Markdown 格式</div>
                    <div className="text-sm text-gray-400 mt-1">适合文档编辑</div>
                  </button>
                  <button
                    onClick={() => downloadFormat('txt')}
                    className="p-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white font-bold transition-all active:scale-95"
                  >
                    <div className="text-3xl mb-2">📄</div>
                    <div>TXT 格式</div>
                    <div className="text-sm text-gray-400 mt-1">纯文本格式</div>
                  </button>
                  <button
                    onClick={() => downloadFormat('json')}
                    className="p-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white font-bold transition-all active:scale-95"
                  >
                    <div className="text-3xl mb-2">🔧</div>
                    <div>JSON 格式</div>
                    <div className="text-sm text-gray-400 mt-1">结构化数据</div>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => downloadFormat('txt')}
                    className="p-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white font-bold transition-all active:scale-95"
                  >
                    <div className="text-3xl mb-2">📄</div>
                    <div>TXT 格式</div>
                    <div className="text-sm text-gray-400 mt-1">讲稿文本</div>
                  </button>
                  <button
                    onClick={() => downloadFormat('json')}
                    className="p-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white font-bold transition-all active:scale-95"
                  >
                    <div className="text-3xl mb-2">🔧</div>
                    <div>JSON 格式</div>
                    <div className="text-sm text-gray-400 mt-1">结构化数据</div>
                  </button>
                </>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                导出时间: {exportData.exportedAt}
              </div>
              <button
                onClick={closeExportDialog}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleReviewPage;
