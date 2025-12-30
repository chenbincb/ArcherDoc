import React, { useState, useEffect } from 'react';

interface FontOption {
  name: string;
  displayName: string;
  category: string;
  platform: 'windows' | 'mac' | 'both';
}

interface FontSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fontName: string) => void;
  defaultFont?: string;
}

const commonChineseFonts: FontOption[] = [
  { name: 'Source Han Sans CN', displayName: '思源黑体', category: 'sans-serif', platform: 'both' },
  { name: 'Microsoft YaHei', displayName: '微软雅黑', category: 'sans-serif', platform: 'windows' },
  { name: 'SimSun', displayName: '宋体', category: 'serif', platform: 'windows' },
  { name: 'SimHei', displayName: '黑体', category: 'sans-serif', platform: 'windows' },
  { name: 'KaiTi', displayName: '楷体', category: 'serif', platform: 'windows' },
  { name: 'FangSong', displayName: '仿宋', category: 'serif', platform: 'windows' },
  { name: 'NSimSun', displayName: '新宋体', category: 'serif', platform: 'windows' },
  { name: 'PingFang SC', displayName: '苹方', category: 'sans-serif', platform: 'mac' },
  { name: 'Heiti SC', displayName: '黑体-简', category: 'sans-serif', platform: 'mac' },
  { name: 'Songti SC', displayName: '宋体-简', category: 'serif', platform: 'mac' },
  { name: 'Kaiti SC', displayName: '楷体-简', category: 'serif', platform: 'mac' },
  { name: 'Hiragino Sans GB', displayName: '冬青黑体', category: 'sans-serif', platform: 'mac' },
  { name: 'STXihei', displayName: '华文黑体', category: 'sans-serif', platform: 'both' },
  { name: 'STKaiti', displayName: '华文楷体', category: 'serif', platform: 'both' },
  { name: 'STSong', displayName: '华文宋体', category: 'serif', platform: 'both' },
  { name: 'STFangsong', displayName: '华文仿宋', category: 'serif', platform: 'both' },
  { name: 'STZhongsong', displayName: '华文中宋', category: 'serif', platform: 'both' }
];

const FontSelectionModal: React.FC<FontSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultFont = 'Source Han Sans CN'
}) => {
  const [selectedFont, setSelectedFont] = useState<string>(defaultFont);
  const [showAllFonts, setShowAllFonts] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  
  // 获取当前平台
  const getCurrentPlatform = (): 'windows' | 'mac' => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) {
      return 'windows';
    } else if (userAgent.includes('Mac')) {
      return 'mac';
    }
    return 'windows'; // 默认返回windows
  };
  
  const currentPlatform = getCurrentPlatform();
  
  // 过滤字体列表
  const filteredFonts = showAllFonts 
    ? commonChineseFonts 
    : commonChineseFonts.filter(font => font.platform === currentPlatform || font.platform === 'both');
  
  // 按字体类别分组
  const groupedFonts = filteredFonts.reduce((acc, font) => {
    if (!acc[font.category]) {
      acc[font.category] = [];
    }
    acc[font.category].push(font);
    return acc;
  }, {} as Record<string, FontOption[]>);
  
  // 字体类别显示名称
  const categoryDisplayNames: Record<string, string> = {
    'sans-serif': '无衬线字体',
    'serif': '衬线字体',
    'monospace': '等宽字体'
  };
  
  // 根据字体名称获取显示名称
  const getFontDisplayName = (fontName: string): string => {
    const font = commonChineseFonts.find(f => f.name === fontName);
    return font ? font.displayName : fontName;
  };
  
  // 当模态框打开时重置状态
  useEffect(() => {
    if (isOpen) {
      setSelectedFont(defaultFont);
      setIsConfirming(false);
    }
  }, [isOpen, defaultFont]);
  
  // 处理确认按钮点击
  const handleConfirm = () => {
    setIsConfirming(true);
    onConfirm(selectedFont);
    onClose();
  };
  
  // 如果模态框未打开，不渲染任何内容
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-3xl text-white">
        <h2 className="text-2xl font-bold mb-6">字体替换设置</h2>
        
        <div className="space-y-6">
          {/* 字体选择 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-300">
                选择目标字体
              </label>
              <button
                onClick={() => setShowAllFonts(!showAllFonts)}
                className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                {showAllFonts ? `仅显示${currentPlatform === 'windows' ? 'Windows' : 'Mac'}字体` : '显示所有字体'}
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto custom-scrollbar bg-gray-700 border border-gray-600 rounded-lg p-4 space-y-4">
              {Object.entries(groupedFonts).map(([category, fonts]) => (
                <div key={category}>
                  <div className="text-sm font-medium text-gray-300 mb-2 px-2">
                    {categoryDisplayNames[category] || category}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {fonts.map((font) => (
                      <button
                        key={font.name}
                        onClick={() => setSelectedFont(font.name)}
                        className={`p-3 rounded-lg transition-all duration-200 flex items-center justify-between ${selectedFont === font.name ? 'bg-primary text-white' : 'bg-gray-800 hover:bg-gray-600'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ fontFamily: font.name }}
                          >
                            Aa
                          </div>
                          <div>
                            <div className="font-medium">{font.displayName}</div>
                            <div className="text-xs text-gray-400">{font.name}</div>
                          </div>
                        </div>
                        {selectedFont === font.name && (
                          <div className="text-xl">✓</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 字体预览 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              字体预览
            </label>
            <div 
              className="p-6 bg-gray-700 border border-gray-600 rounded-lg text-lg"
              style={{ fontFamily: selectedFont }}
            >
              <div className="mb-2">中文预览文本：这是一段用于字体预览的中文文本，包含了不同的字体样式和大小。</div>
              <div className="text-2xl font-bold mb-2">{getFontDisplayName(selectedFont)}</div>
              <div className="text-sm text-gray-400">
                字体名称：{selectedFont}
              </div>
            </div>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
            disabled={isConfirming}
          >
            <span>❌ 取消</span>
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-3 bg-secondary hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95"
            disabled={isConfirming}
          >
            <span>{isConfirming ? '⏳ 替换中...' : '🚀 确认替换'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FontSelectionModal;