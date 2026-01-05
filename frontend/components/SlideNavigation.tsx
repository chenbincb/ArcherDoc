import React from 'react';

interface SlideNavigationProps {
  currentSlide: number;
  totalSlides: number;
  onPreviousSlide: () => void;
  onNextSlide: () => void;
  className?: string;
  isTextMode?: boolean;
}

export const SlideNavigation: React.FC<SlideNavigationProps> = ({
  currentSlide,
  totalSlides,
  onPreviousSlide,
  onNextSlide,
  className = "",
  isTextMode
}) => {
  return (
    <div className={`p-4 border-t border-gray-700 relative ${className}`}>
      <div className="flex items-center justify-between">
        <button
          onClick={onPreviousSlide}
          disabled={currentSlide === 0}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
        >
          ← {isTextMode ? '上一个' : '上一页'}
        </button>

        {/* Progress Bar */}
        <div className="flex-1 mx-6 max-w-xs">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
            />
          </div>
        </div>

        <button
          onClick={onNextSlide}
          disabled={currentSlide === totalSlides - 1}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
        >
          {isTextMode ? '下一个' : '下一页'} →
        </button>

      </div>
    </div>
  );
};