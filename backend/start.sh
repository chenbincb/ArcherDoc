#!/bin/bash

echo "==================================="
echo "ArcherDoc AI Backend"
echo "==================================="
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js >= 18.0.0"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✓ npm version: $(npm --version)"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Installing dependencies..."
    npm install
fi

# 检查LibreOffice
echo ""
echo "Checking LibreOffice..."
if command -v soffice &> /dev/null || command -v libreoffice &> /dev/null || [ -f "/Applications/LibreOffice.app/Contents/MacOS/soffice" ]; then
    echo "✓ LibreOffice is installed"
else
    echo "⚠️  LibreOffice not found. PPT conversion may not work."
    echo "   Install: brew install libreoffice (macOS) or apt-get install libreoffice (Ubuntu)"
fi

# 检查pdftoppm
echo "Checking pdftoppm..."
if command -v pdftoppm &> /dev/null; then
    echo "✓ pdftoppm is installed"
else
    echo "⚠️  pdftoppm not found. PPT conversion may not work."
    echo "   Install: brew install poppler (macOS) or apt-get install poppler-utils (Ubuntu)"
fi

echo ""
echo "==================================="
echo "Starting development server..."
echo "==================================="
echo ""

# 启动开发服务器
npm run dev
