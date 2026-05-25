// 复习会话 API 路由
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getDueItems,
  getDueCount,
  advanceToNextInterval,
  resetToFirstInterval,
} from '../services/reviewScheduler.js';
import { MAX_SESSION_ITEMS, ReviewSession, ReviewSessionItem } from '../types/index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// 内存中存储活跃的复习会话
const activeSessions = new Map<string, ReviewSession>();

/**
 * GET /api/review/due
 * 获取到期学习项数量
 */
router.get('/due', async (req: AuthRequest, res: Response) => {
  try {
    const count = await getDueCount(req.userId!);
    return res.json({ dueCount: count });
  } catch (error) {
    return res.status(500).json({ error: '获取到期项数量失败', message: (error as Error).message });
  }
});

/**
 * POST /api/review/session
 * 开始复习会话（最多 50 项）
 */
router.post('/session', async (req: AuthRequest, res: Response) => {
  try {
    const dueItems = await getDueItems(MAX_SESSION_ITEMS, req.userId!);
    
    if (dueItems.length === 0) {
      return res.json({
        message: '没有到期需要复习的学习项',
        session: null,
      });
    }

    const sessionId = uuidv4();
    const sessionItems: ReviewSessionItem[] = dueItems.map(item => ({
      itemId: item.id,
      text: item.text,
      category: item.category,
      definition: item.definition,
      translation: item.translation,
    }));

    const session: ReviewSession = {
      id: sessionId,
      items: sessionItems,
      currentIndex: 0,
      rememberedCount: 0,
      forgottenCount: 0,
      completed: false,
    };

    activeSessions.set(sessionId, session);

    return res.status(201).json({
      sessionId,
      totalItems: sessionItems.length,
      currentItem: sessionItems[0],
      currentIndex: 1,
    });
  } catch (error) {
    return res.status(500).json({ error: '创建复习会话失败', message: (error as Error).message });
  }
});

/**
 * POST /api/review/respond
 * 提交"记住了"/"忘记了"响应
 */
router.post('/respond', async (req: Request, res: Response) => {
  try {
    const { sessionId, itemId, response } = req.body;

    if (!sessionId || !itemId || !response) {
      return res.status(400).json({ error: '缺少必要参数: sessionId, itemId, response' });
    }

    if (response !== 'remembered' && response !== 'forgotten') {
      return res.status(400).json({ error: 'response 必须为 "remembered" 或 "forgotten"' });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: '复习会话不存在或已结束' });
    }

    // 更新复习调度
    if (response === 'remembered') {
      await advanceToNextInterval(itemId);
      session.rememberedCount++;
    } else {
      await resetToFirstInterval(itemId);
      session.forgottenCount++;
    }

    // 标记当前项目的响应
    const currentItem = session.items.find(i => i.itemId === itemId);
    if (currentItem) {
      currentItem.response = response;
    }

    // 移动到下一项
    session.currentIndex++;

    // 检查是否完成
    if (session.currentIndex >= session.items.length) {
      session.completed = true;
      activeSessions.delete(sessionId);

      return res.json({
        completed: true,
        summary: {
          totalItems: session.items.length,
          rememberedCount: session.rememberedCount,
          forgottenCount: session.forgottenCount,
        },
      });
    }

    // 返回下一项
    const nextItem = session.items[session.currentIndex];
    return res.json({
      completed: false,
      currentItem: nextItem,
      currentIndex: session.currentIndex + 1,
      totalItems: session.items.length,
      rememberedCount: session.rememberedCount,
      forgottenCount: session.forgottenCount,
    });
  } catch (error) {
    return res.status(500).json({ error: '提交响应失败', message: (error as Error).message });
  }
});

/**
 * GET /api/review/session/:id
 * 获取会话状态（用于恢复中断的会话）
 */
router.get('/session/:id', (req: Request, res: Response) => {
  const session = activeSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: '会话不存在或已结束' });
  }

  return res.json({
    sessionId: session.id,
    totalItems: session.items.length,
    currentIndex: session.currentIndex + 1,
    currentItem: session.items[session.currentIndex],
    rememberedCount: session.rememberedCount,
    forgottenCount: session.forgottenCount,
    completed: session.completed,
  });
});

export default router;

// 导出用于测试
export { activeSessions };
