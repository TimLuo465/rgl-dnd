import { ItemStates, LayoutItem, LayoutProps, Position, PositionParams } from '../types';

export function getContainerPadding(containerPadding: number[]): [number, number, number, number] {
  const len = containerPadding.length;
  const [top, right, bottom, left] = containerPadding;

  if (len === 1) {
    return [top, top, top, top];
  } else if (len === 2) {
    return [top, right, top, right];
  } else if (len === 3) {
    return [top, right, bottom, right];
  }

  return [top, right, bottom, left];
}

export function calcCP(containerPadding, axis: 'x' | 'y') {
  const cp = getContainerPadding(containerPadding);
  const [top, right, bottom, left] = cp;

  if (axis === 'x') {
    return right + left;
  }

  return top + bottom;
}

// Helper for generating column width
export function calcGridColWidth(positionParams: PositionParams): number {
  const { margin, containerPadding, containerWidth, cols } = positionParams;
  const cp = calcCP(containerPadding, 'x');

  return (containerWidth - margin[0] * (cols - 1) - cp) / cols;
}

// This can either be called:
// calcGridItemWHPx(w, colWidth, margin[0])
// or
// calcGridItemWHPx(h, rowHeight, margin[1])
export function calcGridItemWHPx(
  gridUnits: number,
  colOrRowSize: number,
  marginPx: number
): number {
  // 0 * Infinity === NaN, which causes problems with resize contraints
  if (!Number.isFinite(gridUnits)) return gridUnits;
  return Math.round(colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx);
}

/**
 * Return position on the page given an x, y, w, h.
 * left, top, width, height are all in pixels.
 * @param  {PositionParams} positionParams  Parameters of grid needed for coordinates calculations.
 * @param  {Number}  x                      X coordinate in grid units.
 * @param  {Number}  y                      Y coordinate in grid units.
 * @param  {Number}  w                      W coordinate in grid units.
 * @param  {Number}  h                      H coordinate in grid units.
 * @return {Position}                       Object containing coords.
 */
export function calcGridItemPosition(
  positionParams: PositionParams,
  x: number,
  y: number,
  w: number,
  h: number,
  state?: ItemStates
): Position {
  const { margin, containerPadding, rowHeight } = positionParams;
  const colWidth = calcGridColWidth(positionParams);
  const [top, , , left] = getContainerPadding(containerPadding);
  const out = {} as Position;
  // If resizing, use the exact width and height as returned from resizing callbacks.
  if (state && state.resizing) {
    out.width = Math.round(state.resizing.width);
    out.height = Math.round(state.resizing.height);
  }
  // Otherwise, calculate from grid units.
  else {
    out.width = calcGridItemWHPx(w, colWidth, margin[0]);
    out.height = calcGridItemWHPx(h, rowHeight, margin[1]);
  }

  // If dragging, use the exact width and height as returned from dragging callbacks.
  // if (state && state.dragging) {
  //   out.top = Math.round(state.dragging.top);
  //   out.left = Math.round(state.dragging.left);
  // }
  // Otherwise, calculate from grid units.
  // else {
  out.top = Math.round((rowHeight + margin[1]) * y + top);
  out.left = Math.round((colWidth + margin[0]) * x + left);
  // }

  return out;
}

// Similar to _.clamp
export function clamp(num: number, lowerBound: number, upperBound: number): number {
  return Math.max(Math.min(num, upperBound), lowerBound);
}

export function calcXY(
  positionParams: PositionParams,
  top: number,
  left: number,
  w: number,
  h: number
): { x: number; y: number } {
  const { margin, cols, rowHeight, maxRows } = positionParams;
  const colWidth = calcGridColWidth(positionParams);

  // left = colWidth * x + margin * (x + 1)
  // l = cx + m(x+1)
  // l = cx + mx + m
  // l - m = cx + mx
  // l - m = x(c + m)
  // (l - m) / (c + m) = x
  // x = (left - margin) / (coldWidth + margin)
  let x = Math.round((left - margin[0]) / (colWidth + margin[0]));
  let y = Math.round((top - margin[1]) / (rowHeight + margin[1]));

  // Capping
  x = clamp(x, 0, cols - w);
  y = clamp(y, 0, maxRows - h);
  return { x, y };
}

/**
 * Given a height and width in pixel values, calculate grid units.
 * @param  {PositionParams} positionParams  Parameters of grid needed for coordinates calcluations.
 * @param  {Number} height                  Height in pixels.
 * @param  {Number} width                   Width in pixels.
 * @param  {Number} x                       X coordinate in grid units.
 * @param  {Number} y                       Y coordinate in grid units.
 * @return {Object}                         w, h as grid units.
 */
export function calcWH(
  positionParams: PositionParams,
  width: number,
  height: number,
  x: number,
  y: number,
  leftSpacing: number
): { w: number; h: number } {
  const { margin, maxRows, cols, rowHeight } = positionParams;
  const colWidth = calcGridColWidth(positionParams);

  // width = colWidth * w - (margin * (w - 1))
  // ...
  // w = (width + margin) / (colWidth + margin)
  let w = (width + margin[0]) / (colWidth + margin[0]);
  // Math.round will cause rowHeight not work well
  // Math.round((height + margin[1]) / (rowHeight + margin[1]));
  let h = (height + margin[1]) / (rowHeight + margin[1]);

  // Capping
  w = clamp(w, 0, cols - x + leftSpacing);
  h = clamp(h, 0, maxRows - y);
  return { w, h };
}

export function calcH(positionParams: PositionParams, height: number, y: number): number {
  const { margin, maxRows, rowHeight } = positionParams;

  // Math.round will cause rowHeight not work well
  // Math.round((height + margin[1]) / (rowHeight + margin[1]));
  let h = (height + margin[1]) / (rowHeight + margin[1]);
  // Capping
  h = clamp(h, 0, maxRows - y);
  return h;
}

/**
 * calculate layout szie when drag group item to another group
 */
export function calcLayoutByProps(
  layout: LayoutItem,
  currProps: LayoutProps,
  props: LayoutProps
): LayoutItem {
  const { cols, rowHeight, margin } = currProps;
  const { rowHeight: _rowHeight, margin: _margin } = props;
  const w = Math.round((layout.w * cols) / props.cols);
  const h = Math.round((layout.h * (_rowHeight + _margin[1])) / (rowHeight + margin[1]));

  return {
    ...layout,
    w: Math.max(w, 1),
    h: Math.max(h, 1),
  };
}

export function calcLeftSpacing(layouts: LayoutItem[], item: LayoutItem): number {
  const leftItems = layouts.filter(
    (lay) =>
      lay.i !== item.i &&
      lay.y <= item.y + item.h &&
      lay.y + lay.h >= item.y &&
      lay.x + lay.w <= item.x
  );

  let leftBoundary = 0;
  leftItems.forEach((it) => {
    leftBoundary = Math.max(it.x + it.w, leftBoundary);
  });

  return item.x - leftBoundary;
}
