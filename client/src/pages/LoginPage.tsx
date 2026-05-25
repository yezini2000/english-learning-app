// 登录/注册页面
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/auth';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const getPasswordStrength = (pwd: string): { level: number; text: string; color: string } => {
    if (pwd.length === 0) return { level: 0, text: '', color: '#ddd' };
    if (pwd.length < 6) return { level: 1, text: '太短', color: '#e74c3c' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: 2, text: '弱', color: '#e67e22' };
    if (score <= 2) return { level: 3, text: '中', color: '#f1c40f' };
    return { level: 4, text: '强', color: '#27ae60' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 前端校验
    if (!validateEmail(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await register(email, password, nickname || undefined);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setConfirmPassword('');
  };

  const strength = getPasswordStrength(password);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>📚 英语学习助手</h1>
          <p style={styles.subtitle}>
            {mode === 'login' ? '欢迎回来，请登录你的账号' : '创建一个新账号开始学习'}
          </p>
        </div>

        {/* Tab 切换 */}
        <div style={styles.tabs}>
          <button
            onClick={() => switchMode()}
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
          >
            登录
          </button>
          <button
            onClick={() => switchMode()}
            style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'register' && (
            <div style={styles.field}>
              <label style={styles.label}>昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="给自己取个名字（可选）"
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>邮箱 <span style={{ color: '#e74c3c' }}>*</span></label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                ...styles.input,
                borderColor: email && !validateEmail(email) ? '#e74c3c' : '#ddd',
              }}
            />
            {email && !validateEmail(email) && (
              <span style={styles.hint}>请输入有效的邮箱格式</span>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>密码 <span style={{ color: '#e74c3c' }}>*</span></label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '至少 6 位，建议包含字母和数字' : '输入密码'}
                required
                style={{ ...styles.input, paddingRight: '48px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {mode === 'register' && password.length > 0 && (
              <div style={styles.strengthBar}>
                <div style={{
                  ...styles.strengthFill,
                  width: `${strength.level * 25}%`,
                  background: strength.color,
                }} />
                <span style={{ ...styles.strengthText, color: strength.color }}>
                  {strength.text}
                </span>
              </div>
            )}
          </div>

          {mode === 'register' && (
            <div style={styles.field}>
              <label style={styles.label}>确认密码 <span style={{ color: '#e74c3c' }}>*</span></label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                required
                style={{
                  ...styles.input,
                  borderColor: confirmPassword && confirmPassword !== password ? '#e74c3c' : '#ddd',
                }}
              />
              {confirmPassword && confirmPassword !== password && (
                <span style={styles.hint}>两次密码不一致</span>
              )}
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={{
            ...styles.submitButton,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '请稍候...' : (mode === 'login' ? '登 录' : '注 册')}
          </button>
        </form>

        <p style={styles.footer}>
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button onClick={switchMode} style={styles.switchButton}>
            {mode === 'login' ? '立即注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '1rem',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: { textAlign: 'center', marginBottom: '1.5rem' },
  title: { margin: '0 0 0.5rem', color: '#333', fontSize: '1.5rem' },
  subtitle: { margin: 0, color: '#888', fontSize: '0.9rem' },
  tabs: {
    display: 'flex',
    background: '#f5f5f5',
    borderRadius: '8px',
    padding: '4px',
    marginBottom: '1.5rem',
  },
  tab: {
    flex: 1,
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#666',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'white',
    color: '#667eea',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    fontWeight: 600,
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '13px', color: '#555', fontWeight: 500 },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  },
  passwordWrapper: { position: 'relative' },
  eyeButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
  },
  strengthBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  strengthFill: {
    height: '4px',
    borderRadius: '2px',
    transition: 'all 0.3s',
    flex: 1,
    maxWidth: '120px',
  },
  strengthText: { fontSize: '12px', fontWeight: 500 },
  hint: { fontSize: '12px', color: '#e74c3c' },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    border: '1px solid #fecaca',
  },
  submitButton: {
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    marginTop: '0.5rem',
    transition: 'opacity 0.2s',
  },
  footer: { textAlign: 'center', marginTop: '1.5rem', color: '#888', fontSize: '14px' },
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    marginLeft: '4px',
  },
};
