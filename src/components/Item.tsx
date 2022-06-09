import throttle from 'lodash.throttle';
import React, { PureComponent, SyntheticEvent } from 'react';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { prefixCls } from '../constants';
import { ItemProps, ItemStates, LayoutItem, PositionParams, Size } from '../types';
import { calcGridItemPosition, calcWH, getWH, setTransform } from '../utils';
import Draggable from './Draggable';

type ResizeEventType = 'onResizeStart' | 'onResize' | 'onResizeStop';

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
  state: ItemStates = {
    resizing: null,
    direction: '',
  };

  pickProps(props: ItemProps) {
    const { isDragging, placeholder, ...restProps } = props;

    return restProps;
  }

  setResizing(resizing: Size) {
    this.setState({ resizing });
  }

  handleResize = (
    e: SyntheticEvent,
    callbackData: ResizeCallbackData,
    evtType: ResizeEventType
  ) => {
    const { data, leftSpacing } = this.props;
    const { size, handle } = callbackData;

    if (evtType === 'onResizeStart') {
      this.setState({ direction: handle });
    } else if (evtType === 'onResizeStop') {
      this.setState({ direction: '' });
    }
    const positionParams = getPositionParams(this.props);
    const { w, h } = calcWH(positionParams, size.width, size.height, data.x, data.y, leftSpacing);
    const item = {
      ...data,
      w,
      h,
    };
    const wh = getWH(item, positionParams, leftSpacing);

    e.preventDefault();
    e.stopPropagation();

    this.setResizing(evtType === 'onResizeStop' ? null : size);
    this.props[evtType]?.(data, wh.w, wh.h, handle);
  };

  onResizeStart = (e: SyntheticEvent, callbackData: ResizeCallbackData) => {
    this.handleResize(e, callbackData, 'onResizeStart');
  };

  onResize = throttle((e: SyntheticEvent, callbackData: ResizeCallbackData) => {
    this.handleResize(e, callbackData, 'onResize');
  }, 200);

  onResizeStop = (e: SyntheticEvent, callbackData: ResizeCallbackData) => {
    this.handleResize(e, callbackData, 'onResizeStop');
  };

  render() {
    const {
      type,
      style,
      data,
      resizeHandles,
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
      placeholder,
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

    return (
      <ResizableBox
        {...restProps}
        {..._style}
        width={position.width}
        height={position.height}
        onResizeStart={this.onResizeStart}
        onResize={this.onResize}
        onResizeStop={this.onResizeStop}
        resizeHandles={resizeHandles}
        minConstraints={[minWidth, 10]}
        maxConstraints={[maxWidth, Infinity]}
        className={`${prefixCls}-item${
          isDragging && placeholder ? '-placeholder' : ''
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
