import React from 'react';

interface FileUploadAreaProps {
    file: File | null;
    handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    clearFile: () => void;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
    file,
    handleFileChange,
    handleDrop,
    clearFile
}) => {
    return (
        <div
            className={`relative group cursor-pointer overflow-hidden rounded-3xl border-2 transition-all duration-300 ease-out
            ${file
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-dashed border-gray-700 hover:border-primary/50 hover:bg-gray-800/50 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.15)]'
                }
            bg-card backdrop-blur-sm h-[420px] flex flex-col items-center justify-center text-center
            `}
            onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-primary', 'bg-primary/10', 'scale-[1.01]');
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-primary', 'bg-primary/10', 'scale-[1.01]');
            }}
            onDrop={(e) => {
                e.currentTarget.classList.remove('border-primary', 'bg-primary/10', 'scale-[1.01]');
                handleDrop(e);
            }}
        >
            {!file ? (
                <>
                    {/* Background decoration */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    {/* Main Icon */}
                    <div className="relative mb-12 group-hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-24 h-24 bg-gray-800/80 rounded-[2rem] flex items-center justify-center shadow-xl border border-white/5 group-hover:shadow-primary/20 group-hover:border-primary/20 transition-all duration-300 relative z-0">
                            <span className="text-5xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">✨</span>
                        </div>
                        {/* Floating elements */}
                        <div className="absolute -right-2 -top-2 w-12 h-12 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center animate-bounce-slow z-20 backdrop-blur-sm" style={{ animationDelay: '0s' }}>
                            <span className="text-xl">📄</span>
                        </div>
                        <div className="absolute -left-2 -bottom-2 w-10 h-10 bg-purple-500/10 rounded-xl border border-purple-500/20 flex items-center justify-center animate-bounce-slow z-20 backdrop-blur-sm" style={{ animationDelay: '1s' }}>
                            <span className="text-lg">📊</span>
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-5 group-hover:text-purple-400 transition-colors">
                        点击或拖拽文件到这里
                    </h3>
                    <div className="text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
                        {/* Format Icons Row */}
                        <div className="flex gap-3 justify-center opacity-60 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-105">
                            {[
                                { ext: 'PPTX', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
                                { ext: 'DOCX', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
                                { ext: 'PDF', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
                                { ext: 'TXT', color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20' },
                                { ext: 'MD', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
                                { ext: 'IMG', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
                            ].map((fmt, i) => (
                                <div key={i} className={`px-3 py-1.5 rounded-lg border ${fmt.border} ${fmt.bg} ${fmt.color} text-xs font-bold font-mono tracking-wider`}>
                                    {fmt.ext}
                                </div>
                            ))}
                        </div>
                    </div>

                    <input
                        type="file"
                        accept=".pptx,.docx,.txt,.md,.pdf,.jpg,.jpeg,.png,.gif,.webp"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                    />
                </>
            ) : (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-8 transition-all animate-in fade-in zoom-in-95 duration-300">
                    {/* File Preview Card */}
                    <div className="relative group/file">
                        <div className={`w-32 h-32 mx-auto rounded-3xl flex items-center justify-center mb-6 text-6xl shadow-2xl border-2 relative z-10 
              ${file.name.toLowerCase().endsWith('.pptx') ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' :
                                file.name.toLowerCase().endsWith('.docx') ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                                    file.name.toLowerCase().endsWith('.pdf') ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                                        file.name.toLowerCase().match(/\.(jpg|png|gif|webp)$/) ? 'bg-purple-500/10 border-purple-500/30 text-purple-500' :
                                            'bg-gray-500/10 border-gray-500/30 text-gray-400'
                            }`}>
                            {file.name.toLowerCase().endsWith('.pptx') ? '📊' :
                                file.name.toLowerCase().endsWith('.docx') ? '📝' :
                                    file.name.toLowerCase().endsWith('.pdf') ? '📕' :
                                        file.name.toLowerCase().match(/\.(jpg|png|gif|webp)$/) ? '🖼️' : '📄'}
                        </div>
                        {/* Glow effect behind icon */}
                        <div className={`absolute inset-0 rounded-3xl blur-2xl opacity-20 group-hover/file:opacity-40 transition-opacity duration-500
              ${file.name.toLowerCase().endsWith('.pptx') ? 'bg-orange-500' :
                                file.name.toLowerCase().endsWith('.docx') ? 'bg-blue-500' :
                                    file.name.toLowerCase().endsWith('.pdf') ? 'bg-red-500' :
                                        'bg-gray-500'
                            }`} />
                    </div>

                    <div className="space-y-2 z-20 max-w-lg">
                        <h3 className="text-3xl font-bold text-white truncate drop-shadow-md px-4">{file.name}</h3>
                        <p className="text-gray-400 font-mono text-sm uppercase tracking-widest opacity-70">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {file.name.split('.').pop()}
                        </p>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            clearFile();
                        }}
                        className="mt-8 px-6 py-2 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 
                     hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300 
                     font-medium text-sm flex items-center gap-2 group/btn backdrop-blur-sm"
                    >
                        <span className="group-hover/btn:rotate-90 transition-transform duration-300">✕</span>
                        移除文件
                    </button>
                </div>
            )}
        </div>
    );
};
