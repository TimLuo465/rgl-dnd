import { isGuideLine } from './snap/utils';
import { BoundingBox } from './types';

export default class DragCore {
  private dropSource: HTMLElement | null = null;

  private _bounds: BoundingBox | null = null;

  private _snapRects: BoundingBox[] | null = null;

  /** 优化hover时一直读取bounds的性能 */
  private needUpdateBounds = true;

  private updateBoundsTimer: number | null = null;

  get bounds() {
    return this._bounds;
  }

  get snapRects() {
    return this._snapRects;
  }

  init(dropSource: HTMLElement) {
    this.dropSource = dropSource;
  }

  calcLayout(el?: HTMLElement) {
    this.calcBounds();
    this.calcSnapRects(el);
  }

  calcBounds() {
    if (!this._bounds || this.needUpdateBounds) {
      this._bounds = this.dropSource.getBoundingClientRect();

      // bounds不需要一直更新，只有在多个layout间切换（droppable位置发生变化）和刚hover到layout（bounds没有值）时才需要更新
      if (!this.updateBoundsTimer) {
        this.updateBoundsTimer = setTimeout(() => {
          this.needUpdateBounds = false;
        }, 200) as any;
      }
    }
  }

  calcSnapRects(currChild?: HTMLElement) {
    const children = Array.from(this.dropSource.children);
    const { x: bx, y: by, width, height } = this._bounds;
    const snapRects: BoundingBox[] = [{ x: 0, y: 0, width, height }];

    children.forEach((_child) => {
      const child = _child as HTMLElement;

      if (child === currChild || isGuideLine(child)) return;

      const rect = child.getBoundingClientRect();

      snapRects.push({
        x: rect.x - bx,
        y: rect.y - by,
        width: rect.width,
        height: rect.height,
      });
    });

    this._snapRects = snapRects;
  }

  reset() {
    clearTimeout(this.updateBoundsTimer);

    this._bounds = null;
    this._snapRects = null;
    this.needUpdateBounds = true;
    this.updateBoundsTimer = null;
  }
}
