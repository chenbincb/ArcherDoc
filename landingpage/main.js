const flows = {
    translation: {
        title: "PPT 翻译流程",
        steps: [
            { title: "上传 PPT", description: "将 .pptx 文件拖放到上传区域或点击选择文件。" },
            { title: "翻译设置", description: "点击右上角⚙️图标，设置目标语言、专有名词术语表及AI模型。" },
            { title: "一键翻译", description: "点击“开始翻译”按钮，系统实时显示进度并自适应调整排版。" },
            { title: "文件下载", description: "翻译完成后，点击下载按钮保存保留原始内容样式的 PPT 文件。" }
        ]
    },
    video: {
        title: "视频生成流程",
        steps: [
            { title: "讲稿生成", description: "上传 PPT 后点击“生成视频”，AI 将自动为每页幻灯片生成讲解稿。" },
            { title: "讲稿预览与编辑", description: "在审核页面查看 AI 生成的文案，支持手动微调与口语化优化。" },
            { title: "语音合成", description: "选择 MiniMax 或 Qwen 等模型，生成高度拟真或具备方言特色的配音。" },
            { title: "视频合成导出", description: "系统自动合并音视频，支持导出 MP4 格式或单独下载音频文件。" }
        ]
    },
    article: {
        title: "文章创作流程",
        steps: [
            { title: "风格定义", description: "选择微信公众号、小红书、抖音等目标平台及文章类型。" },
            { title: "AI 文章生成", description: "系统分析 PPT 核心观点，快速撰写具备社交平台特性的文案内容。" },
            { title: "内容微调", description: "输入微调指令，如“语言更生动”或“增加案例”，对内容进行迭代优化。" },
            { title: "多格式导出", description: "支持 Markdown、HTML、TXT 等格式导出，方便分发到各大平台。" }
        ]
    },
    image: {
        title: "AI 配图流程",
        steps: [
            { title: "视觉分析", description: "系统深度解析每页 PPT 主题，生成对应的场景描述与建议提示词。" },
            { title: "模型选择", description: "支持 ComfyUI (本地) 或 NanoBanana (云端 Gemini) 生成高质量图像。" },
            { title: "参数调节", description: "设置理想的宽高比 (1:1, 16:9 等) 与生成精度。" },
            { title: "自动替换", description: "生成满意图片后，可一键将新视觉素材应用并替换至原 PPT 页面。" }
        ]
    },
    font: {
        title: "字体统一流程",
        steps: [
            { title: "字体预览", description: "浏览内置的思源黑体、方正系列等专业字体库，并查看实时混合预览。" },
            { title: "全局替换", description: "选中目标字体后，系统将自动化处理所有幻灯片文本框的字体样式。" },
            { title: "格式保留", description: "在统一字体的同时，智能保留原有的字号、颜色、加粗等精细格式。" },
            { title: "保存生效", description: "确认修改效果，保存并生成具备统一视觉语言的高级感 PPT。" }
        ]
    }
};

function showFlow(featureKey) {
    const flowContainer = document.getElementById('flow-display');
    const flow = flows[featureKey];

    if (!flow) return;

    let stepsHtml = flow.steps.map((step, index) => `
        <div class="step-item fade-in" style="animation-delay: ${index * 0.15}s">
            <div class="step-number">${index + 1}</div>
            <div class="step-content">
                <h4>${step.title}</h4>
                <p>${step.description}</p>
            </div>
        </div>
    `).join('');

    flowContainer.innerHTML = `
        <div class="section-header">
            <h2>${flow.title}</h2>
            <p>清晰、高效、智能化的操作体验</p>
        </div>
        <div class="step-container">
            ${stepsHtml}
        </div>
    `;

    // Smooth scroll to workflow section
    document.getElementById('workflow').scrollIntoView({ behavior: 'smooth' });
}

// Initial state or default show
window.onload = () => {
    // Optionally pre-load the first flow
    // showFlow('translation');

    // Mobile Menu Toggle
    const hamburger = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // Close menu when a link is clicked
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
};

window.showFlow = showFlow;
