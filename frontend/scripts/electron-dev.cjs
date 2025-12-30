#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// 设置环境变量
process.env.NODE_ENV = 'development';
process.env.ELECTRON = 'true';

console.log('🚀 启动 ArcherDoc AI Electron 开发版...');
console.log('📦 正在启动 Vite 开发服务器...');

// 启动 Vite 开发服务器
const viteProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

// 等待 Vite 服务器启动
viteProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Vite 服务器启动失败');
    process.exit(code);
  }
});

// 监听 stdout，等待服务器启动
viteProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);

  // 当看到 Vite 服务器启动成功的信息时，启动 Electron
  if (output.includes('Local:') && output.includes('http://localhost:3000')) {
    console.log('✅ Vite 服务器启动成功！');
    console.log('🎯 正在启动 Electron 应用...');

    // 延迟1秒后启动 Electron
    setTimeout(() => {
      const electronProcess = spawn('npm', ['run', 'electron'], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env }
      });

      electronProcess.on('close', (code) => {
        console.log(`Electron 应用退出，代码: ${code}`);
        process.exit(code);
      });
    }, 1000);
  }
});

// 错误处理
viteProcess.stderr.on('data', (data) => {
  console.error(`Vite 错误: ${data}`);
});

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭开发服务器...');
  viteProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 正在关闭开发服务器...');
  viteProcess.kill('SIGTERM');
  process.exit(0);
});