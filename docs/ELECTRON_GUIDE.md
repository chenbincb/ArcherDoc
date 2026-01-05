# ArcherDoc AI Electron 桌面版使用指南

## 🚀 快速开始

### 1. 开发环境运行
```bash
# 启动Electron开发版（推荐）
npm run electron-dev

# 或者手动启动
npm run dev  # 在一个终端
npm run electron  # 在另一个终端（等Vite启动后）
```

### 2. 构建和打包
```bash
# 构建Web应用
npm run build

# 打包所有平台
npm run electron-pack

# 打包特定平台
npm run electron-pack-win    # Windows
npm run electron-pack-mac    # macOS
npm run electron-pack-linux  # Linux
```

## 🎯 核心功能特性

### ✅ 已完成功能

1. **跨平台支持**
   - Windows (x64, arm64)
   - macOS (x64, arm64)
   - Linux (x64)

2. **原生桌面功能**
   - 系统菜单栏
   - 文件对话框（打开/保存）
   - 窗口控制（最小化/最大化/关闭）
   - 快捷键支持

3. **安全配置**
   - 禁用Node.js集成
   - 启用上下文隔离
   - 内容安全策略(CSP)
   - 文件系统访问控制

4. **Web功能完全兼容**
   - PPT文件上传
   - AI翻译功能
   - 视频生成
   - 图片配图
   - 文章创作

## 🔧 技术架构

### Electron主进程 (`public/electron.js`)
- 窗口管理
- 菜单创建
- 安全策略
- IPC通信

### 预加载脚本 (`public/preload.js`)
- 安全的API暴露
- 进程间通信桥接
- 文件系统操作

### React集成
- 使用 `useElectronAPI` Hook
- 检测运行环境
- 原生功能调用

## 📱 平台特性

### Windows
- ✅ NSIS安装包
- ✅ 便携版支持
- ✅ 数字签名（需配置）
- ✅ 系统托盘（可扩展）

### macOS
- ✅ DMG安装包
- ✅ 沙沙盒应用
- ✅ 原生菜单栏
- ✅ 手势支持
- ✅ 公证支持（需配置）

### Linux
- ✅ AppImage便携版
- ✅ DEB包 (Debian/Ubuntu)
- ✅ RPM包 (RedHat/CentOS)
- ✅ Snap包

## 🔒 安全性配置

### 启用的安全措施
1. **禁用Node.js集成** - `nodeIntegration: false`
2. **上下文隔离** - `contextIsolation: true`
3. **预加载脚本** - 安全的API桥接
4. **内容安全策略** - 防止XSS攻击
5. **文件访问控制** - 限制文件系统访问

### IPC通信安全
- 使用 `contextBridge` 安全暴露API
- 限制可调用的函数
- 参数验证和错误处理

## 🎨 用户界面增强

### 原生菜单
```
文件
├── 打开PPT文件 (Ctrl+O)
├── 导出
│   ├── 导出翻译结果
│   ├── 导出视频
│   └── 导出图片
└── 退出 (Ctrl+Q)

编辑
├── 撤销 (Ctrl+Z)
├── 重做 (Ctrl+Shift+Z)
├── 剪切 (Ctrl+X)
├── 复制 (Ctrl+C)
├── 粘贴 (Ctrl+V)
└── 全选 (Ctrl+A)

视图
├── 重新加载 (Ctrl+R)
├── 开发者工具 (F12)
├── 实际大小 (Ctrl+0)
├── 放大 (Ctrl++ +)
├── 缩小 (Ctrl+-)
└── 全屏 (F11)

帮助
├── 关于 ArcherDoc AI
└── 查看文档
```

### 快捷键
- `Ctrl+O`: 打开文件
- `F12`: 开发者工具（开发环境）
- `Ctrl+R`: 刷新（开发环境）
- `Ctrl+Q`: 退出应用

## 📦 构建输出

### 输出目录
```
dist-electron/
├── win-unpacked/          # Windows便携版
├── ArcherDoc AI Setup.exe  # Windows安装包
├── ArcherDoc AI.app/      # macOS应用
├── ArcherDoc AI.dmg       # macOS DMG
└── ArcherDoc AI.AppImage  # Linux AppImage
```

### 文件大小预估
- Windows: ~150-200MB
- macOS: ~140-190MB
- Linux: ~130-180MB

## 🔧 开发配置

### 环境变量
```bash
# 开发环境
NODE_ENV=development
ELECTRON=true

# 生产环境
NODE_ENV=production
ELECTRON=false
```

### Vite配置
- 支持Electron构建模式
- 基础路径适配
- 静态资源处理

## 🐛 故障排除

### 常见问题

1. **应用无法启动**
   ```bash
   # 检查Node.js版本
   node --version  # 需要 >= 16.0.0

   # 重新安装依赖
   npm install
   ```

2. **开发服务器连接失败**
   ```bash
   # 检查端口占用
   lsof -i :3000

   # 清除端口
   kill -9 <PID>
   ```

3. **构建失败**
   ```bash
   # 清理缓存
   npm run build -- --mode=production
   ```

4. **文件对话框不工作**
   - 检查preload.js路径是否正确
   - 确认主进程文件路径配置

### 调试技巧

1. **开发者工具**
   - 开发环境自动开启F12
   - 生产环境可通过菜单开启

2. **主进程调试**
   ```bash
   # 启动时显示日志
   npm run electron -- --enable-logging
   ```

3. **渲染进程调试**
   - 使用Chrome DevTools
   - 检查Console面板的错误

## 📈 性能优化

### 内存管理
- 及时释放Blob URLs
- 优化图片加载
- 避免内存泄漏

### 启动优化
- 异步加载非关键资源
- 预加载核心模块
- 延迟加载可选功能

### 构建优化
- 启用代码分割
- 压缩静态资源
- Tree-shaking优化

## 🎯 下一步开发计划

### 可扩展功能
- [ ] 系统托盘集成
- [ ] 自动更新机制
- [ ] 离线支持
- [ ] 多语言界面
- [ ] 主题切换
- [ ] 快捷键自定义

### 集成功能
- [ ] 本地AI模型支持
- [ ] 云存储集成
- [ ] 打印功能
- [ ] OCR文字识别
- [ ] 批量处理