import { Position } from '../types';

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
