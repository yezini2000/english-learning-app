// 复习会话页面
import { useNavigate } from 'react-router-dom';
import { ReviewSession } from '../components/ReviewSession';

export function ReviewPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '15vh' }}>
      <button
        onClick={() => navigate('/')}
        style={{ position: 'absolute', top: '20px', left: '20px', padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', background: '#fff' }}
      >
        ← 返回主页
      </button>
      <div style={{ width: '100%', maxWidth: '800px' }}>
        <ReviewSession onComplete={() => navigate('/')} />
      </div>
    </div>
  );
}

export default ReviewPage;
