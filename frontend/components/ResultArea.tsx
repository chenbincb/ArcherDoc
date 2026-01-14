import React from 'react';

interface ResultAreaProps {
    resultBlob: Blob | null;
    clearFile: () => void;
    setIsFontSelectionOpen: (isOpen: boolean) => void;
    downloadResult: () => void;
}

export const ResultArea: React.FC<ResultAreaProps> = ({
    resultBlob,
    clearFile,
    setIsFontSelectionOpen,
    downloadResult
}) => {
    if (!resultBlob) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h3 className="text-lg font-bold text-white">处理完成！</h3>
                <p className="text-sm text-gray-400">您的文档已准备好下载。</p>
            </div>
            <div className="flex gap-4">
                <button
                    onClick={() => {
                        // Reset all states and return to homepage
                        clearFile();
                    }}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
                >
                    <span>🏠 返回首页</span>
                </button>
                <button
                    onClick={() => {
                        // Open font selection modal for re-generation
                        setIsFontSelectionOpen(true);
                    }}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
                >
                    <span>🔄 重新生成</span>
                </button>
                <button onClick={downloadResult} className="px-6 py-3 bg-secondary hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95">
                    <span>⬇️ 下载文件</span>
                </button>
            </div>
        </div>
    );
};
