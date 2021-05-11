import { LayoutItem, Position, PositionParams } from '../types';
import { clamp } from './calclate';

type TransformStyle = {
  transform: string;
  WebkitTransform: string;
  width: number;
  height: number;
};

export function setTransform({ top, left, width, height }: Position): TransformStyle {
  // Replace unitless items with px
  const translate = `translate(${left}px,${top}px)`;
  return {
    transform: translate,
    WebkitTransform: translate,
    width,
    height,
  };
}

export function getWH(item: LayoutItem, positionParams: PositionParams) {
  const { cols } = positionParams;
  const { minW = 1, maxW = cols, minH = 1, maxH = Infinity, w, h } = item;
  const _minW = Math.max(minW, 1);
  const _maxW = Math.min(maxW, cols - item.x);

  return {
    w: clamp(w, _minW, _maxW),
    h: clamp(h, minH, maxH),
  };
}
