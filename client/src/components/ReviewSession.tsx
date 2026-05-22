// 复习会话组件 - 卡片式复习交互
import { useState, useEffect, useCallback } from 'react';
import { startReviewSession, submitReviewResponse } from '../services/api';
import { PronunciationPlayer } from './PronunciationPlayer';
import type { ReviewSessionItem, SessionSummary, ReviewResponse } from '../types/index';

export function ReviewSession({ onComplete }: { onComplete?: () => void }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<ReviewSessionItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);

  // 开始会话
  useEffect(() => {
    const init = async () => {
      try {
        const result = await startReviewSession();
        if (result.session === null) {
          setError('没有到期需要复习的学习项');
          setLoading(false);
          return;
        }
        setSessionId(result.sessionId);
        setCurrentItem(result.currentItem);
        setCurrentIndex(result.currentIndex);
        setTotalItems(result.totalItems);
        setLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    };
    init();
  }, []);

  // 提交响应
  const handleResponse = useCallback(async (response: ReviewResponse) => {
    if (!sessionId || !currentItem || responding) return;

    setResponding(true);
    try {
      const result = await submitReviewResponse(sessionId, currentItem.itemId, response);

      if (result.completed && result.summary) {
        setSummary(result.summary);
      } else if (result.currentItem) {
        // 1秒后跳转到下一项
        setTimeout(() => {
          setCurrentItem(result.currentItem!);
          setCurrentIndex(result.currentIndex!);
          setShowAnswer(false);
          setResponding(false);
        }, 1000);
        return;
      }
    } catch (err) {
      setError((err as Error).message);
    }
    setResponding(false);
  }, [sessionId, currentItem, responding]);

  // 加载中
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>;
  }

  // 错误
  if (error && !currentItem) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#718096' }}>{error}</p>
        <button
          onClick={onComplete}
          style={{ padding: '8px 16px', background: '#4299e1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '16px' }}
        >
          返回
        </button>
      </div>
    );
  }

  // 会话完成 - 显示总结
  if (summary) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', maxWidth: '400px', margin: '0 auto' }}>
        <h2>🎉 复习完成！</h2>
        <div style={{ margin: '24px 0', padding: '20px', background: '#f7fafc', borderRadius: '8px' }}>
          <p style={{ fontSize: '18px', margin: '8px 0' }}>
            总计: <strong>{summary.totalItems}</strong> 项
          </p>
          <p style={{ fontSize: '18px', margin: '8px 0', color: '#48bb78' }}>
            记住了: <strong>{summary.rememberedCount}</strong>
          </p>
          <p style={{ fontSize: '18px', margin: '8px 0', color: '#e53e3e' }}>
            忘记了: <strong>{summary.forgottenCount}</strong>
          </p>
        </div>
        <button
          onClick={onComplete}
          style={{ padding: '10px 20px', background: '#4299e1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          返回主页
        </button>
      </div>
    );
  }

  // 复习卡片
  if (!currentItem) return null;

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'vocabulary': return '词汇';
      case 'phrase': return '词组';
      case 'sentence': return '语句';
      default: return cat;
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      {/* 进度 */}
      <div style={{ textAlign: 'center', marginBottom: '20px', color: '#718096' }}>
        <span style={{ fontSize: '16px' }}>{currentIndex} / {totalItems}</span>
      </div>

      {/* 卡片 */}
      <div style={{
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '32px',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* 类别标签 */}
        <span style={{
          fontSize: '12px',
          padding: '2px 8px',
          background: '#edf2f7',
          borderRadius: '4px',
          marginBottom: '16px',
        }}>
          {categoryLabel(currentItem.category)}
        </span>

        {/* 学习项文本 */}
        <h2 style={{ margin: '0 0 16px', textAlign: 'center', fontSize: '24px' }}>
          {currentItem.text}
        </h2>

        {/* 发音播放 */}
        <PronunciationPlayer text={currentItem.text} />

        {/* 答案区域 */}
        {showAnswer ? (
          <div style={{ marginTop: '24px', textAlign: 'center', width: '100%' }}>
            <div style={{ padding: '16px', background: '#f7fafc', borderRadius: '8px' }}>
              <p style={{ margin: '4px 0', fontSize: '16px' }}>{currentItem.definition}</p>
              <p style={{ margin: '4px 0', color: '#718096' }}>{currentItem.translation}</p>
            </div>

            {/* 记住了 / 忘记了 按钮 */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px' }}>
              <button
                onClick={() => handleResponse('forgotten')}
                disabled={responding}
                style={{
                  padding: '12px 32px',
                  background: responding ? '#feb2b2' : '#fc8181',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: responding ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                }}
              >
                忘记了 😞
              </button>
              <button
                onClick={() => handleResponse('remembered')}
                disabled={responding}
                style={{
                  padding: '12px 32px',
                  background: responding ? '#9ae6b4' : '#68d391',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: responding ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                }}
              >
                记住了 😊
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAnswer(true)}
            style={{
              marginTop: '24px',
              padding: '12px 32px',
              background: '#4299e1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            显示答案
          </button>
        )}
      </div>
    </div>
  );
}

export default ReviewSession;
