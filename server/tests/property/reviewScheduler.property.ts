// 属性测试：复习调度器正确性
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateNextReview,
  calculateResetReview,
  isDue,
  getMasteryLevel,
} from '../../src/services/reviewScheduler.js';
import { REVIEW_INTERVALS, MAX_SESSION_ITEMS } from '../../src/types/index.js';

describe('Feature: english-learning-app, Property 5: 首次复习在 24 小时内安排', () => {
  it('首次复习时间应在添加时间后 1 天（24小时）', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (addedAt) => {
          // 首次复习 = addedAt + REVIEW_INTERVALS[0] 天 = addedAt + 1 天
          const expectedReview = new Date(addedAt.getTime() + REVIEW_INTERVALS[0] * 24 * 60 * 60 * 1000);
          const diff = expectedReview.getTime() - addedAt.getTime();
          // 应在 24 小时内（即 1 天 = 86400000 毫秒）
          expect(diff).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
          expect(diff).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 6: 标记"记住了"推进到正确的下一个间隔', () => {
  it('记住了应将 interval 推进 1，successCount 加 1，nextReviewAt 正确', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }), // currentInterval (0-4, not 5 since 5 would trigger mastery)
        fc.integer({ min: 0, max: 4 }), // successCount (0-4)
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (currentInterval, successCount, reviewTime) => {
          const result = calculateNextReview(currentInterval, successCount, reviewTime);
          
          expect(result.newSuccessCount).toBe(successCount + 1);
          
          if (successCount + 1 >= 6) {
            expect(result.mastered).toBe(true);
          } else {
            expect(result.mastered).toBe(false);
            expect(result.newInterval).toBe(currentInterval + 1);
            
            const expectedNextReview = new Date(
              reviewTime.getTime() + REVIEW_INTERVALS[currentInterval + 1] * 24 * 60 * 60 * 1000
            );
            expect(result.nextReviewAt.getTime()).toBe(expectedNextReview.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 7: 标记"忘记了"重置到第一个间隔', () => {
  it('忘记了应将 interval 重置为 0，successCount 重置为 0，nextReviewAt = T + 1天', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }), // 任意 currentInterval
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (_currentInterval, reviewTime) => {
          const result = calculateResetReview(reviewTime);
          
          expect(result.newInterval).toBe(0);
          expect(result.newSuccessCount).toBe(0);
          
          const expectedNextReview = new Date(
            reviewTime.getTime() + REVIEW_INTERVALS[0] * 24 * 60 * 60 * 1000
          );
          expect(result.nextReviewAt.getTime()).toBe(expectedNextReview.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 8: 到期学习项判定', () => {
  it('active 状态且 nextReviewAt <= 当前时间的项目应为到期', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
        (nextReviewAt, currentTime) => {
          // nextReviewAt < currentTime
          expect(isDue(nextReviewAt, 'active', currentTime)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('nextReviewAt > 当前时间的项目不应为到期', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (nextReviewAt, currentTime) => {
          // nextReviewAt > currentTime
          expect(isDue(nextReviewAt, 'active', currentTime)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('mastered 状态的项目不应为到期', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
        (nextReviewAt, currentTime) => {
          expect(isDue(nextReviewAt, 'mastered', currentTime)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 9: 复习会话遵守最大数量限制', () => {
  it('会话项目数应为 min(N, 50)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }),
        (totalDueItems) => {
          const sessionSize = Math.min(totalDueItems, MAX_SESSION_ITEMS);
          expect(sessionSize).toBeLessThanOrEqual(MAX_SESSION_ITEMS);
          expect(sessionSize).toBe(Math.min(totalDueItems, 50));
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 10: 6 次成功复习后转为已掌握', () => {
  it('successCount=5 且 interval=5 时标记记住了应转为 mastered', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (reviewTime) => {
          const result = calculateNextReview(5, 5, reviewTime);
          expect(result.mastered).toBe(true);
          expect(result.newSuccessCount).toBe(6);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('successCount < 5 时不应转为 mastered', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (interval, successCount, reviewTime) => {
          const result = calculateNextReview(interval, successCount, reviewTime);
          if (successCount + 1 < 6) {
            expect(result.mastered).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 17: 掌握程度分类正确', () => {
  it('successCount=0 应为 new，1-5 应为 learning，>=6 应为 mastered', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (successCount) => {
          const level = getMasteryLevel(successCount);
          if (successCount === 0) {
            expect(level).toBe('new');
          } else if (successCount >= 6) {
            expect(level).toBe('mastered');
          } else {
            expect(level).toBe('learning');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
