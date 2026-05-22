// 文本文件内容提取器 - 从文本文件中提取英文内容
import { readFile } from 'fs/promises';
import { TextFormat } from '../types/index.js';

/**
 * 判断一段文本是否主要为英文
 * 使用简单的 ASCII 字母比例判断
 */
export function isEnglishText(text: string): boolean {
  if (!text.trim()) return false;
  const alphaChars = text.replace(/[^a-zA-Z]/g, '');
  const totalChars = text.replace(/\s/g, '');
  if (totalChars.length === 0) return false;
  // 如果英文字母占比超过 50%，认为是英文段落
  return alphaChars.length / totalChars.length > 0.5;
}

/**
 * 将文本按段落分割并过滤出英文段落
 */
export function filterEnglishParagraphs(text: string): string {
  const paragraphs = text.split(/\n\s*\n|\r\n\s*\r\n/);
  const englishParagraphs = paragraphs
    .map(p => p.trim())
    .filter(p => p.length > 0 && isEnglishText(p));
  return englishParagraphs.join('\n\n');
}

/**
 * 解析 SRT 字幕文件，提取纯文本内容
 */
export function parseSrt(content: string): string {
  const lines = content.split(/\r?\n/);
  const textLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过序号行（纯数字）
    if (/^\d+$/.test(trimmed)) continue;
    // 跳过时间码行
    if (/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(trimmed)) continue;
    // 跳过空行
    if (!trimmed) continue;
    // 移除 HTML 标签
    const cleanLine = trimmed.replace(/<[^>]+>/g, '');
    if (cleanLine) textLines.push(cleanLine);
  }
  
  return textLines.join('\n');
}

/**
 * 从文本文件中提取英文内容
 */
export async function extractFromTextFile(filePath: string, format: TextFormat): Promise<string> {
  switch (format) {
    case 'txt':
      return extractFromTxt(filePath);
    case 'md':
      return extractFromMd(filePath);
    case 'pdf':
      return extractFromPdf(filePath);
    case 'docx':
      return extractFromDocx(filePath);
    case 'srt':
      return extractFromSrt(filePath);
    default:
      throw new Error(`不支持的文本格式: ${format}`);
  }
}

/**
 * 从 TXT 文件提取内容
 */
async function extractFromTxt(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  return filterEnglishParagraphs(content);
}

/**
 * 从 Markdown 文件提取内容
 * 去除 Markdown 语法标记，保留纯文本
 * 对于中英混合的学习材料，保留全部内容（交给 AI 提取英文学习项）
 */
async function extractFromMd(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  // 去除 Markdown 语法
  const plainText = content
    .replace(/```[\s\S]*?```/g, '')        // 多行代码块
    .replace(/^#{1,6}\s+/gm, '')          // 标题标记
    .replace(/\*\*(.+?)\*\*/g, '$1')      // 粗体
    .replace(/\*(.+?)\*/g, '$1')          // 斜体
    .replace(/`([^`]*)`/g, '$1')          // 行内代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // 图片
    .replace(/^[-*+]\s+/gm, '')           // 无序列表标记
    .replace(/^\d+\.\s+/gm, '')           // 有序列表标记
    .replace(/^>\s+/gm, '')               // 引用标记
    .replace(/^---+$/gm, '')              // 分隔线
    .replace(/\|/g, ' ');                 // 表格分隔符

  // 对于 md 文件（通常是学习笔记），保留全部内容让 AI 提取
  // 只要文件中包含英文字符就认为有效
  const hasEnglish = /[a-zA-Z]{2,}/.test(plainText);
  if (!hasEnglish) {
    return '';
  }
  return plainText.trim();
}

/**
 * 从 PDF 文件提取内容
 * 使用 pdf-parse 库
 */
async function extractFromPdf(filePath: string): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = await readFile(filePath);
    const data = await pdfParse(buffer);
    return filterEnglishParagraphs(data.text);
  } catch (error) {
    throw new Error(`PDF 文件提取失败: ${(error as Error).message}`);
  }
}

/**
 * 从 DOCX 文件提取内容
 * 使用 mammoth 库
 */
async function extractFromDocx(filePath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return filterEnglishParagraphs(result.value);
  } catch (error) {
    throw new Error(`DOCX 文件提取失败: ${(error as Error).message}`);
  }
}

/**
 * 从 SRT 字幕文件提取内容
 */
async function extractFromSrt(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  const text = parseSrt(content);
  return filterEnglishParagraphs(text);
}
