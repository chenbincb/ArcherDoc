#!/bin/bash
# -*- coding: utf-8 -*-
"""
Coqui TTS服务部署脚本
自动化部署Systemd服务
"""

set -e  # 遇到错误时立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否以root权限运行
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "请不要以root用户运行此脚本"
        log_info "请使用普通用户运行，脚本会在需要时使用sudo"
        exit 1
    fi
}

# 检查当前用户
check_user() {
    if [[ "$(whoami)" != "n8n" ]]; then
        log_warning "当前用户不是n8n，将使用当前用户: $(whoami)"
        # 替换服务文件中的用户名
        sed -i "s/user = n8n/user = $(whoami)/g" gunicorn_conf.py
        sed -i "s/group = n8n/group = $(whoami)/g" gunicorn_conf.py
        sed -i "s/User=n8n/User=$(whoami)/g" tts-service.service
        sed -i "s/Group=n8n/Group=$(whoami)/g" tts-service.service
    fi
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."

    sudo mkdir -p /var/log/tts_service
    sudo mkdir -p /home/n8n/AIStudio/jobs/audio
    sudo mkdir -p /home/n8n/AIStudio/Coqui/logs

    # 设置权限
    sudo chown -R $(whoami):$(whoami) /var/log/tts_service
    sudo chown -R $(whoami):$(whoami) /home/n8n/AIStudio/jobs/audio
    sudo chown -R $(whoami):$(whoami) /home/n8n/AIStudio/Coqui

    log_success "目录创建完成"
}

# 安装Python依赖
install_dependencies() {
    log_info "安装Python依赖..."

    # 检查虚拟环境
    if [[ -d "/home/n8n/AIStudio/venv" ]]; then
        VENV_PATH="/home/n8n/AIStudio/venv"
    else
        VENV_PATH="$PWD/venv"
        log_warning "未找到标准虚拟环境，使用当前目录: $VENV_PATH"
    fi

    $VENV_PATH/bin/pip install fastapi uvicorn gunicorn python-multipart pydantic

    log_success "Python依赖安装完成"
}

# 部署Systemd服务
deploy_service() {
    log_info "部署Systemd服务..."

    # 复制服务文件
    sudo cp tts-service.service /etc/systemd/system/

    # 重新加载systemd
    sudo systemctl daemon-reload

    # 启用服务
    sudo systemctl enable tts-service

    log_success "Systemd服务部署完成"
}

# 启动服务
start_service() {
    log_info "启动 TTS 服务..."

    # 启动服务
    sudo systemctl start tts-service

    # 等待服务启动
    sleep 3

    # 检查状态
    if sudo systemctl is-active --quiet tts-service; then
        log_success "TTS 服务启动成功!"
    else
        log_error "TTS 服务启动失败!"
        sudo systemctl status tts-service
        exit 1
    fi
}

# 显示服务状态
show_status() {
    log_info "服务状态:"
    sudo systemctl status tts-service --no-pager

    echo
    log_info "服务日志 (最近20行):"
    sudo journalctl -u tts-service -n 20 --no-pager
}

# 测试API
test_api() {
    log_info "测试API接口..."

    # 等待服务完全启动
    sleep 5

    # 测试健康检查
    if curl -s http://localhost:8001/health > /dev/null; then
        log_success "API健康检查通过!"

        # 显示健康检查结果
        echo
        log_info "健康检查结果:"
        curl -s http://localhost:8001/health | python3 -m json.tool

    else
        log_error "API健康检查失败!"
        return 1
    fi
}

# 显示使用说明
show_usage() {
    cat << 'EOF'
🎉 Coqui TTS 服务部署完成!

📋 服务管理命令:
  查看状态: sudo systemctl status tts-service
  启动服务: sudo systemctl start tts-service
  停止服务: sudo systemctl stop tts-service
  重启服务: sudo systemctl restart tts-service
  查看日志: sudo journalctl -u tts-service -f

🌐 API接口:
  健康检查: curl http://localhost:8001/health
  服务统计: curl http://localhost:8001/stats
  API文档:   http://localhost:8001/docs

🔊 生成音频示例:
  curl -X POST "http://localhost:8001/generate" \
       -H "Content-Type: application/json" \
       -d '{
         "text": "这是一个测试文本",
         "speaker_wav": "/home/n8n/AIStudio/default_speaker.wav",
         "output_filename": "test_audio.mp3"
       }'

📁 音频文件位置:
  输出目录: /home/n8n/AIStudio/jobs/audio/
  日志目录: /var/log/tts_service/

⚠️  注意事项:
  1. 确保GPU可用且有足够内存
  2. 首次启动可能需要1-2分钟加载模型
  3. 检查日志排查问题: sudo journalctl -u tts-service -f

EOF
}

# 主函数
main() {
    log_info "🚀 开始部署 Coqui TTS 服务..."
    echo "========================================"

    # 执行部署步骤
    check_root
    check_user
    create_directories
    install_dependencies
    deploy_service
    start_service

    echo "========================================"

    # 显示状态和测试
    show_status
    echo
    test_api

    echo "========================================"
    show_usage
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@"