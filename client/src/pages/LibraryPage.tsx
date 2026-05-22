// 学习库页面
import { useNavigate } from 'react-router-dom';
import { LearningLibrary } from '../components/LearningLibrary';

export function LibraryPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px' }}>
      <button
        onClick={() => navigate('/')}
        style={{ marginBottom: '20px', padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}
      >
        ← 返回主页
      </button>
      <LearningLibrary />
    </div>
  );
}

export default LibraryPage;
