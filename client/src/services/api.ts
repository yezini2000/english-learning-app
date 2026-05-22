// API 客户端 - 与后端通信
import type {
  LearningItem,
  LearningStats,
  FileStatus,
  PaginatedResponse,
  GeneratedItem,
  ReviewSessionItem,
  SessionSummary,
  ItemCategory,
  MasteryLevel,
  ReviewResponse,
} from '../types/index';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || error.error || '请求失败');
  }

  return response.json();
}

// ===== 文件上传 =====

export async function uploadFile(file: File): Promise<{ id: string; status: string; message: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/files/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '上传失败' }));
    throw new Error(error.message || '上传失败');
  }

  return response.json();
}

export async function getFileStatus(fileId: string): Promise<FileStatus> {
  return request<FileStatus>(`/files/${fileId}/status`);
}

// ===== 学习项 =====

export async function getItems(params: {
  page?: number;
  pageSize?: number;
  category?: ItemCategory;
  masteryLevel?: MasteryLevel;
  search?: string;
}): Promise<PaginatedResponse<LearningItem>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.category) searchParams.set('category', params.category);
  if (params.masteryLevel) searchParams.set('masteryLevel', params.masteryLevel);
  if (params.search) searchParams.set('search', params.search);

  return request<PaginatedResponse<LearningItem>>(`/items?${searchParams.toString()}`);
}

export async function deleteItem(id: string): Promise<void> {
  await request(`/items/${id}`, { method: 'DELETE' });
}

export async function batchAddItems(items: GeneratedItem[], fileId?: string): Promise<{
  added: number;
  skipped: number;
  message: string;
}> {
  return request('/items/batch', {
    method: 'POST',
    body: JSON.stringify({ items, fileId }),
  });
}

// ===== 复习 =====

export async function getDueCount(): Promise<{ dueCount: number }> {
  return request<{ dueCount: number }>('/review/due');
}

export async function startReviewSession(): Promise<{
  sessionId: string;
  totalItems: number;
  currentItem: ReviewSessionItem;
  currentIndex: number;
  message?: string;
  session?: null;
}> {
  return request('/review/session', { method: 'POST' });
}

export async function submitReviewResponse(
  sessionId: string,
  itemId: string,
  response: ReviewResponse
): Promise<{
  completed: boolean;
  currentItem?: ReviewSessionItem;
  currentIndex?: number;
  totalItems?: number;
  rememberedCount?: number;
  forgottenCount?: number;
  summary?: SessionSummary;
}> {
  return request('/review/respond', {
    method: 'POST',
    body: JSON.stringify({ sessionId, itemId, response }),
  });
}

// ===== 统计 =====

export async function getStats(): Promise<LearningStats> {
  return request<LearningStats>('/stats');
}
