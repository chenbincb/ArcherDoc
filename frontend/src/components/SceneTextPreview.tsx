import React, { useEffect, useRef } from 'react';

interface SceneTextPreviewProps {
    content: string;
    highlightText?: string;
    title?: string;
    className?: string;
}

export const SceneTextPreview: React.FC<SceneTextPreviewProps> = ({
    content,
    highlightText,
    title,
    className = ""
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (highlightText && containerRef.current) {
            // 简单的滚动到高亮区域逻辑
            const elements = containerRef.current.querySelectorAll('.highlight-anchor');
            if (elements.length > 0) {
                elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightText]);

    // 处理文本高亮
    const renderContent = () => {
        if (!highlightText) return content;

        const parts = content.split(highlightText);
        if (parts.length <= 1) return content;

        return (
            <>
                {parts[0]}
                <span className="highlight-anchor bg-orange-500/30 border-b-2 border-orange-500 text-white font-medium px-1 rounded">
                    {highlightText}
                </span>
                {parts.slice(1).join(highlightText)}
            </>
        );
    };

    return (
        <div className={`flex flex-col h-full bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden ${className}`}>
            <div className="p-4 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-300">{title || '文档内容'}</h3>
                <span className="text-xs text-gray-500">视觉锚点模式</span>
            </div>
            <div
                ref={containerRef}
                className="p-6 overflow-y-auto leading-relaxed text-gray-300 text-sm whitespace-pre-wrap flex-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            >
                {content ? renderContent() : <div className="text-gray-600 italic">正在加载文档内容...</div>}
            </div>
        </div>
    );
};
