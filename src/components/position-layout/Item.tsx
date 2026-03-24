import React, { MouseEvent, SyntheticEvent, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ResizableBox, ResizeCallbackData, ResizeHandle } from 'react-resizable';
import { prefixCls } from '../../constants';
import { PositionLayoutItemProps } from '../../types';
import { minus, plus } from '../../utils/number-precision';
import Draggable from '../Draggable';
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
  const stateRef = useRef({
    bounds: { minWidth: 0, minHeight: 0, width: Infinity, height: Infinity },
  });

  const handleResizeStart = (e: SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();

    stateRef.current.bounds = {
      width: source.offsetWidth,
      height: source.offsetHeight,
      minWidth: data.x + data.w,
      minHeight: data.y + data.h,
    };
  };

  const getResizingData = (callbackData: ResizeCallbackData) => {
    const { size, handle } = callbackData;
    const { width, height, minWidth, minHeight } = stateRef.current.bounds;
    const newData = {
      ...data,
      w: Math.round(size.width),
      h: Math.round(size.height),
    };

    // 顶部拉伸
    if (handle.indexOf('n') > -1) {
      const newY = data.y + minus(data.h, size.height);

      if (newY < 0) {
        newData.y = 0;
        // 当用户一直朝顶部拉伸时，为了禁止超出容器的范围，需要对高度进行校正，加上newY(为负数)的长度
        // 且不能超过最小高度(初始item.y+item.h)，否则会出现高度越来越小的情况
        newData.h = Math.max(minHeight, plus(newData.h, newY));
      } else {
        newData.y = newY;
      }
    }

    // 左侧拉伸
    if (handle.indexOf('w') > -1) {
      // 左侧向右拉伸
      const newX = data.x + minus(data.w, size.width);

      if (newX < 0) {
        newData.x = 0;
        // 同y逻辑相同
        newData.w = Math.max(minWidth, plus(newData.w, newX));
      } else {
        newData.x = newX;
      }
    }

    if (data.x + newData.w > width) {
      newData.w = minus(width, data.x);
    }

    if (data.y + newData.h > height) {
      newData.h = minus(height, data.y);
    }

    return newData;
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
        className={`react-resizable-handle-${axis} ${positionLayoutItemCls}-handle`}
        data-position-layout-handle={axis}
        data-axis={axis}
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
