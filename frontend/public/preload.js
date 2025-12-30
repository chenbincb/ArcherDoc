const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 系统信息
  platform: process.platform,

  // 应用版本
  getVersion: () => ipcRenderer.invoke('app-get-version'),

  // 文件对话框
  openFile: () => ipcRenderer.invoke('dialog-open-file'),
  saveFile: (defaultPath, filters) => ipcRenderer.invoke('dialog-save-file', defaultPath, filters),

  // 文件系统操作
  writeFile: (filePath, data) => ipcRenderer.invoke('fs-write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('fs-read-file', filePath),

  // 事件监听
  onMenuAction: (callback) => {
    const events = [
      'menu-open-file',
      'menu-export-translation',
      'menu-export-video',
      'menu-export-images'
    ];

    events.forEach(event => {
      ipcRenderer.on(event, callback);
    });
  },

  // 移除事件监听
  removeMenuListener: (callback) => {
    ipcRenderer.removeAllListeners('menu-open-file');
    ipcRenderer.removeAllListeners('menu-export-translation');
    ipcRenderer.removeAllListeners('menu-export-video');
    ipcRenderer.removeAllListeners('menu-export-images');
  },

  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // 窗口标题
  setTitle: (title) => ipcRenderer.send('set-window-title', title)
});

// 安全检查
window.addEventListener('DOMContentLoaded', () => {
  // 检查是否在Electron环境中
  console.log('Running in Electron:', typeof window.electronAPI !== 'undefined');

  // 设置环境变量
  if (typeof window.electronAPI !== 'undefined') {
    window.isElectron = true;
    window.electronPlatform = window.electronAPI.platform;
  }
});

// 导出给TypeScript使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    contextBridge,
    ipcRenderer
  };
}