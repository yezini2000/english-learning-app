// 文件上传和处理 API 路由
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { validateFile } from '../services/fileValidator.js';
import prisma from '../services/prismaClient.js';
import { getFileExtension } from '../services/fileValidator.js';
import { PROCESSING_TIMEOUT } from '../types/index.js';
import { AuthRequest } from '../middleware/auth.js';
import type { GeneratedItem } from '../types/index.js';

const router = Router();

// ===== 异步生成任务管理 =====
interface GenerateTask {
  status: 'processing' | 'completed' | 'failed';
  items: GeneratedItem[];
  error?: string;
  startedAt: number;
}

const generateTasks = new Map<string, GenerateTask>();

// 定期清理超过 30 分钟的旧任务
setInterval(() => {
  const now = Date.now();
  for (const [id, task] of generateTasks) {
    if (now - task.startedAt > 30 * 60 * 1000) {
      generateTasks.delete(id);
    }
  }
}, 5 * 60 * 1000);

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

/**
 * POST /api/files/upload
 * 上传并处理文件
 */
router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未提供文件' });
    }

    const uploadedFile = {
      originalname: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      mimetype: req.file.mimetype,
    };

    // 验证文件
    const validation = validateFile(uploadedFile);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        message: validation.message,
      });
    }

    const ext = getFileExtension(req.file.originalname);

    // 创建文件记录
    const fileRecord = await prisma.file.create({
      data: {
        id: uuidv4(),
        userId: req.userId!,
        originalName: req.file.originalname,
        format: ext,
        sizeBytes: req.file.size,
        status: 'pending',
      },
    });

    // 异步处理文件（带超时）
    processFileAsync(fileRecord.id, req.file.path, ext);

    return res.status(201).json({
      id: fileRecord.id,
      status: 'pending',
      message: '文件已上传，正在处理中...',
    });
  } catch (error) {
    console.error('文件上传错误:', error);
    return res.status(500).json({ error: '文件上传失败', message: (error as Error).message });
  }
});

/**
 * GET /api/files/generate-status/:taskId
 * 轮询生成任务状态
 */
router.get('/generate-status/:taskId', async (req: Request, res: Response) => {
  const task = generateTasks.get(req.params.taskId);

  if (!task) {
    return res.status(404).json({ error: '任务不存在或已过期' });
  }

  return res.json({
    status: task.status,
    items: task.status === 'completed' ? task.items : undefined,
    itemCount: task.items.length,
    error: task.error,
  });
});

/**
 * GET /api/files/:id/status
 * 获取文件处理状态
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const file = await prisma.file.findUnique({
      where: { id: req.params.id },
    });

    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }

    return res.json({
      id: file.id,
      status: file.status,
      originalName: file.originalName,
      errorMessage: file.errorMessage,
      processedAt: file.processedAt,
    });
  } catch (error) {
    return res.status(500).json({ error: '查询失败', message: (error as Error).message });
  }
});

/**
 * POST /api/files/:id/generate
 * 启动异步生成学习项任务，立即返回任务 ID
 */
router.post('/:id/generate', async (req: Request, res: Response) => {
  try {
    const file = await prisma.file.findUnique({
      where: { id: req.params.id },
    });

    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }

    if (file.status !== 'completed') {
      return res.status(400).json({ error: '文件尚未处理完成' });
    }

    if (!file.extractedText || !file.extractedText.trim()) {
      return res.status(400).json({ error: '未从文件中提取到内容', items: [] });
    }

    // 创建异步任务
    const taskId = uuidv4();
    generateTasks.set(taskId, {
      status: 'processing',
      items: [],
      startedAt: Date.now(),
    });

    // 后台异步执行 AI 生成
    runGenerateTask(taskId, file.extractedText);

    return res.json({ taskId, status: 'processing' });
  } catch (error) {
    console.error('生成学习项失败:', error);
    return res.status(500).json({ error: '生成学习项失败', message: (error as Error).message });
  }
});

/**
 * POST /api/files/generate-from-text
 * 直接从输入文本生成学习项（异步模式）
 */
router.post('/generate-from-text', async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text?: string };

    if (!text || !text.trim()) {
      return res.status(400).json({ error: '请输入文本内容' });
    }

    // 创建异步任务
    const taskId = uuidv4();
    generateTasks.set(taskId, {
      status: 'processing',
      items: [],
      startedAt: Date.now(),
    });

    // 后台异步执行 AI 生成
    runGenerateTask(taskId, text.trim());

    return res.json({ taskId, status: 'processing' });
  } catch (error) {
    console.error('生成学习项失败:', error);
    return res.status(500).json({ error: '生成学习项失败', message: (error as Error).message });
  }
});

/**
 * 后台执行 AI 生成任务
 */
async function runGenerateTask(taskId: string, text: string): Promise<void> {
  try {
    const { generateItems } = await import('../services/itemGenerator.js');
    const items = await generateItems(text);

    const task = generateTasks.get(taskId);
    if (task) {
      task.status = 'completed';
      task.items = items;
    }
  } catch (error) {
    const task = generateTasks.get(taskId);
    if (task) {
      task.status = 'failed';
      task.error = (error as Error).message;
    }
  }
}

/**
 * 异步处理文件（带超时保护）
 */
async function processFileAsync(fileId: string, filePath: string, format: string): Promise<void> {
  // 设置处理超时
  const timeoutId = setTimeout(async () => {
    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'failed',
        errorMessage: '处理超时（超过 300 秒）',
      },
    });
  }, PROCESSING_TIMEOUT);

  try {
    // 更新状态为处理中
    await prisma.file.update({
      where: { id: fileId },
      data: { status: 'processing' },
    });

    // 根据文件类型提取内容
    let extractedText = '';
    const { SUPPORTED_TEXT_FORMATS, SUPPORTED_AUDIO_FORMATS, SUPPORTED_VIDEO_FORMATS } = await import('../types/index.js');

    if (SUPPORTED_TEXT_FORMATS.has(format)) {
      const { extractFromTextFile } = await import('../services/textExtractor.js');
      extractedText = await extractFromTextFile(filePath, format as any);
    } else if (SUPPORTED_AUDIO_FORMATS.has(format)) {
      const { extractFromAudio } = await import('../services/audioExtractor.js');
      extractedText = await extractFromAudio(filePath);
    } else if (SUPPORTED_VIDEO_FORMATS.has(format)) {
      const { extractFromVideo } = await import('../services/audioExtractor.js');
      extractedText = await extractFromVideo(filePath);
    }

    clearTimeout(timeoutId);

    if (!extractedText.trim()) {
      await prisma.file.update({
        where: { id: fileId },
        data: {
          status: 'completed',
          extractedText: '',
          errorMessage: '未从文件中提取到任何英文内容',
          processedAt: new Date(),
        },
      });
      return;
    }

    // 更新文件记录
    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'completed',
        extractedText,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);
    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'failed',
        errorMessage: `处理失败: ${(error as Error).message}`,
      },
    });
  }
}

export default router;
