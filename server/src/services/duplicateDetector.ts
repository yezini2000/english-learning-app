// 重复检测逻辑 - 不区分大小写的精确匹配
import prisma from './prismaClient.js';
import { GeneratedItem } from '../types/index.js';

/**
 * 检测学习项是否已存在（不区分大小写的精确匹配）
 * SQLite 默认 COLLATE NOCASE，所以直接比较即可
 */
export async function isDuplicate(text: string, category: string): Promise<boolean> {
  const existing = await prisma.learningItem.findFirst({
    where: {
      text: text,
      category,
    },
  });
  return existing !== null;
}

/**
 * 从生成的项目列表中过滤掉重复项
 * 返回不重复的新项目
 */
export async function filterDuplicates(items: GeneratedItem[]): Promise<GeneratedItem[]> {
  const newItems: GeneratedItem[] = [];
  
  for (const item of items) {
    const exists = await isDuplicateCheck(item.text, item.category);
    if (!exists) {
      newItems.push(item);
    }
  }
  
  return newItems;
}

/**
 * 纯函数版本 - 用于属性测试
 * 检查文本是否与已有项目重复（不区分大小写）
 */
export function isDuplicateText(
  text: string,
  category: string,
  existingItems: Array<{ text: string; category: string }>
): boolean {
  const normalizedText = text.toLowerCase().trim();
  return existingItems.some(
    item => item.text.toLowerCase().trim() === normalizedText && item.category === category
  );
}

/**
 * 数据库级别的重复检查
 * SQLite 默认 text 比较不区分大小写
 */
async function isDuplicateCheck(text: string, category: string): Promise<boolean> {
  const count = await prisma.learningItem.count({
    where: {
      category,
      text: text,
    },
  });
  return count > 0;
}
