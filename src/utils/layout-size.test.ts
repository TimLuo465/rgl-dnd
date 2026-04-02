import {
  DEFAULT_FLOW_LAYOUT,
  DEFAULT_ITEMTYPE,
  DEFAULT_POSITION_LAYOUT,
} from '../constants';
import { DroppingItem, PositionParams } from '../types';
import { calcGridItemPosition } from './calculate';
import { calcDraggingItemPixelSize, resolveDraggingItemGridSize } from './layout-size';

const positionParams: PositionParams = {
  cols: 12,
  containerPadding: [0, 0],
  containerWidth: 1200,
  margin: [10, 10],
  maxRows: 100,
  rowHeight: 10,
};

const droppingItem: DroppingItem = {
  i: '__dropping__',
  w: 3,
  h: 2,
};

describe('layout-size drag size resolution', () => {
  it('preserves flow item grid size when dragging back into grid layout', () => {
    const draggedItem = {
      i: 'flow-item',
      w: 7,
      h: 5,
    };

    expect(
      resolveDraggingItemGridSize(draggedItem, DEFAULT_FLOW_LAYOUT, droppingItem, positionParams)
    ).toEqual({
      w: 7,
      h: 5,
    });
  });

  it('falls back to droppingItem size for palette items', () => {
    const draggedItem = {
      i: 'palette-item',
    };

    expect(
      resolveDraggingItemGridSize(draggedItem, DEFAULT_ITEMTYPE, droppingItem, positionParams)
    ).toEqual({
      w: droppingItem.w,
      h: droppingItem.h,
    });
  });

  it('uses the preserved flow size when converting back to pixel size', () => {
    const draggedItem = {
      i: 'flow-item',
      w: 7,
      h: 5,
    };
    const expected = calcGridItemPosition(
      positionParams,
      0,
      0,
      draggedItem.w,
      draggedItem.h
    );

    expect(
      calcDraggingItemPixelSize(draggedItem, DEFAULT_FLOW_LAYOUT, droppingItem, positionParams)
    ).toEqual({
      width: Number(expected.width),
      height: Number(expected.height),
    });
  });

  it('keeps position layout items using pixel-to-grid conversion', () => {
    const draggedItem = {
      i: 'position-item',
      w: 330,
      h: 90,
    };

    expect(
      resolveDraggingItemGridSize(
        draggedItem,
        DEFAULT_POSITION_LAYOUT,
        droppingItem,
        positionParams
      )
    ).toEqual({
      w: 3,
      h: 5,
    });
  });
});
