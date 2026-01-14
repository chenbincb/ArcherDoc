import React, { useState, useCallback } from 'react';
import { useProcess } from '../contexts/ProcessContext';

export const useFileHandler = () => {
    const [file, setFile] = useState<File | null>(null);
    const {
        setError,
        setResultBlob,
        setStats,
        clearLogs,
        setProgress,
        setStatusMessage,
        setProcessingDetail,
        setVideoStats,
        setSlideImages,
        setSlideScripts,
        setAudioBlobs,
        setVideoResult,
        setArticleStats,
        setArticleResult,
        setImageStats,
        setImageResult
    } = useProcess();

    const resetState = useCallback(() => {
        setError(null);
        setResultBlob(null);
        setStats(null);
        clearLogs();
        setProgress(0);
        setStatusMessage('');
        setProcessingDetail('');
        setVideoStats(null);
        setSlideImages([]);
        setSlideScripts([]);
        setAudioBlobs([]);
        setVideoResult(null);
        setArticleStats(null);
        setArticleResult(null);
        setImageStats(null);
        setImageResult(null);
    }, [
        setError, setResultBlob, setStats, clearLogs, setProgress,
        setStatusMessage, setProcessingDetail, setVideoStats,
        setSlideImages, setSlideScripts, setAudioBlobs, setVideoResult,
        setArticleStats, setArticleResult, setImageStats, setImageResult
    ]);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            const ext = selectedFile.name.toLowerCase().split('.').pop();
            if (['pptx', 'docx', 'pdf', 'txt', 'md', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
                setFile(selectedFile);
                resetState();
            } else {
                setError("不支持的文件格式。请上传 PPTX, DOCX, PDF, TXT, MD, 或图片(JPG/PNG/GIF)。");
            }
        }
    }, [resetState, setError]);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const droppedFile = event.dataTransfer.files[0];
        if (droppedFile) {
            const ext = droppedFile.name.toLowerCase().split('.').pop();
            if (['pptx', 'docx', 'pdf', 'txt', 'md', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
                setFile(droppedFile);
                resetState();
            } else {
                setError("不支持的文件格式。请上传 PPTX, DOCX, PDF, TXT, MD, 或图片(JPG/PNG/GIF)。");
            }
        }
    }, [resetState, setError]);

    const clearFile = useCallback(() => {
        setFile(null);
        resetState();
    }, [resetState]);

    return {
        file,
        setFile,
        handleFileChange,
        handleDrop,
        clearFile
    };
};
