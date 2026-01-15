import React, { useState, useEffect } from 'react';
import { useSettings } from './contexts/SettingsContext';
import { SettingsModal } from './components/SettingsModal';
import { Navbar } from './components/Navbar';
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
                    <Navbar
                        currentPage="video"
                        installPrompt={null}
                        handleInstallApp={() => {}}
                        setIsSettingsOpen={setIsSettingsOpen}
                        hasApiKey={true}
                        isOllama={false}
                    />

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
                    <Navbar
                        currentPage="article"
                        installPrompt={null}
                        handleInstallApp={() => {}}
                        setIsSettingsOpen={setIsSettingsOpen}
                        hasApiKey={true}
                        isOllama={false}
                    />

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
                    <Navbar
                        currentPage="image"
                        installPrompt={null}
                        handleInstallApp={() => {}}
                        setIsSettingsOpen={setIsSettingsOpen}
                        hasApiKey={true}
                        isOllama={false}
                    />

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
