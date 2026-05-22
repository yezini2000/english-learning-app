// 文件导入页面 - 支持文件上传和文本输入
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { ItemReview } from '../components/ItemReview';
import type { GeneratedItem } from '../types/index';

const FILE_CATEGORIES = [
  { label: '📄 文档', formats: ['txt', 'pdf', 'docx', 'md', 'srt'], color: '#ebf8ff' },
  { label: '🎵 录音', formats: ['mp3', 'wav', 'm4a'], color: '#f0fff4' },
  { label: '🎬 视频', formats: ['mp4', 'webm', 'mkv'], color: '#faf5ff' },
];

export function ImportPage() {
  const navigate = useNavigate();
  const [fileId, setFileId] = useState<string | null>(null);
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const startGenerating = () => {
    setGenerating(true);
    setError(null);
    setElapsed(0);
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return timer;
  };

  const handleFileComplete = async (id: string) => {
    setFileId(id);
    const timer = startGenerating();

    try {
      const response = await fetch(`/api/files/${id}/generate`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || '生成学习项失败');
        setGeneratedItems([]);
      } else {
        setGeneratedItems(data.items || []);
      }
    } catch (err) {
      setError((err as Error).message);
      setGeneratedItems([]);
    } finally {
      clearInterval(timer);
      setGenerating(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setFileId(null);
    const timer = startGenerating();

    try {
      const response = await fetch('/api/files/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || '生成学习项失败');
        setGeneratedItems([]);
      } else {
        setGeneratedItems(data.items || []);
      }
    } catch (err) {
      setError((err as Error).message);
      setGeneratedItems([]);
    } finally {
      clearInterval(timer);
      setGenerating(false);
    }
  };

  // 生成中 loading 页面
  if (generating) {
    // 估算已生成数量（大约每 10 秒生成 30 项）
    const estimatedItems = Math.min(Math.floor(elapsed * 3), 200);

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '25vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚙️</div>
          <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>正在使用 AI 生成学习项...</p>
          <p style={{ color: '#4299e1', fontSize: '16px', marginBottom: '8px' }}>
            已生成约 {estimatedItems} 项
          </p>
          <p style={{ color: '#718096', marginBottom: '4px' }}>
            已用时 {elapsed} 秒 · 预计需要 2-4 分钟
          </p>
          <p style={{ color: '#a0aec0', fontSize: '13px' }}>
            内容越多耗时越长，请耐心等待
          </p>
        </div>
      </div>
    );
  }

  // 生成完成，显示结果
  if (generatedItems !== null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '5vh' }}>
        <button
          onClick={() => navigate('/')}
          style={{ position: 'absolute', top: '20px', left: '20px', padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', background: '#fff' }}
        >
          ← 返回主页
        </button>
        <div style={{ width: '100%', maxWidth: '800px', padding: '0 20px' }}>
          {error && (
            <div style={{ padding: '12px', background: '#fed7d7', borderRadius: '4px', marginBottom: '16px' }}>
              <p style={{ color: '#c53030', margin: 0 }}>{error}</p>
            </div>
          )}
          {generatedItems.length > 0 ? (
            <ItemReview
              items={generatedItems}
              fileId={fileId || undefined}
              onComplete={() => navigate('/')}
            />
          ) : (
            !error && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#718096', fontSize: '16px' }}>未能从该内容中生成学习项</p>
                <button
                  onClick={() => { setGeneratedItems(null); setError(null); }}
                  style={{ marginTop: '12px', padding: '8px 16px', background: '#4299e1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  重新导入
                </button>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // 初始页面：输入文本或上传文件
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '10vh' }}>
      <button
        onClick={() => navigate('/')}
        style={{ position: 'absolute', top: '20px', left: '20px', padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', background: '#fff' }}
      >
        ← 返回主页
      </button>

      <div style={{ width: '100%', maxWidth: '800px', padding: '0 20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>导入学习内容</h2>

        {/* 文本输入区域 */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#2d3748' }}>✏️ 直接输入文本</h3>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="粘贴或输入英文内容，AI 会自动提取词汇、词组和语句..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim()}
            style={{
              marginTop: '8px',
              padding: '10px 20px',
              background: textInput.trim() ? '#4299e1' : '#e2e8f0',
              color: textInput.trim() ? '#fff' : '#a0aec0',
              border: 'none',
              borderRadius: '6px',
              cursor: textInput.trim() ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              fontWeight: 'bold',
            }}
          >
            生成学习项
          </button>
        </div>

        {/* 分隔线 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span style={{ color: '#a0aec0', fontSize: '14px' }}>或者</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* 文件上传区域 */}
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#2d3748' }}>📁 上传文件</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {FILE_CATEGORIES.map(cat => (
              <div
                key={cat.label}
                style={{
                  padding: '10px 12px',
                  background: cat.color,
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <p style={{ margin: '0 0 4px', fontWeight: 'bold', fontSize: '14px' }}>{cat.label}</p>
                <p style={{ margin: '0', fontSize: '12px', color: '#4a5568' }}>
                  {cat.formats.join(', ')}
                </p>
              </div>
            ))}
          </div>
          <FileUpload onComplete={handleFileComplete} />
        </div>
      </div>
    </div>
  );
}

export default ImportPage;
