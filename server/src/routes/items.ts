// 学习项管理 API 路由
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../services/prismaClient.js';
import { isDuplicateText } from '../services/duplicateDetector.js';
import { scheduleFirstReview, getMasteryLevel } from '../services/reviewScheduler.js';
import { MAX_PAGE_SIZE, GeneratedItem, ItemCategory, MasteryLevel } from '../types/index.js';

const router = Router();

/**
 * POST /api/items/batch
 * 批量添加生成的学习项到学习库
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { items, fileId } = req.body as { items: GeneratedItem[]; fileId?: string };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '请提供学习项列表' });
    }

    // 获取已有项目用于重复检测
    const existingItems = await prisma.learningItem.findMany({
      select: { text: true, category: true },
    });

    const addedItems: any[] = [];
    const skippedItems: string[] = [];

    for (const item of items) {
      // 检查重复
      const duplicate = isDuplicateText(item.text, item.category, existingItems);
      if (duplicate) {
        skippedItems.push(item.text);
        continue;
      }

      // 也检查本批次内的重复
      const batchDuplicate = addedItems.some(
        a => a.text.toLowerCase() === item.text.toLowerCase() && a.category === item.category
      );
      if (batchDuplicate) {
        skippedItems.push(item.text);
        continue;
      }

      const itemId = uuidv4();

      // 创建学习项
      const created = await prisma.learningItem.create({
        data: {
          id: itemId,
          fileId: fileId || null,
          text: item.text,
          category: item.category,
          definition: item.definition,
          translation: item.translation,
          exampleSentences: {
            create: item.exampleSentences.map((sentence, index) => ({
              id: uuidv4(),
              sentence,
              orderIndex: index,
            })),
          },
        },
      });

      // 为新项目创建复习计划
      await scheduleFirstReview(itemId);

      addedItems.push(created);
      // 添加到已有列表以检测批次内重复
      existingItems.push({ text: item.text, category: item.category });
    }

    return res.status(201).json({
      added: addedItems.length,
      skipped: skippedItems.length,
      skippedItems,
      message: `成功添加 ${addedItems.length} 个学习项，跳过 ${skippedItems.length} 个重复项`,
    });
  } catch (error) {
    return res.status(500).json({ error: '批量添加失败', message: (error as Error).message });
  }
});

/**
 * GET /api/items
 * 获取学习项列表（分页、筛选、搜索）
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, parseInt(req.query.pageSize as string) || MAX_PAGE_SIZE);
    const category = req.query.category as ItemCategory | undefined;
    const masteryLevel = req.query.masteryLevel as MasteryLevel | undefined;
    const search = req.query.search as string | undefined;

    // 构建查询条件
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (search && search.length >= 1) {
      where.OR = [
        { text: { contains: search } },
        { definition: { contains: search } },
        { translation: { contains: search } },
      ];
    }

    // 掌握程度筛选需要关联查询
    if (masteryLevel) {
      if (masteryLevel === 'new') {
        where.reviewSchedule = { successCount: 0 };
      } else if (masteryLevel === 'learning') {
        where.reviewSchedule = { successCount: { gte: 1, lte: 5 } };
      } else if (masteryLevel === 'mastered') {
        where.reviewSchedule = { status: 'mastered' };
      }
    }

    const [items, total] = await Promise.all([
      prisma.learningItem.findMany({
        where,
        include: {
          exampleSentences: { orderBy: { orderIndex: 'asc' } },
          reviewSchedule: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.learningItem.count({ where }),
    ]);

    const formattedItems = items.map(item => ({
      id: item.id,
      text: item.text,
      category: item.category,
      definition: item.definition,
      translation: item.translation,
      exampleSentences: item.exampleSentences.map(e => e.sentence),
      createdAt: item.createdAt,
      masteryLevel: getMasteryLevel(item.reviewSchedule?.successCount || 0),
      nextReviewAt: item.reviewSchedule?.nextReviewAt,
      successCount: item.reviewSchedule?.successCount || 0,
    }));

    return res.json({
      items: formattedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return res.status(500).json({ error: '查询失败', message: (error as Error).message });
  }
});

/**
 * DELETE /api/items/:id
 * 删除学习项（级联删除例句和复习计划）
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await prisma.learningItem.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ error: '学习项不存在' });
    }

    // Prisma 的 onDelete: Cascade 会自动删除关联的例句和复习计划
    await prisma.learningItem.delete({ where: { id } });

    return res.json({ message: '学习项已删除', id });
  } catch (error) {
    return res.status(500).json({ error: '删除失败', message: (error as Error).message });
  }
});

export default router;
