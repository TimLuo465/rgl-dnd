import { ResizeCallbackData } from 'react-resizable';
import { LayoutItem } from '../../../types';
import { calculateResizedItem, ResizeBounds } from './resize';

const createItem = (overrides: Partial<LayoutItem> = {}): LayoutItem => ({
  i: 'position-item',
  x: 100,
  y: 80,
  w: 120,
  h: 90,
  ...overrides,
});

const createResizeData = (
  handle: ResizeCallbackData['handle'],
  width: number,
  height: number
): ResizeCallbackData =>
  ({
    handle,
    node: null,
    size: {
      width,
      height,
    },
  } as ResizeCallbackData);

const createBounds = (overrides: Partial<ResizeBounds> = {}): ResizeBounds => ({
  containerWidth: 600,
  containerHeight: 400,
  initialRight: 220,
  initialBottom: 170,
  ...overrides,
});

describe('position-layout resize calculation', () => {
  it('keeps the resized item aligned when stretching from the west edge', () => {
    const item = createItem({
      x: 400,
      y: 80,
      w: 50,
      h: 90,
    });

    expect(
      calculateResizedItem(
        item,
        createResizeData('w', 150, item.h),
        createBounds({
          containerWidth: 500,
          initialRight: item.x + item.w,
          initialBottom: item.y + item.h,
        })
      )
    ).toEqual({
      ...item,
      x: 300,
      y: 80,
      w: 150,
      h: 90,
    });
  });

  it('keeps the resized item aligned when stretching from the north edge', () => {
    const item = createItem({
      x: 80,
      y: 300,
      w: 120,
      h: 50,
    });

    expect(
      calculateResizedItem(
        item,
        createResizeData('n', item.w, 150),
        createBounds({
          containerHeight: 500,
          initialRight: item.x + item.w,
          initialBottom: item.y + item.h,
        })
      )
    ).toEqual({
      ...item,
      x: 80,
      y: 200,
      w: 120,
      h: 150,
    });
  });

  it('clamps west resizing against the container left edge while keeping the right edge anchored', () => {
    const item = createItem({
      x: 30,
      y: 80,
      w: 120,
      h: 90,
    });

    expect(
      calculateResizedItem(
        item,
        createResizeData('w', 200, item.h),
        createBounds({
          initialRight: item.x + item.w,
          initialBottom: item.y + item.h,
        })
      )
    ).toEqual({
      ...item,
      x: 0,
      y: 80,
      w: 150,
      h: 90,
    });
  });
});
