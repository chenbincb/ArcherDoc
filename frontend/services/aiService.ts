
import { GoogleGenAI } from "@google/genai";
import { AIProvider, AppSettings, ProviderConfig, GlossaryItem } from '../types';

// Generic response interface
interface TranslationResponse {
  translatedText: string;
}

const BASE_SYSTEM_PROMPT = `You are a professional presentation translator. 
Translate the text provided by the user to the target language.

CRITICAL RULES:
1. Maintain the original meaning accurately.
2. KEEP IT CONCISE. The output length should be as close to the original length as possible to strictly preserve the slide layout.
3. If the target language typically uses more space, try to use shorter synonyms or abbreviations where professional.
4. Do not add any explanations, just return the translated text.
5. Do not add markdown formatting unless requested.
6. **DO NOT TRANSLATE SYMBOLS OR PUNCTUATION.** Keep all punctuation marks, bullet points, numbers, and special symbols (e.g., !, ?, ., :, -, •, ©, ®, ™, /) EXACTLY as they appear in the original text. Only translate words.`;

// Helper to construct the full prompt with glossary
const buildSystemPrompt = (targetLanguage: string, glossary: GlossaryItem[] = []) => {
  let prompt = BASE_SYSTEM_PROMPT + `\nTarget Language: ${targetLanguage}`;
  
  if (glossary && glossary.length > 0) {
    prompt += `\n\nTERMINOLOGY GLOSSARY (STRICTLY FOLLOW THESE RULES):                                                                                                                                                                                  │
    You MUST use the specific translations defined below for the following terms:`; 
    glossary.forEach(item => {
      if (item.term.trim() && item.translation.trim()) {
        prompt += `\n- "${item.term}" MUST be translated as "${item.translation}"`;  
      }
    });
  }
  
  return prompt;
};

// Utility for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 7,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check for rate limits (429) or server errors (503, 502, 500)
      const errorMessage = error.message || error.toString();
      const isRateLimit = 
        errorMessage.includes('429') || 
        error.status === 429 || 
        error.code === 429 ||
        errorMessage.toLowerCase().includes('rate limit') ||
        errorMessage.toLowerCase().includes('resource exhausted'); 

      const isServerBusy = 
        errorMessage.includes('503') || 
        error.status === 503 || 
        errorMessage.includes('500') ||
        errorMessage.includes('overloaded');

      if (isRateLimit || isServerBusy) {
        // Exponential backoff with jitter
        let waitTime = baseDelay * Math.pow(2, i) + (Math.random() * 1000);

        // Intelligent header parsing for resets
        const resetMatch = errorMessage.match(/X-RateLimit-Reset[\\":]+(\d+)/i);
        if (resetMatch && resetMatch[1]) {
             const resetTime = parseInt(resetMatch[1], 10);
             const now = Date.now();
             if (!isNaN(resetTime) && resetTime > now) {
                 waitTime = (resetTime - now) + 1000; 
                 if (waitTime > 60000) waitTime = 60000;
                 console.warn(`Rate limit reset detected. Waiting ${Math.round(waitTime)}ms`);
             }
        } else if (isRateLimit) {
            waitTime = Math.max(waitTime, 5000 * Math.pow(1.5, i));
        }

        console.warn(`API request failed (Attempt ${i + 1}/${maxRetries}). Retrying in ${Math.round(waitTime)}ms... Error: ${errorMessage.substring(0, 100)}...`);
        await delay(waitTime);
        continue;
      }

      throw error;
    }
  }
  throw lastError;
}

export const translateText = async (
  text: string,
  settings: AppSettings
): Promise<string> => {
  if (!text || text.trim().length === 0) return text;

  // 1. Quick check: If the text is ONLY symbols/numbers, return it immediately
  if (/^[\d\s\p{P}\p{S}]+$/u.test(text)) {
      return text;
  }

  // 2. Check for single characters (A, b, -, 1) vs CJK (我)
  const trimmed = text.trim();
  if (trimmed.length === 1) {
      const charCode = trimmed.charCodeAt(0);
      const isCJK = (charCode >= 0x4e00 && charCode <= 0x9fff);
      if (!isCJK) {
          return text;
      }
  }

  const currentConfig = settings.configs[settings.activeProvider];
  // Generate the system prompt with glossary once
  const systemPrompt = buildSystemPrompt(settings.targetLanguage, settings.glossary);

  // Wrap the API call in the retry logic
  return withRetry(async () => {
    if (settings.activeProvider === AIProvider.GEMINI) {
      return await translateWithGemini(text, currentConfig, settings.targetLanguage, systemPrompt);
    } else {
      return await translateWithGeneric(text, currentConfig, settings.targetLanguage, settings.activeProvider, systemPrompt);
    }
  });
};



async function translateWithGemini(
    text: string, 
    config: ProviderConfig, 
    targetLanguage: string,
    systemPrompt: string
): Promise<string> {
  const apiKey = config.apiKey || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // We add the prompt instruction again in content just to be safe, though systemInstruction is preferred
  const userPrompt = `Translate to ${targetLanguage}:\n\n"${text}"`;

  const response = await ai.models.generateContent({
    model: config.model || 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.1,
    },
  });

  return response.text?.trim() || text;
}

async function translateWithGeneric(
    text: string, 
    config: ProviderConfig, 
    targetLanguage: string,
    providerType: AIProvider,
    systemPrompt: string
): Promise<string> {
  const apiKey = config.apiKey;
  
  let defaultBaseUrl = 'https://openrouter.ai/api/v1';
  let defaultModel = 'openai/gpt-3.5-turbo';

  if (providerType === AIProvider.OLLAMA) {
      defaultBaseUrl = 'http://localhost:11434/v1';
      defaultModel = 'llama3';
  } else if (providerType === AIProvider.VLLM) {
      defaultBaseUrl = 'http://localhost:8000/v1';
      defaultModel = 'facebook/opt-125m';
  }

  const baseUrl = config.baseUrl || defaultBaseUrl;
  const model = config.model || defaultModel;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey && apiKey !== 'EMPTY') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  
  const body = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },                                                                                                                                                                                            
      { role: 'user', content: text } 
    ],
    temperature: 0.1,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}
