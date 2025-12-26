import EventEmitter from 'eventemitter3';
import debounce from 'lodash.debounce';
import React, { CSSProperties } from 'react';
import { XYCoord } from 'react-dnd';
import {
  DEFAULT_COLS,
  DEFAULT_CONTAINER_PADDING,
  DEFAULT_DROPPINGITEM,
  DEFAULT_FLOW_LAYOUT,
  DEFAULT_GROUP,
  DEFAULT_ITEMTYPE,
  DEFAULT_MARGIN,
  DEFAULT_MAXROWS,
  DEFAULT_ROWHEIGHT,
  prefixCls,
} from '../constants';
import { DragItem, InternalEventType, LayoutItem, LayoutProps, Size } from '../types';
import {
  calcH,
  calcLayoutByProps,
  calcLeftSpacing,
  calcXY,
  cloneLayouts,
  compact,
  getAllCollisions,
  getContainerHeight,
  getLayoutItem,
  getScrollbar,
  isEqual,
  moveElement,
  observeDom,
  pickLayoutItem,
  reLayout,
  setComDisplay,
  withLayoutItem,
} from '../utils';
import Droppable from './Droppable';
import Engine from './Engine';
import Item from './Item';
import { layoutContext, layoutStore } from './LayoutContext';
import Placeholder, { PlaceholderRef } from './Placeholder';
import ResizeSnapLine, { ResizeSnapLineRef } from './ResizeSnapLine';
import event from './event';
import './styles/layout.less';

interface LayoutStates {
  accept: string[];
}

type GroupLayouts = {
  [key: string]: Layout;
};

/** All layout instance by group */
const groupLayouts: GroupLayouts = {};
/** default accept */
let groupKeys = [];
/** group index for default group */
let groupIndex = 0;
/**
 * A card item, may hover multi group,
 * so we need remove the card item in hovered group
 */
let hoveredGroups = [];

class Layout extends React.PureComponent<LayoutProps, LayoutStates> {
  isHoverFlowLayout = false;

  group = '';

  mounted = false;

  event: EventEmitter<InternalEventType> = new EventEmitter<InternalEventType>();

  containerRef: React.RefObject<HTMLDivElement> = React.createRef();

  /** The lastest parent node with scrollbar */
  scrollbar: HTMLElement | null = null;

  // 调整成组件属性，onDragStart 时不再触发组件更新
  oldLayouts: LayoutItem[] | null;

  engine: Engine = new Engine();

  placeholderRef: React.RefObject<PlaceholderRef> = React.createRef();

  snaplineRef: React.RefObject<ResizeSnapLineRef> = React.createRef();

  layouts: LayoutItem[];

  /** for dragging */
  draggingItem: LayoutItem | null = null;

  /** dragging position */
  prevPosition: XYCoord | null = null;

  offset: DOMRect | null = null;

  containerWidth: number = this.getWidth();

  static defaultProps: LayoutProps;

  static contextType = layoutContext;

  constructor(props: LayoutProps) {
    super(props);
    const { group, layouts, compactType, cols } = props;

    this.group = group || `${DEFAULT_GROUP}_${groupIndex}`;

    groupIndex += 1;
    // cache the layout instance for mutli group
    groupLayouts[this.group] = this;
    groupKeys = Object.keys(groupLayouts);
    groupKeys.push(DEFAULT_ITEMTYPE);
    // 流式容器默认group
    groupKeys.push(DEFAULT_FLOW_LAYOUT);

    // use default group
    if (!group) {
      groupKeys.forEach((key) => {
        const layout = groupLayouts[key];
        // update accept for use default group layout
        if (!layout || layout.group.indexOf(DEFAULT_GROUP) === -1) {
          return;
        }
        // layout may not mounted
        // when layout mounted, push default group layout to accept
        if (layout.mounted) {
          layout.setState({
            accept: groupKeys,
          });
        } else {
          layout.event.on('mounted', () => {
            layout.setState({
              accept: groupKeys,
            });
          });
        }
      });
    }

    this.oldLayouts = reLayout(layouts, compactType, cols);

    this.state = {
      accept: groupKeys,
    };

    this.layouts = cloneLayouts(this.oldLayouts);
    layoutStore.setGroups(groupKeys);
  }

  componentDidMount() {
    const { enableSnapLine = true } = this.props;

    this.scrollbar = this.getScrollbarContainer();

    this.engine.init(this.containerRef.current!, {
      getPositionParams: this.getPositionParams,
      scrollContainer: this.scrollbar,
      enableSnapLine,
      snaplineRef: this.snaplineRef,
    });

    if (this.props.nested) {
      // hack code for nested layout
      setTimeout(() => {
        this.resize();
      }, 50);
    } else {
      this.resize();
    }

    this.mounted = true;
    window.addEventListener('resize', this.resize);
    event.on('dragEnd.cardItem', this.onCardItemDragEnd);
    event.on('hover.flowLayout', this.onFlowLayoutHover);
    event.on('drop.flowLayout', this.onFlowLayoutDrop);
    this.onLayoutMaybeChanged(this.layouts, this.props.layouts, false);
    this.event.emit('mounted');
  }

  componentDidUpdate() {
    if (hoveredGroups.length) {
      return;
    }

    const { layouts, compactType, cols } = this.props;
    const newLayouts = reLayout(layouts, compactType, cols);

    this.handleLayoutsChange(newLayouts);
    this.onLayoutMaybeChanged(newLayouts, layouts, false);
  }

  componentWillUnmount() {
    delete groupLayouts[this.group];
    window.removeEventListener('resize', this.resize);
    event.off('dragEnd.cardItem', this.onCardItemDragEnd);
    event.off('hover.flowLayout', this.onFlowLayoutHover);
    event.off('drop.flowLayout', this.onFlowLayoutDrop);
  }

  getScrollbarContainer = () => {
    const { scrollbarContainer } = this.props;
    const scrollbar =
      typeof scrollbarContainer === 'function' ? scrollbarContainer() : scrollbarContainer;

    return scrollbar || getScrollbar(this.containerRef.current);
  };

  handleObserve(el: HTMLElement, item: LayoutItem) {
    return debounce(() => {
      // 避免autoHeight动态变化的情况
      if (!item.autoHeight || this.draggingItem) {
        return;
      }

      const height = el.clientHeight;
      const positionParams = this.getPositionParams();
      const h = calcH(positionParams, height, item.y);
      const oldLayout = this.layouts.find((l) => l.i === item.i);
      const { compactType, cols } = this.props;

      if (!oldLayout?.h || oldLayout.h !== h) {
        if (oldLayout) {
          oldLayout.h = h;
        }

        const newLayouts = reLayout(this.layouts, compactType, cols);

        this.handleLayoutsChange(newLayouts);
        this.onLayoutMaybeChanged(newLayouts, [], false, true);
      }
    }, 50);
  }

  onFlowLayoutHover = (itemType: string) => {
    if (this.isHoverFlowLayout) return;
    this.isHoverFlowLayout = true;

    if (this.draggingItem) {
      // 移入流式容器时候，隐藏占位符
      this.placeholderRef.current.updatePlaceholder(null);
      if (![DEFAULT_FLOW_LAYOUT, DEFAULT_ITEMTYPE].includes(itemType)) {
        // 如果是网格布局中的组件拖入到流式布局，那么原有网格布局中的组件在hover的时候需要隐藏
        setComDisplay(this.draggingItem.i, 'none');
      }
    }
  };

  onFlowLayoutDrop = (layoutItem: LayoutItem | null, itemType: string) => {
    // 流式容器drop的时候，清空状态
    const { draggingItem } = this;
    if (layoutItem) {
      this.resetDraggingState(layoutItem.i);
    } else if (draggingItem) {
      this.resetDraggingState(draggingItem.i);
      if (![DEFAULT_FLOW_LAYOUT, DEFAULT_ITEMTYPE].includes(itemType)) {
        // 如果是网格布局中的组件拖入到流式布局，那么原有网格布局中的组件在hover的时候需要隐藏
        setComDisplay(draggingItem.i, 'block');
      }
    }
  };

  // isUserAction - if true, it maybe drop, resize or swap, if false, it maybe correctBounds
  onLayoutMaybeChanged(
    newLayouts: LayoutItem[],
    _oldLayouts?: LayoutItem[],
    isUserAction = true,
    isLayoutChange = false
  ) {
    if (!_oldLayouts) {
      _oldLayouts = cloneLayouts(this.layouts);
    }

    const equal = isEqual(_oldLayouts, newLayouts);

    if (!equal) {
      this.props.onLayoutChange?.(cloneLayouts(newLayouts), isUserAction, isLayoutChange);
    }

    return equal;
  }

  resize = () => {
    const { containerWidth } = this;
    const containerDOM = this.containerRef.current;

    if (containerDOM && containerDOM.offsetWidth !== containerWidth) {
      this.offset = containerDOM.getBoundingClientRect();
      this.containerWidth = containerDOM.offsetWidth;
      this.forceUpdate();
    }
  };

  handleLayoutsChange = (
    layouts: LayoutItem[],
    dragInfo?: {
      draggingItem: LayoutItem | null;
      prevPosition: XYCoord | null;
      placeholder: LayoutItem | null;
      isDragging?: boolean;
    }
  ) => {
    this.layouts = layouts;
    this.engine.updateLayouts(layouts);

    if (dragInfo) {
      const { draggingItem, prevPosition, placeholder } = dragInfo;

      this.draggingItem = draggingItem;
      this.prevPosition = prevPosition;

      if (placeholder !== null) {
        this.placeholderRef.current?.updatePlaceholder(
          placeholder,
          layouts,
          this.getPositionParams()
        );
      } else {
        this.placeholderRef.current?.updatePlaceholder(null);
      }
    }
  };

  getWidth() {
    const containerDOM = this.containerRef.current;

    return containerDOM?.offsetWidth || 0;
  }

  isGroupItem(itemType: string): boolean {
    return itemType === this.group || !!groupLayouts[itemType];
  }

  removeOtherGroupItem = (layoutItem: LayoutItem, group: string) => {
    const layout = groupLayouts[group];

    if (!layout) return;

    const { layouts } = layout;
    const { compactType, cols } = layout.props;

    const index = layouts.findIndex((l) => l.i === layoutItem.i);

    if (index === -1) return;

    layouts.splice(index, 1);

    layout.handleLayoutsChange(compact(layouts, compactType, cols), {
      draggingItem: null,
      prevPosition: null,
      placeholder: null,
    });
  };

  removeHoverdGroupItem = (layoutItem: LayoutItem) => {
    if (hoveredGroups.length > 1) {
      hoveredGroups.forEach((group) => {
        if (group !== this.group) {
          this.removeOtherGroupItem(layoutItem, group);
        }
      });
      hoveredGroups = [this.group];
    }
  };

  hover = (item: DragItem, offset: XYCoord, itemType: string) => {
    if (this.isHoverFlowLayout) {
      event.emit('hover.layout');
      this.isHoverFlowLayout = false;
    }

    const { layouts } = this;
    let layoutItem: LayoutItem | null = null;

    if (!this.oldLayouts) {
      this.oldLayouts = cloneLayouts(layouts);
    }

    if (hoveredGroups.indexOf(this.group) === -1) {
      hoveredGroups.push(this.group);
    }

    // move group item
    if (this.isGroupItem(itemType)) {
      layoutItem = this.moveGroupItem(item, offset, itemType);
    } else {
      // move card item
      layoutItem = this.moveCardItem(item, offset);
    }

    if (layoutItem) {
      this.props.onDragOver?.(layoutItem);
    }
  };

  calcXY(item: LayoutItem, offset: XYCoord) {
    const positionParams = this.getPositionParams();
    const { offset: parentOffset } = this;
    const { scrollTop, scrollLeft } = this.scrollbar;
    const x = offset.x - parentOffset.x + scrollLeft;
    const y = offset.y - parentOffset.y + scrollTop;

    return calcXY(positionParams, y, x, item.w, item.h);
  }

  moveItem(layoutItem: LayoutItem, offset: XYCoord) {
    // for dragging item has nested layout, the nested layout has unmounted
    if (!this.containerRef.current) {
      return;
    }

    const { layouts, prevPosition } = this;
    const position = this.calcXY(layoutItem, offset);

    if (position.x === prevPosition?.x && position.y === prevPosition?.y) {
      return;
    }

    const { preventCollision, compactType, cols } = this.props;

    const newLayouts = moveElement(
      layouts,
      layoutItem,
      position.x,
      position.y,
      true,
      preventCollision,
      compactType,
      cols
    );

    const compactedLayout = compact(newLayouts, compactType, cols);
    const compactedItem = getLayoutItem(compactedLayout, layoutItem.i);
    const placeholder = pickLayoutItem(compactedItem);

    this.handleLayoutsChange(compactedLayout, {
      placeholder,
      draggingItem: layoutItem,
      prevPosition: position,
    });
  }

  /**
   * move card item not in group layout
   */
  moveCardItem(item: DragItem, offset: XYCoord): LayoutItem | null {
    const { droppingItem } = this.props;
    const { draggingItem, layouts, engine } = this;
    let layoutItem: LayoutItem;

    if (!draggingItem) {
      if (!droppingItem) {
        return null;
      }

      const _item: any = {
        ...item,
        ...droppingItem,
        i: item.i || droppingItem.i,
      };

      layoutItem = {
        ..._item,
        ...this.calcXY(_item, offset),
      };
      layouts.push(layoutItem);
    } else {
      layoutItem = getLayoutItem(layouts, draggingItem.i);
    }

    if (layoutItem) {
      if (engine.draggingItem?.i !== layoutItem.i) {
        this.engine.toggleDraggingItem(layoutItem, false);
      }
      this.removeHoverdGroupItem(layoutItem);
      this.moveItem(layoutItem, offset);
    }

    return layoutItem;
  }

  /**
   * move group item in self group layout
   * or move group item to other group layout
   */
  moveGroupItem(item: DragItem, offset: XYCoord, itemType: string): LayoutItem {
    const { group, layouts } = this;
    let layoutItem = getLayoutItem(layouts, item.i);

    // drag group item to other group
    if (!layoutItem) {
      if (itemType !== group) {
        const { props } = groupLayouts[itemType];

        layoutItem = {
          ...calcLayoutByProps(item as LayoutItem, this.props, props),
          placeholder: true,
          group,
        };

        // remove same item in other group layout
        this.removeOtherGroupItem(layoutItem, itemType);
      } else {
        // prevent oldLayouts be changed
        layoutItem = getLayoutItem(cloneLayouts(this.oldLayouts), item.i);
      }

      layouts.push(layoutItem);
    }

    if (this.engine.draggingItem?.i !== layoutItem.i) {
      this.engine.toggleDraggingItem(layoutItem, false);
    }
    this.removeHoverdGroupItem(layoutItem);
    this.moveItem(layoutItem, offset);

    return layoutItem;
  }

  onDrop = (dragItem: DragItem, itemType: string) => {
    const { draggingItem, layouts } = this;
    const index = layouts.findIndex((l) => l.i === draggingItem.i);
    const layoutItem = layouts[index];
    const sourceLayout = groupLayouts[itemType];

    // group layout change
    if (itemType === this.group) {
      this.onLayoutMaybeChanged(layouts, this.oldLayouts);
    } else if (sourceLayout) {
      // item from other layout
      const { layouts: sourceLayouts } = sourceLayout;
      const { oldLayouts: sourceOldLayouts } = sourceLayout;

      // trigger change for the moved dragitem
      sourceLayout.onLayoutMaybeChanged(sourceLayouts, sourceOldLayouts, true);
    }

    this.resetDraggingState(draggingItem.i);

    this.engine.toggleDraggingItem(layoutItem, true);
    this.props.onDrop?.(layouts, layoutItem, { item: dragItem, type: itemType }, this.group);
  };

  onResizeStart = (
    resizeItem: LayoutItem,
    direction: string,
    setResizing: (size: Size) => void
  ) => {
    if (['n', 's'].includes(direction) && this.engine.snapline) {
      this.engine.snapline.resizeStart(resizeItem, this.layouts, setResizing);
    }

    this.onDragStart(resizeItem);
  };

  onDragStart = (dragItem: DragItem) => {
    const { layouts } = this;
    const layoutItem = getLayoutItem(layouts, dragItem.i);

    this.props.onDragStart?.(layoutItem);

    if (!this.oldLayouts || !isEqual(this.oldLayouts, layouts)) {
      this.oldLayouts = cloneLayouts(layouts);
    }
  };

  onDragEnd = (item: LayoutItem, didDrop: boolean, itemType: string) => {
    this.engine.toggleDraggingItem(item, true);

    // handle by onDrop
    if (didDrop) {
      return;
    }

    const { layouts } = this;
    const index = layouts.findIndex((l) => l.i === item.i);
    const layoutItem = layouts[index];
    const isDrop = !isEqual([layoutItem], [item]);

    if (this.isGroupItem(itemType)) {
      this.handleLayoutsChange(layouts);

      // onDrop中已经有处理，且还会用到相关的属性
      // 所以这里不处理
      if (!isDrop) {
        this.resetDraggingState(item.i);
      }
    }

    if (isDrop) {
      this.onDrop(layoutItem, itemType);
    }
  };

  onDragLeave = () => {
    this.props.onDragLeave?.();
  };

  onDragEnter = () => {
    this.props.onDragEnter?.();
  };

  resetDraggingState(i: string) {
    hoveredGroups = [];

    this.draggingItem = null;
    this.prevPosition = null;
    this.oldLayouts = null;

    this.placeholderRef.current?.updatePlaceholder(null);
  }

  onCardItemDragEnd = (item: DragItem, didDrop: boolean, itemType: string) => {
    const { allowOutBoundedDrop } = this.props;
    const { layouts, draggingItem } = this;

    if (!draggingItem) {
      return;
    }
    if (!didDrop) {
      // 判断是否是新增以及是否允许超出边界拖入
      if (allowOutBoundedDrop) {
        const isDrop = !this.oldLayouts.find((layout) => layout.i === draggingItem.i);
        if (isDrop && !this.isHoverFlowLayout) {
          this.onDrop(item, itemType);
        } else {
          this.oldLayouts = cloneLayouts(layouts);
          this.handleLayoutsChange(cloneLayouts(layouts), {
            placeholder: null,
            draggingItem: null,
            prevPosition: null,
          });
          this.onLayoutMaybeChanged(cloneLayouts(layouts), this.oldLayouts);
        }

        return;
      }

      const index = layouts.findIndex((l) => l.i === draggingItem.i);

      if (index > -1) {
        layouts.splice(index, 1);

        this.handleLayoutsChange(cloneLayouts(this.oldLayouts), {
          placeholder: null,
          draggingItem: null,
          prevPosition: null,
        });
      }
    } else {
      // drop on layout, but not emit onDrop
      // maybe nested layout, so trigger onDrop manual
      !this.isHoverFlowLayout && this.onDrop(item, itemType);
    }
  };

  onResize = (item: LayoutItem, w: number, h: number, direction: string) => {
    const { layouts } = this;
    const { cols, compactType, preventCollision, rowHeight, margin } = this.props;
    const [newLayouts, l] = withLayoutItem(layouts, item.i, (l) => {
      // Something like quad tree should be used
      // to find collisions faster
      let hasCollisions;
      if (preventCollision) {
        const collisions = getAllCollisions(layouts, { ...l, w, h }).filter(
          (layoutItem) => layoutItem.i !== l.i
        );
        hasCollisions = collisions.length > 0;
        // If we're colliding, we need adjust the placeholder.
        if (hasCollisions) {
          // adjust w && h to maximum allowed space
          let leastX = Infinity;
          let leastY = Infinity;
          collisions.forEach((layoutItem) => {
            if (layoutItem.x > l.x) leastX = Math.min(leastX, layoutItem.x);
            if (layoutItem.y > l.y) leastY = Math.min(leastY, layoutItem.y);
          });

          if (Number.isFinite(leastX)) l.w = leastX - l.x;
          if (Number.isFinite(leastY)) l.h = leastY - l.y;
        }
      }

      if (!hasCollisions) {
        // Set new x when handle is w and w has changed (drag to left)
        if (direction === 'w' && l.w !== w) {
          l.x -= w - l.w;
        }
        // Set new width and height.
        l.w = w;
        l.h = h;
      }

      return l;
    });

    if (!l) {
      return;
    }

    if (['n', 's'].includes(direction) && this.engine.snapline) {
      this.engine.snapline.reize(
        { w, h },
        { positionParams: this.getPositionParams(), onResize: this.onResize }
      );
    }

    // Re-compact the newLayout and set the drag placeholder.
    this.handleLayoutsChange(compact(newLayouts, compactType, cols), {
      isDragging: false,
      draggingItem: null,
      prevPosition: null,
      placeholder: {
        w: direction === 'w' ? l.w : Math.round(l.w),
        h: l.h,
        x: l.x,
        y: l.y,
        static: true,
        i: item.i,
      },
    });
  };

  onResizeStop = (item: LayoutItem, direction: string) => {
    const { layouts } = this;
    const { cols, compactType, onResizeStop } = this.props;
    withLayoutItem(layouts, item.i, (l) => {
      l.w = Math.round(l.w);
      l.x = Math.round(l.x);
      return l;
    });

    const newLayouts = compact(layouts, compactType, cols);

    if (!isEqual(newLayouts, layouts)) {
      this.handleLayoutsChange(newLayouts);
    }

    this.placeholderRef.current.updatePlaceholder(null);

    if (['n', 's'].includes(direction) && this.engine.snapline) {
      this.engine.snapline.resizeStop();
    }

    this.onLayoutMaybeChanged(newLayouts, this.oldLayouts);
    onResizeStop?.(item, newLayouts);
  };

  getPositionParams = () => {
    const { cols, margin, maxRows, rowHeight, containerPadding } = this.props;
    const { containerWidth } = this;

    return {
      cols,
      margin,
      maxRows,
      rowHeight,
      containerWidth,
      containerPadding,
    };
  };

  initAutoHeight(item: LayoutItem, layoutDom: HTMLDivElement) {
    if (!item.autoHeight) {
      return;
    }

    const el: any = layoutDom.firstChild;
    const observe = observeDom(el, this.handleObserve(el, item));

    el._observe = observe;
  }

  onItemMount = (layout: LayoutItem, dom: HTMLDivElement) => {
    this.engine.setLayoutDOM(layout, dom);
    this.initAutoHeight(layout, dom);
  };

  onItemUnmount = (layout: LayoutItem, dom: HTMLDivElement) => {
    this.engine.setLayoutDOM(layout, null);
  };

  renderItems() {
    const { layouts, draggingItem } = this;
    const { layouts: _layouts, children, resizeHandles } = this.props;

    return React.Children.map(children, (child: React.ReactElement) => {
      const l = child.props['data-grid'];
      let item: LayoutItem;
      if (!l || child.type !== 'div') {
        return null;
      }

      if (draggingItem?.i === l.i) {
        item = draggingItem;
      } else {
        item = getLayoutItem(layouts, l.i) || getLayoutItem(_layouts, l.i);
      }

      if (!item) {
        return null;
      }

      return (
        <Item
          key={l.i}
          dragOffset
          type={this.group}
          leftSpacing={calcLeftSpacing(layouts, item)}
          data={getLayoutItem(layouts, l.i) || getLayoutItem(_layouts, l.i)}
          isDragging={!!this.draggingItem}
          {...this.getPositionParams()}
          className={child.props.className}
          onClick={child.props.onClick}
          onMouseEnter={child.props.onMouseEnter}
          onMouseLeave={child.props.onMouseLeave}
          resizeHandles={resizeHandles}
          onDragEnd={this.onDragEnd}
          onDragStart={this.onDragStart}
          onResizeStart={this.onResizeStart}
          onResize={this.onResize}
          onResizeStop={this.onResizeStop}
          onMount={this.onItemMount}
          onUnmount={this.onItemUnmount}
        >
          {React.cloneElement(child, {
            ...child.props,
            'data-i': item.i,
            // move child className to item
            className: '',
            onMouseEnter: undefined,
            onMouseLeave: undefined,
          })}
        </Item>
      );
    });
  }

  render() {
    const { accept } = this.state;
    const {
      style,
      margin,
      rowHeight,
      containerPadding,
      droppable,
      className,
      scrollbarContainer = this.getScrollbarContainer,
    } = this.props;

    const clsNameStr = `${prefixCls} ${className}`.trim();
    const containerStyle: CSSProperties = {
      height: getContainerHeight(this.layouts, {
        margin,
        rowHeight,
        containerPadding,
      }),
      ...style,
    };

    return (
      <Droppable
        weId={this.group}
        group={this.group}
        accept={accept}
        scrollbarContainer={scrollbarContainer}
        canDrop={droppable}
        onDrop={this.onDrop}
        onHover={this.hover}
        onDragLeave={this.onDragLeave}
        onDragEnter={this.onDragEnter}
      >
        <div ref={this.containerRef} className={clsNameStr} style={containerStyle}>
          <Placeholder ref={this.placeholderRef} />
          <ResizeSnapLine ref={this.snaplineRef} />
          {this.renderItems()}
        </div>
      </Droppable>
    );
  }
}

Layout.defaultProps = {
  layouts: [],
  accept: [],
  group: '',
  className: '',
  droppable: true,
  cols: DEFAULT_COLS,
  margin: DEFAULT_MARGIN,
  containerPadding: DEFAULT_CONTAINER_PADDING,
  rowHeight: DEFAULT_ROWHEIGHT,
  maxRows: DEFAULT_MAXROWS,
  droppingItem: DEFAULT_DROPPINGITEM,
  preventCollision: false,
  compactType: 'vertical',
  resizeHandles: ['se', 'w', 'e', 'n', 's'],
  allowOutBoundedDrop: true,
};

export default Layout;
