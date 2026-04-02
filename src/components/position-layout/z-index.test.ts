import { LayoutItem } from '../../types';
import {
  applyZIndexAction,
  getDefaultDroppedZIndex,
  getZIndexRange,
  MIN_Z_INDEX,
  normalizeZIndex,
  normalizeZIndexLayouts,
} from './z-index';

const createItem = (i: string, zIndex?: number): LayoutItem => ({
  i,
  x: 0,
  y: 0,
  w: 10,
  h: 10,
  zIndex,
});

const assertContinuousAndUnique = (items: LayoutItem[]) => {
  const zIndexList = items.map((item) => Number(item.zIndex));
  const unique = new Set(zIndexList);

  expect(unique.size).toBe(items.length);
  expect(Math.min(...zIndexList)).toBe(MIN_Z_INDEX);
  expect(Math.max(...zIndexList)).toBe(items.length);

  const sorted = zIndexList.slice().sort((a, b) => a - b);
  expect(sorted).toEqual(Array.from({ length: items.length }, (_, index) => index + MIN_Z_INDEX));
};

describe('z-index utils', () => {
  describe('normalizeZIndex', () => {
    it('returns MIN_Z_INDEX for invalid values', () => {
      expect(normalizeZIndex(undefined)).toBe(1);
      expect(normalizeZIndex(null as any)).toBe(1);
      expect(normalizeZIndex(NaN)).toBe(1);
      expect(normalizeZIndex(0)).toBe(1);
      expect(normalizeZIndex(-10)).toBe(1);
    });

    it('rounds decimal values to nearest integer', () => {
      expect(normalizeZIndex(1.2)).toBe(1);
      expect(normalizeZIndex(1.6)).toBe(2);
    });
  });

  describe('normalizeZIndexLayouts', () => {
    it('normalizes duplicated and unordered z-index to unique continuous values', () => {
      const source = [
        createItem('a', 3),
        createItem('b', 1),
        createItem('c', 1),
        createItem('d'),
      ];

      const normalized = normalizeZIndexLayouts(source);

      expect(normalized.map((item) => item.i)).toEqual(['b', 'c', 'd', 'a']);
      expect(normalized.map((item) => item.zIndex)).toEqual([1, 2, 3, 4]);
      assertContinuousAndUnique(normalized);
    });
  });

  describe('getDefaultDroppedZIndex', () => {
    it('returns MIN_Z_INDEX when layouts are empty', () => {
      expect(getDefaultDroppedZIndex([])).toBe(1);
    });

    it('returns max + 1 for non-empty layouts', () => {
      const layouts = [createItem('a', 2), createItem('b', 5), createItem('c', 3)];
      expect(getDefaultDroppedZIndex(layouts)).toBe(6);
    });
  });

  describe('getZIndexRange', () => {
    it('returns default range for empty layouts', () => {
      expect(getZIndexRange([])).toEqual({ min: 1, max: 1 });
    });

    it('calculates min/max with normalized lower bound', () => {
      const layouts = [createItem('a', -3), createItem('b', 7), createItem('c', 2)];
      expect(getZIndexRange(layouts)).toEqual({ min: 1, max: 7 });
    });
  });

  describe('applyZIndexAction', () => {
    const baseLayouts = [createItem('a', 1), createItem('b', 2), createItem('c', 3)];

    it('moves item forward by swapping with adjacent upper layer', () => {
      const next = applyZIndexAction(baseLayouts, 'b', 'forward');

      expect(next?.map((item) => item.i)).toEqual(['a', 'c', 'b']);
      expect(next?.map((item) => item.zIndex)).toEqual([1, 2, 3]);
      assertContinuousAndUnique(next!);
    });

    it('moves item backward by swapping with adjacent lower layer', () => {
      const next = applyZIndexAction(baseLayouts, 'b', 'backward');

      expect(next?.map((item) => item.i)).toEqual(['b', 'a', 'c']);
      expect(next?.map((item) => item.zIndex)).toEqual([1, 2, 3]);
      assertContinuousAndUnique(next!);
    });

    it('moves item to front', () => {
      const next = applyZIndexAction(baseLayouts, 'a', 'front');

      expect(next?.map((item) => item.i)).toEqual(['b', 'c', 'a']);
      expect(next?.map((item) => item.zIndex)).toEqual([1, 2, 3]);
      assertContinuousAndUnique(next!);
    });

    it('moves item to back', () => {
      const next = applyZIndexAction(baseLayouts, 'c', 'back');

      expect(next?.map((item) => item.i)).toEqual(['c', 'a', 'b']);
      expect(next?.map((item) => item.zIndex)).toEqual([1, 2, 3]);
      assertContinuousAndUnique(next!);
    });

    it('returns null when target item does not exist', () => {
      expect(applyZIndexAction(baseLayouts, 'missing', 'front')).toBeNull();
    });

    it('returns null on boundary operations', () => {
      expect(applyZIndexAction(baseLayouts, 'c', 'forward')).toBeNull();
      expect(applyZIndexAction(baseLayouts, 'a', 'backward')).toBeNull();
      expect(applyZIndexAction(baseLayouts, 'c', 'front')).toBeNull();
      expect(applyZIndexAction(baseLayouts, 'a', 'back')).toBeNull();
    });

    it('keeps id set unchanged and invariants valid for all non-null results', () => {
      const source = [
        createItem('a', 3),
        createItem('b', 1),
        createItem('c', 1),
        createItem('d', 9),
      ];
      const sourceIds = source.map((item) => item.i).sort();

      const actions: Array<'forward' | 'backward' | 'front' | 'back'> = [
        'forward',
        'backward',
        'front',
        'back',
      ];

      source.forEach((item) => {
        actions.forEach((action) => {
          const next = applyZIndexAction(source, item.i, action);

          if (!next) return;

          expect(next.map((i) => i.i).sort()).toEqual(sourceIds);
          assertContinuousAndUnique(next);
        });
      });
    });
  });
});
