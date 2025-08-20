import { LayoutItem, PositionParams } from '../types';
import { calcGridItemPosition, isLayoutChange, setTransform } from '../utils';
import { ResizeSnapLineRef } from './ResizeSnapLine';
import SnapLine from './SnapLine';

type OptsType = {
  enableSnapLine: boolean;
  snaplineRef: React.RefObject<ResizeSnapLineRef>;
  scrollContainer: HTMLElement;
  getPositionParams: () => PositionParams;
};

export default class Engine {
  container: HTMLElement;

  scrollContainer: HTMLElement;

  getPositionParams: () => PositionParams;

  draggingItem: LayoutItem | null = null;

  prevLayouts: Record<string, Pick<LayoutItem, 'w' | 'h' | 'x' | 'y'>> = {};

  layoutDomCache: Record<string, HTMLElement> = {};

  /** 视窗范围内Layout Item 的可见状态 */
  itemsVisibleMap: Record<string, boolean> = {};

  /** 吸附线 */
  snapline: SnapLine | null = null;

  init(container: HTMLElement, opts: OptsType) {
    this.container = container;
    this.getPositionParams = opts.getPositionParams;
    this.scrollContainer = opts.scrollContainer;

    if (opts.enableSnapLine) {
      this.snapline = new SnapLine({ snaplineRef: opts.snaplineRef });
    }
  }

  updateLayouts(layouts: LayoutItem[]) {
    const positionParams = this.getPositionParams();

    if (positionParams.containerWidth === 0) {
      return;
    }

    const viewportArea = this.calcScrollArea(positionParams);

    layouts.forEach((l) => {
      if (this.draggingItem?.i === l.i) {
        const { i, x, y, w, h } = l;

        this.prevLayouts[i] = { x, y, w, h };
        return;
      }

      this.updateLayoutItemPosition(l, positionParams, viewportArea);
    });
  }

  /**
   * 当拖拽layout item时，item需要隐藏，由placeholder代替
   * @param draggingItem 拖拽的layout item对象
   * @param isShow 是否显示对应的layout item
   * @returns
   */
  toggleDraggingItem(draggingItem: LayoutItem | null, isShow: boolean) {
    const dom = this.getLayoutDom(draggingItem) as HTMLElement;

    // 新拖入的item是没有节点只有placeholder
    if (dom) {
      dom.style.display = isShow ? 'block' : 'none';
    }

    if (isShow) {
      this.draggingItem = null;
    } else {
      this.draggingItem = draggingItem;
    }
  }

  setLayoutDOM = (layout: LayoutItem, dom: HTMLDivElement | null) => {
    if (dom) {
      this.layoutDomCache[layout.i] = dom;
    } else {
      delete this.layoutDomCache[layout.i];
    }
  };

  getLayoutDom(layout: LayoutItem | null) {
    if (!layout) {
      return null;
    }

    if (layout.i in this.layoutDomCache) {
      return this.layoutDomCache[layout.i];
    }

    const dom = this.container.querySelector(`[data-i="${layout.i}"]`);

    this.layoutDomCache[layout.i] = dom?.parentElement;

    return dom;
  }

  private updateLayoutItemPosition(
    layout: LayoutItem,
    positionParams: PositionParams,
    viewportArea: number[]
  ) {
    const { x, y, w, h } = layout;
    const layoutArea = [y, y + h];
    const layoutDom = this.getLayoutDom(layout) as HTMLElement;
    const prevLayout = this.prevLayouts[layout.i];
    const prevLayoutArea = prevLayout ? [prevLayout.y, prevLayout.y + prevLayout.h] : [-1, -1];
    const hasPoisitonChanged = isLayoutChange(prevLayout, layout);

    if (
      !layoutDom ||
      !hasPoisitonChanged ||
      (hasPoisitonChanged &&
        !isIntersect(layoutArea, viewportArea) &&
        !isIntersect(prevLayoutArea, viewportArea))
    ) {
      return;
    }

    const position = calcGridItemPosition(positionParams, x, y, w, h);
    const style = setTransform(position);

    this.prevLayouts[layout.i] = { x, y, w, h };

    const styleCssText = `transform: ${style.transform}; width: ${style.width}px; height: ${style.height}px`;
    const layoutDomCssText = layoutDom.style.cssText
      .split(';')
      .filter(
        (cssText) => !['transform', 'width', 'height'].some((cssName) => cssText.includes(cssName))
      )
      .join(';');

    // card外有一层data-i的容器，所以这里取parentElement
    layoutDom.setAttribute('style', layoutDomCssText + styleCssText);
  }

  private calcScrollArea(positionParams: PositionParams) {
    const { scrollTop, offsetHeight } = this.scrollContainer;
    const { rowHeight, margin } = positionParams;
    const getH = (height: number) => {
      return Math.max(0, (height - margin[1]) / (rowHeight + margin[1]));
    };
    const minH = getH(scrollTop);
    const maxH = getH(offsetHeight);

    return [minH, minH + maxH];
  }
}

/**
 * 是否相交
 * @param layoutArea layoutItem的大小范围
 * @param viewportArea 可视区域的大小范围
 * @returns boolean
 */
function isIntersect(layoutArea: number[], viewportArea: number[]) {
  const [top, bottom] = viewportArea;
  const [itemTop, itemBottom] = layoutArea;

  return (itemBottom >= top && itemBottom <= bottom) || (itemTop <= bottom && itemTop >= top);
}
