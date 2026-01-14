import React from 'react';
import { StatsChart } from './StatsChart';
import { AppSettings, TranslationStats, VideoGenerationStats } from '../types';

interface DashboardStatsProps {
    stats: TranslationStats | null;
    videoStats: VideoGenerationStats | null;
    settings: AppSettings;
    setIsSettingsOpen: (isOpen: boolean) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
    stats,
    videoStats,
    settings,
    setIsSettingsOpen
}) => {
    if (!stats && !videoStats) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                {/* Stats Chart for translation */}
                {stats && (
                    <div className="bg-card border border-gray-700 rounded-xl p-6 shadow-lg">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">实时数据</h3>
                        <StatsChart stats={stats} />
                    </div>
                )}

                {/* Video Stats */}
                {videoStats && (
                    <div className="bg-card border border-gray-700 rounded-xl p-6 shadow-lg">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">视频生成统计</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">幻灯片数量</span><span className="text-primary">{videoStats.slidesProcessed} / {videoStats.totalSlides}</span></div>
                            <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">视频时长</span><span className="text-primary">{videoStats.videoDuration.toFixed(1)} 秒</span></div>
                            <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">音频生成</span><span className="text-primary">{videoStats.audioGenerated} / {videoStats.totalAudio}</span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Config Overview - Only show for translation (when stats exist) */}
            {stats && (
                <div className="space-y-6">
                    <div className="bg-card border border-gray-700 rounded-xl p-6 shadow-lg flex flex-col">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">配置概览</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">目标语言</span><span className="text-primary">{settings.targetLanguage}</span></div>
                            <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">提供商</span><span className="text-white">{settings.activeProvider}</span></div>
                        </div>

                        {settings.glossary && settings.glossary.length > 0 && (
                            <div className="mt-4">
                                <div className="text-xs text-gray-400 mb-2 flex justify-between items-center">
                                    <span>专有名词表</span>
                                    <span className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px]">{settings.glossary.length}</span>
                                </div>
                                <div className="bg-gray-900/50 rounded border border-gray-800 p-2 max-h-[120px] overflow-y-auto custom-scrollbar space-y-1.5">
                                    {settings.glossary.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs gap-2">
                                            <span className="text-gray-300 truncate max-w-[80px]" title={item.term}>{item.term}</span>
                                            <span className="text-gray-600 text-[10px]">➜</span>
                                            <span className="text-green-400 truncate max-w-[80px]" title={item.translation}>{item.translation}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button onClick={() => setIsSettingsOpen(true)} className="w-full mt-6 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-white font-medium">编辑配置</button>
                    </div>
                </div>
            )}
        </div>
    );
};
