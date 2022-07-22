import EventEmitter from 'eventemitter3';
import React, { CSSProperties } from 'react';
import { XYCoord } from 'react-dnd';
import {
  DEFAULT_COLS,
  DEFAULT_CONTAINER_PADDING,
  DEFAULT_DROPPINGITEM,
  DEFAULT_GROUP,
  DEFAULT_ITEMTYPE,
  DEFAULT_MARGIN,
  DEFAULT_MAXROWS,
  DEFAULT_ROWHEIGHT,
  prefixCls,
} from '../constants';
import { DragItem, InternalEventType, LayoutItem, LayoutProps } from '../types';
import {
  calcGridItemPosition,
  calcLayoutByProps,
  calcLeftSpacing,
  calcXY,
  cloneLayouts,
  compact,
  getAllCollisions,
  getContainerHeight,
  getLayoutItem,
  getScrollbar,
  getWH,
  isEqual,
  moveElement,
  pickLayoutItem,
  reLayout,
  setTransform,
  withLayoutItem,
} from '../utils';
import Droppable from './Droppable';
import event from './event';
import Item from './Item';
import './styles/layout.less';

interface LayoutStates {
  offset: DOMRect | null;
  accept: string[];
  layouts: LayoutItem[];
  containerWidth: number;
  /** for resizing */
  placeholder: LayoutItem | null;
  /** for dragging */
  draggingItem: LayoutItem | null;
  /** dragging position */
  prevPosition: XYCoord | null;
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

class Layout extends React.Component<LayoutProps, LayoutStates> {
  isOverFlowLayout = false;
  group = '';

  mounted = false;

  event: EventEmitter<InternalEventType> = new EventEmitter<InternalEventType>();

  containerRef: React.RefObject<HTMLDivElement> = React.createRef();

  /** The lastest parent node with scrollbar */
  scrollbar: HTMLElement | null = null;

  // 调整成组件属性，onDragStart 时不再触发组件更新
  oldLayouts: LayoutItem[] | null;

  static defaultProps: LayoutProps;

  constructor(props: LayoutProps) {
    super(props);

    const { group, layouts, compactType, cols } = props;

    this.group = group || `${DEFAULT_GROUP}_${groupIndex}`;

    groupIndex += 1;
    // cache the layout instance for mutli group
    groupLayouts[this.group] = this;
    groupKeys = Object.keys(groupLayouts);
    groupKeys.push(DEFAULT_ITEMTYPE);

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
      layouts: reLayout(layouts, compactType, cols),
      offset: null,
      accept: groupKeys,
      containerWidth: 0,
      draggingItem: null,
      prevPosition: null,
      placeholder: null,
    };
  }

  static getDerivedStateFromProps(props, prevState: LayoutStates) {
    // skip to update layouts when dragging or resizing
    if (hoveredGroups.length || prevState.placeholder) {
      return null;
    }

    const { layouts, cols, compactType } = props;
    const { layouts: _layouts } = prevState;

    if (!isEqual(layouts, _layouts)) {
      return {
        layouts: reLayout(layouts, compactType, cols),
      };
    }
    return null;
  }

  componentDidMount() {
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
    event.on('overFlowLayout', this.overFlowLayout);
    this.onLayoutMaybeChanged(this.state.layouts, this.props.layouts, false);
    this.event.emit('mounted');
  }

  componentDidUpdate(prevProps: LayoutProps, prevState: LayoutStates) {
    const { layouts } = this.state;

    if (hoveredGroups.length || prevState.placeholder) {
      return;
    }

    this.onLayoutMaybeChanged(layouts, prevState.layouts, false);
  }

  componentWillUnmount() {
    delete groupLayouts[this.group];
    window.removeEventListener('resize', this.resize);
    event.off('dragEnd.cardItem', this.onCardItemDragEnd);
    event.off('overFlowLayout', this.overFlowLayout);
  }

  overFlowLayout = () => {
    if (this.isOverFlowLayout) return;
    this.isOverFlowLayout = true;
    const { draggingItem } = this.state;
    console.log(draggingItem, '=====');
    if (draggingItem) {
      this.resetDraggingState(draggingItem.i);
    }
  };

  // isUserAction - if true, it maybe drop, resize or swap, if false, it maybe correctBounds
  onLayoutMaybeChanged(newLayouts: LayoutItem[], _oldLayouts?: LayoutItem[], isUserAction = true) {
    if (!_oldLayouts) {
      _oldLayouts = cloneLayouts(this.state.layouts);
    }

    const equal = isEqual(_oldLayouts, newLayouts);

    if (!equal) {
      this.props.onLayoutChange?.(cloneLayouts(newLayouts), isUserAction);
    }

    return equal;
  }

  resize = () => {
    const { containerWidth } = this.state;
    const containerDOM = this.containerRef.current;

    if (containerDOM && containerDOM.offsetWidth !== containerWidth) {
      this.setState({
        offset: containerDOM.getBoundingClientRect(),
        containerWidth: containerDOM.offsetWidth,
      });
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

    const { layouts } = layout.state;
    const { compactType, cols } = layout.props;

    const index = layouts.findIndex((l) => l.i === layoutItem.i);

    if (index === -1) return;

    layouts.splice(index, 1);
    layout.setState({
      layouts: compact(layouts, compactType, cols),
      draggingItem: null,
      placeholder: null,
      prevPosition: null,
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
    event.emit('overLayout');
    this.isOverFlowLayout = false;
    const { layouts } = this.state;
    let layoutItem: LayoutItem | null = null;

    if (!this.scrollbar) {
      this.scrollbar = getScrollbar(this.containerRef.current);
    }

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
    layoutItem = null;
    if (layoutItem) {
      this.props.onDragOver?.(layoutItem);
    }
  };

  calcXY(item: LayoutItem, offset: XYCoord) {
    const positionParams = this.getPositionParams();
    const { offset: parentOffset } = this.state;
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

    const { layouts, prevPosition } = this.state;
    const position = this.calcXY(layoutItem, offset);

    layoutItem.placeholder = true;
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

    this.setState({
      draggingItem: layoutItem,
      prevPosition: position,
      placeholder: pickLayoutItem(compactedItem),
      layouts: compactedLayout,
    });
  }

  /**
   * move card item not in group layout
   */
  moveCardItem(item: DragItem, offset: XYCoord): LayoutItem | null {
    const { droppingItem } = this.props;
    const { draggingItem, layouts } = this.state;
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
      this.removeHoverdGroupItem(layoutItem);
      this.moveItem(layoutItem, offset);
    }

    layoutItem = null;

    return layoutItem;
  }

  /**
   * move group item in self group layout
   * or move group item to other group layout
   */
  moveGroupItem(item: DragItem, offset: XYCoord, itemType: string): LayoutItem {
    const { group } = this;
    const { layouts } = this.state;
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

    this.removeHoverdGroupItem(layoutItem);
    this.moveItem(layoutItem, offset);

    return layoutItem;
  }

  onDrop = (dragItem: DragItem, itemType: string) => {
    console.log('drop======00====');
    // event.emit('layoutDrop', dragItem);
    const { draggingItem, layouts } = this.state;
    if (dragItem && cloneLayouts(layouts).findIndex((l) => l.i === dragItem.i) === -1) {
      console.log(111111);
    }
    // console.log(dragItem, draggingItem, 'drop');

    const index = layouts.findIndex((l) => l.i === draggingItem.i);
    const layoutItem = layouts[index];

    delete layoutItem.placeholder;

    // group layout change
    if (itemType === this.group) {
      this.onLayoutMaybeChanged(layouts, this.oldLayouts);
    } else {
      // new card item or other group item
      const index = layouts.findIndex((l) => l.i === draggingItem.i);
      const sourceLayout = groupLayouts[itemType];

      // remove dragitem from layout
      // use ondrop to custom handle layouts change when drag new item
      layouts.splice(index, 1);

      // item from other layout
      if (sourceLayout) {
        const { layouts: sourceLayouts } = sourceLayout.state;
        const { oldLayouts: sourceOldLayouts } = sourceLayout;
        // trigger change for the moved dragitem
        sourceLayout.onLayoutMaybeChanged(sourceLayouts, sourceOldLayouts);
      }
    }

    this.resetDraggingState(draggingItem.i);

    this.props.onDrop?.(layouts, layoutItem, { item: dragItem, type: itemType }, this.group);
  };

  onDragStart = (dragItem: DragItem) => {
    const { layouts } = this.state;
    const layoutItem = getLayoutItem(layouts, dragItem.i);

    this.props.onDragStart?.(layoutItem);

    if (!this.oldLayouts || !isEqual(this.oldLayouts, layouts)) {
      this.oldLayouts = cloneLayouts(layouts);
    }
  };

  onDragEnd = (item: LayoutItem, didDrop: boolean, itemType: string) => {
    // handle by onDrop
    if (didDrop) {
      return;
    }

    if (this.isGroupItem(itemType)) {
      this.setState({
        layouts: cloneLayouts(this.oldLayouts),
      });

      this.resetDraggingState(item.i);
    }
  };

  resetDraggingState(i: string) {
    const { layouts } = this.state;
    const layoutItem = getLayoutItem(layouts, i);

    if (layoutItem) {
      delete layoutItem.placeholder;
    }

    hoveredGroups = [];

    this.setState({
      draggingItem: null,
      placeholder: null,
      prevPosition: null,
    });
    this.oldLayouts = null;
    this.scrollbar = null;
  }

  onCardItemDragEnd = (item: DragItem, didDrop: boolean, itemType: string) => {
    const { allowOutBoundedDrop } = this.props;
    const { layouts, draggingItem } = this.state;
    if (!draggingItem) {
      return;
    }

    if (!didDrop) {
      // 判断是否是新增以及是否允许超出边界拖入
      if (allowOutBoundedDrop) {
        const isDrop = !this.oldLayouts.find((layout) => layout.i === draggingItem.i);
        console.log(isDrop, 'isDropisDrop');
        if (isDrop && !this.isOverFlowLayout) {
          this.onDrop(item, itemType);
        } else {
          this.setState({
            draggingItem: null,
            placeholder: null,
            prevPosition: null,
            layouts: cloneLayouts(layouts),
          });

          this.oldLayouts = cloneLayouts(layouts);

          this.onLayoutMaybeChanged(cloneLayouts(layouts), this.oldLayouts);
        }

        return;
      }

      const index = layouts.findIndex((l) => l.i === draggingItem.i);

      if (index > -1) {
        layouts.splice(index, 1);

        this.setState({
          draggingItem: null,
          placeholder: null,
          prevPosition: null,
          layouts: cloneLayouts(this.oldLayouts),
        });
      }
    } else {
      // drop on layout, but not emit onDrop
      // maybe nested layout, so trigger onDrop manual
      !this.isOverFlowLayout && this.onDrop(item, itemType);
    }
  };

  onResize = (item: LayoutItem, w: number, h: number, direction: string) => {
    const { layouts } = this.state;
    const { cols, compactType, preventCollision } = this.props;
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

    // Re-compact the newLayout and set the drag placeholder.
    this.setState({
      layouts: compact(newLayouts, compactType, cols),
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

  onResizeStop = (item: LayoutItem) => {
    const { layouts } = this.state;
    const { cols, compactType, onResizeStop } = this.props;
    withLayoutItem(layouts, item.i, (l) => {
      l.w = Math.round(l.w);
      l.x = Math.round(l.x);
      return l;
    });

    const newLayouts = compact(layouts, compactType, cols);

    if (!isEqual(newLayouts, layouts)) {
      this.setState({ layouts: newLayouts, placeholder: null });
    } else {
      this.setState({ placeholder: null });
    }

    this.onLayoutMaybeChanged(newLayouts, this.oldLayouts);
    onResizeStop?.(newLayouts);
  };

  getPositionParams = () => {
    const { cols, margin, maxRows, rowHeight, containerPadding } = this.props;

    return {
      cols,
      margin,
      maxRows,
      rowHeight,
      containerWidth: this.getWidth(),
      containerPadding,
    };
  };

  renderPlaceholder = (placeholder: LayoutItem) => {
    if (!placeholder) {
      return null;
    }
    const { layouts } = this.state;
    const { i, x, y } = placeholder;
    const positionParams = this.getPositionParams();
    const leftSpacing = calcLeftSpacing(layouts, placeholder);
    const { w, h } = getWH(placeholder, this.getPositionParams(), leftSpacing);
    const position = calcGridItemPosition(positionParams, x, y, w, h);

    return <div key={i} className={`${prefixCls}-placeholder`} style={setTransform(position)} />;
  };

  renderItems() {
    const { placeholder, layouts, draggingItem } = this.state;
    const { children, resizeHandles } = this.props;

    return React.Children.map(children, (child: React.ReactElement) => {
      const l = child.props['data-grid'];
      let item: LayoutItem;

      if (!l || child.type !== 'div') {
        return null;
      }

      if (draggingItem?.i === l.i) {
        item = draggingItem;
      } else {
        item = getLayoutItem(layouts, l.i);
      }

      if (!item) {
        return null;
      }

      return (
        <Item
          key={l.i}
          type={this.group}
          leftSpacing={calcLeftSpacing(layouts, item)}
          data={getLayoutItem(layouts, l.i)}
          placeholder={l.i === placeholder?.i}
          isDragging={!!this.state.draggingItem}
          {...this.getPositionParams()}
          className={child.props.className}
          onClick={child.props.onClick}
          onMouseEnter={child.props.onMouseEnter}
          onMouseLeave={child.props.onMouseLeave}
          resizeHandles={resizeHandles}
          onDragEnd={this.onDragEnd}
          onDragStart={this.onDragStart}
          onResizeStart={this.onDragStart}
          onResize={this.onResize}
          onResizeStop={this.onResizeStop}
        >
          {React.cloneElement(child, {
            ...child.props,
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
    const { layouts, accept, placeholder } = this.state;
    const { style, margin, rowHeight, containerPadding, droppable, className } = this.props;

    const clsNameStr = `${prefixCls} ${className}`.trim();
    const containerStyle: CSSProperties = {
      height: getContainerHeight(layouts, {
        margin,
        rowHeight,
        containerPadding,
      }),
      ...style,
    };

    console.log(accept, '===========accept');
    return (
      <Droppable
        weId={this.group}
        group={this.group}
        accept={accept}
        canDrop={droppable}
        onDrop={this.onDrop}
        onHover={this.hover}
      >
        <div ref={this.containerRef} className={clsNameStr} style={containerStyle}>
          {this.renderPlaceholder(placeholder)}
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
