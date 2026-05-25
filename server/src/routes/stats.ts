// 学习统计 API 路由
import { Router, Request, Response } from 'express';
import prisma from '../services/prismaClient.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/stats
 * 获取学习统计数据
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const now = new Date();

    const [totalItems, masteredItems, dueItems] = await Promise.all([
      prisma.learningItem.count({ where: { userId } }),
      prisma.reviewSchedule.count({
        where: { status: 'mastered', item: { userId } },
      }),
      prisma.reviewSchedule.count({
        where: {
          status: 'active',
          nextReviewAt: { lte: now },
          item: { userId },
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
