# 应用图标更换指南

## 🎨 更换应用图标

### 方法1：直接替换（最简单）

1. **准备图标文件**
   - 你的新图标应该是正方形的PNG格式
   - 建议尺寸：512x512px（会自动缩放到其他尺寸）

2. **替换现有图标**
   ```bash
   # 将你的新图标替换到指定路径
   cp /path/to/your/new-icon-512.png public/assets/icons/app-icon-512.png
   cp /path/to/your/new-icon-512.png public/assets/icons/app-icon-192.png
   ```

3. **重新构建应用**
   ```bash
   npm run electron-pack-mac
   ```

### 方法2：使用完整图标集（推荐）

1. **创建所有尺寸的图标**
   ```bash
   mkdir -p public/assets/icons

   # 使用你的原始图标生成不同尺寸
   # 假设你的原始图标是 icon-original.png
   sips -Z 16 icon-original.png --out public/assets/icons/app-icon-16.png
   sips -Z 32 icon-original.png --out public/assets/icons/app-icon-32.png
   sips -Z 64 icon-original.png --out public/assets/icons/app-icon-64.png
   sips -Z 128 icon-original.png --out public/assets/icons/app-icon-128.png
   sips -Z 256 icon-original.png --out public/assets/icons/app-icon-256.png
   sips -Z 512 icon-original.png --out public/assets/icons/app-icon-512.png
   ```

2. **创建macOS图标文件(.icns)**
   ```bash
   # 使用iconutil创建macOS图标文件
   iconutil -c icns -o public/assets/icons/app-icon.icns public/assets/icons/icon.iconset/
   ```

3. **构建应用**
   ```bash
   npm run electron-pack-mac
   ```

## 📋 图标要求

- **格式**：PNG（推荐）
- **尺寸**：正方形
- **最小尺寸**：512x512px
- **最大文件大小**：建议小于1MB
- **设计**：简洁、易识别、适合小尺寸显示

## 🎯 注意事项

1. 确保图标在浅色和深色背景下都清晰可见
2. 测试图标在不同尺寸下的显示效果
3. 图标应该代表应用的功能和品牌
4. 避免使用过于复杂的细节

## 🚀 快速测试

修改图标后，可以通过以下方式快速测试：

```bash
# 开发模式测试
npm run electron

# 确认图标正确显示后，打包发布
npm run electron-pack-mac
```