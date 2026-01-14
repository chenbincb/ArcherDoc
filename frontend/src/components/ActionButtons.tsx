import React from 'react';

interface ActionButtonsProps {
    file: File;
    startVideoGeneration: (file: File) => void;
    startImageGeneration: (file: File) => void;
    setIsArticleSettingsOpen: (isOpen: boolean) => void;
    startTranslation: () => void;
    handleFontReplacement: () => void;
    selectedFont: string;
    getFontDisplayName: (font: string) => string;
    setIsHovering: (isHovering: boolean) => void;
    setHoveredIndex: (index: number) => void;
    startError: (msg: string) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    file,
    startVideoGeneration,
    startImageGeneration,
    setIsArticleSettingsOpen,
    startTranslation,
    handleFontReplacement,
    selectedFont,
    getFontDisplayName,
    setIsHovering,
    setHoveredIndex,
    startError
}) => {
    return (
        <div className="flex flex-wrap justify-center gap-5 animate-in fade-in slide-in-from-top-2">
            {/* Video Generation - Only for PPTX */}
            {file.name.toLowerCase().endsWith('.pptx') && (
                <button
                    onClick={() => {
                        if (file) {
                            startVideoGeneration(file);
                        }
                    }}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 p-5 transition-all hover:shadow-lg hover:shadow-purple-500/25 active:scale-95 text-left flex items-center gap-4 animate-in fade-in min-w-[260px] flex-1 max-w-[340px]"
                    onMouseEnter={() => { setIsHovering(true); setHoveredIndex(1); }}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    <div className="relative z-10 bg-white/20 p-3 rounded-lg backdrop-blur-sm shrink-0 flex items-center justify-center w-14 h-14">
                        <span className="font-serif font-bold text-white text-xl">🎬</span>
                    </div>
                    <div className="relative z-10 flex flex-col">
                        <div className="font-bold text-white text-lg">视频配音</div>
                        <div className="text-xs text-purple-100 opacity-90">AI讲稿+语音合成</div>
                    </div>
                    {/* Decorative glow */}
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                </button>
            )}

            <button
                onClick={() => {
                    if (file) {
                        startImageGeneration(file);
                    }
                }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 p-5 transition-all hover:shadow-lg hover:shadow-orange-500/25 active:scale-95 text-left flex items-center gap-4 min-w-[260px] flex-1 max-w-[340px]"
                onMouseEnter={() => { setIsHovering(true); setHoveredIndex(4); }}
                onMouseLeave={() => setIsHovering(false)}
            >
                <div className="relative z-10 bg-white/20 p-3 rounded-lg backdrop-blur-sm shrink-0 flex items-center justify-center w-14 h-14">
                    <span className="font-serif font-bold text-white text-xl">🎨</span>
                </div>
                <div className="relative z-10 flex flex-col">
                    <div className="font-bold text-white text-lg">AI配图</div>
                    <div className="text-xs text-orange-100 opacity-90">智能插图生成</div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
            </button>

            <button
                onClick={() => {
                    if (!file) {
                        startError("请先选择一个文件");
                        return;
                    }
                    // Open article settings dialog instead of direct generation
                    setIsArticleSettingsOpen(true);
                }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 p-5 transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 text-left flex items-center gap-4 min-w-[260px] flex-1 max-w-[340px]"
                onMouseEnter={() => { setIsHovering(true); setHoveredIndex(2); }}
                onMouseLeave={() => setIsHovering(false)}
            >
                <div className="relative z-10 bg-white/20 p-3 rounded-lg backdrop-blur-sm shrink-0 flex items-center justify-center w-14 h-14">
                    <span className="font-serif font-bold text-white text-xl">📝</span>
                </div>
                <div className="relative z-10 flex flex-col">
                    <div className="font-bold text-white text-lg">文章撰写</div>
                    <div className="text-xs text-blue-100 opacity-90">AI软文生成</div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
            </button>

            <button
                onClick={startTranslation}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-blue-600 p-5 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-95 text-left flex items-center gap-4 min-w-[260px] flex-1 max-w-[340px]"
                onMouseEnter={() => { setIsHovering(true); setHoveredIndex(0); }}
                onMouseLeave={() => setIsHovering(false)}
            >
                <div className="relative z-10 bg-white/20 p-3 rounded-lg backdrop-blur-sm shrink-0">
                    <div className="text-2xl">🚀</div>
                </div>
                <div className="relative z-10 flex flex-col">
                    <div className="font-bold text-white text-lg">文本翻译</div>
                    <div className="text-xs text-blue-100 opacity-90">保持排版，智能翻译</div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
            </button>

            {/* Font Replacement - Only for PPTX */}
            {file.name.toLowerCase().endsWith('.pptx') && (
                <button
                    onClick={handleFontReplacement}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-secondary to-emerald-600 p-5 transition-all hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95 text-left flex items-center gap-4 animate-in fade-in min-w-[260px] flex-1 max-w-[340px]"
                    onMouseEnter={() => { setIsHovering(true); setHoveredIndex(3); }}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    <div className="relative z-10 bg-white/20 p-3 rounded-lg backdrop-blur-sm shrink-0 flex items-center justify-center w-14 h-14">
                        <span className="font-serif font-bold text-white text-xl">Aa</span>
                    </div>
                    <div className="relative z-10 flex flex-col">
                        <div className="font-bold text-white text-lg">字体统一</div>
                        <div className="text-xs text-emerald-100 opacity-90">一键转为{getFontDisplayName(selectedFont)}</div>
                    </div>
                    {/* Decorative glow */}
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                </button>
            )}
        </div>
    );
};
