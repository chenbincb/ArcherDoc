#!/bin/bash

# 配置您的服务器信息
SERVER_USER="n8n"
SERVER_IP="178.104.163.8"
REMOTE_DIR="/home/n8n/ArcherDoc"
BACKUP_DIR="$REMOTE_DIR/backups"

echo "🚀 开始部署流程..."

# --- 1. 服务器备份 ---
echo "💾 [Backup] 正在执行服务器备份..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="backup_$TIMESTAMP.tar.gz"

ssh $SERVER_USER@$SERVER_IP "
    # 确保备份目录存在
    mkdir -p $BACKUP_DIR
    
    # 进入项目根目录
    cd $REMOTE_DIR
    
    # 执行打包备份 (排除 node_modules, uploads, jobs 等大文件和临时文件)
    # -z: gzip压缩, -c: 创建, -f: 文件名
    echo '   正在压缩文件...'
    tar -czf $BACKUP_DIR/$BACKUP_FILENAME \
        --exclude='node_modules' \
        --exclude='uploads' \
        --exclude='jobs' \
        --exclude='dist' \
        --exclude='.git' \
        --exclude='backups' \
        backend frontend
        
    echo '   备份已保存至: $BACKUP_DIR/$BACKUP_FILENAME'
    
    # (可选) 只保留最近 10 个备份，清理旧的
    ls -t $BACKUP_DIR/backup_*.tar.gz | tail -n +11 | xargs -I {} rm -- {}
"

if [ $? -ne 0 ]; then
    echo "❌ 备份失败！终止部署以保护现场。"
    exit 1
fi
echo "✅ 备份完成！"

# --- 2. 后端构建与上传 (可选) ---
echo "📦 [Backend] 正在编译后端..."
cd backend
npm run build
if [ $? -ne 0 ]; then echo "❌ 后端编译失败"; exit 1; fi

echo "📤 [Backend] 上传代码..."
# 排除 node_modules 和 uploads，利用 rsync 增量上传
rsync -avz --exclude 'node_modules' --exclude 'uploads' --exclude 'jobs' --exclude '.env' ./dist ./package.json $SERVER_USER@$SERVER_IP:$REMOTE_DIR/backend/
cd ..

# --- 3. 前端构建与上传 ---
echo "🎨 [Frontend] 正在编译前端..."
cd frontend
# 确保使用生产环境 API 地址
export VITE_API_BASE_URL=http://$SERVER_IP:4567
npm run build
if [ $? -ne 0 ]; then echo "❌ 前端编译失败"; exit 1; fi

echo "📤 [Frontend] 上传 dist 目录..."
# 直接将 dist 目录的内容同步到服务器的 frontend/dist
rsync -avz ./dist/ $SERVER_USER@$SERVER_IP:$REMOTE_DIR/frontend/dist/
cd ..

# --- 4. 重启服务 ---
echo "🔄 [Server] 重启服务..."
ssh $SERVER_USER@$SERVER_IP "sudo systemctl restart archerdoc archerdoc_backend"

echo "✅ 部署全部完成！"
