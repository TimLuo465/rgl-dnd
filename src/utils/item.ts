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

export function getDragOffset() {
  const e = window.event as DragEvent;

  if (!e) return { x: 0, y: 0 };

  const { pageX, pageY, target } = e;
  const targetEl = target as HTMLElement;
  const { left, top } = targetEl.getBoundingClientRect();

  return {
    x: pageX - left,
    y: pageY - top,
  };
}
