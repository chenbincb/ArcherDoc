import React, { useState } from 'react';
import { SlideNavigation } from './SlideNavigation';

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
  onToggleImage
}) => {
  return (
    <div className={`bg-gray-800 rounded-xl overflow-hidden border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center relative">
        <h3 className="text-sm font-bold text-gray-300">幻灯片 {slideNumber}</h3>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400">
            {currentSlide + 1} / {totalSlides}
          </div>

          {/* Slide Selector - positioned at right top of the entire component */}
          {showSlideSelector && onSlideSelect && (
            <div className="absolute top-2 right-4 flex items-center gap-2 bg-gray-800 border border-gray-600 rounded px-2 py-1">
              <span className="text-xs text-gray-500">跳转到:</span>
              <select
                value={currentSlide}
                onChange={(e) => onSlideSelect(Number(e.target.value))}
                className="bg-transparent text-sm text-white focus:outline-none"
              >
                {Array.from({ length: totalSlides }, (_, i) => (
                  <option key={i} value={i}>
                    第 {i + 1} 页
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Toggle Buttons - positioned at center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2">
          {/* Video Toggle Button */}
          {showVideoToggle && onToggleVideo && (
            <button
              onClick={onToggleVideo}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              {showVideoPreview ? '显示图片' : '显示视频'}
            </button>
          )}
          {/* Image/PPT Toggle Button */}
          {hasGeneratedImage && originalImageUrl && onToggleImage && (
            <button
              onClick={onToggleImage}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              {showGeneratedImage ? '显示PPT' : '显示AI图'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex justify-center items-center min-h-[300px]">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-300">正在处理中...</p>
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
          <div className="relative group">
            <img
              src={imageUrl}
              alt={`幻灯片 ${slideNumber}`}
              className="w-full max-h-[80vh] object-contain"
            />

            {/* Hover Controls */}
            {showImageControls && showGeneratedImage && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <button
                  onClick={onImageFullscreen}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30"
                >
                  🔍 全屏查看
                </button>
                <button
                  onClick={onImageDownload}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30"
                >
                  ⬇️ 下载图片
                </button>
              </div>
            )}

            {/* Image Info Overlay - only for generated images */}
            {showGeneratedImage && generatedImageInfo && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm text-white p-3 rounded-b-lg">
                <div className="text-sm space-y-1">
                  <div className="font-medium">提示词: {generatedImageInfo.prompt}</div>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div>生成时间: {generatedImageInfo.generationTime}秒</div>
                    <div>图片尺寸: {generatedImageInfo.width} × {generatedImageInfo.height}</div>
                    <div>使用模型: {generatedImageInfo.provider}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : originalImageUrl ? (
          <div className="relative group">
            <img
              src={originalImageUrl}
              alt={`幻灯片 ${slideNumber}`}
              className="w-full max-h-[80vh] object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <div className="text-4xl">📄</div>
            </div>
            <h3 className="text-xl font-bold text-gray-300 mb-2">无图片</h3>
            <p className="text-gray-500 max-w-md">当前幻灯片没有可用图片</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <SlideNavigation
        currentSlide={currentSlide}
        totalSlides={totalSlides}
        onPreviousSlide={onPreviousSlide}
        onNextSlide={onNextSlide}
      />
    </div>
  );
};