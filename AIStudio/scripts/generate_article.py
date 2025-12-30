#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI生成公众号网文脚本
基于提取的PPT内容，使用AI大模型生成适合公众号发布的文章
"""

import os
import json
import argparse
import sys
import requests

def load_ppt_content(content_file):
    """加载PPT内容数据"""
    try:
        with open(content_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading PPT content: {e}")
        return None

def generate_article_prompt(ppt_data, custom_prompt, existing_article=None):
    """
    使用Web页面生成的提示词，替换模板变量
    ppt_data: PPT内容数据
    custom_prompt: Web页面生成的提示词模板
    existing_article: 已生成的文章内容（用于微调）
    """
    
    # 提取关键信息
    structure = ppt_data.get("structure", {})
    slides = ppt_data.get("slides", [])
    summary = ppt_data.get("summary", {})
    
    # 构建内容摘要
    content_summary = []
    for slide in slides:
        if slide.get("text_content"):
            slide_text = " ".join(slide["text_content"])
            if slide_text.strip():
                content_summary.append(f"第{slide['slide_number']}页: {slide_text}")
    
    # 替换模板变量
    prompt = custom_prompt.replace("{{PPT_TITLE}}", structure.get('master_info', {}).get('title', '未命名'))
    prompt = prompt.replace("{{PPT_AUTHOR}}", structure.get('master_info', {}).get('author', '未知'))
    prompt = prompt.replace("{{TOTAL_SLIDES}}", str(summary.get('total_slides', 0)))
    prompt = prompt.replace("{{CONTENT_SLIDES}}", str(summary.get('slides_with_content', 0)))
    prompt = prompt.replace("{{CONTENT_SUMMARY}}", "\n".join(content_summary[:10]))
    
    # 如果有已生成的文章内容，添加到提示词中
    if existing_article:
        prompt += f"\n\n以下是已生成的文章内容，请基于此进行优化和微调：\n\n{existing_article}"
    
    return prompt

def generate_article_with_ai(prompt, config):
    """使用AI生成文章"""
    try:
        headers = {
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": config['model_name'],
            "messages": [
                {"role": "system", "content": "你是一位专业的公众号内容创作专家，擅长将PPT演示内容转化为吸引人的公众号文章。"},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 4000
        }
        
        response = requests.post(
            f"{config['api_base_url']}/chat/completions",
            headers=headers,
            json=data
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content'].strip()
        else:
            print(f"Error calling AI API: Status {response.status_code}, Response: {response.text}")
            return None
        
    except Exception as e:
        print(f"Error calling AI API: {e}")
        return None

def save_article(article_content, output_file, ppt_data):
    """保存生成的文章"""
    article_data = {
        "article": {
            "content": article_content,
            "word_count": len(article_content),
            "generation_time": str(os.popen('date').read().strip())
        },
        "source": {
            "ppt_title": ppt_data.get("structure", {}).get("master_info", {}).get("title", ""),
            "ppt_author": ppt_data.get("structure", {}).get("master_info", {}).get("author", ""),
            "total_slides": ppt_data.get("summary", {}).get("total_slides", 0),
            "content_slides": ppt_data.get("summary", {}).get("slides_with_content", 0)
        },
        "metadata": {
            "generated_by": "AI Article Generator",
            "version": "1.0"
        }
    }
    
    # 确保输出目录存在
    output_dir = os.path.dirname(output_file)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    # 保存JSON格式
    json_file = output_file.replace('.txt', '.json')
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(article_data, f, ensure_ascii=False, indent=2)
    
    # 保存纯文本格式
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(article_content)
    
    return json_file

def main():
    parser = argparse.ArgumentParser(
        description="基于PPT内容生成公众号网文"
    )
    parser.add_argument("--content-file", required=True, help="PPT内容JSON文件路径")
    parser.add_argument("--output-file", required=True, help="输出文章文件路径")
    parser.add_argument("--custom-prompt", required=True, help="Web页面生成的提示词模板")
    parser.add_argument("--existing-article", default="", help="已生成的文章内容（用于微调）")
    parser.add_argument("--api-base-url", default="https://openrouter.ai/api/v1", help="AI API地址")
    parser.add_argument("--model-name", default="qwen/qwen3-235b-a22b:free", help="AI模型名称")
    parser.add_argument("--api-key", default="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", help="AI API密钥")
    
    args = parser.parse_args()
    
    # 检查API密钥
    if not args.api_key or "xxxxxxxx" in args.api_key:
        print("Error: API key is not configured properly.")
        return 1
    
    print("--- Starting AI Article Generation ---")
    print(f"Content file: {args.content_file}")
    print(f"Output file: {args.output_file}")
    print(f"Using model: {args.model_name}")
    print(f"API Base URL: {args.api_base_url}")
    
    # 加载PPT内容
    ppt_data = load_ppt_content(args.content_file)
    if not ppt_data:
        print("Error: Failed to load PPT content.")
        return 1
    
    # 生成提示词
    prompt = generate_article_prompt(ppt_data, args.custom_prompt, args.existing_article)
    print(f"Generated prompt (first 200 chars): {prompt[:200]}...")
    
    # 调用AI生成文章
    print("  - Generating article with AI...")
    article_content = generate_article_with_ai(prompt, {
        'api_base_url': args.api_base_url,
        'model_name': args.model_name,
        'api_key': args.api_key
    })
    
    if not article_content:
        print("Error: Failed to generate article content.")
        return 1
    
    # 保存文章
    json_file = save_article(article_content, args.output_file, ppt_data)
    
    print(f"\nSuccessfully generated article:")
    print(f"  - Word count: {len(article_content)}")
    print(f"  - Text file: {args.output_file}")
    print(f"  - JSON file: {json_file}")
    
    # 验证文件是否正确生成
    if os.path.exists(args.output_file) and os.path.exists(json_file):
        print("  - Both files verified to exist")
        # 读取并显示生成的JSON文件内容以验证
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                saved_data = json.load(f)
                print(f"  - JSON data keys: {list(saved_data.keys())}")
        except Exception as e:
            print(f"  - Error reading JSON file: {e}")
    else:
        print("  - Warning: One or both files may not exist")
    
    return 0

if __name__ == "__main__":
    exit(main())