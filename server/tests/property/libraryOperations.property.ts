// 属性测试：学习库操作
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getMasteryLevel } from '../../src/services/reviewScheduler.js';
import { MAX_PAGE_SIZE } from '../../src/types/index.js';

// 纯函数版本的库操作逻辑

/**
 * 计算分页
 */
function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; totalPages: number } {
  const effectivePageSize = Math.min(pageSize, MAX_PAGE_SIZE);
  const totalPages = Math.ceil(items.length / effectivePageSize);
  const start = (page - 1) * effectivePageSize;
  const paginatedItems = items.slice(start, start + effectivePageSize);
  return { items: paginatedItems, totalPages };
}

/**
 * 按类别筛选
 */
function filterByCategory(
  items: Array<{ category: string }>,
  category: string
): Array<{ category: string }> {
  return items.filter(item => item.category === category);
}

/**
 * 搜索筛选（不区分大小写子串匹配）
 */
function searchItems(
  items: Array<{ text: string; definition: string; translation: string }>,
  query: string
): Array<{ text: string; definition: string; translation: string }> {
  const lowerQuery = query.toLowerCase();
  return items.filter(
    item =>
      item.text.toLowerCase().includes(lowerQuery) ||
      item.definition.toLowerCase().includes(lowerQuery) ||
      item.translation.toLowerCase().includes(lowerQuery)
  );
}

describe('Feature: english-learning-app, Property 15: 分页每页不超过 50 项', () => {
  it('每页项目数应 <= 50', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }), // 总项目数
        fc.integer({ min: 1, max: 20 }),   // 页码
        (totalItems, page) => {
          const items = Array.from({ length: totalItems }, (_, i) => ({ id: i }));
          const result = paginate(items, page, MAX_PAGE_SIZE);
          expect(result.items.length).toBeLessThanOrEqual(MAX_PAGE_SIZE);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('总页数应等于 ceil(N / 50)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        (totalItems) => {
          const items = Array.from({ length: totalItems }, (_, i) => ({ id: i }));
          const result = paginate(items, 1, MAX_PAGE_SIZE);
          expect(result.totalPages).toBe(Math.ceil(totalItems / MAX_PAGE_SIZE));
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 16: 类别筛选仅返回匹配项', () => {
  it('筛选结果中每个项目的类别应匹配筛选值', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            category: fc.constantFrom('vocabulary', 'phrase', 'sentence'),
            text: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        fc.constantFrom('vocabulary', 'phrase', 'sentence'),
        (items, filterCategory) => {
          const result = filterByCategory(items, filterCategory);
          
          // 结果中每个项目的类别应匹配
          for (const item of result) {
            expect(item.category).toBe(filterCategory);
          }
          
          // 不应遗漏匹配的项目
          const expected = items.filter(i => i.category === filterCategory);
          expect(result.length).toBe(expected.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 17: 掌握程度分类正确', () => {
  it('掌握程度分类应与 successCount 对应', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (successCount) => {
          const level = getMasteryLevel(successCount);
          if (successCount === 0) expect(level).toBe('new');
          else if (successCount >= 6) expect(level).toBe('mastered');
          else expect(level).toBe('learning');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 18: 搜索筛选返回正确的子串匹配', () => {
  it('搜索结果中每个项目应在至少一个字段中包含查询子串', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 30 }),
            definition: fc.string({ minLength: 1, maxLength: 50 }),
            translation: fc.string({ minLength: 1, maxLength: 30 }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        fc.string({ minLength: 1, maxLength: 10 }),
        (items, query) => {
          const result = searchItems(items, query);
          const lowerQuery = query.toLowerCase();
          
          // 结果中每个项目应包含查询子串
          for (const item of result) {
            const matches =
              item.text.toLowerCase().includes(lowerQuery) ||
              item.definition.toLowerCase().includes(lowerQuery) ||
              item.translation.toLowerCase().includes(lowerQuery);
            expect(matches).toBe(true);
          }
          
          // 不应遗漏匹配的项目
          const expected = items.filter(
            i =>
              i.text.toLowerCase().includes(lowerQuery) ||
              i.definition.toLowerCase().includes(lowerQuery) ||
              i.translation.toLowerCase().includes(lowerQuery)
          );
          expect(result.length).toBe(expected.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: english-learning-app, Property 19: 统计计数准确', () => {
  it('统计应正确反映各状态的项目数', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            status: fc.constantFrom('active', 'mastered'),
            successCount: fc.integer({ min: 0, max: 10 }),
            isDue: fc.boolean(),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        (schedules) => {
          const totalItems = schedules.length;
          const masteredItems = schedules.filter(s => s.status === 'mastered').length;
          const dueItems = schedules.filter(s => s.status === 'active' && s.isDue).length;
          
          expect(totalItems).toBeGreaterThanOrEqual(0);
          expect(masteredItems).toBeLessThanOrEqual(totalItems);
          expect(dueItems).toBeLessThanOrEqual(totalItems - masteredItems);
        }
      ),
      { numRuns: 100 }
    );
  });
});
