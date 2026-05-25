// 复习调度器 - 实现艾宾浩斯遗忘曲线算法
import { PrismaClient } from '@prisma/client';
import { REVIEW_INTERVALS, MAX_SESSION_ITEMS, LearningItem } from '../types/index.js';

const prisma = new PrismaClient();

/**
 * 为新添加的学习项安排首次复习
 * 首次复习在添加后 24 小时内安排
 */
export async function scheduleFirstReview(itemId: string): Promise<void> {
  const now = new Date();
  // 导入后立即可复习
  const nextReviewAt = now;
  
  await prisma.reviewSchedule.create({
    data: {
      itemId,
      currentInterval: 0,
      successCount: 0,
      nextReviewAt,
      status: 'active',
    },
  });
}

/**
 * 标记"记住了" - 推进到下一个复习间隔
 */
export async function advanceToNextInterval(itemId: string): Promise<void> {
  const schedule = await prisma.reviewSchedule.findUnique({
    where: { itemId },
  });
  
  if (!schedule) {
    throw new Error(`未找到学习项 ${itemId} 的复习计划`);
  }
  
  const now = new Date();
  const newSuccessCount = schedule.successCount + 1;
  
  // 如果已完成所有 6 个间隔，标记为已掌握
  if (newSuccessCount >= 6) {
    await prisma.reviewSchedule.update({
      where: { itemId },
      data: {
        successCount: newSuccessCount,
        lastReviewedAt: now,
        status: 'mastered',
        // 已掌握的项目不再需要复习，设置一个远期日期
        nextReviewAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    return;
  }
  
  // 推进到下一个间隔
  const newInterval = Math.min(schedule.currentInterval + 1, REVIEW_INTERVALS.length - 1);
  const nextReviewAt = new Date(now.getTime() + REVIEW_INTERVALS[newInterval] * 24 * 60 * 60 * 1000);
  
  await prisma.reviewSchedule.update({
    where: { itemId },
    data: {
      currentInterval: newInterval,
      successCount: newSuccessCount,
      nextReviewAt,
      lastReviewedAt: now,
    },
  });
}

/**
 * 标记"忘记了" - 重置到第一个复习间隔
 */
export async function resetToFirstInterval(itemId: string): Promise<void> {
  const now = new Date();
  const nextReviewAt = new Date(now.getTime() + REVIEW_INTERVALS[0] * 24 * 60 * 60 * 1000);
  
  await prisma.reviewSchedule.update({
    where: { itemId },
    data: {
      currentInterval: 0,
      successCount: 0,
      nextReviewAt,
      lastReviewedAt: now,
    },
  });
}

/**
 * 获取到期需要复习的学习项
 */
export async function getDueItems(limit: number = MAX_SESSION_ITEMS, userId?: string): Promise<LearningItem[]> {
  const now = new Date();
  
  const where: any = {
    status: 'active',
    nextReviewAt: { lte: now },
  };
  if (userId) {
    where.item = { userId };
  }

  const schedules = await prisma.reviewSchedule.findMany({
    where,
    include: {
      item: {
        include: {
          exampleSentences: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      },
    },
    take: limit,
    orderBy: { nextReviewAt: 'asc' },
  });
  
  return schedules.map((s: any) => ({
    id: s.item.id,
    fileId: s.item.fileId || undefined,
    text: s.item.text,
    category: s.item.category as LearningItem['category'],
    definition: s.item.definition,
    translation: s.item.translation,
    exampleSentences: s.item.exampleSentences.map((e: any) => e.sentence),
    createdAt: s.item.createdAt,
  }));
}

/**
 * 获取到期学习项数量
 */
export async function getDueCount(userId?: string): Promise<number> {
  const now = new Date();
  
  const where: any = {
    status: 'active',
    nextReviewAt: { lte: now },
  };
  if (userId) {
    where.item = { userId };
  }

  return prisma.reviewSchedule.count({ where });
}

/**
 * 纯函数版本 - 用于测试
 * 计算标记"记住了"后的下一个复习时间
 */
export function calculateNextReview(
  currentInterval: number,
  successCount: number,
  reviewTime: Date
): { nextReviewAt: Date; newInterval: number; newSuccessCount: number; mastered: boolean } {
  const newSuccessCount = successCount + 1;
  
  if (newSuccessCount >= 6) {
    return {
      nextReviewAt: new Date(reviewTime.getTime() + 365 * 24 * 60 * 60 * 1000),
      newInterval: currentInterval,
      newSuccessCount,
      mastered: true,
    };
  }
  
  const newInterval = Math.min(currentInterval + 1, REVIEW_INTERVALS.length - 1);
  const nextReviewAt = new Date(reviewTime.getTime() + REVIEW_INTERVALS[newInterval] * 24 * 60 * 60 * 1000);
  
  return { nextReviewAt, newInterval, newSuccessCount, mastered: false };
}

/**
 * 纯函数版本 - 用于测试
 * 计算标记"忘记了"后的下一个复习时间
 */
export function calculateResetReview(reviewTime: Date): { nextReviewAt: Date; newInterval: number; newSuccessCount: number } {
  const nextReviewAt = new Date(reviewTime.getTime() + REVIEW_INTERVALS[0] * 24 * 60 * 60 * 1000);
  return { nextReviewAt, newInterval: 0, newSuccessCount: 0 };
}

/**
 * 纯函数版本 - 用于测试
 * 判断学习项是否到期
 */
export function isDue(nextReviewAt: Date, status: string, currentTime: Date): boolean {
  return status === 'active' && nextReviewAt <= currentTime;
}

/**
 * 纯函数版本 - 用于测试
 * 计算掌握程度
 */
export function getMasteryLevel(successCount: number): 'new' | 'learning' | 'mastered' {
  if (successCount === 0) return 'new';
  if (successCount >= 6) return 'mastered';
  return 'learning';
}
