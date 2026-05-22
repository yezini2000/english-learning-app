// 文件验证器 - 验证上传文件的格式、大小和内容
import {
  ValidationResult,
  UploadedFile,
  ALL_SUPPORTED_FORMATS,
  MAX_FILE_SIZE,
} from '../types/index.js';

/**
 * 从文件名中提取扩展名（不区分大小写）
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * 验证文件格式是否支持
 */
export function validateFormat(filename: string): ValidationResult {
  const ext = getFileExtension(filename);
  if (!ext || !ALL_SUPPORTED_FORMATS.has(ext)) {
    return {
      valid: false,
      error: 'unsupported_format',
      message: `不支持的文件格式。支持的格式：${Array.from(ALL_SUPPORTED_FORMATS).join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * 验证文件大小是否在限制范围内
 */
export function validateSize(sizeBytes: number): ValidationResult {
  if (sizeBytes > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'file_too_large',
      message: `文件大小超过限制。最大允许文件大小为 500MB。`,
    };
  }
  return { valid: true };
}

/**
 * 验证文件是否为空
 */
export function validateNotEmpty(sizeBytes: number): ValidationResult {
  if (sizeBytes === 0) {
    return {
      valid: false,
      error: 'empty_file',
      message: `文件无内容。请上传非空文件。`,
    };
  }
  return { valid: true };
}

/**
 * 完整的文件验证（格式 + 大小 + 空文件检测）
 */
export function validateFile(file: UploadedFile): ValidationResult {
  // 1. 检查空文件
  const emptyCheck = validateNotEmpty(file.size);
  if (!emptyCheck.valid) return emptyCheck;

  // 2. 检查文件格式
  const formatCheck = validateFormat(file.originalname);
  if (!formatCheck.valid) return formatCheck;

  // 3. 检查文件大小
  const sizeCheck = validateSize(file.size);
  if (!sizeCheck.valid) return sizeCheck;

  return { valid: true };
}
