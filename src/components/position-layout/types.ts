export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GuideLine = {
  type: 'vertical' | 'horizontal';
  position: number;
};
