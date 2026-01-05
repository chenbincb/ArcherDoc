import React, { useState } from 'react';
import { AppSettings, AIProvider, ProviderConfig, GlossaryItem, VideoSettings, SpeechModelType, ImageGenerationSettings, ImageProvider } from '../types';
import { PROVIDER_OPTIONS, POPULAR_LANGUAGES, AVAILABLE_VOICES, COQUI_TTS_SPEAKERS, QWEN_TTS_VOICES, QWEN_TTS_MODELS, COMFYUI_MODELS, NANO_BANANA_MODELS, IMAGE_SIZES, NANOBANANA_ASPECT_RATIOS } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  initialTab?: 'ai' | 'translation' | 'video' | 'image';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, initialTab = 'ai' }) => {
  // Tab state - Must be at the top before other hooks
  const [activeTab, setActiveTab] = useState<'ai' | 'translation' | 'video' | 'image'>('ai');

  // Main settings state
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);

  // Glossary State (to handle adding new items easily)
  const [newTerm, setNewTerm] = useState('');
  const [newTranslation, setNewTranslation] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setActiveTab(initialTab);

      // Handle subTab navigation
      const subTab = localStorage.getItem('settings-subtab');
      if (subTab) {
        setTimeout(() => {
          switch (subTab) {
            case 'qwen-tts':
              // Navigate to video tab and set Qwen TTS as active provider
              setLocalSettings(prev => ({
                ...prev,
                videoSettings: {
                  ...prev.videoSettings,
                  speechModelType: SpeechModelType.QWEN_TTS
                }
              }));
              break;
            case 'nanobanana':
              // Navigate to image tab and set Nano Banana as active provider
              setLocalSettings(prev => ({
                ...prev,
                imageSettings: {
                  ...prev.imageSettings,
                  defaultProvider: ImageProvider.NANO_BANANA
                }
              }));
              break;
          }
          // Clear the subTab after handling
          localStorage.removeItem('settings-subtab');
        }, 100);
      }
    }
  }, [settings, isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const activeConfig = localSettings.configs[localSettings.activeProvider];

  const updateActiveConfig = (updates: Partial<ProviderConfig>) => {
    setLocalSettings(prev => ({
      ...prev,
      configs: {
        ...prev.configs,
        [prev.activeProvider]: {
          ...prev.configs[prev.activeProvider],
          ...updates
        }
      }
    }));
  };

  // --- Glossary Handlers ---
  const addGlossaryItem = () => {
    if (!newTerm.trim() || !newTranslation.trim()) return;
    setLocalSettings(prev => ({
      ...prev,
      glossary: [...(prev.glossary || []), { term: newTerm.trim(), translation: newTranslation.trim() }]
    }));
    setNewTerm('');
    setNewTranslation('');
  };

  const removeGlossaryItem = (index: number) => {
    setLocalSettings(prev => ({
      ...prev,
      glossary: prev.glossary.filter((_, i) => i !== index)
    }));
  };

  const getPlaceholderModel = () => {
    switch (localSettings.activeProvider) {
      case AIProvider.GEMINI: return "gemini-2.5-flash";
      case AIProvider.OLLAMA: return "llama3";
      case AIProvider.VLLM: return "facebook/opt-125m";
      default: return "gpt-3.5-turbo";
    }
  };

  const getPlaceholderUrl = () => {
    switch (localSettings.activeProvider) {
      case AIProvider.OLLAMA: return "http://localhost:11434/v1";
      case AIProvider.VLLM: return "http://localhost:8000/v1";
      default: return "https://openrouter.ai/api/v1";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full animate-in fade-in zoom-in duration-200 my-8 h-[688px] flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-between sticky top-0 bg-card z-10 py-2 border-b border-gray-700">
            <span>配置</span>
            <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
          </h2>

          {/* Tab Navigation */}
          <div className="mb-4 border-b border-gray-700">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('ai')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'ai'
                  ? 'bg-primary text-white border-b-2 border-primary'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300 border-b-2 border-transparent'
                  }`}
              >
                🤖 AI 设置
              </button>
              <button
                onClick={() => setActiveTab('translation')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'translation'
                  ? 'bg-primary text-white border-b-2 border-primary'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300 border-b-2 border-transparent'
                  }`}
              >
                📖 翻译设置
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'video'
                  ? 'bg-primary text-white border-b-2 border-primary'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300 border-b-2 border-transparent'
                  }`}
              >
                🎙️ 音频生成设置
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'image'
                  ? 'bg-primary text-white border-b-2 border-primary'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300 border-b-2 border-transparent'
                  }`}
              >
                🎨 图片生成设置
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {/* AI 设置 Tab */}
            {activeTab === 'ai' && (
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">AI 模型提供商</label>
                    <div className="grid grid-cols-4 gap-2">
                      {PROVIDER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setLocalSettings({ ...localSettings, activeProvider: opt.value })}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${localSettings.activeProvider === opt.value
                            ? 'bg-primary text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 space-y-4">
                    <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                      {localSettings.activeProvider} 参数
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          模型名称
                        </label>
                        <input
                          type="text"
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary"
                          placeholder={getPlaceholderModel()}
                          value={activeConfig.model}
                          onChange={(e) => updateActiveConfig({ model: e.target.value })}
                        />
                      </div>

                      {localSettings.activeProvider !== AIProvider.GEMINI && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Base URL</label>
                          <input
                            type="text"
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary"
                            placeholder={getPlaceholderUrl()}
                            value={activeConfig.baseUrl || ''}
                            onChange={(e) => updateActiveConfig({ baseUrl: e.target.value })}
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          API Key {localSettings.activeProvider === AIProvider.OLLAMA || localSettings.activeProvider === AIProvider.VLLM ? '(可选)' : ''}
                        </label>
                        <input
                          type="password"
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary"
                          placeholder={localSettings.activeProvider === AIProvider.VLLM ? "EMPTY" : "sk-..."}
                          value={activeConfig.apiKey}
                          onChange={(e) => updateActiveConfig({ apiKey: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 翻译设置 Tab */}
            {activeTab === 'translation' && (
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700 space-y-4">
                {/* Target Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">目标语言</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={localSettings.targetLanguage}
                    onChange={(e) => setLocalSettings({ ...localSettings, targetLanguage: e.target.value })}
                  >
                    {POPULAR_LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                {/* Glossary */}
                <div className="bg-gray-900/50 rounded border border-gray-700 p-3">
                  <div className="mb-3">
                    <h4 className="text-sm font-bold text-gray-300">专有名词术语表 (Glossary)</h4>
                    <p className="text-xs text-gray-500">强制 AI 将特定词汇翻译为您指定的内容。</p>
                  </div>

                  <div className="bg-gray-900/50 rounded border border-gray-700 mb-3 p-2 overflow-y-auto max-h-[350px] min-h-[200px]">
                    {(localSettings.glossary && localSettings.glossary.length > 0) ? (
                      <div className="space-y-2">
                        {localSettings.glossary.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-gray-800 p-2 rounded text-sm group">
                            <span className="text-gray-300 flex-1 truncate" title={item.term}>{item.term}</span>
                            <span className="text-gray-500">→</span>
                            <span className="text-green-400 flex-1 truncate" title={item.translation}>{item.translation}</span>
                            <button onClick={() => removeGlossaryItem(idx)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">✖</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-600 text-xs italic">
                        暂无术语，请在下方添加
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-[1fr,1fr,auto] gap-2 items-end">
                    <div>
                      <input
                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-xs text-white"
                        placeholder="原文 (如: AI)"
                        value={newTerm}
                        onChange={e => setNewTerm(e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-xs text-white"
                        placeholder="译文 (如: 人工智能)"
                        value={newTranslation}
                        onChange={e => setNewTranslation(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addGlossaryItem()}
                      />
                    </div>
                    <button
                      onClick={addGlossaryItem}
                      disabled={!newTerm.trim() || !newTranslation.trim()}
                      className="bg-primary hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded"
                    >
                      ➕
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 视频生成设置 Tab */}
            {activeTab === 'video' && (
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">语音合成引擎</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setLocalSettings({
                          ...localSettings,
                          videoSettings: {
                            ...localSettings.videoSettings,
                            speechModelType: SpeechModelType.MINIMAX
                          }
                        })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${localSettings.videoSettings.speechModelType === SpeechModelType.MINIMAX
                          ? 'bg-primary text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                      >
                        MiniMax
                      </button>
                      <button
                        onClick={() => setLocalSettings({
                          ...localSettings,
                          videoSettings: {
                            ...localSettings.videoSettings,
                            speechModelType: SpeechModelType.COQUI_TTS
                          }
                        })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${localSettings.videoSettings.speechModelType === SpeechModelType.COQUI_TTS
                          ? 'bg-primary text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                      >
                        Coqui TTS
                      </button>
                      <button
                        onClick={() => setLocalSettings({
                          ...localSettings,
                          videoSettings: {
                            ...localSettings.videoSettings,
                            speechModelType: SpeechModelType.QWEN_TTS
                          }
                        })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${localSettings.videoSettings.speechModelType === SpeechModelType.QWEN_TTS
                          ? 'bg-primary text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                      >
                        Qwen TTS
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 space-y-4">
                    <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                      {localSettings.videoSettings.speechModelType === SpeechModelType.MINIMAX && 'MiniMax 参数'}
                      {localSettings.videoSettings.speechModelType === SpeechModelType.COQUI_TTS && 'Coqui TTS 参数'}
                      {localSettings.videoSettings.speechModelType === SpeechModelType.QWEN_TTS && 'Qwen TTS 参数'}
                    </h4>

                    <div className="space-y-4">
                      {/* MiniMax Settings */}
                      {localSettings.videoSettings.speechModelType === SpeechModelType.MINIMAX && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">MiniMax Group ID</label>
                            <input
                              type="text"
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary"
                              value={localSettings.videoSettings.minimaxGroupId}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                videoSettings: {
                                  ...localSettings.videoSettings,
                                  minimaxGroupId: e.target.value
                                }
                              })}
                              placeholder="输入 MiniMax Group ID"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">MiniMax Access Token</label>
                            <input
                              type="password"
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary"
                              value={localSettings.videoSettings.minimaxAccessToken}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                videoSettings: {
                                  ...localSettings.videoSettings,
                                  minimaxAccessToken: e.target.value
                                }
                              })}
                              placeholder="输入 MiniMax Access Token"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">语音音色</label>
                            <select
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                              value={localSettings.videoSettings.voiceId}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                videoSettings: {
                                  ...localSettings.videoSettings,
                                  voiceId: e.target.value
                                }
                              })}
                            >
                              {AVAILABLE_VOICES.map(voice => (
                                <option key={voice.id} value={voice.id}>
                                  {voice.name} - {voice.description}
                                </option>
                              ))}
                            </select>
                          </div>

                        </>
                      )}

                      {/* Coqui TTS Settings */}
                      {localSettings.videoSettings.speechModelType === SpeechModelType.COQUI_TTS && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Coqui TTS 服务器地址</label>
                            <input
                              type="text"
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary"
                              value={localSettings.videoSettings.coquiSettings.url}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                videoSettings: {
                                  ...localSettings.videoSettings,
                                  coquiSettings: {
                                    ...localSettings.videoSettings.coquiSettings,
                                    url: e.target.value
                                  }
                                }
                              })}
                              placeholder="http://178.109.129.11:8001/generate"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">语音音色（参考音频）</label>
                            <select
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                              value={localSettings.videoSettings.coquiSettings.speakerWav}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                videoSettings: {
                                  ...localSettings.videoSettings,
                                  coquiSettings: {
                                    ...localSettings.videoSettings.coquiSettings,
                                    speakerWav: e.target.value
                                  }
                                }
                              })}
                            >
                              {COQUI_TTS_SPEAKERS.map(speaker => (
                                <option key={speaker.id} value={speaker.id}>
                                  {speaker.name} - {speaker.description}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">GPU 显存阈值 (GB)</label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary"
                              value={localSettings.videoSettings.coquiSettings.gpuThresholdGb}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                videoSettings: {
                                  ...localSettings.videoSettings,
                                  coquiSettings: {
                                    ...localSettings.videoSettings.coquiSettings,
                                    gpuThresholdGb: parseFloat(e.target.value)
                                  }
                                }
                              })}
                              placeholder="4.0"
                            />
                            <p className="text-xs text-gray-500 mt-1">GPU 显存低于此值将使用 CPU</p>
                          </div>
                        </>
                      )}

                      {/* Qwen TTS Settings */}
                      {localSettings.videoSettings.speechModelType === SpeechModelType.QWEN_TTS && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
                            <input
                              type="password"
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary"
                              value={localSettings.videoSettings.qwenApiKey}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                videoSettings: {
                                  ...localSettings.videoSettings,
                                  qwenApiKey: e.target.value
                                }
                              })}
                              placeholder="输入阿里云DashScope API Key"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">模型版本</label>
                            <select
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                              value={localSettings.videoSettings.qwenModel}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                videoSettings: {
                                  ...localSettings.videoSettings,
                                  qwenModel: e.target.value
                                }
                              })}
                            >
                              {QWEN_TTS_MODELS.map(model => (
                                <option key={model.id} value={model.id}>
                                  {model.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">语音音色</label>
                            <select
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                              value={localSettings.videoSettings.qwenVoiceId}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                videoSettings: {
                                  ...localSettings.videoSettings,
                                  qwenVoiceId: e.target.value
                                }
                              })}
                            >
                              {QWEN_TTS_VOICES.map(voice => (
                                <option key={voice.id} value={voice.id}>
                                  {voice.name} - {voice.description}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 图片生成设置 Tab */}
            {activeTab === 'image' && (
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                <div className="space-y-6">
                  {/* 图片生成提供商 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">图片生成提供商</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setLocalSettings({
                          ...localSettings,
                          imageSettings: {
                            ...localSettings.imageSettings,
                            defaultProvider: ImageProvider.COMFYUI
                          }
                        })}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${localSettings.imageSettings.defaultProvider === ImageProvider.COMFYUI
                          ? 'bg-primary text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                      >
                        ComfyUI (本地)
                      </button>
                      <button
                        onClick={() => setLocalSettings({
                          ...localSettings,
                          imageSettings: {
                            ...localSettings.imageSettings,
                            defaultProvider: ImageProvider.NANO_BANANA
                          }
                        })}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${localSettings.imageSettings.defaultProvider === ImageProvider.NANO_BANANA
                          ? 'bg-primary text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                      >
                        Nano Banana (云端)
                      </button>
                    </div>
                  </div>

                  {/* 当前选中提供商的设置 */}
                  <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
                    <h4 className="text-sm font-medium text-orange-400 mb-3">
                      {localSettings.imageSettings.defaultProvider === ImageProvider.COMFYUI
                        ? '🎨 ComfyUI 设置'
                        : '🍌 Nano Banana 设置'}
                    </h4>

                    {/* ComfyUI 设置 - 仅当选中 ComfyUI 时显示 */}
                    {localSettings.imageSettings.defaultProvider === ImageProvider.COMFYUI && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">服务器地址</label>
                          <input
                            type="text"
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            value={localSettings.imageSettings.comfyuiSettings.baseUrl}
                            onChange={(e) => setLocalSettings({
                              ...localSettings,
                              imageSettings: {
                                ...localSettings.imageSettings,
                                comfyuiSettings: {
                                  ...localSettings.imageSettings.comfyuiSettings,
                                  baseUrl: e.target.value
                                }
                              }
                            })}
                            placeholder="http://localhost:8188"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">模型</label>
                            <select
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              value={localSettings.imageSettings.comfyuiSettings.model}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                imageSettings: {
                                  ...localSettings.imageSettings,
                                  comfyuiSettings: {
                                    ...localSettings.imageSettings.comfyuiSettings,
                                    model: e.target.value
                                  }
                                }
                              })}
                            >
                              {COMFYUI_MODELS.map(model => (
                                <option key={model.id} value={model.id}>
                                  {model.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">采样步数</label>
                            <input
                              type="number"
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              value={localSettings.imageSettings.comfyuiSettings.steps}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                imageSettings: {
                                  ...localSettings.imageSettings,
                                  comfyuiSettings: {
                                    ...localSettings.imageSettings.comfyuiSettings,
                                    steps: parseInt(e.target.value) || 20
                                  }
                                }
                              })}
                              min="1"
                              max="50"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">CFG Scale</label>
                            <input
                              type="number"
                              step="0.1"
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              value={localSettings.imageSettings.comfyuiSettings.cfgScale}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                imageSettings: {
                                  ...localSettings.imageSettings,
                                  comfyuiSettings: {
                                    ...localSettings.imageSettings.comfyuiSettings,
                                    cfgScale: parseFloat(e.target.value) || 7.5
                                  }
                                }
                              })}
                              min="1"
                              max="20"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">宽度</label>
                            <input
                              type="number"
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              value={localSettings.imageSettings.comfyuiSettings.width}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                imageSettings: {
                                  ...localSettings.imageSettings,
                                  comfyuiSettings: {
                                    ...localSettings.imageSettings.comfyuiSettings,
                                    width: parseInt(e.target.value) || 1024
                                  }
                                }
                              })}
                              min="256"
                              max="2048"
                              step="64"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">高度</label>
                            <input
                              type="number"
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              value={localSettings.imageSettings.comfyuiSettings.height}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                imageSettings: {
                                  ...localSettings.imageSettings,
                                  comfyuiSettings: {
                                    ...localSettings.imageSettings.comfyuiSettings,
                                    height: parseInt(e.target.value) || 768
                                  }
                                }
                              })}
                              min="256"
                              max="2048"
                              step="64"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Nano Banana 设置 - 仅当选中 Nano Banana 时显示 */}
                    {localSettings.imageSettings.defaultProvider === ImageProvider.NANO_BANANA && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Google AI API Key
                            <span className="text-xs text-gray-400 ml-2">
                              (获取API密钥: <a href="https://ai.google.dev/api" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Google AI Studio</a>)
                            </span>
                          </label>
                          <input
                            type="password"
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            value={localSettings.imageSettings.nanobananaSettings.apiKey}
                            onChange={(e) => setLocalSettings({
                              ...localSettings,
                              imageSettings: {
                                ...localSettings.imageSettings,
                                nanobananaSettings: {
                                  ...localSettings.imageSettings.nanobananaSettings,
                                  apiKey: e.target.value
                                }
                              }
                            })}
                            placeholder="请输入 Nano Banana API Key"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">模型</label>
                            <select
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                              value={localSettings.imageSettings.nanobananaSettings.model}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                imageSettings: {
                                  ...localSettings.imageSettings,
                                  nanobananaSettings: {
                                    ...localSettings.imageSettings.nanobananaSettings,
                                    model: e.target.value
                                  }
                                }
                              })}
                            >
                              {NANO_BANANA_MODELS.map(model => (
                                <option key={model.id} value={model.id}>
                                  {model.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">图片质量</label>
                            <select
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                              value={localSettings.imageSettings.nanobananaSettings.quality}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                imageSettings: {
                                  ...localSettings.imageSettings,
                                  nanobananaSettings: {
                                    ...localSettings.imageSettings.nanobananaSettings,
                                    quality: e.target.value as 'standard' | 'hd'
                                  }
                                }
                              })}
                            >
                              <option value="standard">标准质量</option>
                              <option value="hd">高清质量</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">宽高比</label>
                          <div className="flex gap-3">
                            <select
                              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                              value={localSettings.imageSettings.nanobananaSettings.aspectRatio}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                imageSettings: {
                                  ...localSettings.imageSettings,
                                  nanobananaSettings: {
                                    ...localSettings.imageSettings.nanobananaSettings,
                                    aspectRatio: e.target.value as '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'
                                  }
                                }
                              })}
                            >
                              {NANOBANANA_ASPECT_RATIOS.map(ratio => (
                                <option key={ratio.id} value={ratio.id}>
                                  {ratio.name}
                                </option>
                              ))}
                            </select>
                            <div className="mt-2">
                              <div className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-400/20">
                                <div className="flex items-start gap-2">
                                  <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                  <div className="flex-1">
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                      {NANOBANANA_ASPECT_RATIOS.find(r => r.id === localSettings.imageSettings.nanobananaSettings.aspectRatio)?.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 通用设置部分已注释 */}
                  {/* {
                  <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
                    <h4 className="text-sm font-medium text-blue-400 mb-3">⚙️ 通用设置</h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">负面提示词</label>
                      <textarea
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={2}
                        value={localSettings.imageSettings.negativePrompt}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          imageSettings: {
                            ...localSettings.imageSettings,
                            negativePrompt: e.target.value
                          }
                        })}
                        placeholder="低质量, 模糊, 失真, 扭曲, 变形, 水印, 签名, 文字, 标题"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">图片格式</label>
                        <select
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={localSettings.imageSettings.imageFormat}
                          onChange={(e) => setLocalSettings({
                            ...localSettings,
                            imageSettings: {
                              ...localSettings.imageSettings,
                              imageFormat: e.target.value as 'png' | 'jpg'
                            }
                          })}
                        >
                          <option value="png">PNG (推荐)</option>
                          <option value="jpg">JPG (较小)</option>
                        </select>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="autoRetry"
                          className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                          checked={localSettings.imageSettings.autoRetry}
                          onChange={(e) => setLocalSettings({
                            ...localSettings,
                            imageSettings: {
                              ...localSettings.imageSettings,
                              autoRetry: e.target.checked
                            }
                          })}
                        />
                        <label htmlFor="autoRetry" className="ml-2 text-sm text-gray-300">
                          自动重试失败
                        </label>
                      </div>

                      {localSettings.imageSettings.autoRetry && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">最大重试次数</label>
                          <input
                            type="number"
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={localSettings.imageSettings.maxRetries}
                            onChange={(e) => setLocalSettings({
                              ...localSettings,
                              imageSettings: {
                                ...localSettings.imageSettings,
                                maxRetries: parseInt(e.target.value) || 3
                              }
                            })}
                            min="1"
                            max="10"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  } */}

                </div>
              </div>
            )}
          </div>

        </div>
        <div className="bg-gray-800/50 p-4 flex justify-end gap-3 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">取消</button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            保存并关闭
          </button>
        </div>
      </div>
    </div>
  );
};