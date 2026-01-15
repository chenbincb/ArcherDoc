import React from 'react';
import { safeGoHome } from '../utils/navigationHelper';

interface NavbarProps {
    currentPage: 'home' | 'video' | 'article' | 'image';
    installPrompt: any;
    handleInstallApp: () => void;
    setIsSettingsOpen: (isOpen: boolean) => void;
    hasApiKey: boolean;
    isOllama: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
    currentPage,
    installPrompt,
    handleInstallApp,
    setIsSettingsOpen,
    hasApiKey,
    isOllama
}) => {
    return (
        <nav className="border-b border-gray-800 bg-dark/50 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div 
                        onClick={safeGoHome}
                        className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20 cursor-pointer hover:scale-105 transition-transform"
                    >
                        AI
                    </div>
                    <div className="flex items-center gap-3">
                        <span 
                            onClick={safeGoHome}
                            className="font-bold text-lg tracking-tight cursor-pointer"
                        >
                            ArcherDoc AI
                        </span>
                        {currentPage !== 'home' && (
                            <>
                                <span className="text-gray-400">/</span>
                                <span className="text-sm text-gray-300">
                                    {currentPage === 'video' && '视频文案审核'}
                                    {currentPage === 'article' && '文章预览'}
                                    {currentPage === 'image' && 'AI生图审核'}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {currentPage !== 'home' && (
                        <button
                            onClick={safeGoHome}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                            <span>🏠</span>
                            <span>返回首页</span>
                        </button>
                    )}
                    {currentPage === 'home' && installPrompt && (
                        <button onClick={handleInstallApp} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-primary hover:text-white transition-all text-sm font-medium border border-primary/50">
                            <span>⬇️ 安装应用</span>
                        </button>
                    )}
                    <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-sm font-medium border border-gray-700">
                        <span>⚙️ 设置</span>
                        {currentPage === 'home' && (!hasApiKey && !isOllama) && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                    </button>
                </div>
            </div>
        </nav>
    );
};
