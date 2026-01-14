import React from 'react';
import { MagicTextDisplay } from './MagicTextDisplay';

interface ProcessStatusProps {
    isProcessing: boolean;
    progress: number;
    statusMessage: string;
    processingDetail: string;
    logs: string[];
    logsEndRef: React.RefObject<HTMLDivElement>;
}

export const ProcessStatus: React.FC<ProcessStatusProps> = ({
    isProcessing,
    progress,
    statusMessage,
    processingDetail,
    logs,
    logsEndRef
}) => {
    if (!isProcessing && logs.length === 0) {
        return null;
    }

    return (
        <div className="bg-card border border-gray-700 rounded-xl overflow-hidden shadow-xl flex flex-col">
            {/* Magic Visualization Area */}
            <div className="p-6 border-b border-gray-700 bg-gray-800/50">
                <div className="flex justify-between text-sm font-medium text-gray-300 mb-4">
                    <span className="flex items-center gap-2">
                        {isProcessing && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>}
                        {isProcessing ? '处理中...' : '空闲'}
                    </span>
                    <span>{Math.round(progress)}%</span>
                </div>

                <MagicTextDisplay status={statusMessage} text={processingDetail} />

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
    );
};
