// 属性测试：文件格式验证正确性
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateFile, validateFormat, getFileExtension } from '../../src/services/fileValidator.js';
import { ALL_SUPPORTED_FORMATS } from '../../src/types/index.js';

describe('Feature: english-learning-app, Property 1: 文件格式验证正确', () => {
  const supportedExtensions = Array.from(ALL_SUPPORTED_FORMATS);

  it('应接受所有支持格式的文件（不区分大小写）', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...supportedExtensions),
        fc.boolean(), // 是否大写
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('.')),
        (ext, uppercase, basename) => {
          const finalExt = uppercase ? ext.toUpperCase() : ext;
          const filename = `${basename}.${finalExt}`;
          const result = validateFormat(filename);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('应拒绝所有不支持格式的文件', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(
          s => !ALL_SUPPORTED_FORMATS.has(s.toLowerCase()) && /^[a-zA-Z0-9]+$/.test(s)
        ),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('.')),
        (ext, basename) => {
          const filename = `${basename}.${ext}`;
          const result = validateFormat(filename);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('unsupported_format');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('应拒绝超过 500MB 的文件', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...supportedExtensions),
        fc.integer({ min: 500 * 1024 * 1024 + 1, max: 1024 * 1024 * 1024 }),
        (ext, size) => {
          const file = { originalname: `test.${ext}`, size, path: '/tmp/test', mimetype: '' };
          const result = validateFile(file);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('file_too_large');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('应拒绝空文件（0 字节）', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...supportedExtensions),
        (ext) => {
          const file = { originalname: `test.${ext}`, size: 0, path: '/tmp/test', mimetype: '' };
          const result = validateFile(file);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('empty_file');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('应接受有效大小的支持格式文件', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...supportedExtensions),
        fc.integer({ min: 1, max: 500 * 1024 * 1024 }),
        (ext, size) => {
          const file = { originalname: `test.${ext}`, size, path: '/tmp/test', mimetype: '' };
          const result = validateFile(file);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('文件扩展名提取应正确处理各种文件名', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('.')),
        fc.string({ minLength: 1, maxLength: 5 }).filter(s => /^[a-zA-Z]+$/.test(s)),
        (basename, ext) => {
          const filename = `${basename}.${ext}`;
          const result = getFileExtension(filename);
          expect(result).toBe(ext.toLowerCase());
        }
      ),
      { numRuns: 100 }
    );
  });
});
