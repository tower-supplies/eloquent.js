import { partition } from '@/utils';
import { describe, expect, it } from 'vitest';

describe('partition', () => {
  describe('basic partitioning', () => {
    it('splits numbers into even and odd', () => {
      const [evens, odds] = partition([1, 2, 3, 4, 5], (n) => n % 2 === 0);
      expect(evens).toEqual([2, 4]);
      expect(odds).toEqual([1, 3, 5]);
    });

    it('splits strings by a condition', () => {
      const words = ['apple', 'fig', 'banana', 'kiwi', 'cherry'];
      const [long, short] = partition(words, (w) => w.length > 4);
      expect(long).toEqual(['apple', 'banana', 'cherry']);
      expect(short).toEqual(['fig', 'kiwi']);
    });

    it('splits objects by a property', () => {
      const users = [
        { name: 'Alice', active: true },
        { name: 'Bob', active: false },
        { name: 'Carol', active: true },
      ];
      const [active, inactive] = partition(users, (u) => u.active);
      expect(active).toEqual([
        { name: 'Alice', active: true },
        { name: 'Carol', active: true },
      ]);
      expect(inactive).toEqual([{ name: 'Bob', active: false }]);
    });
  });

  describe('edge cases', () => {
    it('returns two empty arrays for an empty input', () => {
      const [a, b] = partition([], () => true);
      expect(a).toEqual([]);
      expect(b).toEqual([]);
    });

    it('puts all items in the first array when predicate is always true', () => {
      const [matched, unmatched] = partition([1, 2, 3], () => true);
      expect(matched).toEqual([1, 2, 3]);
      expect(unmatched).toEqual([]);
    });

    it('puts all items in the second array when predicate is always false', () => {
      const [matched, unmatched] = partition([1, 2, 3], () => false);
      expect(matched).toEqual([]);
      expect(unmatched).toEqual([1, 2, 3]);
    });

    it('handles an array with a single element that matches', () => {
      const [matched, unmatched] = partition([42], (n) => n === 42);
      expect(matched).toEqual([42]);
      expect(unmatched).toEqual([]);
    });

    it('handles an array with a single element that does not match', () => {
      const [matched, unmatched] = partition([42], (n) => n === 0);
      expect(matched).toEqual([]);
      expect(unmatched).toEqual([42]);
    });

    it('handles arrays with duplicate values', () => {
      const [matched, unmatched] = partition([1, 1, 2, 2, 3], (n) => n === 1);
      expect(matched).toEqual([1, 1]);
      expect(unmatched).toEqual([2, 2, 3]);
    });
  });

  describe('index and array arguments', () => {
    it('passes the correct index to the predicate', () => {
      const indices: number[] = [];
      partition([10, 20, 30], (_, i) => {
        indices.push(i);
        return true;
      });
      expect(indices).toEqual([0, 1, 2]);
    });

    it('splits by index (even vs odd positions)', () => {
      const [evenIdx, oddIdx] = partition(['a', 'b', 'c', 'd'], (_, i) => i % 2 === 0);
      expect(evenIdx).toEqual(['a', 'c']);
      expect(oddIdx).toEqual(['b', 'd']);
    });

    it('passes the original array to the predicate', () => {
      const input = [1, 2, 3];
      let receivedArr: number[] | null = null;
      partition(input, (_, _i, arr) => {
        receivedArr = arr;
        return true;
      });
      expect(receivedArr).toBe(input);
    });
  });

  describe('type safety', () => {
    it('works with booleans', () => {
      const [truthy, falsy] = partition([true, false, true, false], (v) => v);
      expect(truthy).toEqual([true, true]);
      expect(falsy).toEqual([false, false]);
    });

    it('works with nullable values', () => {
      const values = [1, null, 2, null, 3];
      const [nonNull, nulls] = partition(values, (v) => v !== null);
      expect(nonNull).toEqual([1, 2, 3]);
      expect(nulls).toEqual([null, null]);
    });

    it('returns a tuple of two independent arrays', () => {
      const [a, b] = partition([1, 2, 3], (n) => n > 1);
      a.push(99);
      expect(b).toEqual([1]);
    });
  });
});
