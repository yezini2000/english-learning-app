// 学习项审核组件 - 显示生成的学习项供用户审核
import { useState } from 'react';
import { batchAddItems } from '../services/api';
import type { GeneratedItem } from '../types/index';

interface ItemReviewProps {
  items: GeneratedItem[];
  fileId?: string;
  onComplete?: () => void;
}

export function ItemReview({ items: initialItems, fileId, onComplete }: ItemReviewProps) {
  const [items, setItems] = useState<GeneratedItem[]>(initialItems);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (items.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await batchAddItems(items, fileId);
      setResult({ added: res.added, skipped: res.skipped });
      onComplete?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h3>✅ 添加完成</h3>
        <p>成功添加 {result.added} 个学习项</p>
        {result.skipped > 0 && <p>跳过 {result.skipped} 个重复项</p>}
        <button
          onClick={onComplete}
          style={{ padding: '8px 16px', background: '#4299e1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          返回
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p>无法从该内容生成学习项</p>
        <button
          onClick={onComplete}
          style={{ padding: '8px 16px', background: '#4299e1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          返回
        </button>
      </div>
    );
  }

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'vocabulary': return '词汇';
      case 'phrase': return '词组';
      case 'sentence': return '语句';
      default: return cat;
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3>生成的学习项 ({items.length})</h3>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          style={{
            padding: '8px 16px',
            background: submitting ? '#a0aec0' : '#48bb78',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? '添加中...' : `确认添加 (${items.length})`}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#fed7d7', borderRadius: '4px', marginBottom: '16px' }}>
          <p style={{ color: '#c53030', margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              background: '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{item.text}</span>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 6px',
                    background: '#edf2f7',
                    borderRadius: '4px',
                  }}>
                    {categoryLabel(item.category)}
                  </span>
                </div>
                <p style={{ margin: '4px 0', color: '#4a5568' }}>{item.definition}</p>
                <p style={{ margin: '4px 0', color: '#718096' }}>{item.translation}</p>
                {item.exampleSentences.length > 0 && (
                  <div style={{ marginTop: '8px', paddingLeft: '12px', borderLeft: '2px solid #e2e8f0' }}>
                    {item.exampleSentences.map((s, i) => (
                      <p key={i} style={{ margin: '2px 0', fontSize: '14px', color: '#718096' }}>• {s}</p>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemove(index)}
                title="移除"
                style={{
                  padding: '4px 8px',
                  background: 'none',
                  border: '1px solid #e53e3e',
                  color: '#e53e3e',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                移除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ItemReview;
