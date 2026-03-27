import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { ResizeCallbackData } from 'react-resizable';
import { DEFAULT_POSITION_LAYOUT, prefixCls } from '../../constants';
import { LayoutItem, PositionLayoutProps, PositionLayoutRef, XYCoord } from '../../types';
import { useEvent } from '../../utils';
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
  getDraggingEl,
  getPlaceholderRect,
  initPlaceholderRect,
  moveItem,
  movePlaceholder,
  renderPlaceholder,
  resetPlaceholder,
} from './utils';
import {
  applyZIndexAction,
  getDefaultDroppedZIndex,
  normalizeZIndex,
  normalizeZIndexLayouts,
  ZIndexAction,
} from './z-index';

type TransformOpts = SnapOptions & {
  itemRect?: BoundingBox;
  itemSize?: { width: number; height: number };
};

const getPositionChildren = (children: React.ReactNode): LayoutItem[] => {
  const items: LayoutItem[] = [];

  React.Children.forEach(children, (child: React.ReactElement) => {
    if (!React.isValidElement(child)) {
      return;
    }

    const item = child.props['data-position'];

    if (item) {
      items.push(item);
    }
  });

  return items;
};

const PositionLayout = React.forwardRef<PositionLayoutRef, PositionLayoutProps>((props, ref) => {
  const {
    layoutItem,
    className = '',
    droppable = true,
    empty = null,
    children,
    selectedItemId = '',
    onDrop,
    onSelect,
    onDragStart,
    onResizeStop,
    onBeforeDrop,
    onBeforeHover,
    onZIndexChange,
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

  const moveLayer = useEvent((itemId: string, action: ZIndexAction) => {
    const positionChildren = getPositionChildren(children);
    // 规则层返回的是“所有受影响元素”的新层级，保证外部可一次性同步。
    const changedItems = applyZIndexAction(positionChildren, itemId, action);

    if (!changedItems || !changedItems.length) return;

    onZIndexChange?.(changedItems);
  });

  useImperativeHandle(
    ref,
    () => ({
      bringForward: (itemId: string) => moveLayer(itemId, 'forward'),
      sendBackward: (itemId: string) => moveLayer(itemId, 'backward'),
      bringToFront: (itemId: string) => moveLayer(itemId, 'front'),
      sendToBack: (itemId: string) => moveLayer(itemId, 'back'),
    }),
    [moveLayer]
  );

  const transformItem = (el: HTMLElement, offset: XYCoord, opts?: TransformOpts) => {
    dragCore.calcBounds();
    dragCore.calcSnapRects(el);
    const size = opts?.itemRect || ({} as any);

    calcRect(offset, dragCore.bounds, size);

    const itemRect = opts?.itemRect || getPlaceholderRect();
    const { snappedRect, guides: newGuides } = calculateSnapAndGuides(
      itemRect,
      dragCore.snapRects,
      opts
    );

    guidesRef.current?.setGuides(newGuides);

    moveItem(el, snappedRect);
  };

  const getHoverItemSize = (item: LayoutItem, itemType: string) => {
    if (itemType.indexOf(DEFAULT_POSITION_LAYOUT) === 0) {
      return {
        width: item.w,
        height: item.h,
      };
    }

    return parentLayout?.getDraggingItemPixelSize(item, itemType);
  };

  const handleHover = (item: LayoutItem, offset: XYCoord, itemType: string) => {
    if (item.i === layoutItem.i) return;

    if (onBeforeHover?.(item, itemType) === false) return;

    const { el } = item.extra;
    const draggingNode = getDraggingEl(el, itemType);

    // 处理本布局的元素拖拽hover
    if (itemType.indexOf(DEFAULT_POSITION_LAYOUT) === 0) {
      initPlaceholderRect(draggingNode);
      transformItem(draggingNode, offset);
      event.emit('hover.otherLayout', itemType);
      return;
    }

    const preferredSize = getHoverItemSize(item, itemType);

    if (!preferredSize) {
      console.warn('item not found w and h props, skip hover.', item);
      return;
    }

    dragCore.calcBounds();
    dragCore.calcSnapRects(draggingNode);
    calcRect(offset, dragCore.bounds, preferredSize);

    const { x: bx, y: by } = dragCore.bounds;
    const itemRect = getPlaceholderRect();
    const { snappedRect, guides: newGuides } = calculateSnapAndGuides(itemRect, dragCore.snapRects);

    guidesRef.current?.setGuides(newGuides);

    movePlaceholder(snappedRect, {
      ...snappedRect,
      x: snappedRect.x + bx,
      y: snappedRect.y + by,
    });

    event.emit('hover.otherLayout', itemType);
  };

  const handleDrop = (draggingItem: LayoutItem, itemType: string) => {
    const rect = getPlaceholderRect();

    if (!rect || draggingItem.i === layoutItem.i) return;

    const childItems = getPositionChildren(children);
    const hasDraggingItem = !!childItems.find((item) => item.i === draggingItem.i);
    const dropType = hasDraggingItem ? 'move' : 'create';

    // 从其他布局拖入元素时，需要检查是否允许拖入
    if (onBeforeDrop?.(draggingItem, itemType, dropType) === false) {
      resetState();
      return;
    }

    // 已有元素再次拖入当前容器时，先做一次归一化，再读取其稳定层级。
    const normalizedChildren = normalizeZIndexLayouts(childItems);
    const normalizedDraggingItem = normalizedChildren.find((item) => item.i === draggingItem.i);
    const newDraggingItem = {
      ...draggingItem,
      x: rect.x,
      y: rect.y,
      w: rect.width,
      h: rect.height,
      // 新拖入元素始终插入顶层；已有元素保留当前（归一化后）层级。
      zIndex: hasDraggingItem
        ? normalizeZIndex(normalizedDraggingItem?.zIndex ?? draggingItem.zIndex)
        : getDefaultDroppedZIndex(childItems),
    };

    resetState();
    event.emit('drop.otherLayout', newDraggingItem, itemType);

    // 需要放在emit之后，需要先通过emit清空上层Layout的拖拽状态
    onDrop?.(layoutItem, newDraggingItem, itemType, dropType);
  };

  const handleResize = (
    item: LayoutItem,
    el: HTMLElement,
    resizeCallbackData: ResizeCallbackData
  ) => {
    dragCore.calcBounds();
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
    if (!rect) return;

    resetState();
    onResizeStop?.({
      ...item,
      x: rect.x,
      y: rect.y,
      w: rect.width,
      h: rect.height,
    });
  };

  const renderItems = () => {
    let isEmpty = false;

    const nodes = React.Children.map(children, (child: React.ReactElement) => {
      if (!child) return null;

      const item = child.props['data-position'];

      isEmpty = false;

      return (
        <Item
          key={item.i}
          data={item}
          source={containerRef.current}
          type={DEFAULT_POSITION_LAYOUT}
          selected={selectedItemId === item.i}
          onResize={handleResize}
          onResizeStop={handleResizeStop}
          onSelect={onSelect}
          onDragStart={onDragStart}
          onDragEnd={resetState}
        >
          {React.cloneElement(child, {
            ...child.props,
          })}
        </Item>
      );
    });

    if (isEmpty) {
      return empty;
    }

    return nodes;
  };

  const { groups, parentLayout } = useLayoutContext();

  useEffect(() => {
    dragCore.init(containerRef.current!);
    renderPlaceholder();
    event.on('hover.layout', resetState);

    return () => {
      event.off('hover.layout', resetState);
    };
  }, []);

  return (
    <Droppable canDrop={droppable} accept={groups} onHover={handleHover} onDrop={handleDrop}>
      <div
        className={`${prefixCls}-position-layout ${className}`.trim()}
        ref={containerRef}
        tabIndex={0}
      >
        {renderItems()}
        <SmartGuides ref={guidesRef} />
      </div>
    </Droppable>
  );
});

PositionLayout.displayName = 'PositionLayout';

export default PositionLayout;
