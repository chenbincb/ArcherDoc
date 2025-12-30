const { app, BrowserWindow, Menu, shell, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// 保持窗口对象的全局引用，避免被垃圾回收
let mainWindow;

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    icon: path.join(__dirname, 'assets/icons/app-icon-512.png'),
    title: 'ArcherDoc AI', // 设置窗口标题
    titleBarStyle: 'default', // 显示标准标题栏，确保可以拖动窗口
    webPreferences: {
      nodeIntegration: false, // 安全性：禁用node集成
      contextIsolation: true, // 安全性：启用上下文隔离
      enableRemoteModule: false, // 安全性：禁用remote模块
      preload: path.join(__dirname, 'preload.js'), // 预加载脚本
      webSecurity: true, // 启用web安全
      allowRunningInsecureContent: false, // 禁止不安全内容
      experimentalFeatures: false, // 禁用实验性功能
      plugins: false, // 禁用插件
      defaultEncoding: 'utf-8'
    },
    show: false // 先不显示，等加载完成后再显示
  });

  // 加载应用
  if (isDev) {
    // 开发环境加载本地服务器
    mainWindow.loadURL('http://localhost:3001');
    // 开发环境不自动打开开发者工具（如需调试可通过菜单开启）
    // mainWindow.webContents.openDevTools();
  } else {
    // 生产环境加载打包后的文件
    // electron.cjs在asar包的/dist/目录下，所以index.html在同级目录
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setTitle('ArcherDoc AI'); // 设置初始标题

    // 开发环境聚焦到窗口
    if (isDev) {
      mainWindow.focus();
    }
  });

  // 监听来自渲染进程的标题更新请求
  ipcMain.on('set-window-title', (event, title) => {
    if (mainWindow) {
      mainWindow.setTitle(title);
    }
  });

  // 当窗口被关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 阻止导航到外部页面
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // 只允许同源和本地文件
    if (parsedUrl.origin !== 'http://localhost:3000' && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // 创建应用菜单
  createMenu();

  // 开发环境快捷键
  if (isDev) {
    // 刷新快捷键
    globalShortcut.register('CommandOrControl+R', () => {
      mainWindow.reload();
    });

    // 开发者工具快捷键
    globalShortcut.register('F12', () => {
      mainWindow.webContents.toggleDevTools();
    });
  }
}

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开PPT文件',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            // 通过IPC向渲染进程发送消息
            mainWindow.webContents.send('menu-open-file');
          }
        },
        { type: 'separator' },
        {
          label: '导出',
          submenu: [
            {
              label: '导出翻译结果',
              click: () => mainWindow.webContents.send('menu-export-translation')
            },
            {
              label: '导出视频',
              click: () => mainWindow.webContents.send('menu-export-video')
            },
            {
              label: '导出图片',
              click: () => mainWindow.webContents.send('menu-export-images')
            }
          ]
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '切换开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 ArcherDoc AI',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 ArcherDoc AI',
              message: 'ArcherDoc AI',
              detail: '企业级智能文档处理解决方案\n\n版本: 1.0.0\n\n功能包括：\n• 智能翻译\n• 视频生成\n• 文章创作\n• AI配图\n\n© 2025 ArcherDoc AI'
            });
          }
        },
        {
          label: '查看文档',
          click: () => {
            shell.openExternal('https://github.com/your-repo/ppt-ai-studio');
          }
        }
      ]
    }
  ];

  // macOS特殊菜单
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: '关于 ' + app.getName(), role: 'about' },
        { type: 'separator' },
        { label: '服务', role: 'services' },
        { type: 'separator' },
        { label: '隐藏 ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
        { label: '隐藏其他', accelerator: 'Command+Shift+H', role: 'hideOthers' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        { label: '退出', accelerator: 'Command+Q', click: () => app.quit() }
      ]
    });

    // 窗口菜单
    template[4].submenu = [
      { label: '关闭', accelerator: 'Cmd+W', role: 'close' },
      { label: '最小化', accelerator: 'Cmd+M', role: 'minimize' },
      { label: '缩放', role: 'zoom' },
      { type: 'separator' },
      { label: '置于所有窗口前面', role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 当所有窗口都被关闭时退出应用
app.on('window-all-closed', () => {
  // 在macOS上，除非用户用Cmd + Q明确地退出，
  // 否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在macOS上，当单击dock图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC事件处理
ipcMain.handle('dialog-open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'PowerPoint Files', extensions: ['pptx', 'ppt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  return result;
});

ipcMain.handle('dialog-save-file', async (event, defaultPath, filters) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath,
    filters: filters || [
      { name: 'PowerPoint Files', extensions: ['pptx'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  return result;
});

ipcMain.handle('app-get-version', () => {
  return app.getVersion();
});

// 安全的文件操作
ipcMain.handle('fs-write-file', async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-read-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return { success: true, data: data.toString('base64') };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 应用就绪时创建窗口
app.whenReady().then(() => {
  createWindow();

  // 设置安全策略
  app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    });
  });
});

// 应用退出前清理
app.on('before-quit', () => {
  // 清理所有快捷键
  globalShortcut.unregisterAll();
});

// 安全配置
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // 在生产环境中，应该验证证书
  if (isDev) {
    // 开发环境忽略证书错误
    event.preventDefault();
    callback(true);
  } else {
    // 生产环境使用默认行为
    callback(false);
  }
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('ArcherDoc AI Electron 应用启动中...');