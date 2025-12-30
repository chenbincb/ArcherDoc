#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
组合结果数据脚本
读取生成的文章和元数据文件，组合成最终的响应数据
"""

import os
import json
import argparse
import sys

def load_article_content(file_path):
    """加载文章内容"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading article content: {e}")
        return None

def load_article_metadata(file_path):
    """加载文章元数据"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading article metadata: {e}")
        return None

def save_result(result_data, output_file):
    """保存结果到文件"""
    try:
        # 确保输出目录存在
        output_dir = os.path.dirname(output_file)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving result: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='组合结果数据')
    parser.add_argument('--job-dir', required=True, help='任务目录路径')
    parser.add_argument('--job-id', required=True, help='任务ID')
    parser.add_argument('--article-type', required=True, help='文章类型')
    
    args = parser.parse_args()
    
    # 构建文件路径
    article_file = os.path.join(args.job_dir, 'generated_article.txt')
    metadata_file = os.path.join(args.job_dir, 'generated_article.json')
    
    # 读取文章内容
    article_content = load_article_content(article_file)
    if article_content is None:
        print("Failed to load article content")
        sys.exit(1)
    
    # 读取元数据
    article_metadata = load_article_metadata(metadata_file)
    if article_metadata is None:
        # 如果元数据文件不存在或读取失败，创建默认元数据
        article_metadata = {
            "generated_by": "AI Article Generator",
            "version": "1.0",
            "timestamp": "unknown"
        }
    
    # 创建最终响应数据
    response_data = {
        "success": True,
        "jobId": args.job_id,
        "article": {
            "content": article_content,
            "metadata": article_metadata,
            "wordCount": len(article_content),
            "articleType": args.article_type
        },
        "downloadUrl": f"http://178.118.101.128:5678/webhook/article-download-webhook/download-article/{args.job_id}",
        "previewUrl": f"http://178.118.101.128:5678/webhook/article-preview-webhook/preview-article/{args.job_id}"
    }
    
    # 输出结果到标准输出，供n8n捕获
    print(json.dumps(response_data, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()