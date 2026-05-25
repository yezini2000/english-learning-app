// 认证服务 - 管理登录状态和 token
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface User {
  id: string;
  email: string;
  nickname: string | null;
}

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  // 简单验证 token 格式（JWT 是三段 base64 用 . 分隔）
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    clearAuth();
    return null;
  }
  // 检查是否过期
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      clearAuth();
      return null;
    }
  } catch {
    clearAuth();
    return null;
  }
  return token.trim();
}

export function getUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '登录失败');
  saveAuth(data.token, data.user);
  return data;
}

export async function register(email: string, password: string, nickname?: string): Promise<{ token: string; user: User }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, nickname }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '注册失败');
  saveAuth(data.token, data.user);
  return data;
}

export function logout(): void {
  clearAuth();
  window.location.href = '/login';
}
