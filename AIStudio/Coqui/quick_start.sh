#!/bin/bash
# -*- coding: utf-8 -*-
"""
Coqui TTS服务快速启动脚本
适用于已经部署后的快速重启和管理
"""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 显示服务状态
show_status() {
    log_info "服务状态:"
    sudo systemctl status tts-service --no-pager
    echo

    log_info "GPU状态:"
    nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv,noheader,nounits
    echo

    log_info "最新日志 (最后5行):"
    sudo journalctl -u tts-service -n 5 --no-pager
}

# 快速测试API
quick_test() {
    log_info "快速API测试..."

    # 健康检查
    health_response=$(curl -s http://localhost:8001/health 2>/dev/null)
    if [[ $? -eq 0 ]]; then
        log_success "✅ API健康检查通过"
        echo "$health_response" | python3 -m json.tool 2>/dev/null || echo "$health_response"
    else
        log_error "❌ API健康检查失败"
        return 1
    fi

    # 生成测试音频
    test_response=$(curl -s -X POST "http://localhost:8001/generate" \
        -H "Content-Type: application/json" \
        -d '{"text": "快速测试音频", "output_filename": "quick_test.mp3"}' 2>/dev/null)

    if [[ $? -eq 0 ]]; then
        echo "$test_response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('✅ 音频生成测试通过')
        print(f'处理时间: {data.get(\"processing_time\", \"N/A\")}秒')
    else:
        print('❌ 音频生成失败')
        print(f'错误: {data.get(\"error\", \"Unknown\")}')
except:
    print('响应格式解析失败')
" 2>/dev/null
    else
        log_error "❌ 音频生成测试失败"
        return 1
    fi
}

# 显示常用命令
show_commands() {
    cat << 'EOF'
🔧 常用管理命令:

服务控制:
  start:    sudo systemctl start tts-service
  stop:     sudo systemctl stop tts-service
  restart:  sudo systemctl restart tts-service
  status:   sudo systemctl status tts-service
  reload:   sudo systemctl reload tts-service

日志查看:
  实时日志: sudo journalctl -u tts-service -f
  错误日志: sudo journalctl -u tts-service -p err -f
  最近日志: sudo journalctl -u tts-service -n 50

服务配置:
  编辑配置: sudo systemctl edit tts-service
  重载配置: sudo systemctl daemon-reload

API测试:
  健康检查: curl http://localhost:8001/health
  服务统计: curl http://localhost:8001/stats
  API文档:  http://localhost:8001/docs

批量测试: python test_client.py

EOF
}

# 显示使用案例
show_examples() {
    cat << 'EOF'
💡 使用示例:

1. 基础音频生成:
   curl -X POST "http://localhost:8001/generate" \
        -H "Content-Type: application/json" \
        -d '{"text": "测试文本", "output_filename": "test.mp3"}'

2. 使用自定义说话人:
   curl -X POST "http://localhost:8001/generate" \
        -H "Content-Type: application/json" \
        -d '{
          "text": "自定义语音测试",
          "speaker_wav": "/home/n8n/AIStudio/default_speaker.wav",
          "output_filename": "custom_voice.mp3"
        }'

3. Python脚本调用:
   python3 -c "
import requests
r = requests.post('http://localhost:8001/generate',
    json={'text': 'Python测试', 'output_filename': 'python_test.mp3'})
print(r.json())
"

4. 批量处理测试:
   python test_client.py

EOF
}

# 主菜单
case "${1:-}" in
    "status"|"s")
        show_status
        ;;
    "test"|"t")
        show_status
        echo
        quick_test
        ;;
    "commands"|"c")
        show_commands
        ;;
    "examples"|"e")
        show_examples
        ;;
    "help"|"h"|"")
        echo "Coqui TTS 服务管理工具"
        echo
        echo "用法: $0 [命令]"
        echo
        echo "命令:"
        echo "  status, s     显示服务状态"
        echo "  test, t      运行快速测试"
        echo "  commands, c  显示管理命令"
        echo "  examples, e  显示使用示例"
        echo "  help, h      显示帮助"
        ;;
    *)
        log_error "未知命令: $1"
        echo "使用 '$0 help' 查看帮助"
        exit 1
        ;;
esac