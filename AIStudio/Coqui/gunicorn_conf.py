#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gunicorn配置文件
用于Coqui TTS服务的生产环境部署
"""

import multiprocessing

# 服务器配置
bind = "0.0.0.0:8001"
workers = 1  # 单worker，因为模型要常驻GPU
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
preload_app = True  # 预加载应用，模型在fork前加载

# 超时配置
timeout = 120
keepalive = 5

# 日志配置
accesslog = "/var/log/tts_service/access.log"
errorlog = "/var/log/tts_service/error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# 进程配置
user = "n8n"
group = "n8n"
daemon = False

# 优雅重启
graceful_timeout = 30

# 安全配置
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# 进程命名
proc_name = "coqui_tts_service"