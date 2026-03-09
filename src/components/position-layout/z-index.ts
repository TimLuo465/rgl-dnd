import { LayoutItem } from '../../types';

/**
 * PositionLayout 层级规则核心模块
 *
 * 设计目标：
 * 1. zIndex 始终是正整数，最小值为 1。
 * 2. 每次层级操作后都归一化为连续值 1..N，避免重复和膨胀。
 * 3. “上移/下移”语义为与相邻层交换，而不是简单 +/-1。
 */
export const MIN_Z_INDEX = 1;

export type ZIndexAction = 'forward' | 'backward' | 'front' | 'back';

export type ZIndexRange = {
  min: number;
  max: number;
};

/** 兜底并规范 zIndex，确保下游计算统一使用有效层级值。 */
export function normalizeZIndex(zIndex?: number) {
  if (!Number.isFinite(zIndex)) {
    return MIN_Z_INDEX;
  }

  return Math.max(MIN_Z_INDEX, Math.round(zIndex as number));
}

type ZIndexRecord = {
  item: LayoutItem;
  order: number;
  zIndex: number;
};

/**
 * 先按业务层级排序，层级相同则按原数组顺序稳定排序。
 * 这样可以在旧数据存在重复 zIndex 时，得到确定性的归一化结果。
 */
function getNormalizedRecords(layouts: LayoutItem[] = []) {
  const records = layouts.map((item, order) => ({
    item,
    order,
    zIndex: normalizeZIndex(item.zIndex),
  }));

  records.sort((a, b) => {
    if (a.zIndex === b.zIndex) {
      return a.order - b.order;
    }

    return a.zIndex - b.zIndex;
  });

  return records;
}

export function getZIndexRange(layouts: LayoutItem[] = []): ZIndexRange {
  if (!layouts.length) {
    return {
      min: MIN_Z_INDEX,
      max: MIN_Z_INDEX,
    };
  }

  return layouts.reduce(
    (range, item) => {
      const current = normalizeZIndex(item.zIndex);

      return {
        min: Math.min(range.min, current),
        max: Math.max(range.max, current),
      };
    },
    { min: Infinity, max: -Infinity } as ZIndexRange
  );
}

/**
 * 将任意 zIndex 集合压缩为连续区间 1..N，保证唯一且无空洞。
 * 返回顺序是按层级从低到高。
 */
export function normalizeZIndexLayouts(layouts: LayoutItem[] = []) {
  const records = getNormalizedRecords(layouts);

  return records.map((record, index) => ({
    ...record.item,
    zIndex: index + MIN_Z_INDEX,
  }));
}

/** 新拖入元素默认插入到最顶层（最大层级 + 1）。 */
export function getDefaultDroppedZIndex(layouts: LayoutItem[] = []) {
  if (!layouts.length) {
    return MIN_Z_INDEX;
  }

  const { max } = getZIndexRange(layouts);

  return max + 1;
}

/** 执行层级动作，但不直接写回 zIndex。写回统一由 applyZIndexAction 完成。 */
function moveByAction(records: ZIndexRecord[], index: number, action: ZIndexAction) {
  const isTop = index === records.length - 1;
  const isBottom = index === 0;
  const next = records.slice();

  if (action === 'forward') {
    if (isTop) return null;

    const tmp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = tmp;
    return next;
  }

  if (action === 'backward') {
    if (isBottom) return null;

    const tmp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = tmp;
    return next;
  }

  if (action === 'front') {
    if (isTop) return null;

    const [target] = next.splice(index, 1);
    next.push(target);
    return next;
  }

  if (isBottom) return null;

  const [target] = next.splice(index, 1);
  next.unshift(target);
  return next;
}

/**
 * 对目标元素执行层级动作并返回“归一化后的完整变更结果”。
 *
 * 返回值：
 * - `null`：无变化（目标不存在，或已经在边界层级）
 * - `LayoutItem[]`：所有受影响元素的新层级（已连续化为 1..N）
 */
export function applyZIndexAction(
  layouts: LayoutItem[] = [],
  itemId: string,
  action: ZIndexAction
) {
  const normalized = getNormalizedRecords(layouts);
  const targetIndex = normalized.findIndex((record) => record.item.i === itemId);

  if (targetIndex < 0) {
    return null;
  }

  const moved = moveByAction(normalized, targetIndex, action);
  if (!moved) {
    return null;
  }

  return moved.map((record, index) => ({
    ...record.item,
    zIndex: index + MIN_Z_INDEX,
  }));
}
