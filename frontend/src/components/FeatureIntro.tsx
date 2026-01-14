import React, { useState, useEffect } from 'react';

interface FeatureIntroProps {
    isHovering: boolean;
    hoveredIndex: number;
}

const FeatureIntro: React.FC<FeatureIntroProps> = ({ isHovering, hoveredIndex }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState(1);
    const [currentOpacity, setCurrentOpacity] = useState(1);
    const [nextOpacity, setNextOpacity] = useState(0);

    // Extended feature descriptions with ~50 characters each
    const features = [
        "AI技术精准翻译文档内容，保持原文件的排版、字体和风格不变，无需手动调整格式",
        "自动为文档生成专业演讲文稿，结合AI语音合成技术，快速生成高质量动态讲解视频",
        "将文档内容转换为适合公众号、小红书、微博等平台的专业文章，节省内容创作时间",
        "批量统一文档中所有文字的字体，支持自定义字体，确保文档风格一致，提升专业感",
        "基于文档内容智能生成相关配图，支持多种AI模型，一键提升文档视觉效果和专业度"
    ];

    useEffect(() => {
        if (isHovering) {
            // If hovering, immediately show the hovered feature
            setCurrentIndex(hoveredIndex);
            setCurrentOpacity(1);
            setNextOpacity(0);
            return;
        }

        // Configuration
        const holdDuration = 3000; // Hold fully visible text for 3 seconds
        const fadeDuration = 1000; // Fade transition takes 1 second
        const overlapDuration = 500; // Overlap between fades is 0.5 seconds

        const startCycle = () => {
            // Reset opacities for new cycle
            setCurrentOpacity(1);
            setNextOpacity(0);

            // Set next index
            const newNextIndex = (currentIndex + 1) % features.length;
            setNextIndex(newNextIndex);

            // Hold current text fully visible for holdDuration
            const holdTimer = setTimeout(() => {
                // Start cross fade animation
                const startTime = Date.now();

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / fadeDuration, 1);

                    // Calculate opacities with overlap
                    if (elapsed <= overlapDuration) {
                        // First half: both texts fading with overlap
                        setCurrentOpacity(1 - (progress * 2)); // Current fades out faster
                        setNextOpacity(progress * 2); // Next fades in faster
                    } else {
                        // Second half: continue fade
                        setCurrentOpacity(0); // Current fully faded out
                        setNextOpacity(0.5 + (progress - 0.5) * 2); // Next continues to full opacity
                    }

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        // Fade complete, update index and start next cycle
                        setCurrentIndex(newNextIndex);
                        clearTimeout(holdTimer);
                        startCycle();
                    }
                };

                animate();
            }, holdDuration);

            return () => clearTimeout(holdTimer);
        };

        // Initial cycle
        startCycle();
    }, [currentIndex, isHovering, hoveredIndex]);

    return (
        <div className="relative text-center">
            {/* Current feature text */}
            <div
                className="absolute inset-0 transition-opacity duration-1000 ease-in-out text-gray-400 text-lg"
                style={{ opacity: currentOpacity, zIndex: 1 }}
            >
                <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-gray-400 via-white to-gray-400 animate-shimmer">
                    {isHovering ? features[hoveredIndex] : features[currentIndex]}
                </span>
            </div>

            {/* Next feature text (only for cycling, not for hover) */}
            {!isHovering && (
                <div
                    className="absolute inset-0 transition-opacity duration-1000 ease-in-out text-gray-400 text-lg"
                    style={{ opacity: nextOpacity, zIndex: 2 }}
                >
                    <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-gray-400 via-white to-gray-400 animate-shimmer">
                        {features[nextIndex]}
                    </span>
                </div>
            )}
        </div>
    );
};

export default FeatureIntro;
