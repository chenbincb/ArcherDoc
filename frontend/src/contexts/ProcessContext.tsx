import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { TranslationStats, VideoGenerationStats, ArticleGenerationStats, ImageGenerationStats, VideoResult, ArticleResult, ImageResult } from '../types';

interface ProcessContextType {
    isProcessing: boolean;
    setIsProcessing: (isProcessing: boolean) => void;
    progress: number;
    setProgress: (progress: number) => void;
    statusMessage: string;
    setStatusMessage: (message: string) => void;
    processingDetail: string;
    setProcessingDetail: (detail: string) => void;
    error: string | null;
    setError: (error: string | null) => void;
    logs: string[];
    addLog: (msg: string) => void;
    clearLogs: () => void;

    // Results
    resultBlob: Blob | null;
    setResultBlob: (blob: Blob | null) => void;
    downloadName: string;
    setDownloadName: (name: string) => void;

    // Stats
    stats: TranslationStats | null;
    setStats: (stats: TranslationStats | null) => void;
    videoStats: VideoGenerationStats | null;
    setVideoStats: (stats: VideoGenerationStats | null) => void;
    articleStats: ArticleGenerationStats | null;
    setArticleStats: (stats: ArticleGenerationStats | null) => void;
    imageStats: ImageGenerationStats | null;
    setImageStats: (stats: ImageGenerationStats | null) => void;

    // Artifact Results
    videoResult: VideoResult | null;
    setVideoResult: (result: VideoResult | null) => void;
    articleResult: ArticleResult | null;
    setArticleResult: (result: ArticleResult | null) => void;
    imageResult: ImageResult | null;
    setImageResult: (result: ImageResult | null) => void;

    // Video State (Intermediate)
    slideImages: string[];
    setSlideImages: (images: string[]) => void;
    slideScripts: string[];
    setSlideScripts: (scripts: string[]) => void;
    audioBlobs: Blob[];
    setAudioBlobs: (blobs: Blob[]) => void;
}

const ProcessContext = createContext<ProcessContextType | undefined>(undefined);

export const ProcessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [processingDetail, setProcessingDetail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [downloadName, setDownloadName] = useState('');

    const [stats, setStats] = useState<TranslationStats | null>(null);
    const [videoStats, setVideoStats] = useState<VideoGenerationStats | null>(null);
    const [articleStats, setArticleStats] = useState<ArticleGenerationStats | null>(null);
    const [imageStats, setImageStats] = useState<ImageGenerationStats | null>(null);

    const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
    const [articleResult, setArticleResult] = useState<ArticleResult | null>(null);
    const [imageResult, setImageResult] = useState<ImageResult | null>(null);

    const [slideImages, setSlideImages] = useState<string[]>([]);
    const [slideScripts, setSlideScripts] = useState<string[]>([]);
    const [audioBlobs, setAudioBlobs] = useState<Blob[]>([]);

    const addLog = useCallback((msg: string) => {
        setLogs(prev => {
            const newLogs = [...prev, msg];
            if (newLogs.length > 8) newLogs.shift();
            return newLogs;
        });
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    const value = {
        isProcessing, setIsProcessing,
        progress, setProgress,
        statusMessage, setStatusMessage,
        processingDetail, setProcessingDetail,
        error, setError,
        logs, addLog, clearLogs,
        resultBlob, setResultBlob,
        downloadName, setDownloadName,
        stats, setStats,
        videoStats, setVideoStats,
        articleStats, setArticleStats,
        imageStats, setImageStats,
        videoResult, setVideoResult,
        articleResult, setArticleResult,
        imageResult, setImageResult,
        slideImages, setSlideImages,
        slideScripts, setSlideScripts,
        audioBlobs, setAudioBlobs
    };

    return (
        <ProcessContext.Provider value={value}>
            {children}
        </ProcessContext.Provider>
    );
};

export const useProcess = () => {
    const context = useContext(ProcessContext);
    if (context === undefined) {
        throw new Error('useProcess must be used within a ProcessProvider');
    }
    return context;
};
