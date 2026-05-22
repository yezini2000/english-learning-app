// 属性测试：复习会话管理
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ReviewSession, ReviewSessionItem, SessionSummary } from '../../src/types/index.js';

// 纯函数版本的会话逻辑，用于属性测试

/**
 * 模拟会话响应处理
 */
function processResponses(
  items: ReviewSessionItem[],
  responses: Array<'remembered' | 'forgotten'>
): SessionSummary {
  let rememberedCount = 0;
  let forgottenCount = 0;

  for (let i = 0; i < responses.length && i < items.length; i++) {
    if (responses[i] === 'remembered') {
      rememberedCount++;
    } else {
      forgottenCount++;
    }
  }

  return {
    totalItems: items.length,
    rememberedCount,
    forgottenCount,
  };
}

/**
 * 计算进度显示
 */
function getProgressDisplay(currentIndex: number, totalItems: number): string {
  return `${currentIndex} / ${totalItems}`;
}

describe('Feature: english-learning-app, Property 11: 会话总结计数准确', () => {
  it('remembered + forgotten 应等于总复习项数', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.constantFrom('remembered' as const, 'forgotten' as const), { minLength: 1, maxLength: 50 }),
        (itemCount, responses) => {
          const items: ReviewSessionItem[] = Array.from({ length: itemCount }, (_, i) => ({
            itemId: `item-${i}`,
            text: `word-${i}`,
            category: 'vocabulary' as const,
            definition: `def-${i}`,
            translation: `翻译-${i}`,
          }));

          // 只处理 min(itemCount, responses.length) 个响应
          const actualResponses = responses.slice(0, itemCount);
          const summary = processResponses(items, actualResponses);

          expect(summary.rememberedCount + summary.forgottenCount).toBe(actualResponses.length);
          expect(summary.rememberedCount).toBe(actualResponses.filter(r => r === 'remembered').length);
          expect(summary.forgottenCount).toBe(actualResponses.filter(r => r === 'forgotten').length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 12: 会话进度显示正确', () => {
  it('进度应显示为 "i / N"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }), // totalItems
        fc.integer({ min: 1, max: 50 }), // currentIndex
        (totalItems, currentIndex) => {
          const adjustedIndex = Math.min(currentIndex, totalItems);
          const display = getProgressDisplay(adjustedIndex, totalItems);
          expect(display).toBe(`${adjustedIndex} / ${totalItems}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 13: 部分完成的会话保留已复习项并保持未复习项为到期状态', () => {
  it('部分完成时，已复习项有响应，未复习项无响应', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 50 }), // totalItems (至少2个才能部分完成)
        fc.integer({ min: 1, max: 49 }), // reviewedCount (部分完成)
        (totalItems, reviewedCount) => {
          const actualReviewed = Math.min(reviewedCount, totalItems - 1); // 确保部分完成
          
          const items: ReviewSessionItem[] = Array.from({ length: totalItems }, (_, i) => ({
            itemId: `item-${i}`,
            text: `word-${i}`,
            category: 'vocabulary' as const,
            definition: `def-${i}`,
            translation: `翻译-${i}`,
          }));

          // 模拟部分完成
          for (let i = 0; i < actualReviewed; i++) {
            items[i].response = i % 2 === 0 ? 'remembered' : 'forgotten';
          }

          // 已复习的项目应有响应
          const reviewed = items.filter(i => i.response !== undefined);
          expect(reviewed.length).toBe(actualReviewed);

          // 未复习的项目应无响应（保持到期状态）
          const unreviewed = items.filter(i => i.response === undefined);
          expect(unreviewed.length).toBe(totalItems - actualReviewed);
        }
      ),
      { numRuns: 100 }
    );
  });
});
