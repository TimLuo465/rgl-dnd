import React, { memo, SyntheticEvent, useState } from 'react';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { prefixCls } from '../constants';
import { ItemProps, ItemStates, Size } from '../types';
import { calcGridItemPosition, calcWH, clamp, setTransform } from '../utils';
import Draggable from './Draggable';

type ResizeEventType = 'onResize' | 'onResizeStop';

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
const getPosition = (props: ItemProps, state: ItemStates) => {
  const { data } = props;
  const positionParams = getPositionParams(props);
  const position = calcGridItemPosition(positionParams, data.x, data.y, data.w, data.h, state);

  return setTransform(position);
};

const Item: React.FC<ItemProps> = memo((props: ItemProps) => {
  const {
    type,
    style,
    data,
    cols,
    minW = 1,
    maxW = cols,
    minH = 1,
    maxH = Infinity,
    resizeHandles,
    children,
    onDragStart,
    onDragEnd,
  } = props;
  const [resizing, setResizing] = useState<Size>(null);
  const state = { resizing };
  const position = getPosition(props, state);
  // ResizableBox types definition has no style, but mention in doc
  const _style: any = { style: { ...style, ...position, ...resizing } };
  const handleResize = (
    e: SyntheticEvent,
    callbackData: ResizeCallbackData,
    evtType: ResizeEventType
  ) => {
    const { size } = callbackData;
    let { w, h } = calcWH(getPositionParams(props), size.width, size.height, data.x, data.y);
    let _minW = Math.max(minW, 1);
    let _maxW = Math.min(maxW, cols - data.x);

    w = clamp(w, _minW, _maxW);
    h = clamp(h, minH, maxH);

    setResizing(evtType === 'onResizeStop' ? null : size);
    props[evtType]?.(data, w, h);
  };
  const onResize = (e: SyntheticEvent, callbackData: ResizeCallbackData) => {
    handleResize(e, callbackData, 'onResize');
  };
  const onResizeStop = (e: SyntheticEvent, callbackData: ResizeCallbackData) => {
    handleResize(e, callbackData, 'onResizeStop');
  };

  return (
    <ResizableBox
      {..._style}
      width={position.width}
      height={position.height}
      onResizeStart={onResize}
      onResize={onResize}
      onResizeStop={onResizeStop}
      resizeHandles={resizeHandles}
      className={`${prefixCls}-item`}
    >
      <Draggable
        type={type}
        data={data}
        draggable={data.static !== true}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
      >
        {children}
      </Draggable>
    </ResizableBox>
  );
});

export default Item;
