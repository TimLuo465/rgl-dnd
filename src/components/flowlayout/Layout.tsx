import React, { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { XYCoord } from 'react-dnd';
import {
  DEFAULT_FLOW_LAYOUT,
  DEFAULT_ITEMTYPE,
  DEFAULT_POSITION_LAYOUT,
  prefixCls,
} from '../../constants';
import { DragItem, FlowLayoutProps, LayoutItem, indicatorInfo } from '../../types';
import {
  DragSourceVisibilityController,
  UUID,
  checkArray,
  findPosition,
  getDOMInfo,
  movePlaceholder,
  renderIndicator,
} from '../../utils';
import Droppable from '../Droppable';
import { useLayoutContext } from '../LayoutContext';
import event from '../event';
import Item from './Item';

function useEvent<T extends (...args: unknown[]) => unknown>(handler: T): T {
  const handlerRef = useRef<T>(handler);

  // In a real implementation, this would run before layout effects
  useLayoutEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  return useCallback((...args: Parameters<T>) => {
    // In a real implementation, this would throw if called during render
    const fn = handlerRef.current;
    return fn(...args);
  }, []) as T;
}

// 记录指示线位置
let indicator: indicatorInfo = {
  el: null,
  index: -1,
  where: 'before',
};

const faultToleranceValue = 10;

const FlowLayout: React.FC<FlowLayoutProps> = memo((props, ref) => {
  const {
    id = '',
    layoutItem,
    canDrop = true,
    classNameStr = '',
    droppable = true,
    itemDraggable = true,
    allowOutBoundedDrop = true,
    isEmpty = false,
    empty,
    collectDrag,
    onDrop,
    onHover,
    onDragStart,
    onDragEnd,
    children,
  } = props;

  const containerRef = useRef<HTMLDivElement>();
  const dragSourceVisibility = useRef(new DragSourceVisibilityController());

  const hideDragSource = useEvent((item: DragItem) => {
    dragSourceVisibility.current.hide(item);
  });

  const restoreHiddenDragSource = useEvent(() => {
    dragSourceVisibility.current.restore();
  });

  // 设置指示线位置
  const setIndicatorPosition = useEvent(({ height, left, top, width }) => {
    const indicator = document.querySelector(`.${prefixCls}-indicator`) as HTMLElement;
    const backgroundColor = canDrop ? 'rgb(98, 196, 98)' : 'rgb(231, 54, 51)';
    indicator.style.cssText = `display:block;height:${height};
      width:${width};
      left:${left};
      top:${top};
      background-color:${backgroundColor}`;
  });

  const resetIndicator = useCallback(() => {
    // 重置指示线
    indicator = {
      el: null,
      index: -1,
      where: 'before',
    };

    const Indicator = document.querySelector(`.${prefixCls}-indicator`) as HTMLElement;
    if (Indicator) {
      Indicator.style.display = 'none';
    }
  }, []);

  const calcIndicator = useEvent((targetNodes: HTMLElement[], { x, y }: XYCoord) => {
    const dimensionsInContainer = targetNodes
      ? targetNodes.reduce((result: Array<ReturnType<typeof getDOMInfo>>, el: HTMLElement) => {
          const domInfo = getDOMInfo(el);
          result.push(domInfo);
          return result;
        }, [])
      : [];

    const indicatorPosition = findPosition(targetNodes, dimensionsInContainer, x, y);

    const position = movePlaceholder(indicatorPosition);

    setIndicatorPosition(position);
    indicator = indicatorPosition;
  });

  // drop时，更新layouts
  const handleDrop = useEvent((dragItem: LayoutItem, itemType: string) => {
    if (!canDrop) {
      event.emit('drop.otherLayout', null, itemType);
      onDrop?.(null, dragItem, itemType);
      return;
    }
    // 如果当前正在拖动的组件，就是当前容器，那么不触发drop事件
    if (dragItem.i === layoutItem.i) return;
    const draggingItem = { i: UUID(), ...dragItem };

    const newLayoutItem = JSON.parse(JSON.stringify(layoutItem)) as LayoutItem;
    const nextChildren = Array.isArray(newLayoutItem.children) ? [...newLayoutItem.children] : [];
    const itemIndex = nextChildren.findIndex((i: string) => i === draggingItem.i);
    const isNewItem = itemType === DEFAULT_ITEMTYPE || itemIndex === -1;
    event.emit('drop.otherLayout', draggingItem, itemType);

    // 新拖入的组件，或者是从其他其他容器内拖入的情况
    if (isNewItem) {
      if (nextChildren.length && !isEmpty) {
        // 如果当前容器内有组件，那么将新拖入的组件插入对应的位置
        const insertIndex = indicator.where === 'before' ? indicator.index : indicator.index + 1;
        nextChildren.splice(insertIndex, 0, draggingItem.i);
      } else {
        // 如果当前容器没有组件，直接插入children即可
        nextChildren.push(draggingItem.i);
      }
    } else {
      // 正在拖拽的组件，就在当前容器中
      // 如果dragover的下标和当前正在拖拽dragItem下标相同，则表示不需要更换位置，直接return
      if (indicator.index === itemIndex) return;
      // 将组件插入到对应的位置
      if (indicator.index > itemIndex) {
        const insertIndex = indicator.where === 'before' ? indicator.index - 1 : indicator.index;
        const insertItem = nextChildren.splice(itemIndex, 1)[0];
        nextChildren.splice(insertIndex, 0, insertItem);
      } else {
        const insertIndex = indicator.where === 'before' ? indicator.index : indicator.index + 1;
        const insertItem = nextChildren.splice(itemIndex, 1)[0];
        nextChildren.splice(insertIndex, 0, insertItem);
      }
    }

    newLayoutItem.children = nextChildren;
    onDrop?.(newLayoutItem, draggingItem, itemType);
  });

  const handleHover = useEvent(
    (item: LayoutItem, _offset: XYCoord, itemType: string, clientOffset: XYCoord) => {
      // 如果当前正在拖动的组件，就是当前容器，那么不触发hover事件
      if (item.i === layoutItem.i) return;
      if (itemType === DEFAULT_POSITION_LAYOUT) {
        hideDragSource(item);
      }

      if (checkArray(layoutItem.children) && !isEmpty) {
        const targetNodes = Array.from(containerRef.current?.children || []) as HTMLElement[];
        calcIndicator(targetNodes, clientOffset);
      } else {
        const position = movePlaceholder({}, containerRef.current);
        setIndicatorPosition(position);
      }

      event.emit('hover.otherLayout', itemType);
      onHover?.(item, itemType);
    }
  );

  const handleDragStart = useCallback(
    (draggedItem: DragItem) => {
      onDragStart?.(draggedItem);
    },
    [onDragStart]
  );

  const handleDragEnd = useCallback(
    (draggedItem: DragItem, didDrop: boolean, itemType: string) => {
      const isMoveOut = !indicator.el;

      onDragEnd?.(draggedItem, didDrop, itemType, isMoveOut);
    },
    [onDragEnd]
  );

  const handleCardDragEnd = useEvent((item: DragItem, didDrop: boolean, itemType: string) => {
    if (!didDrop) {
      if (allowOutBoundedDrop) {
        const indicator = document.querySelector(`.${prefixCls}-indicator`) as HTMLElement;
        const { left, right, top, bottom } = indicator.getBoundingClientRect() as DOMRect;
        const {
          left: cLeft,
          right: cRight,
          top: cTop,
          bottom: cBottom,
        } = containerRef.current.getBoundingClientRect() as DOMRect;
        if (
          left >= cLeft - faultToleranceValue &&
          right <= cRight + faultToleranceValue &&
          top >= cTop - faultToleranceValue &&
          bottom <= cBottom + faultToleranceValue
        ) {
          handleDrop(item as LayoutItem, itemType);
          resetIndicator();
        }
      } else {
        event.emit('drop.otherLayout', null, itemType);
      }
    } else {
      resetIndicator();
    }

    restoreHiddenDragSource();
  });

  useEffect(() => {
    // 渲染指示线
    renderIndicator();
    event.on('dragEnd.cardItem', handleCardDragEnd);
    event.on('hover.layout', resetIndicator);

    return () => {
      event.off('dragEnd.cardItem', handleCardDragEnd);
      event.off('hover.layout', resetIndicator);
      restoreHiddenDragSource();
    };
  }, []);

  const renderItems = () => {
    if (!checkArray(layoutItem?.children) || isEmpty) {
      return empty;
    }

    return React.Children.map(children, (child: React.ReactElement<any>) => {
      if (!child) return null;
      const item = child.props['data-flow'];
      return (
        <Item
          key={item.i}
          data={item}
          type={DEFAULT_FLOW_LAYOUT}
          draggable={itemDraggable}
          connectDrag={collectDrag}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {React.cloneElement(child, {
            ...child.props,
          })}
        </Item>
      );
    });
  };

  const { groups } = useLayoutContext();

  return (
    <Droppable canDrop={droppable} accept={groups} onDrop={handleDrop} onHover={handleHover}>
      <div id={id} ref={containerRef} className={`${prefixCls}-flow-layout ${classNameStr}`.trim()}>
        {renderItems()}
      </div>
    </Droppable>
  );
});

export default FlowLayout;
