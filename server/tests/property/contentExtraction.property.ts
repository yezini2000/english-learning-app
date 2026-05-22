// 属性测试：英文内容提取排除非英文文本
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isEnglishText, filterEnglishParagraphs } from '../../src/services/textExtractor.js';

describe('Feature: english-learning-app, Property 2: 英文内容提取排除非英文文本', () => {
  // 生成英文文本的 arbitrary
  const englishTextArb = fc.stringOf(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '.split('')
    ),
    { minLength: 10, maxLength: 100 }
  ).filter(s => s.trim().length > 5);

  // 生成中文文本的 arbitrary
  const chineseTextArb = fc.stringOf(
    fc.integer({ min: 0x4e00, max: 0x9fff }).map(c => String.fromCharCode(c)),
    { minLength: 5, maxLength: 50 }
  );

  it('纯英文文本应被识别为英文', () => {
    fc.assert(
      fc.property(englishTextArb, (text) => {
        expect(isEnglishText(text)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('纯中文文本应被识别为非英文', () => {
    fc.assert(
      fc.property(chineseTextArb, (text) => {
        expect(isEnglishText(text)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('混合文本过滤后应只包含英文段落', () => {
    fc.assert(
      fc.property(
        fc.array(englishTextArb, { minLength: 1, maxLength: 5 }),
        fc.array(chineseTextArb, { minLength: 1, maxLength: 5 }),
        (englishParagraphs, chineseParagraphs) => {
          // 交错排列英文和中文段落
          const mixed: string[] = [];
          const maxLen = Math.max(englishParagraphs.length, chineseParagraphs.length);
          for (let i = 0; i < maxLen; i++) {
            if (i < englishParagraphs.length) mixed.push(englishParagraphs[i]);
            if (i < chineseParagraphs.length) mixed.push(chineseParagraphs[i]);
          }
          
          const input = mixed.join('\n\n');
          const result = filterEnglishParagraphs(input);
          
          // 结果中不应包含中文段落
          for (const chPara of chineseParagraphs) {
            expect(result).not.toContain(chPara);
          }
          
          // 结果应包含英文段落
          for (const enPara of englishParagraphs) {
            expect(result).toContain(enPara.trim());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('空文本应返回空字符串', () => {
    const result = filterEnglishParagraphs('');
    expect(result).toBe('');
  });
});
