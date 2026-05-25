// 全局导航栏 - 显示用户信息和退出按钮
import { useNavigate, useLocation } from 'react-router-dom';
import { getUser, logout } from '../services/auth';

export function NavBar() {
  const user = getUser();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { path: '/', label: '首页' },
    { path: '/import', label: '导入' },
    { path: '/library', label: '学习库' },
    { path: '/review', label: '复习' },
  ];

  return (
    <nav style={styles.nav}>
      <div style={styles.left}>
        <span style={styles.logo} onClick={() => navigate('/')}>📚 英语学习</span>
        <div style={styles.links}>
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                ...styles.link,
                ...(location.pathname === item.path ? styles.linkActive : {}),
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.right}>
        <span style={styles.username}>{user.nickname || user.email}</span>
        <button onClick={logout} style={styles.logoutBtn}>
          退出
        </button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    height: '56px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  logo: {
    fontWeight: 700,
    fontSize: '16px',
    cursor: 'pointer',
    color: '#333',
  },
  links: {
    display: 'flex',
    gap: '4px',
  },
  link: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    background: 'transparent',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  linkActive: {
    background: '#eef2ff',
    color: '#667eea',
    fontWeight: 600,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  username: {
    fontSize: '14px',
    color: '#555',
  },
  logoutBtn: {
    padding: '5px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    background: 'white',
    color: '#666',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
