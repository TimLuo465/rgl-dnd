import { LayoutItem, PositionParams, Size } from '../types';
import { calcGridColWidth, calcGridItemWHPx } from '../utils';
import { ResizeSnapLineRef } from './ResizeSnapLine';

type OptsType = {
  positionParams: PositionParams;
  onResize: (data: LayoutItem, w: number, h: number, direction: string) => void;
};

type SetResizing = (size: Size) => void;

export default class SnapLine {
  snaplineRef: React.RefObject<ResizeSnapLineRef>;

  // 当前正在拖拽的layoutItem
  resizeItem: LayoutItem;

  // 记录其他layoutItem 的数据
  layouts: LayoutItem[] = [];

  // 记录最临近的layoutItem
  lastLayoutItem: LayoutItem;

  // 记录上次吸附的高度
  preSnapLayoutHeight: number;

  setResizing: SetResizing;

  constructor({ snaplineRef }) {
    this.snaplineRef = snaplineRef;
  }

  // 根据当前正在拖拽的layout 对比 记录的临近的layoutItem，不需要实时去对比获取
  getLastLayoutItem = (direction: string) => {
    if (this.lastLayoutItem) {
      if (
        direction === 'n' &&
        this.lastLayoutItem.h + this.lastLayoutItem.y < this.resizeItem.y + this.resizeItem.h
      ) {
        return this.lastLayoutItem;
      }
      if (
        direction === 's' &&
        this.lastLayoutItem.h + this.lastLayoutItem.y > this.resizeItem.y + this.resizeItem.h
      ) {
        return this.lastLayoutItem;
      }
    }

    const layouts = direction === 'n' ? this.layouts.slice().reverse() : this.layouts;

    const lastLayoutItemIndex = layouts.findIndex((layout) => {
      return direction === 'n'
        ? layout.y + layout.h < this.resizeItem.y + this.resizeItem.h
        : layout.y + layout.h > this.resizeItem.y + this.resizeItem.h;
    });

    this.lastLayoutItem = layouts[lastLayoutItemIndex];

    return this.lastLayoutItem;
  };

  resizeStart(resizeItem: LayoutItem, layouts: LayoutItem[], setResizing: SetResizing) {
    const { i, x, y, w, h } = resizeItem;

    let minX = x;
    let maxX = x + w;

    // 获取当前组件向上下拖拽时，能够对的layouts
    this.layouts = layouts
      .sort((l1, l2) => l1.y - l2.y)
      .filter((layout) => {
        const canJustify =
          layout.i !== i && layout.y >= y && (layout.x + layout.w <= minX || layout.x >= maxX);

        if (layout.i !== i && canJustify && layout.y >= y + h) {
          minX = Math.min(minX, layout.x);
          maxX = Math.max(maxX, layout.x + layout.w);
        }

        return canJustify;
      })
      .sort((l1, l2) => l1.h + l1.y - (l2.h + l2.y));

    this.resizeItem = { ...resizeItem };
    this.setResizing = setResizing;
  }

  reize(size: { w: number; h: number }, opts: OptsType) {
    const { positionParams, onResize } = opts;
    const { w, h } = size;
    const { rowHeight, margin } = positionParams;

    if (this.resizeItem.h !== h) {
      const direction = this.resizeItem.h > h ? 'n' : 's';

      this.resizeItem = { ...this.resizeItem, w, h };

      // 根据高度变化，找最临近高度变化的item
      const lastItem = this.getLastLayoutItem(direction);

      let height;

      if (lastItem) {
        height = calcGridItemWHPx(h + this.resizeItem.y, rowHeight, margin[1]);

        const lastItemHeight = calcGridItemWHPx(lastItem.h + lastItem.y, rowHeight, margin[1]);

        // 判断最临近Item 跟 现在拖拽Item 的高度差，如果小于等于15px，显示吸附线
        if (Math.abs(height - lastItemHeight) <= 15) {
          const newH = (lastItemHeight + margin[1]) / (rowHeight + margin[1]) - this.resizeItem.y;
          const colWidth = calcGridColWidth(positionParams);

          this.resizeItem = { ...this.resizeItem, w, h: newH };

          // 更新吸附线样式
          this.snaplineRef.current.updateSnapLine(
            {
              x: Math.min(this.resizeItem.x, lastItem.x),
              y: lastItem.y + lastItem.h,
              w:
                Math.abs(this.resizeItem.x - lastItem.x) +
                (this.resizeItem.x < lastItem.x ? lastItem.w : this.resizeItem.w),
              h: 0,
              i: '0',
            },
            positionParams
          );

          this.setResizing({
            width: calcGridItemWHPx(w, colWidth, margin[0]),
            height: calcGridItemWHPx(newH, rowHeight, margin[1]),
          });

          onResize(this.resizeItem, w, newH, direction);

          this.preSnapLayoutHeight = lastItemHeight;

          return;
        }
      }

      if (this.preSnapLayoutHeight) {
        height = height || calcGridItemWHPx(h + this.resizeItem.y, rowHeight, margin[1]);

        if (Math.abs(height - this.preSnapLayoutHeight) >= 10) {
          this.snaplineRef.current.updateSnapLine(null);
          this.preSnapLayoutHeight = 0;
        }
      }
    }
  }

  resizeStop() {
    // 更新吸附线样式
    this.snaplineRef.current.updateSnapLine(null);
    this.preSnapLayoutHeight = 0;
  }
}
