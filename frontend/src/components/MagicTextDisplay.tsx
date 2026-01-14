import React, { useState, useEffect } from 'react';

interface MagicTextDisplayProps {
    status: string;
    text: string;
}

export const MagicTextDisplay: React.FC<MagicTextDisplayProps> = ({ status, text }) => {
    const [displayContent, setDisplayContent] = useState<{text: string, mode: 'idle' | 'shimmer' | 'morph'}>({
        text: '等待内容...',
        mode: 'idle'
    });

    useEffect(() => {
        // Handle special event statuses
        if (status === 'TRANSLATING_START' || status === 'TRANSLATING_END' ||
            status === 'FONT_REPLACE' || status === 'MERGING_VIDEO' ||
            status === 'MERGING_COMPLETE' || status === 'GENERATING_AUDIO' ||
            status === 'GENERATING_VIDEO' || status === 'GENERATING_IMAGE') {
            if (status === 'TRANSLATING_START' || status === 'FONT_REPLACE' ||
                status === 'MERGING_VIDEO' || status === 'GENERATING_AUDIO' ||
                status === 'GENERATING_VIDEO' || status === 'GENERATING_IMAGE') {
                setDisplayContent({ text: text, mode: 'shimmer' });
            } else if (status === 'TRANSLATING_END' || status === 'MERGING_COMPLETE') {
                setDisplayContent({ text: text, mode: 'morph' });
            }
        } 
        // Handle regular text statuses for video generation and other processes
        else if (status && status.trim() !== '') {
            setDisplayContent({ text: text || status, mode: 'shimmer' });
        }
    }, [status, text]);

    return (
        <div className="relative w-full h-32 flex items-center justify-center p-4 bg-black/40 rounded-xl border border-gray-700 overflow-hidden">
            {/* Grid Background */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            
            <div className={`relative text-center transition-all duration-500 max-w-full
                ${displayContent.mode === 'morph' ? 'animate-morph' : ''}
            `}>
                 {displayContent.mode === 'shimmer' ? (
                     <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-500 via-white to-gray-500 animate-shimmer select-none overflow-hidden text-ellipsis whitespace-nowrap">
                         {displayContent.text}
                     </h3>
                 ) : displayContent.mode === 'morph' ? (
                     <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-secondary to-emerald-200 drop-shadow-sm overflow-hidden text-ellipsis whitespace-nowrap">
                         {displayContent.text}
                     </h3>
                 ) : (
                     <span className="text-gray-500 text-sm italic">AI 已准备好...</span>
                 )}
                 
                 {displayContent.mode === 'shimmer' && (
                     <div className="mt-2 text-xs text-primary uppercase tracking-widest animate-pulse">
                        {status === 'FONT_REPLACE' ? '正在修改样式...' :
                         status === 'MERGING_VIDEO' ? '正在合并视频...' :
                         status === 'GENERATING_AUDIO' ? '正在生成语音...' :
                         status === 'GENERATING_VIDEO' ? '正在生成视频...' :
                         status === 'GENERATING_IMAGE' ? '正在生成图片...' :
                         'AI 思考中...'}
                     </div>
                 )}
                 {displayContent.mode === 'morph' && (
                     <div className="mt-2 text-xs text-secondary uppercase tracking-widest">处理完成</div>
                 )}
            </div>
        </div>
    );
};
