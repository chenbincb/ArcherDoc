require('dotenv').config();
const https = require('https');

const apiKey = process.env.GEMINI_API_KEY || ''; // 尝试找到随口拿来的 Qwen 或者是环境变量里有的 key，如果是 QWEN，我需要去 settings/库看，其实用户在 Settings 里填的。
// 测试脚本不需要，因为我不知道 frontend 的 key。
