// 学习统计 API 路由
import { Router, Request, Response } from 'express';
import prisma from '../services/prismaClient.js';

const router = Router();

/**
 * GET /api/stats
 * 获取学习统计数据
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const now = new Date();

    const [totalItems, masteredItems, dueItems] = await Promise.all([
      // 总项目数
      prisma.learningItem.count(),
      // 已掌握项目数
      prisma.reviewSchedule.count({
        where: { status: 'mastered' },
      }),
      // 到期待复习项目数
      prisma.reviewSchedule.count({
        where: {
          status: 'active',
          nextReviewAt: { lte: now },
        },
      }),
    ]);

    return res.json({
      totalItems,
      masteredItems,
      dueItems,
    });
  } catch (error) {
    return res.status(500).json({ error: '获取统计数据失败', message: (error as Error).message });
  }
});

export default router;
