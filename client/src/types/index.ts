// 前端类型定义

/** 学习项类别 */
export type ItemCategory = 'vocabulary' | 'phrase' | 'sentence';

/** 掌握程度 */
export type MasteryLevel = 'new' | 'learning' | 'mastered';

/** 复习响应 */
export type ReviewResponse = 'remembered' | 'forgotten';

/** 学习项 */
export interface LearningItem {
  id: string;
  text: string;
  category: ItemCategory;
  definition: string;
  translation: string;
  correction?: string | null;
  exampleSentences: string[];
  createdAt: string;
  masteryLevel: MasteryLevel;
  nextReviewAt?: string;
  successCount: number;
}

/** 生成的学习项（未保存） */
export interface GeneratedItem {
  text: string;
  category: ItemCategory;
  definition: string;
  translation: string;
  exampleSentences: string[];
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 学习统计 */
export interface LearningStats {
  totalItems: number;
  masteredItems: number;
  dueItems: number;
}

/** 文件上传状态 */
export interface FileStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  originalName: string;
  errorMessage?: string;
  processedAt?: string;
}

/** 复习会话项目 */
export interface ReviewSessionItem {
  itemId: string;
  text: string;
  category: ItemCategory;
  definition: string;
  translation: string;
}

/** 会话总结 */
export interface SessionSummary {
  totalItems: number;
  rememberedCount: number;
  forgottenCount: number;
}
