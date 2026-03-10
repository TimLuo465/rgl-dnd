import { DEFAULT_ITEMTYPE, DEFAULT_POSITION_LAYOUT } from '../constants';
import { DragItem, DroppingItem, PositionParams } from '../types';
import { calcGridItemPosition, calcWH } from './calculate';

type GridSize = {
  w: number;
  h: number;
};

type NumberSize = {
  width: number;
  height: number;
};

type PixelSize = {
  width: number;
  height: number;
};

function normalizeGridSize(width: number, height: number): GridSize {
  return {
    w: Math.max(Math.round(width), 1),
    h: Math.max(Math.round(height), 1),
  };
}

function toNumberSize(width: unknown, height: unknown): NumberSize | null {
  const w = Number(width);
  const h = Number(height);

  if (!Number.isFinite(w) || !Number.isFinite(h)) {
    return null;
  }

  return {
    width: w,
    height: h,
  };
}

function getGridSizeFromDroppingItem(droppingItem?: DroppingItem): GridSize | null {
  if (!droppingItem) return null;

  const size = toNumberSize(droppingItem.w, droppingItem.h);
  if (!size) return null;

  return normalizeGridSize(size.width, size.height);
}

function getGridSizeFromDragItem(item: DragItem): GridSize | null {
  const size = toNumberSize(item.w, item.h);
  if (!size) return null;

  return normalizeGridSize(size.width, size.height);
}

function getNumberSizeFromItemOrDropping(item: DragItem, droppingItem?: DroppingItem): NumberSize | null {
  const dragSize = toNumberSize(item.w, item.h);
  if (dragSize) return dragSize;

  if (!droppingItem) return null;
  return toNumberSize(droppingItem.w, droppingItem.h);
}

function getDraggingGridSizeByType(
  item: DragItem,
  itemType: string | undefined,
  droppingItem: DroppingItem | undefined,
  positionParams: PositionParams
): GridSize | null {
  if (itemType === DEFAULT_ITEMTYPE) {
    return getGridSizeFromDroppingItem(droppingItem);
  }

  if (itemType === DEFAULT_POSITION_LAYOUT) {
    return calcDraggingItemGridSize(item, droppingItem, positionParams);
  }

  return getGridSizeFromDragItem(item) || getGridSizeFromDroppingItem(droppingItem);
}

function gridSizeToPixelSize(size: GridSize, positionParams: PositionParams): PixelSize | null {
  const position = calcGridItemPosition(positionParams, 0, 0, size.w, size.h);
  const width = Number(position.width);
  const height = Number(position.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return {
    width,
    height,
  };
}

export function calcDraggingItemGridSize(
  item: DragItem,
  droppingItem: DroppingItem | undefined,
  positionParams: PositionParams
): GridSize | null {
  const size = getNumberSizeFromItemOrDropping(item, droppingItem);
  if (!size) return null;

  const { w, h } = calcWH(positionParams, size.width, size.height, 0, 0, 0);

  return normalizeGridSize(w, h);
}

export function calcDraggingItemPixelSize(
  item: DragItem,
  itemType: string | undefined,
  droppingItem: DroppingItem | undefined,
  positionParams: PositionParams
): PixelSize | null {
  const size = getDraggingGridSizeByType(item, itemType, droppingItem, positionParams);
  if (!size) return null;

  return gridSizeToPixelSize(size, positionParams);
}
