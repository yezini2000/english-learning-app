// 音频/视频内容提取器 - 使用 OpenAI Whisper API 进行语音转文字
import { readFile } from 'fs/promises';
import { EXTRACTION_TIMEOUT } from '../types/index.js';
import { filterEnglishParagraphs } from './textExtractor.js';

/**
 * 使用 OpenAI Whisper API 转录音频文件
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('OpenAI API Key 未配置。请在 .env 文件中设置 OPENAI_API_KEY。');
  }

  const fileBuffer = await readFile(filePath);
  const fileName = filePath.split('/').pop() || 'audio.mp3';

  // 创建 FormData
  const formData = new FormData();
  const blob = new Blob([fileBuffer]);
  formData.append('file', blob, fileName);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  formData.append('response_format', 'text');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXTRACTION_TIMEOUT);

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API 错误 (${response.status}): ${errorText}`);
    }

    const text = await response.text();
    return text;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      throw new Error('音频转录超时（超过 120 秒）');
    }
    throw error;
  }
}

/**
 * 从音频文件提取英文内容
 */
export async function extractFromAudio(filePath: string): Promise<string> {
  try {
    const text = await transcribeAudio(filePath);
    return filterEnglishParagraphs(text);
  } catch (error) {
    throw new Error(`音频内容提取失败: ${(error as Error).message}`);
  }
}

/**
 * 从视频文件提取英文内容
 * 优先提取字幕，失败时回退到音频转录
 */
export async function extractFromVideo(filePath: string): Promise<string> {
  try {
    // 尝试提取字幕（简化实现：直接使用 Whisper 转录视频音频）
    // 在生产环境中，应先尝试 ffmpeg 提取字幕轨道
    const text = await transcribeAudio(filePath);
    return filterEnglishParagraphs(text);
  } catch (error) {
    throw new Error(`视频内容提取失败: ${(error as Error).message}`);
  }
}
