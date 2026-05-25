// 主页 - 显示统计摘要和导航
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStats, getDueCount } from '../services/api';
import type { LearningStats } from '../types/index';

export function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, dueData] = await Promise.all([
          getStats(),
          getDueCount(),
        ]);
        setStats(statsData);
        setDueCount(dueData.dueCount);
      } catch (err) {
        console.error('获取数据失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}>
      <div style={{ maxWidth: '800px', width: '100%', padding: '20px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '32px' }}>📚 英语学习</h1>

        {/* 统计摘要 */}
        {!loading && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <div style={{ textAlign: 'center', padding: '20px', background: '#ebf8ff', borderRadius: '8px' }} title="学习库中所有词汇/词组/语句的总数">
              <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#2b6cb0' }}>{stats.totalItems}</p>
              <p style={{ margin: '4px 0 0', color: '#4a5568' }}>总学习项</p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#a0aec0' }}>所有导入的词汇</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: '#f0fff4', borderRadius: '8px' }} title="连续答对6次的项目，不再出现在复习中">
              <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#276749' }}>{stats.masteredItems}</p>
              <p style={{ margin: '4px 0 0', color: '#4a5568' }}>已掌握</p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#a0aec0' }}>连续答对6次</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: dueCount > 0 ? '#fffaf0' : '#f7fafc', borderRadius: '8px' }} title="已到复习时间的项目，按艾宾浩斯间隔安排">
              <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: dueCount > 0 ? '#c05621' : '#718096' }}>{dueCount}</p>
              <p style={{ margin: '4px 0 0', color: '#4a5568' }}>待复习</p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#a0aec0' }}>已到复习时间</p>
            </div>
          </div>
        )}

        {loading && <p style={{ textAlign: 'center', color: '#718096' }}>加载中...</p>}

        {/* 导航按钮 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button
            onClick={() => navigate('/review')}
            disabled={dueCount === 0}
            style={{
              padding: '20px',
              background: dueCount > 0 ? '#4299e1' : '#e2e8f0',
              color: dueCount > 0 ? '#fff' : '#a0aec0',
              border: 'none',
              borderRadius: '8px',
              cursor: dueCount > 0 ? 'pointer' : 'not-allowed',
              fontSize: '18px',
              fontWeight: 'bold',
            }}
          >
            {dueCount > 0 ? `开始复习 (${dueCount} 项待复习)` : '暂无待复习项目'}
          </button>

          <button
            onClick={() => navigate('/import')}
            style={{
              padding: '20px',
              background: '#48bb78',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
            }}
          >
            📁 导入学习内容
          </button>

          <button
            onClick={() => navigate('/library')}
            style={{
              padding: '20px',
              background: '#9f7aea',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
            }}
          >
            📖 学习库
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
