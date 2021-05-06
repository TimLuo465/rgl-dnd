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
  calcXY,
  cloneLayouts,
  compact,
  getAllCollisions,
  getContainerHeight,
  getLayoutItem,
  isEqual,
  moveElement,
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
  oldLayouts: LayoutItem[] | null;
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
let groupLayouts: GroupLayouts = {};
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
  group: string = '';
  event: EventEmitter<InternalEventType> = new EventEmitter<InternalEventType>();
  containerRef: React.RefObject<HTMLDivElement> = React.createRef();

  static defaultProps: LayoutProps;

  constructor(props: LayoutProps) {
    super(props);

    const { group, layouts, compactType, cols } = props;

    this.group = group || `${DEFAULT_GROUP}_${groupIndex}`;

    groupIndex = groupIndex + 1;
    // cache the layout instance for mutli group
    groupLayouts[this.group] = this;
    groupKeys = Object.keys(groupLayouts);
    groupKeys.push(DEFAULT_ITEMTYPE);

    // use default group
    if (!group) {
      groupKeys.forEach((key) => {
        const layout = groupLayouts[key];
        // update accept for use default group layout
        if (layout?.group.indexOf(DEFAULT_GROUP) > -1) {
          // layout may not mounted
          // when layout mounted, trigger state change
          layout.event.on('mounted', () => {
            layout.setState({
              accept: groupKeys,
            });
          });
        }
      });
    }

    this.state = {
      layouts: reLayout(layouts, compactType, cols),
      oldLayouts: null,
      offset: null,
      accept: groupKeys,
      containerWidth: 0,
      draggingItem: null,
      prevPosition: null,
      placeholder: null,
    };
  }

  componentDidMount() {
    const containerDOM = this.containerRef.current;

    if (containerDOM) {
      this.setState({
        offset: containerDOM.getBoundingClientRect(),
        containerWidth: containerDOM.offsetWidth,
      });
    }

    window.addEventListener('resize', this.resize);
    event.on('dragEnd.cardItem', this.onCardItemDragEnd);
    this.onLayoutMaybeChanged(this.state.layouts, this.props.layouts);
    this.event.emit('mounted');
  }

  componentWillUnmount() {
    delete groupLayouts[this.group];
    window.removeEventListener('resize', this.resize);
    event.off('dragEnd.cardItem', this.onCardItemDragEnd);
  }

  onLayoutMaybeChanged(newLayouts: LayoutItem[], oldLayouts?: LayoutItem[]) {
    if (!oldLayouts) {
      oldLayouts = this.state.layouts;
    }

    const equal = isEqual(oldLayouts, newLayouts);

    if (!equal) {
      this.props.onLayoutChange?.(newLayouts);
    }

    return equal;
  }

  resize = () => {
    const containerDOM = this.containerRef.current;

    if (containerDOM) {
      this.setState({
        containerWidth: containerDOM.offsetWidth,
      });
    }
  };

  isGroupItem(itemType: string): boolean {
    return itemType === this.group || !!groupLayouts[itemType];
  }

  removeOtherGroupItem = (
    layoutItem: LayoutItem,
    group: string,
    callback?: (layout: Layout) => void
  ) => {
    const layout = groupLayouts[group];
    const { layouts } = layout.state;
    const { compactType, cols } = layout.props;
    const index = layouts.findIndex((l) => l.i === layoutItem.i);

    if (index === -1) {
      return;
    }

    if (callback) {
      callback(layout);
    } else {
      layouts.splice(index, 1);
      layout.setState({
        layouts: compact(layouts, compactType, cols),
        draggingItem: null,
        prevPosition: null,
      });
    }
  };

  removeHoverdGroupItem = (layoutItem: LayoutItem) => {
    if (hoveredGroups.length > 1) {
      hoveredGroups.forEach((group) => {
        if (group !== this.group) {
          this.removeOtherGroupItem(layoutItem, group, (layout) => {
            layout.setState({
              layouts: cloneLayouts(layout.state.oldLayouts),
              prevPosition: null,
              draggingItem: null,
            });
          });
        }
      });
    }
  };

  hover = (item: DragItem, offset: XYCoord, itemType: string) => {
    const { layouts, oldLayouts } = this.state;

    if (!oldLayouts) {
      this.setState({
        oldLayouts: cloneLayouts(layouts),
      });
    }

    hoveredGroups.push(this.group);

    // move group item
    if (this.isGroupItem(itemType)) {
      this.moveGroupItem(item, offset, itemType);
    } else {
      // move card item
      this.moveCardItem(item, offset);
    }
  };

  calcXY(item: LayoutItem, offset: XYCoord) {
    const positionParams = this.getPositionParams();
    const { offset: parentOffset } = this.state;
    const { scrollTop, scrollLeft } = this.containerRef.current;
    const x = offset.x + scrollLeft;
    const y = offset.y - parentOffset.y + scrollTop;

    return calcXY(positionParams, y, x, item.w, item.h);
  }

  moveItem(layoutItem: LayoutItem, offset: XYCoord) {
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

    this.setState({
      draggingItem: layoutItem,
      prevPosition: position,
      layouts: compact(newLayouts, compactType, cols),
    });
  }

  /**
   * move card item not in group layout
   */
  moveCardItem(item: DragItem, offset: XYCoord) {
    const { droppingItem } = this.props;
    const { draggingItem, layouts } = this.state;
    let layoutItem: LayoutItem;

    if (!draggingItem) {
      const _item: any = {
        ...item,
        ...droppingItem,
      };

      layoutItem = {
        ..._item,
        ...this.calcXY(_item, offset),
      };

      layouts.push(layoutItem);
    } else {
      layoutItem = getLayoutItem(layouts, draggingItem.i);
    }

    this.removeHoverdGroupItem(layoutItem);
    this.moveItem(layoutItem, offset);
  }

  /**
   * move group item in self group layout
   * or move group item to other group layout
   */
  moveGroupItem(item: DragItem, offset: XYCoord, itemType: string) {
    const group = this.group;
    const { layouts, oldLayouts } = this.state;
    let layoutItem = getLayoutItem(layouts, item.i);

    // drag group item to other group
    if (!layoutItem) {
      if (itemType !== group) {
        layoutItem = {
          ...(item as LayoutItem),
          placeholder: true,
          group,
        };
        // remove same item in other group layout
        this.removeOtherGroupItem(layoutItem, itemType);
      } else {
        // prevent oldLayouts be changed
        layoutItem = getLayoutItem(cloneLayouts(oldLayouts), item.i);
      }
      layouts.push(layoutItem);
    }

    this.removeHoverdGroupItem(layoutItem);
    this.moveItem(layoutItem, offset);
  }

  onDrop = () => {
    const { draggingItem } = this.state;
    const { layouts, oldLayouts } = this.state;

    this.onLayoutMaybeChanged(layouts, oldLayouts);
    this.resetDraggingState(draggingItem.i);
  };

  onDragStart = () => {
    const { layouts } = this.state;

    this.setState({
      oldLayouts: cloneLayouts(layouts),
    });
  };

  onDragEnd = (item: LayoutItem, didDrop: boolean, itemType: string) => {
    // handle by onDrop
    if (didDrop) {
      return;
    }

    if (this.isGroupItem(itemType)) {
      this.setState({
        layouts: this.state.oldLayouts,
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
      prevPosition: null,
      oldLayouts: null,
    });
  }

  onCardItemDragEnd = (item: DragItem, didDrop: boolean) => {
    const { layouts, oldLayouts, draggingItem } = this.state;

    // handle by onDrop
    if (didDrop || !draggingItem) {
      return;
    }

    const index = layouts.findIndex((l) => l.i === draggingItem.i);

    if (index > -1) {
      layouts.splice(index, 1);

      this.setState({
        draggingItem: null,
        prevPosition: null,
        layouts: cloneLayouts(oldLayouts),
      });
    }
  };

  onResize = (item: LayoutItem, w: number, h: number) => {
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
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        static: true,
        i: item.i,
      },
    });
  };

  onResizeStop = () => {
    const { layouts } = this.state;
    const { cols, compactType } = this.props;
    const newLayouts = compact(layouts, compactType, cols);

    this.setState({ placeholder: null });
    this.onLayoutMaybeChanged(newLayouts);
  };

  getPositionParams = () => {
    const { containerWidth } = this.state;
    const { cols, margin, maxRows, rowHeight, containerPadding } = this.props;

    return {
      cols,
      margin,
      maxRows,
      rowHeight,
      containerWidth,
      containerPadding,
    };
  };

  renderPlaceholder = (placeholder: LayoutItem) => {
    if (!placeholder) {
      return null;
    }

    const { i, x, y, w, h } = placeholder;
    const positionParams = this.getPositionParams();
    const position = calcGridItemPosition(positionParams, x, y, w, h);

    return <div key={i} className={`${prefixCls}-placeholder`} style={setTransform(position)} />;
  };

  renderItem = (l: LayoutItem) => {
    const { resizeHandles, renderItem } = this.props;

    if (l.placeholder) {
      return this.renderPlaceholder(l);
    }

    return (
      <Item
        key={l.i}
        type={this.group}
        data={l}
        {...this.getPositionParams()}
        resizeHandles={resizeHandles}
        onDragEnd={this.onDragEnd}
        onDragStart={this.onDragStart}
        onResize={this.onResize}
        onResizeStop={this.onResizeStop}
      >
        {renderItem(l)}
      </Item>
    );
  };

  render() {
    const { layouts, accept, placeholder } = this.state;
    const { style, margin, rowHeight, containerPadding, className } = this.props;
    const clsNameStr = `${prefixCls} ${className}`.trim();
    const containerStyle: CSSProperties = {
      height: getContainerHeight(layouts, {
        margin,
        rowHeight,
        containerPadding,
      }),
      ...style,
    };

    return (
      <Droppable group={this.group} accept={accept} onDrop={this.onDrop} onHover={this.hover}>
        <div ref={this.containerRef} className={clsNameStr} style={containerStyle}>
          {this.renderPlaceholder(placeholder)}
          {layouts.map(this.renderItem)}
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
  cols: DEFAULT_COLS,
  margin: DEFAULT_MARGIN,
  containerPadding: DEFAULT_CONTAINER_PADDING,
  rowHeight: DEFAULT_ROWHEIGHT,
  maxRows: DEFAULT_MAXROWS,
  droppingItem: DEFAULT_DROPPINGITEM,
  preventCollision: false,
  compactType: 'vertical',
  resizeHandles: ['se'],
  renderItem: () => null,
};

export default Layout;
