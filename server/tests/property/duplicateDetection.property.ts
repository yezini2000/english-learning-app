// 属性测试：重复检测和学习项生成有效性
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isDuplicateText } from '../../src/services/duplicateDetector.js';
import { validateAndCleanItems } from '../../src/services/itemGenerator.js';

describe('Feature: english-learning-app, Property 3: 生成的学习项满足有效性约束', () => {
  it('验证后的项目应满足所有约束', () => {
    const categoryArb = fc.constantFrom('vocabulary', 'phrase', 'sentence');
    
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            category: categoryArb,
            definition: fc.string({ minLength: 1, maxLength: 100 }),
            translation: fc.string({ minLength: 1, maxLength: 50 }),
            exampleSentences: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 5 }),
          }),
          { minLength: 0, maxLength: 250 }
        ),
        (rawItems) => {
          const validated = validateAndCleanItems(rawItems);
          
          // (a) 总项目数 ≤ 200（由 slice 保证）
          expect(validated.length).toBeLessThanOrEqual(200);
          
          // (b) 每个项目的类别属于有效集合
          for (const item of validated) {
            expect(['vocabulary', 'phrase', 'sentence']).toContain(item.category);
          }
          
          // (c) 每个项目有非空的释义和翻译
          for (const item of validated) {
            expect(item.definition.length).toBeGreaterThan(0);
            expect(item.translation.length).toBeGreaterThan(0);
          }
          
          // (d) 词汇和词组的例句数量在 0-3 之间
          for (const item of validated) {
            if (item.category === 'vocabulary' || item.category === 'phrase') {
              expect(item.exampleSentences.length).toBeLessThanOrEqual(3);
            }
            if (item.category === 'sentence') {
              expect(item.exampleSentences.length).toBe(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 4: 重复检测不区分大小写', () => {
  it('相同文本不同大小写应被检测为重复', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => /[a-zA-Z]/.test(s)),
        fc.constantFrom('vocabulary', 'phrase', 'sentence'),
        (text, category) => {
          const existingItems = [{ text: text.toLowerCase(), category }];
          
          // 大写版本应被检测为重复
          expect(isDuplicateText(text.toUpperCase(), category, existingItems)).toBe(true);
          // 原始版本应被检测为重复
          expect(isDuplicateText(text, category, existingItems)).toBe(true);
          // 混合大小写应被检测为重复
          const mixed = text.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join('');
          expect(isDuplicateText(mixed, category, existingItems)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('不同类别的相同文本不应被检测为重复', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => /[a-zA-Z]/.test(s)),
        (text) => {
          const existingItems = [{ text, category: 'vocabulary' }];
          
          // 不同类别不应重复
          expect(isDuplicateText(text, 'phrase', existingItems)).toBe(false);
          expect(isDuplicateText(text, 'sentence', existingItems)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('不存在的文本不应被检测为重复', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => /[a-zA-Z]/.test(s)),
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => /[a-zA-Z]/.test(s)),
        fc.constantFrom('vocabulary', 'phrase', 'sentence'),
        (text1, text2, category) => {
          // 确保两个文本不同
          if (text1.toLowerCase().trim() === text2.toLowerCase().trim()) return;
          
          const existingItems = [{ text: text1, category }];
          expect(isDuplicateText(text2, category, existingItems)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
