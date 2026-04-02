import React, { MouseEvent, SyntheticEvent, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ResizableBox, ResizeCallbackData, ResizeHandle } from 'react-resizable';
import { prefixCls } from '../../constants';
import { PositionLayoutItemProps } from '../../types';
import Draggable from '../Draggable';
import { calculateResizedItem, ResizeBounds } from './utils/resize';
import { normalizeZIndex } from './z-index';

const positionLayoutItemCls = `${prefixCls}-position-layout-item`;

const handleEvent = (event: MouseEvent<HTMLSpanElement>) => {
  event.stopPropagation();
};

const PositionLayoutItem: React.FC<PositionLayoutItemProps> = React.memo((props) => {
  const {
    children,
    data,
    type,
    source,
    draggable = true,
    resizeHandles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'],
    onDragStart,
    onDragEnd,
    onResize,
    onResizeStop,
    onSelect,
    selected = false,
  } = props;

  const style = {
    transform: `translate(${data.x}px, ${data.y}px)`,
    width: `${data.w}px`,
    height: `${data.h}px`,
    zIndex: normalizeZIndex(data.zIndex),
  };
  const boxRef = useRef(null);
  const stateRef = useRef<{ resizeBounds: ResizeBounds }>({
    resizeBounds: {
      containerWidth: Infinity,
      containerHeight: Infinity,
      initialRight: 0,
      initialBottom: 0,
    },
  });

  const handleResizeStart = (e: SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();

    stateRef.current.resizeBounds = {
      containerWidth: source.offsetWidth,
      containerHeight: source.offsetHeight,
      // Keep the opposite edges anchored when resizing from west/north handles.
      initialRight: data.x + data.w,
      initialBottom: data.y + data.h,
    };
  };

  const getResizingData = (callbackData: ResizeCallbackData) => {
    return calculateResizedItem(data, callbackData, stateRef.current.resizeBounds);
  };

  // 处理调整大小
  const handleResize = (e: SyntheticEvent, callbackData: ResizeCallbackData) => {
    const el = ReactDOM.findDOMNode(boxRef.current) as HTMLElement;
    const newData = getResizingData(callbackData);

    onResize?.(newData, el, callbackData);
  };

  // 处理调整大小结束
  const handleResizeStop = (e: SyntheticEvent, callbackData: ResizeCallbackData) => {
    const newData = getResizingData(callbackData);

    onResizeStop?.(newData);
  };

  const renderResizeHandle = (axis: ResizeHandle, ref: React.Ref<HTMLElement>) => {
    if (!selected) return null;

    return (
      <span
        ref={ref}
        className={`pl-resizable-handle-${axis} pl-resizable-handle`}
        onClick={handleEvent}
        onMouseDown={handleEvent}
      />
    );
  };

  const connectDrag = (_, drag) => {
    if (!boxRef.current) return;

    const dom = ReactDOM.findDOMNode(boxRef.current);

    drag(dom);
  };

  const handleSelect = (e: MouseEvent<HTMLSpanElement>) => {
    if (e.buttons !== 1) return;

    e.stopPropagation();
    onSelect?.(data);
  };

  return (
    <Draggable
      draggable={draggable && data.draggable !== false}
      data={data}
      type={type}
      connectDrag={connectDrag}
      useDragPreview={false}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <ResizableBox
        {...{ style }}
        ref={boxRef}
        width={data.w}
        height={data.h}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        resizeHandles={selected ? resizeHandles : []}
        handle={renderResizeHandle as any}
        className={`${positionLayoutItemCls}${
          selected ? ` ${positionLayoutItemCls}-selected` : ''
        }`}
        data-position-layout-item-id={data.i}
        data-selected={selected}
        minConstraints={[10, 10]}
        draggableOpts={{
          enableUserSelectHack: false,
        }}
      >
        <div className={`${positionLayoutItemCls}-content`} onMouseDown={handleSelect}>
          {children}
        </div>
      </ResizableBox>
    </Draggable>
  );
});

export default PositionLayoutItem;
