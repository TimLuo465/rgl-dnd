import throttle from 'lodash.throttle';
import React, { PureComponent, SyntheticEvent } from 'react';
import ReactDOM from 'react-dom';
import { ResizableBox, ResizeCallbackData, ResizeHandle } from 'react-resizable';
import { prefixCls } from '../constants';
import { ItemProps, ItemStates, LayoutItem, PositionParams, Size } from '../types';
import { calcGridItemPosition, calcWH, getWH, setTransform } from '../utils';
import Draggable from './Draggable';

// 如果是流式容器，默认只能左右拉伸
const flowLayoutHandles: ResizeHandle[] = ['w', 'e'];

const getPositionParams = (props: ItemProps) => {
  const { margin, containerPadding, cols, containerWidth, rowHeight, maxRows } = props;

  return {
    margin,
    containerPadding,
    cols,
    containerWidth,
    rowHeight,
    maxRows,
  };
};
const getPosition = (data: LayoutItem, positionParams: PositionParams, state: ItemStates) => {
  const position = calcGridItemPosition(positionParams, data.x, data.y, data.w, data.h, state);
  return setTransform(position);
};

export default class Item extends PureComponent<ItemProps, ItemStates> {
  itemRef = React.createRef<any>();

  state: ItemStates = {
    resizing: null,
    direction: '',
  };

  componentDidMount() {
    const { data } = this.props;
    const itemDOM = ReactDOM.findDOMNode(this.itemRef.current);

    this.props.onMount?.(data, itemDOM as HTMLDivElement);
  }

  componentWillUnmount() {
    const { data } = this.props;
    this.props.onUnmount?.(data, this.itemRef.current);
  }

  pickProps(props: ItemProps) {
    const { isDragging, ...restProps } = props;

    return restProps;
  }

  setResizing(resizing: Size) {
    this.setState({ resizing });
  }

  onResizeStart = (e: SyntheticEvent, callbackData: ResizeCallbackData) => {
    e.preventDefault();
    e.stopPropagation();
    const { data } = this.props;
    const { size, handle } = callbackData;
    this.setState({ direction: handle });
    this.setResizing(size);
    this.props.onResizeStart?.(data);
  };

  onResize = throttle((e: SyntheticEvent, callbackData: ResizeCallbackData) => {
    e.preventDefault();
    e.stopPropagation();

    const { data, leftSpacing } = this.props;
    const { size, handle } = callbackData;
    const { direction } = this.state;

    const positionParams = getPositionParams(this.props);
    const { w, h } = calcWH(positionParams, size.width, size.height, data.x, data.y, leftSpacing);
    const item = {
      ...data,
      w,
      h,
    };
    const wh = getWH(item, positionParams, leftSpacing);

    // 上下拖拽时，确保w不变
    if (direction === 'n' || direction === 's') {
      wh.w = data.w;
      // 左右拖拽时，确保h不变
    } else if (direction === 'e' || direction === 'w') {
      wh.h = data.h;
    }

    this.setResizing(size);
    this.props.onResize?.(data, wh.w, wh.h, handle);
  }, 1 / 60);

  onResizeStop = (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { data } = this.props;
    this.setState({ direction: '' });
    this.setResizing(null);
    this.props.onResizeStop?.(data);
  };

  getResizeHandles = () => {
    const { resizeHandles, data } = this.props;

    if (data.resizeHandles) return data.resizeHandles;

    return data.autoHeight ? flowLayoutHandles : resizeHandles;
  };

  render() {
    const {
      type,
      style,
      data,
      children,
      onDragStart,
      onDragEnd,
      className = '',
      leftSpacing = 0,
      margin,
      cols,
      containerWidth,
      containerPadding,
      rowHeight,
      maxRows,
      isDragging,
      onMount,
      onUnmount,
      ...restProps
    } = this.props;
    const { resizing, direction } = this.state;
    const positionParams = getPositionParams(this.props);

    const position = getPosition(data, positionParams, this.state);

    const _style: any = { style: { ...style, ...position, ...resizing } };

    const { width: minWidth } = calcGridItemPosition(positionParams, 0, 0, 1, 0);

    let calcOffset = leftSpacing;
    if (direction === 'e' || direction === 'se') {
      calcOffset = 0;
    }
    const { width: maxWidth } = calcGridItemPosition(
      positionParams,
      0,
      0,
      cols - data.x + calcOffset,
      0
    );

    const resizeHandles = this.getResizeHandles();

    return (
      <ResizableBox
        {...restProps}
        {..._style}
        ref={this.itemRef}
        width={position.width}
        height={position.height}
        onResizeStart={this.onResizeStart}
        onResize={this.onResize}
        onResizeStop={this.onResizeStop}
        resizeHandles={resizeHandles}
        minConstraints={[minWidth, 10]}
        maxConstraints={[maxWidth, Infinity]}
        draggableOpts={{
          enableUserSelectHack: false,
        }}
        className={`${prefixCls}-item ${
          data.autoHeight ? `${prefixCls}-autoheight` : ''
        } ${className}`.trim()}
      >
        <Draggable
          type={type}
          data={data}
          draggable={data.static !== true && data.draggable !== false}
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
        >
          {children}
        </Draggable>
      </ResizableBox>
    );
  }
}
