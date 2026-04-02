import { ResizeCallbackData } from 'react-resizable';
import { LayoutItem } from '../../../types';
import { minus, plus } from '../../../utils/number-precision';

export type ResizeBounds = {
  containerWidth: number;
  containerHeight: number;
  initialRight: number;
  initialBottom: number;
};

/**
 * Convert react-resizable callback data into the next absolute-position layout item.
 * The result must be based on the latest x/y after handle correction; otherwise
 * left/top resizing can be incorrectly clamped against the old position.
 */
export function calculateResizedItem(
  item: LayoutItem,
  callbackData: ResizeCallbackData,
  bounds: ResizeBounds
): LayoutItem {
  const { size, handle } = callbackData;
  const { containerWidth, containerHeight, initialRight, initialBottom } = bounds;
  const nextItem = {
    ...item,
    w: Math.round(size.width),
    h: Math.round(size.height),
  };

  // Moving the north edge changes y and height while the bottom edge stays anchored.
  if (handle.indexOf('n') > -1) {
    const nextY = item.y + minus(item.h, size.height);

    if (nextY < 0) {
      nextItem.y = 0;
      nextItem.h = Math.max(initialBottom, plus(nextItem.h, nextY));
    } else {
      nextItem.y = nextY;
    }
  }

  // Moving the west edge changes x and width while the right edge stays anchored.
  if (handle.indexOf('w') > -1) {
    const nextX = item.x + minus(item.w, size.width);

    if (nextX < 0) {
      nextItem.x = 0;
      nextItem.w = Math.max(initialRight, plus(nextItem.w, nextX));
    } else {
      nextItem.x = nextX;
    }
  }

  if (nextItem.x + nextItem.w > containerWidth) {
    nextItem.w = minus(containerWidth, nextItem.x);
  }

  if (nextItem.y + nextItem.h > containerHeight) {
    nextItem.h = minus(containerHeight, nextItem.y);
  }

  return nextItem;
}
