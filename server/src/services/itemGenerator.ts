// 学习项生成器 - 使用 DeepSeek API 从文本中提取词汇、词组和语句
import { GeneratedItem, MAX_GENERATED_ITEMS } from '../types/index.js';

/**
 * 提示模板
 */
const GENERATION_PROMPT = `You are an English learning assistant. Analyze the following text and extract useful English learning items for a Chinese learner.

For each item, provide:
1. The English text (word, phrase, or sentence)
2. Category: "vocabulary" (single word), "phrase" (multi-word expression), or "sentence" (full sentence)
3. English definition
4. Chinese translation
5. For vocabulary and phrases: 1-3 example sentences

Return ONLY a JSON array (no markdown, no code blocks) with this structure:
[
  {
    "text": "example",
    "category": "vocabulary",
    "definition": "a thing characteristic of its kind",
    "translation": "例子",
    "exampleSentences": ["This is a good example.", "Can you give me an example?"]
  }
]

Rules:
- Extract ALL English vocabulary, phrases, and sentences from the text. Do not skip any items.
- The "text" field MUST be in English only. Do NOT extract Chinese words or phrases as learning items.
- If the input contains Chinese explanations paired with English words, only extract the English words/phrases, not the Chinese.
- Sentences should be complete and meaningful
- Definitions should be clear and concise
- Translations should be natural Chinese
- Example sentences should demonstrate typical usage
- Only include items that would be useful for an intermediate English learner
- If the input contains Chinese explanations with English words, extract the English words/phrases

Text to analyze:
`;

/**
 * 使用 DeepSeek API 生成学习项
 */
export async function generateItems(text: string): Promise<GeneratedItem[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
    throw new Error('API Key 未配置。请在 .env 文件中设置 OPENAI_API_KEY。');
  }

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.OPENAI_MODEL || 'deepseek-chat';

  // 如果文本过长，分段处理（每段最多 2500 字符，确保每段都能完整生成）
  const MAX_CHUNK = 2500;
  if (text.length <= MAX_CHUNK) {
    return await generateFromChunk(text, baseUrl, model, apiKey);
  }

  // 分段处理长文本
  const allItems: GeneratedItem[] = [];
  for (let i = 0; i < text.length; i += MAX_CHUNK) {
    const chunk = text.slice(i, i + MAX_CHUNK);
    const items = await generateFromChunk(chunk, baseUrl, model, apiKey);
    allItems.push(...items);
    if (allItems.length >= MAX_GENERATED_ITEMS) break;
  }
  return allItems.slice(0, MAX_GENERATED_ITEMS);
}

/**
 * 分段生成学习项，每段完成后通过回调返回结果
 * 回调返回 false 表示停止生成
 */
export async function generateItemsChunked(
  text: string,
  onChunk: (items: GeneratedItem[]) => boolean
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
    throw new Error('API Key 未配置。请在 .env 文件中设置 OPENAI_API_KEY。');
  }

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.OPENAI_MODEL || 'deepseek-chat';

  const MAX_CHUNK = 2500;

  if (text.length <= MAX_CHUNK) {
    const items = await generateFromChunk(text, baseUrl, model, apiKey);
    onChunk(items);
    return;
  }

  for (let i = 0; i < text.length; i += MAX_CHUNK) {
    const chunk = text.slice(i, i + MAX_CHUNK);
    const items = await generateFromChunk(chunk, baseUrl, model, apiKey);
    const shouldContinue = onChunk(items);
    if (!shouldContinue) break;
  }
}

async function generateFromChunk(text: string, baseUrl: string, model: string, apiKey: string): Promise<GeneratedItem[]> {
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful English learning assistant. Always respond with valid JSON array only, no markdown. Extract ALL items from the text, do not skip any.',
          },
          {
            role: 'user',
            content: GENERATION_PROMPT + text,
          },
        ],
        temperature: 0.7,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 错误 (${response.status}): ${errorText}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('API 返回空内容');
    }

    // 解析 JSON（处理可能的 markdown 代码块包裹）
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    const items: GeneratedItem[] = Array.isArray(parsed) ? parsed : parsed.items || [];

    // 验证和清理生成的项目
    return validateAndCleanItems(items).slice(0, MAX_GENERATED_ITEMS);
  } catch (error) {
    const errMsg = (error as Error).message;
    if (errMsg.includes('API')) {
      throw error;
    }
    throw new Error(`学习项生成失败: ${errMsg}`);
  }
}

/**
 * 验证和清理生成的学习项
 */
export function validateAndCleanItems(items: any[]): GeneratedItem[] {
  const validCategories = new Set(['vocabulary', 'phrase', 'sentence']);

  return items
    .filter(item => {
      if (!item || typeof item !== 'object') return false;
      if (!item.text || typeof item.text !== 'string') return false;
      if (!validCategories.has(item.category)) return false;
      if (!item.definition || typeof item.definition !== 'string') return false;
      if (!item.translation || typeof item.translation !== 'string') return false;
      // 过滤掉 text 是中文的项目（英文字母占比低于 50%）
      const englishChars = item.text.replace(/[^a-zA-Z]/g, '').length;
      const totalChars = item.text.replace(/\s/g, '').length;
      if (totalChars > 0 && englishChars / totalChars < 0.5) return false;
      return true;
    })
    .map(item => ({
      text: item.text.trim(),
      category: item.category as GeneratedItem['category'],
      definition: item.definition.trim(),
      translation: item.translation.trim(),
      exampleSentences: validateExampleSentences(item),
    }));
}

/**
 * 验证例句（词汇和词组需要 1-3 个例句）
 */
function validateExampleSentences(item: any): string[] {
  if (item.category === 'sentence') {
    return [];
  }

  const sentences = Array.isArray(item.exampleSentences)
    ? item.exampleSentences
        .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        .map((s: string) => s.trim())
        .slice(0, 3)
    : [];

  return sentences;
}
