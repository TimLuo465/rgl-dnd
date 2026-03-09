import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { XYCoord } from 'react-dnd';
import { ResizeCallbackData } from 'react-resizable';
import { DEFAULT_ITEMTYPE, DEFAULT_POSITION_LAYOUT, prefixCls } from '../../constants';
import { LayoutItem, PositionLayoutProps } from '../../types';
import { checkArray } from '../../utils';
import { plus } from '../../utils/number-precision';
import Droppable from '../Droppable';
import event from '../event';
import { useLayoutContext } from '../LayoutContext';
import DragCore from './DragCore';
import Item from './Item';
import { SmartGuides, SmartGuidesRef } from './snap';
import { calculateSnapAndGuides, SnapOptions } from './snap/utils';
import { BoundingBox } from './types';
import {
  calcRect,
  getPlaceholderRect,
  moveItem,
  movePlaceholder,
  renderPlaceholder,
  resetPlaceholder,
} from './utils';

type TransformOpts = SnapOptions & {
  itemRect?: BoundingBox;
};

const PositionLayout: React.FC<PositionLayoutProps> = (props) => {
  const {
    layoutItem,
    className = '',
    canDrop = true,
    droppable = true,
    isEmpty = false,
    empty,
    children,
    onDrop,
    onResizeStop,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const guidesRef = useRef<SmartGuidesRef | null>(null);
  const dragCore = useMemo(() => new DragCore(), []);

  const resetState = useCallback(() => {
    const rect = getPlaceholderRect();

    if (!rect) return;

    guidesRef.current?.setGuides([]);
    dragCore.reset();
    resetPlaceholder();
  }, []);

  const transformItem = (el: HTMLElement, offset: XYCoord, opts?: TransformOpts) => {
    dragCore.calcBounds();
    if (!dragCore.bounds) return;
    dragCore.calcSnapRects(el);
    calcRect(offset, dragCore.bounds, el);

    const itemRect =
      opts?.itemRect ||
      getPlaceholderRect() || {
        x: 0,
        y: 0,
        width: el.offsetWidth || 100,
        height: el.offsetHeight || 50,
      };
    const { snappedRect, guides: newGuides } = calculateSnapAndGuides(
      itemRect,
      dragCore.snapRects || [],
      opts
    );

    guidesRef.current?.setGuides(newGuides);

    moveItem(el, snappedRect);
  };

  const handleHover = (item: LayoutItem, offset: XYCoord, itemType: string) => {
    // 如果当前正在拖动的组件，就是当前容器，那么不触发hover事件
    if (item.i === layoutItem.i) return;

    const el = item?.extra?.el;
    if (!el) return;

    if (itemType.indexOf(DEFAULT_POSITION_LAYOUT) === 0) {
      transformItem(el, offset);
    } else {
      dragCore.calcBounds();
      if (!dragCore.bounds) return;
      dragCore.calcSnapRects(el.parentElement);
      const useElementSize = !(
        itemType === DEFAULT_ITEMTYPE &&
        !Number.isFinite(item.w) &&
        !Number.isFinite(item.h)
      );
      calcRect(offset, dragCore.bounds, el.parentElement, useElementSize);

      const { x: bx, y: by } = dragCore.bounds;
      const itemRect =
        getPlaceholderRect() || {
          x: 0,
          y: 0,
          width: el.offsetWidth || 100,
          height: el.offsetHeight || 50,
        };
      const { snappedRect, guides: newGuides } = calculateSnapAndGuides(
        itemRect,
        dragCore.snapRects || []
      );

      guidesRef.current?.setGuides(newGuides);

      movePlaceholder(snappedRect, {
        ...snappedRect,
        x: snappedRect.x + bx,
        y: snappedRect.y + by,
      });
    }

    event.emit('hover.otherLayout', itemType);
  };

  const handleDrop = (draggingItem: LayoutItem, itemType: string) => {
    if (!canDrop) {
      event.emit('drop.otherLayout', null, itemType);
      onDrop?.(null, draggingItem, itemType);
      return;
    }
    if (draggingItem.i === layoutItem.i) return;

    const rect = getPlaceholderRect();
    const nextRect = rect || {
      x: Number.isFinite(draggingItem.x) ? draggingItem.x : 0,
      y: Number.isFinite(draggingItem.y) ? draggingItem.y : 0,
      width: Number.isFinite(draggingItem.w) ? draggingItem.w : 100,
      height: Number.isFinite(draggingItem.h) ? draggingItem.h : 50,
    };
    const newDraggingItem = {
      ...draggingItem,
      x: nextRect.x,
      y: nextRect.y,
      w: nextRect.width,
      h: nextRect.height,
    };

    delete newDraggingItem.extra;

    resetState();
    event.emit('drop.otherLayout', newDraggingItem, itemType);
    // 需要放在emit之后，需要先通过emit清空上层Layout的拖拽状态
    onDrop?.(layoutItem, newDraggingItem, itemType);
  };

  const handleResize = (
    item: LayoutItem,
    el: HTMLElement,
    resizeCallbackData: ResizeCallbackData
  ) => {
    dragCore.calcBounds();
    if (!dragCore.bounds) return;
    const { handle } = resizeCallbackData;
    const { x: bx, y: by } = dragCore.bounds;
    const offset = {
      x: plus(item.x, bx),
      y: plus(item.y, by),
    };
    const itemRect = {
      x: item.x,
      y: item.y,
      width: item.w,
      height: item.h,
    };

    transformItem(el, offset, {
      itemRect,
      resizingHandle: handle,
    });
  };

  const handleResizeStop = (item: LayoutItem) => {
    const rect = getPlaceholderRect();
    const nextRect = rect || {
      x: item.x,
      y: item.y,
      width: item.w,
      height: item.h,
    };

    resetState();
    onResizeStop?.({
      ...item,
      x: nextRect.x,
      y: nextRect.y,
      w: nextRect.width,
      h: nextRect.height,
    });
  };

  const renderItems = () => {
    if (!checkArray(layoutItem?.children) || isEmpty) {
      return empty;
    }

    return React.Children.map(children, (child: React.ReactElement) => {
      if (!child) return null;

      const item = child.props['data-position'];

      return (
        <Item
          key={item.i}
          data={item}
          source={containerRef.current}
          type={DEFAULT_POSITION_LAYOUT}
          onResize={handleResize}
          onResizeStop={handleResizeStop}
        >
          {React.cloneElement(child, {
            ...child.props,
          })}
        </Item>
      );
    });
  };

  const { groups } = useLayoutContext();

  useEffect(() => {
    if (containerRef.current) {
      dragCore.init(containerRef.current);
    }
    renderPlaceholder();
    event.on('hover.layout', resetState);
    window.addEventListener('mouseup', resetState);

    return () => {
      dragCore.reset();
      event.off('hover.layout', resetState);
      window.removeEventListener('mouseup', resetState);
    };
  }, []);

  return (
    <Droppable canDrop={droppable} accept={groups} onHover={handleHover} onDrop={handleDrop}>
      <div className={`${prefixCls}-position-layout ${className}`.trim()} ref={containerRef}>
        {renderItems()}
        <SmartGuides ref={guidesRef} />
      </div>
    </Droppable>
  );
};

export default PositionLayout;
