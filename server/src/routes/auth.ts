// 用户认证 API 路由
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../services/prismaClient.js';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/register
 * 用户注册
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, nickname } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' });
    }

    // 检查邮箱是否已注册
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: '该邮箱已注册' });
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        nickname: nickname || email.split('@')[0],
      },
    });

    const token = generateToken(user.id);

    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, nickname: user.nickname },
    });
  } catch (error) {
    return res.status(500).json({ error: '注册失败', message: (error as Error).message });
  }
});

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = generateToken(user.id);

    return res.json({
      token,
      user: { id: user.id, email: user.email, nickname: user.nickname },
    });
  } catch (error) {
    return res.status(500).json({ error: '登录失败', message: (error as Error).message });
  }
});

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, nickname: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: '获取用户信息失败' });
  }
});

export default router;
