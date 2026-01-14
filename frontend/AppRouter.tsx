import React, { useState, useEffect } from 'react';
import { useSettings } from './contexts/SettingsContext';
import { SettingsModal } from './components/SettingsModal';
import { safeGoHome } from './utils/navigationHelper';
import App from './App';

// Lazy load pages
const VideoReviewPage = React.lazy(() => import('./pages/VideoReviewPage'));
const ArticleReviewPage = React.lazy(() => import('./pages/ArticleReviewPage'));
const ImageReviewPage = React.lazy(() => import('./pages/ImageReviewPage').then(module => ({ default: module.ImageReviewPage })));

const AppRouter: React.FC = () => {
    // Track current page type for dynamic header content
    const [currentPage, setCurrentPage] = useState<'home' | 'video' | 'article' | 'image'>('home');

    // Check current page based on URL
    useEffect(() => {
        const checkCurrentPage = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const jobIdParam = urlParams.get('jobId');
            const articleJobIdParam = urlParams.get('articleJobId');
            const imageJobIdParam = urlParams.get('imageJobId');

            let newPage: 'home' | 'video' | 'article' | 'image';
            if (jobIdParam) {
                newPage = 'video';
            } else if (articleJobIdParam) {
                newPage = 'article';
            } else if (imageJobIdParam) {
                newPage = 'image';
            } else {
                newPage = 'home';
            }

            setCurrentPage(newPage);
        };

        // Check initial URL
        checkCurrentPage();

        // Listen for URL changes
        window.addEventListener('popstate', checkCurrentPage);
        window.addEventListener('urlchange', checkCurrentPage);

        return () => {
            window.removeEventListener('popstate', checkCurrentPage);
            window.removeEventListener('urlchange', checkCurrentPage);
        };
    }, []);

    // Get settings from context
    const { settings, saveSettings: setSettings } = useSettings();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsInitialTab, setSettingsInitialTab] = useState<'ai' | 'translation' | 'video' | 'image'>('ai');

    // Function to open settings with specific tab and subTab
    const handleOpenSettings = (options?: { tab?: 'ai' | 'translation' | 'video' | 'image'; subTab?: string }) => {
        if (options?.tab) {
            setSettingsInitialTab(options.tab);
        }
        // Store subTab info in localStorage for SettingsModal to use
        if (options?.subTab) {
            localStorage.setItem('settings-subtab', options.subTab);
        }
        setIsSettingsOpen(true);
    };

    // If URL has jobId parameter, show video review page
    if (currentPage === 'video') {
        return (
            <>
                <div className="min-h-screen bg-dark text-gray-100 font-sans selection:bg-primary selection:text-white">
                    {/* Unified Navigation */}
                    <nav className="border-b border-gray-800 bg-dark/50 backdrop-blur-md sticky top-0 z-40">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
                                    AI
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg tracking-tight">ArcherDoc AI</span>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-sm text-gray-300">视频文案审核</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={safeGoHome}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                                >
                                    <span>🏠</span>
                                    <span>返回首页</span>
                                </button>
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-sm font-medium border border-gray-700"
                                >
                                    <span>⚙️ 设置</span>
                                </button>
                            </div>
                        </div>
                    </nav>

                    <React.Suspense fallback={<div className="text-center mt-20 text-gray-400">加载视频预览页面中...</div>}>
                        <VideoReviewPage
                            jobId={new URLSearchParams(window.location.search).get('jobId') || ''}
                            videoSettings={settings.videoSettings}
                            onOpenSettings={handleOpenSettings}
                            settings={settings}
                            onSaveSettings={setSettings}
                        />
                    </React.Suspense>
                </div>

                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    settings={settings}
                    onSave={setSettings}
                    initialTab={settingsInitialTab}
                />
            </>
        );
    }

    // If URL has articleJobId parameter, show article review page
    if (currentPage === 'article') {
        return (
            <>
                <div className="min-h-screen bg-dark text-gray-100 font-sans selection:bg-primary selection:text-white">
                    {/* Unified Navigation */}
                    <nav className="border-b border-gray-800 bg-dark/50 backdrop-blur-md sticky top-0 z-40">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
                                    AI
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg tracking-tight">ArcherDoc AI</span>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-sm text-gray-300">文章预览</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={safeGoHome}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                                >
                                    <span>🏠</span>
                                    <span>返回首页</span>
                                </button>
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-sm font-medium border border-gray-700"
                                >
                                    <span>⚙️ 设置</span>
                                </button>
                            </div>
                        </div>
                    </nav>

                    <React.Suspense fallback={<div className="text-center mt-20 text-gray-400">加载文章预览页面中...</div>}>
                        <ArticleReviewPage
                            articleJobId={new URLSearchParams(window.location.search).get('articleJobId') || ''}
                            onOpenSettings={handleOpenSettings}
                            settings={settings}
                            onSaveSettings={setSettings}
                        />
                    </React.Suspense>
                </div>

                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    settings={settings}
                    onSave={setSettings}
                    initialTab={settingsInitialTab}
                />
            </>
        );
    }

    // If URL has imageJobId parameter, show image review page
    if (currentPage === 'image') {
        return (
            <>
                <div className="min-h-screen bg-dark text-gray-100 font-sans selection:bg-primary selection:text-white">
                    {/* Unified Navigation */}
                    <nav className="border-b border-gray-800 bg-dark/50 backdrop-blur-md sticky top-0 z-40">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
                                    AI
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg tracking-tight">ArcherDoc AI</span>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-sm text-gray-300">AI生图审核</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={safeGoHome}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                                >
                                    <span>🏠 返回首页</span>
                                </button>
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-sm font-medium border border-gray-700"
                                >
                                    <span>⚙️ 设置</span>
                                </button>
                            </div>
                        </div>
                    </nav>

                    <React.Suspense fallback={<div className="text-center mt-20 text-gray-400">加载AI配图页面中...</div>}>
                        <ImageReviewPage
                            imageJobId={new URLSearchParams(window.location.search).get('imageJobId') || ''}
                            onOpenSettings={handleOpenSettings}
                            settings={settings}
                            onSaveSettings={setSettings}
                        />
                    </React.Suspense>
                </div>

                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    settings={settings}
                    onSave={setSettings}
                    initialTab={settingsInitialTab}
                />
            </>
        );
    }

    // Otherwise, show main page
    return <App />;
};

export default AppRouter;
