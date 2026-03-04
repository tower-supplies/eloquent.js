import { deepMerge } from '@/utils';
import { describe, expect, it } from 'vitest';

describe('deepMerge', () => {
  it('deeply merges two objects', () => {
    const a = {
      a: 123,
      b: { c: 123 },
    };

    const b = {
      a: 456,
      b: { c: 123, d: 789 },
      e: 'abc',
    };

    const merged = deepMerge(a, b);
    expect(merged).toEqual({
      a: 456,
      b: { c: 123, d: 789 },
      e: 'abc',
    });
  });

  it('does not merge inherited properties', () => {
    const a = Object.create({ inheritedKey: 'from A' });
    a.b = 'abc';

    const b = Object.create({ inheritedKey: 'from B' });
    b.b = 'def';

    const merged = deepMerge(a, b);
    expect(merged).toEqual({
      b: 'def',
    });
  });

  it('does not attempt to merge non-primitive Objects', () => {
    const a = {
      nested: { date: new Date(Date.parse('01 Jan 2026 09:00:00 GMT')) },
    };

    const b = {
      nested: { date: new Date(Date.parse('01 Jan 2026 09:00:00 GMT')) },
    };

    const merged = deepMerge(a, b);
    expect(merged).toEqual({
      nested: { date: new Date(Date.parse('01 Jan 2026 09:00:00 GMT')) },
    });
  });
});
