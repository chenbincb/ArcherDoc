
export interface VisualTheme {
    id: string;
    name: string;
    englishName: string;
    promptModifiers: string;
    negativePrompt: string;
}

export const VISUAL_THEMES: VisualTheme[] = [
    {
        id: 'tech_blue_glass',
        name: '科技微光 (Tech Glass)',
        englishName: 'Tech Glass',
        promptModifiers: 'futuristic style, glassmorphism, translucent materials, glowing neon blue and cyan accents, dark navy background, clean vector lines, high tech, premium UI design, octane render, 8k resolution',
        negativePrompt: 'rustic, vintage, grunge, dirty, messy, low resolution, pixelated, hand drawn, sketch, watercolor, pastel colors, warm tones, wooden textures'
    },
    {
        id: 'corporate_clean',
        name: '极简商务 (Corporate Clean)',
        englishName: 'Corporate Clean',
        promptModifiers: 'minimalist corporate style, apple design style, clean white background, soft shadows, plenty of whitespace, professional, flat vector art, subtle gradients, business blue and gray',
        negativePrompt: 'dark mode, neon, cyberpunk, chaotic, cluttered, graffiti, anime, cartoon, 3d realistic, oil painting'
    },
    {
        id: 'neon_cyberpunk',
        name: '赛博霓虹 (Neon Cyberpunk)',
        englishName: 'Neon Cyberpunk',
        promptModifiers: 'coroprate cyberpunk style, dark black background, vibrant neon purple and pink lights, grid lines, retro-futuristic, synthwave, glowing data streams, digital particles',
        negativePrompt: 'daylight, sunshine, nature, organic, white background, pastel, flat, matte, dull'
    },
    {
        id: 'blueprint_schematic',
        name: '工程蓝图 (Blueprint)',
        englishName: 'Architecture Blueprint',
        promptModifiers: 'blueprint style, engineering schematic, technical drawing, white lines on dark blue grid paper, precise measurements, isometric view, architectural details, CAD rendering',
        negativePrompt: 'photorealistic, colorful, painted, organic, messy, blurred, 3d render, glossy'
    },
    {
        id: 'warm_illustration',
        name: '暖色插画 (Warm Illustration)',
        englishName: 'Warm Illustration',
        promptModifiers: 'modern flat illustration, warm color palette, orange and yellow tones, friendly, human-centric, soft shapes, vector art, editorial design style, notion style',
        negativePrompt: 'cold, sterile, metallic, 3d, photorealistic, scary, dark, technological, neon'
    },
    {
        id: 'claymorphism',
        name: '软萌黏土 (Claymorphism)',
        englishName: 'Claymorphism',
        promptModifiers: 'claymorphism, 3d clay style, soft rounded edges, matte finish, plasticine texture, cute, pastel colors, soft lighting, playful, toy-like',
        negativePrompt: 'sharp edges, metallic, glass, neon, gritty, dark, horror, realistic features'
    },
    {
        id: 'abstract_geometry',
        name: '抽象几何 (Abstract Geometry)',
        englishName: 'Abstract Geometry',
        promptModifiers: 'abstract geometric shapes, bauhaus style, colorful primitives, memphis design, pattern background, artistic composition, bold colors, basic forms',
        negativePrompt: 'representational, realistic, photo, character, text, detail, complex'
    }
];
