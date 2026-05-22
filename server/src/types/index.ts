// 核心 TypeScript 接口和类型定义

// ===== 文件处理相关类型 =====

/** 支持的文本文件格式 */
export type TextFormat = 'txt' | 'pdf' | 'docx' | 'srt' | 'md';

/** 支持的音频文件格式 */
export type AudioFormat = 'mp3' | 'wav' | 'm4a';

/** 支持的视频文件格式 */
export type VideoFormat = 'mp4' | 'webm' | 'mkv';

/** 所有支持的文件格式 */
export type SupportedFormat = TextFormat | AudioFormat | VideoFormat;

/** 文件处理状态 */
export type FileStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** 文件验证错误类型 */
export type ValidationErrorType = 'unsupported_format' | 'file_too_large' | 'empty_file';

/** 文件验证结果 */
export interface ValidationResult {
  valid: boolean;
  error?: ValidationErrorType;
  message?: string;
}

/** 文件处理结果 */
export interface ProcessingResult {
  success: boolean;
  extractedText?: string;
  error?: string;
}

/** 上传的文件信息 */
export interface UploadedFile {
  originalname: string;
  size: number;
  path: string;
  mimetype: string;
}

// ===== 学习项相关类型 =====

/** 学习项类别 */
export type ItemCategory = 'vocabulary' | 'phrase' | 'sentence';

/** 学习项 */
export interface LearningItem {
  id: string;
  fileId?: string;
  text: string;
  category: ItemCategory;
  definition: string;
  translation: string;
  exampleSentences: string[];
  createdAt: Date;
}

/** 生成的学习项（未保存） */
export interface GeneratedItem {
  text: string;
  category: ItemCategory;
  definition: string;
  translation: string;
  exampleSentences: string[];
}

// ===== 复习调度相关类型 =====

/** 复习计划状态 */
export type ReviewStatus = 'active' | 'mastered';

/** 复习响应 */
export type ReviewResponse = 'remembered' | 'forgotten';

/** 掌握程度 */
export type MasteryLevel = 'new' | 'learning' | 'mastered';

/** 艾宾浩斯复习间隔（天） */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30] as const;

/** 每次复习会话最大项目数 */
export const MAX_SESSION_ITEMS = 50;

/** 每页最大项目数 */
export const MAX_PAGE_SIZE = 50;

/** 最大文件大小（字节）：500MB */
export const MAX_FILE_SIZE = 500 * 1024 * 1024;

/** 文件处理超时（毫秒）：300秒 */
export const PROCESSING_TIMEOUT = 300 * 1000;

/** 内容提取超时（毫秒）：120秒 */
export const EXTRACTION_TIMEOUT = 120 * 1000;

/** 每次生成最大学习项数 */
export const MAX_GENERATED_ITEMS = 500;

// ===== 复习会话相关类型 =====

/** 复习会话 */
export interface ReviewSession {
  id: string;
  items: ReviewSessionItem[];
  currentIndex: number;
  rememberedCount: number;
  forgottenCount: number;
  completed: boolean;
}

/** 复习会话中的项目 */
export interface ReviewSessionItem {
  itemId: string;
  text: string;
  category: ItemCategory;
  definition: string;
  translation: string;
  response?: ReviewResponse;
}

/** 会话总结 */
export interface SessionSummary {
  totalItems: number;
  rememberedCount: number;
  forgottenCount: number;
}

// ===== API 请求/响应类型 =====

/** 分页参数 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** 学习库筛选参数 */
export interface LibraryFilterParams extends PaginationParams {
  category?: ItemCategory;
  masteryLevel?: MasteryLevel;
  search?: string;
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

/** 批量添加请求 */
export interface BatchAddRequest {
  items: GeneratedItem[];
  fileId?: string;
}

/** 复习响应请求 */
export interface ReviewRespondRequest {
  sessionId: string;
  itemId: string;
  response: ReviewResponse;
}

// ===== 接口定义 =====

/** 文件处理器接口 */
export interface IFileProcessor {
  validateFile(file: UploadedFile): ValidationResult;
  processFile(fileId: string): Promise<ProcessingResult>;
}

/** 内容提取器接口 */
export interface IContentExtractor {
  extractFromText(filePath: string, format: TextFormat): Promise<string>;
  extractFromAudio(filePath: string): Promise<string>;
  extractFromVideo(filePath: string): Promise<string>;
}

/** 学习项生成器接口 */
export interface IItemGenerator {
  generateItems(text: string): Promise<GeneratedItem[]>;
}

/** 复习调度器接口 */
export interface IReviewScheduler {
  scheduleFirstReview(itemId: string): Promise<void>;
  advanceToNextInterval(itemId: string): Promise<void>;
  resetToFirstInterval(itemId: string): Promise<void>;
  getDueItems(limit?: number): Promise<LearningItem[]>;
  getDueCount(): Promise<number>;
}

// ===== 支持的文件格式集合 =====

export const SUPPORTED_TEXT_FORMATS: Set<string> = new Set(['txt', 'pdf', 'docx', 'srt', 'md']);
export const SUPPORTED_AUDIO_FORMATS: Set<string> = new Set(['mp3', 'wav', 'm4a']);
export const SUPPORTED_VIDEO_FORMATS: Set<string> = new Set(['mp4', 'webm', 'mkv']);
export const ALL_SUPPORTED_FORMATS: Set<string> = new Set([
  ...SUPPORTED_TEXT_FORMATS,
  ...SUPPORTED_AUDIO_FORMATS,
  ...SUPPORTED_VIDEO_FORMATS,
]);
