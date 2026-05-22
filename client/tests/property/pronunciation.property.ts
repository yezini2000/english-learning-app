// 属性测试：发音重试限制
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

const MAX_RETRIES = 3;

/**
 * 模拟发音播放重试逻辑（纯函数版本）
 */
function simulatePlayback(
  failureSequence: boolean[] // true = 失败, false = 成功
): { totalAttempts: number; finalState: 'success' | 'unavailable' } {
  let attempts = 0;
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    attempts++;
    if (i < failureSequence.length && !failureSequence[i]) {
      // 成功
      return { totalAttempts: attempts, finalState: 'success' };
    }
    // 失败，继续重试
  }
  
  // 所有重试用尽
  return { totalAttempts: attempts, finalState: 'unavailable' };
}

describe('Feature: english-learning-app, Property 14: 发音重试不超过 3 次', () => {
  it('重试次数不应超过 3 次', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 0, maxLength: 10 }),
        (failureSequence) => {
          const result = simulatePlayback(failureSequence);
          expect(result.totalAttempts).toBeLessThanOrEqual(MAX_RETRIES);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('全部失败时应显示"暂时不可用"', () => {
    fc.assert(
      fc.property(
        fc.constant([true, true, true]), // 3次全部失败
        (failureSequence) => {
          const result = simulatePlayback(failureSequence);
          expect(result.finalState).toBe('unavailable');
          expect(result.totalAttempts).toBe(MAX_RETRIES);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('第一次成功时应只尝试 1 次', () => {
    fc.assert(
      fc.property(
        fc.constant([false]), // 第一次成功
        (failureSequence) => {
          const result = simulatePlayback(failureSequence);
          expect(result.finalState).toBe('success');
          expect(result.totalAttempts).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('任意失败序列后成功时，总尝试次数应正确', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 }), // 失败次数 (0-2)
        (failCount) => {
          // 构造 failCount 次失败后成功的序列
          const sequence = [...Array(failCount).fill(true), false];
          const result = simulatePlayback(sequence);
          expect(result.finalState).toBe('success');
          expect(result.totalAttempts).toBe(failCount + 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
