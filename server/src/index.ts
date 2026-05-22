// 英语学习应用 - 后端入口
import express from 'express';
import cors from 'cors';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import filesRouter from './routes/files.js';
import itemsRouter from './routes/items.js';
import reviewRouter from './routes/review.js';
import statsRouter from './routes/stats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 确保上传目录存在
const uploadsDir = path.join(process.cwd(), 'uploads');
try {
  mkdirSync(uploadsDir, { recursive: true });
} catch {
  // 目录已存在
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/files', filesRouter);
app.use('/api/items', itemsRouter);
app.use('/api/review', reviewRouter);
app.use('/api/stats', statsRouter);

// 生产环境：serve 前端静态文件
const clientDistPath = path.join(__dirname, '../../client/dist');
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // SPA fallback - 所有非 API 路由返回 index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
