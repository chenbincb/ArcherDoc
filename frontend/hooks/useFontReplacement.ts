import { useState, useCallback } from 'react';
import { useProcess } from '../contexts/ProcessContext';
import { replaceGlobalFonts } from '../services/pptxService';

export const useFontReplacement = () => {
    const {
        setIsProcessing,
        setProgress,
        setStatusMessage,
        setProcessingDetail,
        addLog,
        clearLogs,
        setError,
        setStats,
        setResultBlob,
        setDownloadName
    } = useProcess();

    const [selectedFont, setSelectedFont] = useState<string>(() => {
        // 从localStorage中获取上次选择的字体，默认为思源黑体
        return localStorage.getItem('archerdoc-ai-last-font') || 'Source Han Sans CN';
    });

    const startFontReplacement = useCallback(async (file: File, fontName: string) => {
        if (!file) return;

        setSelectedFont(fontName);
        // 将选择的字体保存到localStorage
        localStorage.setItem('archerdoc-ai-last-font', fontName);

        setIsProcessing(true);
        setProgress(5);
        setStatusMessage("FONT_REPLACE"); // Custom status for magic text
        setProcessingDetail(fontName);
        clearLogs();
        addLog(`正在扫描所有幻灯片和母版，准备替换为${fontName}...`);
        setError(null);
        setStats(null); // Clear stats as this isn't translation
        setResultBlob(null);

        try {
            const blob = await replaceGlobalFonts(file, fontName, (msg, prog) => {
                setProgress(prog);
                addLog(msg);
            });

            setResultBlob(blob);
            setDownloadName(`${file.name.replace('.pptx', '')}_${fontName.replace(/\s+/g, '')}.pptx`);

            setStatusMessage("完成");
            setProcessingDetail("字体替换成功");
            addLog(`所有页面和母版字体已更新为${fontName}。`);
        } catch (err: any) {
            setError(err.message || "字体替换失败");
            setStatusMessage("失败");
            addLog(`错误: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    }, [
        setIsProcessing,
        setProgress,
        setStatusMessage,
        setProcessingDetail,
        addLog,
        clearLogs,
        setError,
        setStats,
        setResultBlob,
        setDownloadName
    ]);

    // 根据字体名称获取显示名称
    const getFontDisplayName = useCallback((fontName: string): string => {
        const commonChineseFonts = [
            { name: 'Source Han Sans CN', displayName: '思源黑体' },
            { name: 'Microsoft YaHei', displayName: '微软雅黑' },
            { name: 'SimSun', displayName: '宋体' },
            { name: 'SimHei', displayName: '黑体' },
            { name: 'KaiTi', displayName: '楷体' },
            { name: 'FangSong', displayName: '仿宋' },
            { name: 'NSimSun', displayName: '新宋体' },
            { name: 'PingFang SC', displayName: '苹方' },
            { name: 'Heiti SC', displayName: '黑体-简' },
            { name: 'Songti SC', displayName: '宋体-简' },
            { name: 'Kaiti SC', displayName: '楷体-简' },
            { name: 'Hiragino Sans GB', displayName: '冬青黑体' },
            { name: 'STXihei', displayName: '华文黑体' },
            { name: 'STKaiti', displayName: '华文楷体' },
            { name: 'STSong', displayName: '华文宋体' },
            { name: 'STFangsong', displayName: '华文仿宋' },
            { name: 'STZhongsong', displayName: '华文中宋' }
        ];

        const font = commonChineseFonts.find(f => f.name === fontName);
        return font ? font.displayName : fontName;
    }, []);

    return { startFontReplacement, selectedFont, setSelectedFont, getFontDisplayName };
};
