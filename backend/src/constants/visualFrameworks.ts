
export interface VisualFramework {
    id: string;
    name: string;
    englishName: string;
    category: 'contrast' | 'flow' | 'structure' | 'hierarchy' | 'scene';
    description: string;
    compositionInstruction: string;
}

export const VISUAL_FRAMEWORKS: VisualFramework[] = [
    // --- 1. 情境对比型 (Problem vs. Solution) ---
    {
        id: 'framework_01_contrast',
        name: '情境对比型',
        englishName: 'Problem vs Solution',
        category: 'contrast',
        description: '左右分屏对比，左侧展示痛点（混乱/灰暗），右侧展示方案（有序/亮丽）。',
        compositionInstruction: '3D split composition. Left side: Dim monochromatic tone, chaotic pile of messy documents and error icons. Right side: Bright vibrant tone, neatly organized holographic data blocks floating in order. A sharp vertical dividing line or light beam separates the two worlds.'
    },
    // --- 2. SOP 流程圖型 (Linear Progress) ---
    {
        id: 'framework_02_linear_sop',
        name: 'SOP 流程图型',
        englishName: 'Linear Progress',
        category: 'flow',
        description: '横向 1:2:1 布局，Input -> Process -> Output，强调转换过程。',
        compositionInstruction: 'Horizontal 1:2:1 layout. Left: Scattered input icons (raw data). Center: A large, complex glowing processing unit (hexagonal core or engine). Right: Polished output icons (documents/diamonds). Glowing neon pipelines connect the three sections sequentially.'
    },
    // --- 3. 核心概念聚焦型 (Central Focus) ---
    {
        id: 'framework_03_critical_focus',
        name: '核心概念聚焦',
        englishName: 'Central Focus',
        category: 'structure',
        description: '中央放置核心物体，周围留白，下方配关键词卡片。',
        compositionInstruction: 'Center composition. A single, large, high-quality 3D object (like a glowing light bulb or multifaceted gem) floating in the center. Three frosted glass cards with keywords hovering below it. Clean, minimalist background to emphasize the central subject.'
    },
    // --- 4. 資訊儀表板型 (Dashboard/Grid) ---
    {
        id: 'framework_04_dashboard',
        name: '资讯仪表板',
        englishName: 'Dashboard Grid',
        category: 'structure',
        description: '网格布局，多个磨砂玻璃卡片展示不同维度信息。',
        compositionInstruction: 'Isometric view. A structured grid of 4 floating frosted glass tiles. Each tile features a distinct, colorful 3D icon representing a metric or feature. Soft backlighting behind each tile. Organized and data-rich appearance.'
    },
    // --- 5. 四向矩陣分析型 (2x2 Matrix) ---
    {
        id: 'framework_05_matrix',
        name: '四向矩阵分析',
        englishName: '2x2 Matrix',
        category: 'structure',
        description: '十字切割画面，四个象限展示SWOT或不同属性。',
        compositionInstruction: 'Top-down or slight isometric view. A 2x2 matrix layout. Four quadrants differentiated by soft pastel background colors (pink, blue, green, yellow). A central glowing node at the intersection point. Clear separation lines.'
    },
    // --- 6. 環狀循環型 (Circular Flow) ---
    {
        id: 'framework_06_circular_loop',
        name: '环状循环型',
        englishName: 'Circular Flow',
        category: 'flow',
        description: '圆周旋转布局，强调持续迭代与生态闭环。',
        compositionInstruction: 'Circular composition. A ring of floating icons orbiting a central empty space or core. Neon light paths connecting the icons in a clockwise direction. Dynamic motion blur indicating rotation and continuous flow.'
    },
    // --- 7. 金字塔階層型 (Pyramid Hierarchy) ---
    {
        id: 'framework_07_pyramid',
        name: '金字塔阶层',
        englishName: 'Pyramid Hierarchy',
        category: 'hierarchy',
        description: '阶梯金字塔，展示从基础到顶层的层级关系。',
        compositionInstruction: '3D stepped pyramid made of translucent glass layers. Bottom layers are wide and solid (foundation). Top layer is small, glowing, and elevated (goal/peak). Distinct color coding for each level.'
    },
    // --- 8. 時光隧道里程碑 (Timeline) ---
    {
        id: 'framework_08_timeline',
        name: '时光隧道',
        englishName: 'Timeline Roadmap',
        category: 'flow',
        description: '蜿蜒的路径，沿途设立里程碑节点。',
        compositionInstruction: 'Perspective view of a winding glowing path extending from bottom-left to top-right. Floating islands or pillars acting as milestones along the path. Nebula or abstract tech background suggesting forward movement.'
    },
    // --- 9. 多維雷達圖型 (Radar Chart) ---
    {
        id: 'framework_09_radar',
        name: '多维雷达图',
        englishName: 'Radar Chart',
        category: 'structure',
        description: '多边形雷达图，展示综合能力分布。',
        compositionInstruction: '3D holographic radar chart. A transparent glass polygon suspended in air, with vertices connected to a central axis. Glowing data points at each vertex. Grid lines visible on the floor.'
    },
    // --- 10. 漏斗轉化型 (Conversion Funnel) ---
    {
        id: 'framework_10_funnel',
        name: '漏斗转化',
        englishName: 'Conversion Funnel',
        category: 'flow',
        description: '上宽下窄的透明漏斗，展示筛选与提纯过程。',
        compositionInstruction: 'Large 3D transparent glass funnel. Top wide opening receiving mixed chaotic particles. Narrow bottom spout releasing refined, uniform glowing spheres. Visualizing the filtering process.'
    },
    // --- 11. 天平/槓桿對比型 (Balance) ---
    {
        id: 'framework_11_balance',
        name: '天平/杠杆',
        englishName: 'Balance Scale',
        category: 'contrast',
        description: '3D跷跷板或天平，展示优劣势或成本效益对比。',
        compositionInstruction: 'A large 3D minimalist seesaw or balance scale. One side loaded with heavy, dark, rough cubes (Cost/Effort). The other side holding a single bright, glowing, light-weight sphere (Value/Profit) that tips the scale.'
    },
    // --- 12. 拼圖連結型 (Puzzle) ---
    {
        id: 'framework_12_puzzle',
        name: '拼图连结',
        englishName: 'Puzzle Integration',
        category: 'structure',
        description: '立体的拼图块，展示模块组合或缺失的一环。',
        compositionInstruction: 'Large interlocking 3D puzzle pieces. Most pieces are assembled on the ground. One final, glowing piece is suspended in the air, about to slot perfectly into the remaining gap.'
    },
    // --- 13. 階梯式進階導引 (Stepped Tutorial) ---
    {
        id: 'framework_13_steps',
        name: '阶梯导引',
        englishName: 'Stepped Tutorial',
        category: 'flow',
        description: '上升的台阶，展示步骤 1-2-3。',
        compositionInstruction: 'Three ascending glowing blocks or stairs arranged from left to right. Each step is clearly distinct, perhaps carrying a number or icon. A visual path leading upwards.'
    },
    // --- 14. 放射狀心智發散 (Radial Expansion) ---
    {
        id: 'framework_14_mindmap',
        name: '放射状发散',
        englishName: 'Radial Expansion',
        category: 'structure',
        description: '中心向四周发散出多个分支气泡。',
        compositionInstruction: 'A central glowing core emitting 5-6 translucent bubbles or nodes outwards. Thin connecting lines linking center to nodes. Resembles a 3D mind map or molecular structure.'
    },
    // --- 15. 樹狀邏輯決策樹 (Logic Tree) ---
    {
        id: 'framework_15_tree',
        name: '树状决策树',
        englishName: 'Logic Tree',
        category: 'flow',
        description: '从左侧根节点向右分叉，展示分支路径。',
        compositionInstruction: 'Horizontal branching structure. A single path entering from the left, splitting into multiple neon light paths towards the right. End nodes marked with different status indicators (checkmarks or crosses).'
    },
    // --- 16. 維恩交集尋找區 (Venn Diagram) ---
    {
        id: 'framework_16_venn',
        name: '维恩交集',
        englishName: 'Venn Diagram',
        category: 'structure',
        description: '圆形重叠，强调交集区域。',
        compositionInstruction: 'Three overlapping transparent frosted glass circles. The intersection area ("Sweet Spot") glows intensely with a different color. Clean, minimalist geometric composition.'
    },
    // --- 17. 冰山底層型 (The Iceberg) ---
    {
        id: 'framework_17_iceberg',
        name: '冰山底层',
        englishName: 'The Iceberg',
        category: 'hierarchy',
        description: '水面上的显性部分 vs 水下的巨大隐性部分。',
        compositionInstruction: 'Split view above and below a water line. Top: Small visible white iceberg tip. Bottom: Massive, glowing, complex digital structure extending deep underwater. Visualizing hidden depth.'
    },
    // --- 18. 火箭噴射型 (The Rocket Launch) ---
    {
        id: 'framework_18_rocket',
        name: '火箭喷射',
        englishName: 'Rocket Launch',
        category: 'scene',
        description: '火箭升空，强调增长与启动。',
        compositionInstruction: 'A stylized 3D rocket blasting off diagonally upwards. Leaving a trail of colorful smoke or particles. Upward pointing arrows or charts integrated into the background smoke.'
    },
    // --- 19. 盾牌防衛型 (The Shield) ---
    {
        id: 'framework_19_shield',
        name: '盾牌防卫',
        englishName: 'The Shield',
        category: 'scene',
        description: '巨大的盾牌挡住外部威胁，保护内部核心。',
        compositionInstruction: 'Front view. A large, semi-transparent hexagonal energy shield. Behind the shield: A pristine, safe data cube. In front of the shield: Red lasers or spiky shapes being deflected/bounced off.'
    },
    // --- 20. 磁鐵吸引型 (The Magnet) ---
    {
        id: 'framework_20_magnet',
        name: '磁铁吸引',
        englishName: 'The Magnet',
        category: 'scene',
        description: 'U型磁铁吸引各类元素。',
        compositionInstruction: 'A large U-shaped glowing magnet positioned at the side or top. It is magnetically pulling in a stream of various colorful icons (spheres, cubes, stars) towards it. Visible magnetic field lines.'
    },
    // --- 21. 跨越橋樑型 (Digital Bridge) ---
    {
        id: 'framework_21_bridge',
        name: '跨越桥梁',
        englishName: 'Digital Bridge',
        category: 'scene',
        description: '连接两个孤岛的桥梁，强调转型与连接。',
        compositionInstruction: 'Two separate floating islands separated by a gap. A sleek, glowing digital bridge connecting them. Light pulses traveling across the bridge from one side to the other.'
    },
    // --- 22. 齒輪連動型 (Interlocking Gears) ---
    {
        id: 'framework_22_gears',
        name: '齿轮连动',
        englishName: 'Interlocking Gears',
        category: 'scene',
        description: '咬合的齿轮，强调协作与精密运转。',
        compositionInstruction: 'Close-up of three interlocked 3D gears made of glass or metal. They are positioned to drive each other. Glowing energy friction at the contact points. Sense of mechanical precision.'
    },
    // --- 23. 能量電池型 (Battery/Gauge) ---
    {
        id: 'framework_23_battery',
        name: '能量电池',
        englishName: 'Battery Gauge',
        category: 'structure',
        description: '大电池或进度条，展示充能或进度。',
        compositionInstruction: 'A large vertical or horizontal 3D battery object. Inside, segmented glowing liquid or light blocks fill it up to 80-90%. Emitting a "fully charged" or "charging" aura.'
    },
    // --- 24. 種子成長型 (Seed to Tree) ---
    {
        id: 'framework_24_growth',
        name: '种子成长',
        englishName: 'Seed to Tree',
        category: 'flow',
        description: '从种子到大树的生长过程，展发生命周期。',
        compositionInstruction: 'Three stages of growth arranged horizontally. 1. A glowing seed in soil. 2. A small sprout. 3. A full stylized tech-tree with digital leaves/fruit. Visualizing evolution.'
    },
    // --- 25. 顯微鏡深掘型 (Microscope Dive) ---
    {
        id: 'framework_25_microscope',
        name: '显微镜深掘',
        englishName: 'Microscope Dive',
        category: 'scene',
        description: '显微镜观察细节，强调深度分析。',
        compositionInstruction: 'A large stylized 3D microscope focusing on a specific spot. Above the lens, a holographic projection creates a magnified, detailed view of a tiny data point or bug. Professional analysis vibe.'
    },
    // --- 26. 藍圖架構型 (Blueprint Design) ---
    {
        id: 'framework_26_blueprint',
        name: '蓝图架构',
        englishName: 'Blueprint Design',
        category: 'structure',
        description: '深蓝色背景上的线框图，强调规划与底层。',
        compositionInstruction: 'Dark blue background with grid lines. Floating white or neon blue wireframe structures (buildings or system boxes) being drawn in 3D space. Precise, architectural aesthetic.'
    },
    // --- 27. 山峰攻頂型 (Mountain Peak) ---
    {
        id: 'framework_27_mountain',
        name: '山峰攻顶',
        englishName: 'Mountain Peak',
        category: 'scene',
        description: '高耸的山峰与顶端的旗帜，强调愿景与目标。',
        compositionInstruction: 'A low-angle view of a stylized 3D mountain peak reaching into the sky. A glowing flag planted at the very summit. A challenging winding path visible on the mountainside.'
    },
    // --- 28. 自動輸送帶型 (Conveyor Belt) ---
    {
        id: 'framework_28_conveyor',
        name: '自动输送带',
        englishName: 'Conveyor Belt',
        category: 'flow',
        description: '输送带上的批量产出，强调自动化与量产。',
        compositionInstruction: 'isometric view of an industrial conveyor belt. Identical glowing cubes or gems moving along the belt in perfect rhythm. Suggests mass production and automation.'
    },
    // --- 29. 燈塔指引型 (Lighthouse Guidance) ---
    {
        id: 'framework_29_lighthouse',
        name: '灯塔指引',
        englishName: 'Lighthouse Guidance',
        category: 'scene',
        description: '灯塔照亮黑暗海洋，强调方向与指引。',
        compositionInstruction: 'A tall futuristic lighthouse standing amidst a dark digital sea. It emits a wide, bright beam of light cutting through the darkness, illuminating a clear path ahead.'
    },
    // --- 30. 三稜鏡折射型 (Prism Refraction) ---
    {
        id: 'framework_30_prism',
        name: '三棱镜折射',
        englishName: 'Prism Refraction',
        category: 'flow',
        description: '白光进入折射出七彩光，强调一源多用。',
        compositionInstruction: 'A crystal clear triangular prism in the center. A single beam of white light enters from one side, and refracts out the other side into a spectrum of multiple colored beams. Physics/Optics metaphor.'
    },
    // --- 31. 實驗室燒瓶型 (Lab Experiment) ---
    {
        id: 'framework_31_lab',
        name: '实验室烧瓶',
        englishName: 'Lab Experiment',
        category: 'scene',
        description: '烧瓶与气泡，强调创新、实验与测试。',
        compositionInstruction: 'Close-up of futuristic glass flasks and test tubes. Bubbling colored liquids inside. Floating digital particles or data symbols rising from the glassware like steam.'
    },
    // --- 32. 塔台調度型 (Control Tower) ---
    {
        id: 'framework_32_control_tower',
        name: '塔台调度',
        englishName: 'Control Tower',
        category: 'scene',
        description: '指挥室屏幕，强调全局管控与调度。',
        compositionInstruction: 'Interior view of a futuristic control room. A curved array of holographic screens displaying maps, charts, and flight paths. Focus on the sophisticated dashboard interface.'
    }
];
