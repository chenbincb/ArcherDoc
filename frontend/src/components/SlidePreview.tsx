import React, { useState, useEffect, useRef } from 'react';
import { SlideNavigation } from './SlideNavigation';

interface ImageVersion {
  url: string;
  filename: string;
  metadata: {
    prompt: string;
    negativePrompt?: string;
    provider: string;
    width: number;
    height: number;
    generationTime: number;
    createdAt: string;
  };
}

interface SlidePreviewProps {
  currentSlide: number;
  totalSlides: number;
  slideNumber: number;
  imageUrl?: string;
  originalImageUrl?: string; // 原始PPT图片URL
  videoUrl?: string; // 视频URL
  title?: string;
  onPreviousSlide?: () => void;
  onNextSlide?: () => void;
  onSlideSelect?: (slideIndex: number) => void;
  showVideoToggle?: boolean;
  showVideoPreview?: boolean;
  onToggleVideo?: () => void;
  isGenerating?: boolean;
  showSlideSelector?: boolean;
  className?: string;
  showImageControls?: boolean; // 是否显示图片控制按钮（全屏、下载）
  onImageFullscreen?: () => void;
  onImageDownload?: () => void;
  hasGeneratedImage?: boolean; // 是否有生成的图片
  generatedImageInfo?: {
    prompt: string;
    generationTime: number;
    width: number;
    height: number;
    provider: string;
  }; // 生成图片的信息
  showGeneratedImage?: boolean; // 受控：是否显示生成的图片
  onToggleImage?: () => void; // 切换图片显示的回调
  headerTitle?: string; // 自定义标题，如“场景 x”
  isTextMode?: boolean;
  documentContent?: string; // 文本文档全文
  highlightText?: string;   // 当前选中的文本
  onTextSelect?: (text: string) => void; // 划选文字的回调
  // 图片版本切换
  imageVersions?: ImageVersion[]; // 所有生成的图片版本
  currentVersionIndex?: number; // 当前显示的版本索引
  onVersionChange?: (index: number) => void; // 版本切换回调
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({
  currentSlide,
  totalSlides,
  slideNumber,
  imageUrl,
  originalImageUrl,
  videoUrl,
  title,
  onPreviousSlide,
  onNextSlide,
  onSlideSelect,
  showVideoToggle = false,
  showVideoPreview = false,
  onToggleVideo,
  isGenerating = false,
  showSlideSelector = false,
  className = "",
  showImageControls = false,
  onImageFullscreen,
  onImageDownload,
  hasGeneratedImage = false,
  generatedImageInfo,
  showGeneratedImage = true,
  onToggleImage,
  headerTitle,
  isTextMode,
  documentContent,
  highlightText,
  onTextSelect,
  imageVersions = [],
  currentVersionIndex = 0,
  onVersionChange
}) => {
  const [showTextReference, setShowTextReference] = useState(true);
  const textContainerRef = useRef<HTMLDivElement>(null);
  // 监听高亮文本变化，自动滚动定位
  useEffect(() => {
    if (isTextMode && showTextReference && highlightText && textContainerRef.current) {
      setTimeout(() => {
        const highlightElement = textContainerRef.current?.querySelector('.visual-anchor');
        if (highlightElement) {
          highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50); // 稍作延迟确保 DOM 已渲染
    }
  }, [highlightText, showTextReference, isTextMode]);

  // 当外部指令要求显示生成图时（如生图完成），自动关闭文本参考
  useEffect(() => {
    if (isTextMode && showGeneratedImage) {
      setShowTextReference(false);
    }
  }, [showGeneratedImage, isTextMode]);

  // 当有图片生成且未处于强制显示图片状态时，如果还没切换过，自动切换到图片（可选，目前手动切换更稳）
  const displayTitle = headerTitle || (isTextMode ? '划选生图模式' : `幻灯片 ${slideNumber}`);

  const handleMouseUp = () => {
    if (!isTextMode || !onTextSelect) return;
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text) {
      onTextSelect(text);
    }
  };

  return (
    <div className={`bg-gray-800 rounded-xl overflow-hidden border border-gray-700 flex flex-col h-full \${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center relative">
        <h3 className="text-sm font-bold text-gray-300">{displayTitle}</h3>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400">
            {currentSlide + 1} / {totalSlides}
          </div>

          {/* Slide Selector */}
          {showSlideSelector && onSlideSelect && (
            <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-600 rounded px-2 py-1">
              <span className="text-xs text-gray-500">跳转到:</span>
              <select
                value={currentSlide}
                onChange={(e) => onSlideSelect(Number(e.target.value))}
                className="bg-transparent text-sm text-white focus:outline-none"
              >
                {Array.from({ length: totalSlides }, (_, i) => (
                  <option key={i} value={i} className="bg-gray-800">
                    {isTextMode ? `第 ${i + 1} 项` : `第 ${i + 1} 页`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Toggle Buttons - Center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2">
          {/* Video Toggle Button - 视频/图片切换 */}
          {showVideoToggle && onToggleVideo && (
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
              <button
                onClick={() => showVideoPreview && onToggleVideo()}
                className={`text-xs px-3 py-1 rounded-md transition-all ${!showVideoPreview ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                📷 图片
              </button>
              <button
                onClick={() => !showVideoPreview && onToggleVideo()}
                className={`text-xs px-3 py-1 rounded-md transition-all ${showVideoPreview ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                🎬 视频
              </button>
            </div>
          )}

          {isTextMode && (
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
              <button
                onClick={() => setShowTextReference(true)}
                className={`text-xs px-3 py-1 rounded-md transition-all ${showTextReference ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                📄 原文参考
              </button>
              <button
                onClick={() => setShowTextReference(false)}
                className={`text-xs px-3 py-1 rounded-md transition-all ${!showTextReference ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                🎨 视觉配图
              </button>
            </div>
          )}

          {/* PPT Mode Toggle - 双按钮样式 */}
          {!isTextMode && originalImageUrl && (
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
              <button
                onClick={() => onToggleImage && showGeneratedImage && onToggleImage()}
                className={`text-xs px-3 py-1 rounded-md transition-all ${!showGeneratedImage ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                🖼️ 原图
              </button>
              <button
                onClick={() => onToggleImage && !showGeneratedImage && onToggleImage()}
                disabled={!hasGeneratedImage}
                className={`text-xs px-3 py-1 rounded-md transition-all ${showGeneratedImage ? 'bg-purple-500 text-white' : (hasGeneratedImage ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 cursor-not-allowed')}`}
              >
                ✨ AI配图
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex justify-center items-stretch relative overflow-hidden bg-gray-900/10">
        {isGenerating ? (
          <div className="w-full flex flex-col items-center justify-center bg-gray-900/30">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-300">正在创造视觉场景...</p>
          </div>
        ) : isTextMode && showTextReference ? (
          <div
            ref={textContainerRef}
            onMouseUp={handleMouseUp}
            className="w-full h-full p-6 overflow-y-auto leading-relaxed text-gray-300 text-sm whitespace-pre-wrap scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent bg-gray-900/20 select-text"
          >
            {documentContent ? (
              documentContent.split(highlightText || '').length > 1 && highlightText ? (
                <>
                  {documentContent.split(highlightText)[0]}
                  <span className="visual-anchor bg-orange-500/30 border-b-2 border-orange-500 text-white font-medium px-1 rounded">
                    {highlightText}
                  </span>
                  {documentContent.split(highlightText).slice(1).join(highlightText)}
                </>
              ) : documentContent
            ) : (
              <div className="italic text-gray-600">加载文档原文中...</div>
            )}
          </div>
        ) : showVideoPreview && videoUrl ? (
          <video
            key={videoUrl}
            src={videoUrl}
            controls
            autoPlay
            playsInline
            className="w-full max-h-[80vh] object-contain"
            onError={() => console.error("Video failed to load:", videoUrl)}
          />
        ) : imageUrl ? (
          <div className="relative group w-full overflow-y-auto flex items-center justify-center p-4 scrollbar-thin scrollbar-thumb-gray-700">
            <img
              src={imageUrl}
              alt={title || `场景 ${slideNumber}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onError={(e) => {
                // 图片加载失败时隐藏 img 元素
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />

            {/* Hover Controls - 仅在 AI 配图模式显示 */}
            {showImageControls && showGeneratedImage && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-4">
                <button
                  onClick={onImageFullscreen}
                  className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-all text-white flex items-center gap-2"
                >
                  <span>🔍</span> 全屏查看
                </button>
                <button
                  onClick={onImageDownload}
                  className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-all text-white flex items-center gap-2"
                >
                  <span>⬇️</span> 下载保存
                </button>
              </div>
            )}

            {/* 图片版本切换控件 - 仅在有多个版本时显示 */}
            {showGeneratedImage && imageVersions.length > 1 && (
              <>
                {/* 左箭头 */}
                <button
                  onClick={() => {
                    const newIndex = currentVersionIndex === 0 ? imageVersions.length - 1 : currentVersionIndex - 1;
                    onVersionChange?.(newIndex);
                  }}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  ‹
                </button>
                {/* 右箭头 */}
                <button
                  onClick={() => {
                    const newIndex = currentVersionIndex >= imageVersions.length - 1 ? 0 : currentVersionIndex + 1;
                    onVersionChange?.(newIndex);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  ›
                </button>
                {/* 版本索引指示器 */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                  {currentVersionIndex + 1} / {imageVersions.length}
                </div>
              </>
            )}


            {/* Image Info Overlay - 仅在 AI 配图模式显示 */}
            {generatedImageInfo && showGeneratedImage && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md text-white p-4 rounded-xl border border-white/10 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <div className="text-sm space-y-2">
                  <div className="font-medium line-clamp-2">提示词: {generatedImageInfo.prompt}</div>
                  <div className="flex gap-4 text-xs text-gray-300 border-t border-white/10 pt-2">
                    <span>耗时: {generatedImageInfo.generationTime}s</span>
                    <span>尺寸: {generatedImageInfo.width}×{generatedImageInfo.height}</span>
                    <span>模型: {generatedImageInfo.provider}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center text-center p-8 bg-gray-900/10">
            <div className="w-24 h-24 bg-gray-700/50 rounded-full flex items-center justify-center mb-6 border border-gray-600">
              <div className="text-4xl">🖼️</div>
            </div>
            <h3 className="text-xl font-bold text-gray-300 mb-2">暂无配图</h3>
            <p className="text-gray-500 max-w-sm">
              {isTextMode ? '请点击右侧按钮，让 AI 为此场景构绘画面' : '当前幻灯片尚未生成 AI 配图'}
            </p>
            {isTextMode && (
              <button
                onClick={() => setShowTextReference(true)}
                className="mt-6 text-orange-500 hover:text-orange-400 text-sm font-medium"
              >
                查看对应的原文段落
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation - Only show if not in text mode */}
      {!isTextMode && (
        <SlideNavigation
          currentSlide={currentSlide}
          totalSlides={totalSlides}
          onPreviousSlide={onPreviousSlide}
          onNextSlide={onNextSlide}
          isTextMode={isTextMode}
        />
      )}
    </div>
  );
};