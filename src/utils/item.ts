import { LayoutItem, Position, PositionParams } from '../types';
import { clamp } from './calculate';

type TransformStyle = {
  transform: string;
  width: number;
  height: number | 'auto';
};

export function setTransform({ top, left, width, height }: Position): TransformStyle {
  // Replace unitless items with px
  const translate = `translate(${left}px,${top}px)`;
  return {
    transform: translate,
    width,
    height,
  };
}

export function getWH(item: LayoutItem, positionParams: PositionParams, leftSpacing: number) {
  const { cols } = positionParams;
  const { minW = 1, maxW = cols, minH = 1, maxH = Infinity, w, h } = item;
  const _minW = Math.max(minW, 1);
  const _maxW = Math.min(maxW, cols - item.x + leftSpacing);

  return {
    w: clamp(w, _minW, _maxW),
    h: clamp(h, minH, maxH),
  };
}

/**
 * 获取拖拽时的偏移量，按照鼠标拖拽时的位置来进行位置变动
 * @returns
 */
export function getDragOffset(sourceEl?: HTMLElement | null, event?: MouseEvent | DragEvent) {
  const e =
    event ||
    ((typeof window !== 'undefined' ? (window.event as MouseEvent | DragEvent | undefined) : null) ||
      null);
  const targetEl = sourceEl || ((e?.target as HTMLElement) || null);

  if (!targetEl || !e) {
    return { x: 0, y: 0 };
  }

  const pageX = Number.isFinite((e as MouseEvent).pageX)
    ? (e as MouseEvent).pageX
    : (e as MouseEvent).clientX + window.scrollX;
  const pageY = Number.isFinite((e as MouseEvent).pageY)
    ? (e as MouseEvent).pageY
    : (e as MouseEvent).clientY + window.scrollY;
  const { left, top } = targetEl.getBoundingClientRect();

  return {
    x: pageX - (left + window.scrollX),
    y: pageY - (top + window.scrollY),
  };
}
