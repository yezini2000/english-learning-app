// 学习库管理组件 - 分页表格、筛选、搜索、删除
import { useState, useEffect, useCallback } from 'react';
import { getItems, deleteItem } from '../services/api';
import { PronunciationPlayer } from './PronunciationPlayer';
import type { LearningItem, ItemCategory, MasteryLevel } from '../types/index';

export function LearningLibrary() {
  const [items, setItems] = useState<LearningItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [category, setCategory] = useState<ItemCategory | ''>('');
  const [masteryLevel, setMasteryLevel] = useState<MasteryLevel | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page };
      if (category) params.category = category;
      if (masteryLevel) params.masteryLevel = masteryLevel;
      if (search) params.search = search;

      const result = await getItems(params);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('获取学习项失败:', err);
    } finally {
      setLoading(false);
    }
  }, [page, category, masteryLevel, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 搜索防抖
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
      setDeleteConfirm(null);
      fetchItems();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'vocabulary': return '词汇';
      case 'phrase': return '词组';
      case 'sentence': return '语句';
      default: return cat;
    }
  };

  const masteryLabel = (level: string) => {
    switch (level) {
      case 'new': return '新学';
      case 'learning': return '学习中';
      case 'mastered': return '已掌握';
      default: return level;
    }
  };

  const masteryColor = (level: string) => {
    switch (level) {
      case 'new': return '#4299e1';
      case 'learning': return '#ed8936';
      case 'mastered': return '#48bb78';
      default: return '#718096';
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>学习库</h2>

      {/* 筛选和搜索 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value as ItemCategory | ''); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
        >
          <option value="">全部类别</option>
          <option value="vocabulary">词汇</option>
          <option value="phrase">词组</option>
          <option value="sentence">语句</option>
        </select>

        <select
          value={masteryLevel}
          onChange={(e) => { setMasteryLevel(e.target.value as MasteryLevel | ''); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
        >
          <option value="">全部程度</option>
          <option value="new">新学</option>
          <option value="learning">学习中</option>
          <option value="mastered">已掌握</option>
        </select>

        <input
          type="text"
          placeholder="搜索..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0', flex: 1, minWidth: '200px' }}
        />
      </div>

      {/* 总数 */}
      <p style={{ color: '#718096', marginBottom: '12px' }}>共 {total} 项</p>

      {/* 加载中 */}
      {loading && <p style={{ textAlign: 'center' }}>加载中...</p>}

      {/* 无结果 */}
      {!loading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
          <p>未找到匹配的学习项</p>
        </div>
      )}

      {/* 学习项列表 */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                background: '#fff',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold' }}>{item.text}</span>
                <span style={{ fontSize: '12px', padding: '1px 6px', background: '#edf2f7', borderRadius: '4px' }}>
                  {categoryLabel(item.category)}
                </span>
                <span style={{ fontSize: '12px', padding: '1px 6px', background: masteryColor(item.masteryLevel) + '20', color: masteryColor(item.masteryLevel), borderRadius: '4px' }}>
                  {masteryLabel(item.masteryLevel)}
                </span>
              </div>
              <p style={{ margin: '4px 0', fontSize: '14px', color: '#4a5568' }}>{item.translation}</p>
              {item.nextReviewAt && (
                <p style={{ margin: '2px 0', fontSize: '12px', color: '#a0aec0' }}>
                  下次复习: {new Date(item.nextReviewAt).toLocaleDateString('zh-CN')}
                </p>
              )}

              {/* 右上角删除按钮 */}
              <button
                onClick={() => setDeleteConfirm(item.id)}
                style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 8px', background: 'none', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                删除
              </button>

              {/* 右下角音标和播放 */}
              <div style={{ position: 'absolute', bottom: '12px', right: '12px' }}>
                <PronunciationPlayer text={item.text} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            上一页
          </button>
          <span style={{ padding: '6px 12px', color: '#718096' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >
            下一页
          </button>
        </div>
      )}

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 16px' }}>确认删除</h3>
            <p>确定要删除这个学习项吗？此操作不可撤销。</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{ padding: '8px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LearningLibrary;
