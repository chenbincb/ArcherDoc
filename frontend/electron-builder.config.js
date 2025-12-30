module.exports = {
  appId: 'com.archeros.archerdoc-ai',
  productName: 'ArcherDoc AI',
  copyright: 'Copyright © 2025 ArcherDoc AI',

  // 打包配置
  directories: {
    output: 'dist-electron',
    buildResources: 'build'
  },

  // 文件包含
  files: [
    'dist/**/*',
    'public/**/*',
    'node_modules/**/*',
    'package.json',
    '!**/tsconfig.json',
    '!**/README.md',
    '!**/vite.config.ts',
    '!**/.git/**/*',
    '!**/.DS_Store'
  ],

  // 额外文件
  extraResources: [
    {
      from: 'build/',
      to: '.',
      filter: ['**/*']
    }
  ],

  // 主进程入口
  mainEntryPoint: 'public/electron.cjs',

  // 预加载脚本
  preload: 'public/preload.js',

  // 构建前脚本
  beforeBuild: async (context) => {
    console.log('Starting Electron build...');
    console.log('Electron version:', context.electronVersion);
    console.log('Platform:', context.platform);
  },

  // 构建后脚本
  afterSign: async (context) => {
    console.log('Build completed and signed!');
  },

  // 发布配置
  publish: {
    provider: 'github',
    owner: 'your-username',
    repo: 'ppt-ai-studio'
  },

  // Windows配置
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'arm64']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ],
    icon: 'build/icon.ico',
    publisherName: 'ArcherDoc AI',
    publisherUrl: 'https://archeros.com',
    requestedExecutionLevel: 'asInvoker'
  },

  // NSIS配置
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'ArcherDoc AI',
    include: 'build/installer.nsh',
    script: 'build/installer.nsh'
  },

  // macOS配置
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'build/icon.icns',
    category: 'public.app-category.productivity',
    hardenedRuntime: true,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    extendInfo: {
      NSDocumentsTypeUsageDescription: 'PowerPoint files for processing and translation',
      NSRemovableVolumesUsageDescription: 'Access removable drives to open PowerPoint files'
    }
  },

  // DMG配置
  dmg: {
    title: 'ArcherDoc AI Installer',
    icon: 'build/volume.icns',
    background: 'build/dmg-background.png',
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications'
      }
    ],
    window: {
      width: 540,
      height: 380
    }
  },

  // Linux配置
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      },
      {
        target: 'rpm',
        arch: ['x64']
      },
      {
        target: 'snap',
        arch: ['x64']
      }
    ],
    icon: 'build/icon.png',
    category: 'Office'
  },

  // AppImage配置
  AppImage: {
    icon: 'build/icon.png',
    category: 'Office'
  },

  // Snap配置
  snap: {
    plugs: [
      'default',
      'desktop',
      'desktop-legacy',
      'home',
      'x11',
      'unity7',
      'browser-support',
      'network',
      'gsettings',
      'audio-playback',
      'pulseaudio',
      'opengl'
    ]
  },

  // 通用配置
  compression: 'maximum',
  cscLink: undefined, // Code signing certificate (Windows)
  cscKeyPassword: undefined,

  // 安全配置
  asar: true,
  asarUnpack: [
    '**/node_modules/ffmpeg-static/**/*',
    '**/node_modules/@ffmpeg-installer/**/*'
  ],

  // 资源配置
  buildDependenciesFromSource: false,

  // Node.js配置
  nodeGypRebuild: false,

  // 性能优化
  nodeVersion: '18.17.0',
  electronDownload: {
    mirror: 'https://npmmirror.com/mirrors/electron/'
  }
};