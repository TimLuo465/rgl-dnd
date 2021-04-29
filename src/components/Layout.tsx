import isEqual from 'lodash.isequal';
import React, { CSSProperties } from 'react';
import { XYCoord } from 'react-dnd';
import {
  DEFAULT_COLS,
  DEFAULT_CONTAINER_PADDING,
  DEFAULT_DROPPINGITEM,
  DEFAULT_ITEMTYPE,
  DEFAULT_MARGIN,
  DEFAULT_MAXROWS,
  DEFAULT_ROWHEIGHT,
  prefixCls,
} from '../constants';
import { DragItem, LayoutItem, LayoutProps } from '../types';
import {
  calcGridItemPosition,
  calcXY,
  compact,
  getAllCollisions,
  getContainerHeight,
  getLayoutItem,
  moveElement,
  pickDroppingItem,
  reLayout,
  setTransform,
  withLayoutItem,
} from '../utils';
import Droppable from './Droppable';
import Item from './Item';
import './styles/layout.less';

interface LayoutStates {
  layouts: LayoutItem[];
  oldLayouts: LayoutItem[] | null;
  // item.i
  // item drag from layouts or outside
  // item resizing from self layouts
  droppingId: string;
  containerWidth: number;
  dragFromOutside: boolean;
  placeholder: LayoutItem | null;
  // item drag from layouts
  draggingItem: DragItem | null;
}

type GroupLayouts = {
  [key: string]: Layout;
};

// All layout instance by group
let groupLayouts: GroupLayouts = {};
// A dragging standalone Item, not from other group
let __draggingStandaloneItem__: { i: string; group: string } = null;

class Layout extends React.PureComponent<LayoutProps, LayoutStates> {
  constructor(props: LayoutProps) {
    super(props);

    const { group, accept, layouts, compactType, cols } = props;

    // cache the layout instance for mutli group
    if (group) {
      groupLayouts[group] = this;
    }

    // accpect default item by default
    if (accept && accept.indexOf(DEFAULT_ITEMTYPE) === -1) {
      accept.push(DEFAULT_ITEMTYPE);
    }

    this.state = {
      layouts: reLayout(layouts, compactType, cols),
      oldLayouts: null,
      droppingId: '',
      containerWidth: 0,
      dragFromOutside: false,
      draggingItem: null,
      placeholder: null,
    };
  }

  static defaultProps: LayoutProps = {
    layouts: [],
    group: '',
    accept: [DEFAULT_ITEMTYPE],
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

  static getDerivedStateFromProps(props, prevState: LayoutStates) {
    // when dragging, should skip compare
    if (prevState.droppingId) {
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

  containerRef: React.RefObject<HTMLDivElement> = React.createRef();

  componentDidMount() {
    this.setWidth();
    window.addEventListener('resize', this.setWidth);
  }

  componentDidUpdate(prevProps: LayoutProps, prevState: LayoutStates) {
    if (!this.state.droppingId) {
      const newLayouts = this.state.layouts;
      const oldLayouts = prevState.layouts;

      this.onLayoutMaybeChanged(newLayouts, oldLayouts);
    }
  }

  componentWillUnmount() {
    const { group } = this.props;

    if (group) {
      delete groupLayouts[group];
    }
    window.removeEventListener('resize', this.setWidth);
  }

  onLayoutMaybeChanged(newLayouts: LayoutItem[], oldLayouts?: LayoutItem[]) {
    if (!oldLayouts) {
      oldLayouts = this.state.layouts;
    }

    if (!isEqual(oldLayouts, newLayouts)) {
      this.props.onLayoutChange?.(newLayouts);
    }
  }

  setWidth = () => {
    const containerDOM = this.containerRef.current;

    if (containerDOM) {
      this.setState({
        containerWidth: containerDOM.offsetWidth,
      });
    }
  };

  removeItemForOtherGroup(item: DragItem) {
    if (!item || !item.group) return;

    const { group } = this.props;
    const layout = groupLayouts[item.group];

    if (item.group !== group && layout) {
      const { layouts: _layouts } = layout.state;
      const index = _layouts.findIndex((l) => l.i === item.i);

      if (index > -1) {
        item.group = group;
        _layouts.splice(index, 1);
        layout.setState({
          layouts: _layouts,
        });
        layout.forceUpdate();
      }
    }
  }

  enter = (item: DragItem, offset: XYCoord) => {
    const { layouts, droppingId } = this.state;
    const { droppingItem, group } = this.props;
    const { w, h } = droppingItem;
    const positionParams = this.getPositionParams();
    let layoutItem = getLayoutItem(layouts, item.i);
    const position = calcXY(positionParams, offset.y, offset.x, w, h);

    // drag over
    if (!layoutItem) {
      const layout = groupLayouts[item.group];

      if (__draggingStandaloneItem__?.group) {
        // a standalone item
        this.removeItemForOtherGroup(__draggingStandaloneItem__);
      } else if (item && item.group) {
        // a group item from other group
        this.removeItemForOtherGroup(item);
      } else {
        __draggingStandaloneItem__ = {
          i: item.i,
          group,
        };
      }

      // drag from outside
      layouts.push({
        ...droppingItem,
        // maybe from other group
        ...pickDroppingItem(item),
        ...position,
        group,
        static: false,
        placeholder: true,
      });
      this.setState({
        droppingId: item.i || droppingItem.i,
        dragFromOutside: true,
        layouts: layouts,
      });
    } else {
      // from layouts
      layoutItem.placeholder = true;

      this.setState({
        droppingId: layoutItem.i,
      });
    }
  };

  hover = (item: DragItem, offset: XYCoord) => {
    const { layouts, droppingId } = this.state;
    const { droppingItem, cols, group, compactType, preventCollision } = this.props;

    const { w, h } = droppingItem;
    const positionParams = this.getPositionParams();
    let layoutItem = getLayoutItem(layouts, droppingId);
    const position = calcXY(positionParams, offset.y, offset.x, w, h);

    let newLayouts = moveElement(
      layouts,
      layoutItem,
      position.x,
      position.y,
      true,
      preventCollision,
      compactType,
      cols
    );

    newLayouts = compact(layouts, compactType, cols);

    this.setState({
      droppingId: layoutItem.i,
      layouts: newLayouts,
    });
  };

  onDrop = (item: DragItem) => {
    const { droppingId, layouts, dragFromOutside } = this.state;
    const { compactType, cols, onDrop } = this.props;
    let layoutItem = getLayoutItem(layouts, droppingId);

    if (!layoutItem) return;

    let newLayouts: LayoutItem[] = layouts;

    if (dragFromOutside) {
      newLayouts = compact(
        layouts.filter((l) => l.i !== droppingId),
        compactType,
        cols
      );
    }

    delete layoutItem.placeholder;
    __draggingStandaloneItem__ = null;

    this.setState({
      droppingId: '',
      layouts: newLayouts,
      dragFromOutside: false,
      draggingItem: null,
    });

    if (dragFromOutside) {
      onDrop?.(newLayouts, layoutItem, item.group);
    } else {
      this.onLayoutMaybeChanged(newLayouts);
    }
  };

  onDragStart = (item: DragItem) => {
    this.setState({
      draggingItem: item,
      droppingId: item.i,
      dragFromOutside: false,
      oldLayouts: this.state.layouts.slice(0),
    });
  };

  onDragEnd = (item: LayoutItem, didDrop: boolean) => {
    // handle by onDrop
    if (didDrop) {
      return;
    }
    const { droppingId, draggingItem, dragFromOutside, layouts, oldLayouts } = this.state;
    let newLayouts = layouts;

    if (dragFromOutside) {
      newLayouts = layouts.filter((l) => !l.placeholder);
    } else {
      const layoutItem = getLayoutItem(newLayouts, draggingItem.i);

      delete layoutItem.placeholder;
    }

    this.setState({
      droppingId: '',
      dragFromOutside: false,
      draggingItem: null,
      layouts: newLayouts,
      oldLayouts: null,
    });
    this.onLayoutMaybeChanged(newLayouts, oldLayouts);
  };

  onResize = (item: LayoutItem, w: number, h: number) => {
    const { layouts, placeholder } = this.state;
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
      droppingId: item.i,
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

  onResizeStop = (item: LayoutItem, w: number, h: number) => {
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
    const { group, resizeHandles, renderItem } = this.props;

    if (l.placeholder) {
      return this.renderPlaceholder(l);
    }

    return (
      <Item
        key={l.i}
        type={group}
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
    const { layouts, placeholder } = this.state;
    const { group, accept, style, margin, rowHeight, containerPadding } = this.props;
    const containerStyle: CSSProperties = {
      height: getContainerHeight(layouts, {
        margin,
        rowHeight,
        containerPadding,
      }),
      ...style,
    };

    return (
      <Droppable
        group={group}
        accept={accept}
        onDrop={this.onDrop}
        onHover={this.hover}
        onEnter={this.enter}
      >
        <div ref={this.containerRef} className={prefixCls} style={containerStyle}>
          {this.renderPlaceholder(placeholder)}
          {layouts.map(this.renderItem)}
        </div>
      </Droppable>
    );
  }
}

export default Layout;
