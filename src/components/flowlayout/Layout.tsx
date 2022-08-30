import React, { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { XYCoord } from 'react-dnd';
import {
  DEFAULT_FLOW_LAYOUT,
  DEFAULT_ITEMTYPE,
  DEFAULT_MARGIN,
  DEFAULT_MAXROWS,
  prefixCls,
} from '../../constants';
import { DragItem, FlowLayoutProps, indicatorInfo, LayoutItem } from '../../types';
import {
  checkArray,
  findPosition,
  getDOMInfo,
  movePlaceholder,
  renderIndicator,
  UUID,
} from '../../utils';
import Droppable from '../Droppable';
import event from '../event';
import { useLayoutContext } from '../LayoutContext';
import Item from './Item';

function useEvent(handler) {
  const handlerRef = useRef(null);

  // In a real implementation, this would run before layout effects
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  return useCallback((...args) => {
    // In a real implementation, this would throw if called during render
    const fn = handlerRef.current;
    return fn(...args);
  }, []);
}

// 记录指示线位置
let indicator: indicatorInfo = {
  el: null,
  index: -1,
  where: 'before',
};

const FlowLayout: React.FC<FlowLayoutProps> = memo((props, ref) => {
  const {
    layoutItem,
    canDrop = true,
    rowHeight = 1,
    maxRows = DEFAULT_MAXROWS,
    margin = DEFAULT_MARGIN,
    empty,
    onDrop,
    onHover,
    onDragStart,
    onDragEnd,
    children,
  } = props;

  const containerRef = React.createRef<HTMLDivElement>();

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

  const calcIndicator = useEvent((targetNodes: any[], { x, y }: XYCoord) => {
    const dimensionsInContainer = targetNodes
      ? targetNodes.reduce((result: any[], el: HTMLElement) => {
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
      event.emit('drop.flowLayout', null, itemType);
      onDrop(null, dragItem, itemType);
      return;
    }
    // 如果当前正在拖动的组件，就是当前容器，那么不触发drop事件
    if (dragItem.i === layoutItem.i) return;
    const draggingItem = { i: UUID(), ...dragItem };

    const newLayoutItem = JSON.parse(JSON.stringify(layoutItem));
    const itemIndex = newLayoutItem.children?.findIndex((i: string) => i === draggingItem.i);
    // 新拖入的组件，或者是从其他其他容器内拖入的情况
    if (itemType === DEFAULT_ITEMTYPE || (itemIndex && itemIndex === -1)) {
      if (checkArray(newLayoutItem.children)) {
        // 如果当前容器内有组件，那么将新拖入的组件插入对应的位置
        const insertIndex = indicator.where === 'before' ? indicator.index : indicator.index + 1;
        newLayoutItem.children.splice(insertIndex, 0, draggingItem.i);
      } else {
        // 如果当前容器没有组件，直接插入children即可
        newLayoutItem.children = [draggingItem.i];
      }
      event.emit('drop.flowLayout', draggingItem, itemType);
    } else {
      // 正在拖拽的组件，就在当前容器中
      // 如果dragover的下标和当前正在拖拽dragItem下标相同，则表示不需要更换位置，直接return
      if (indicator.index === itemIndex) return;
      // 将组件插入到对应的位置
      if (indicator.index > itemIndex) {
        const insertIndex = indicator.where === 'before' ? indicator.index - 1 : indicator.index;
        const insertItem = newLayoutItem.children.splice(itemIndex, 1)[0];
        newLayoutItem.children.splice(insertIndex, 0, insertItem);
      } else {
        const insertIndex = indicator.where === 'before' ? indicator.index : indicator.index + 1;
        const insertItem = newLayoutItem.children.splice(itemIndex, 1)[0];
        newLayoutItem.children.splice(insertIndex, 0, insertItem);
      }
    }

    onDrop?.(newLayoutItem, draggingItem, itemType);
  });

  const handleHover = useEvent(
    (item: LayoutItem, offset: XYCoord, itemType: string, clientOffset: XYCoord) => {
      // 如果当前正在拖动的组件，就是当前容器，那么不触发hover事件
      if (item.i === layoutItem.i) return;

      if (checkArray(layoutItem.children)) {
        const targetNodes: any[] = Array.from(containerRef.current.children);
        calcIndicator(targetNodes, clientOffset);
      } else {
        const position = movePlaceholder({}, containerRef.current);
        setIndicatorPosition(position);
      }

      event.emit('hover.flowLayout', itemType);
      onHover?.(item, itemType);
    }
  );

  const handleDragStart = useCallback((draggedItem: DragItem) => {
    onDragStart?.(draggedItem);
  }, []);

  const handleDragEnd = useCallback((draggedItem: DragItem, didDrop: boolean, itemType: string) => {
    onDragEnd?.(draggedItem, didDrop, itemType);
  }, []);

  useEffect(() => {
    // 渲染指示线
    renderIndicator();
    event.on('dragEnd.cardItem', resetIndicator);
    event.on('hover.layout', resetIndicator);

    return () => {
      event.off('dragEnd.cardItem', resetIndicator);
      event.off('hover.layout', resetIndicator);
    };
  }, []);

  const renderItems = () => {
    if (!checkArray(layoutItem?.children)) {
      return empty;
    }

    return React.Children.map(children, (child: React.ReactElement) => {
      if (!child) return null;
      const item = child.props['data-flow'];
      return (
        <Item
          key={item.i}
          data={item}
          type={DEFAULT_FLOW_LAYOUT}
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
    <Droppable canDrop={true} accept={groups} onDrop={handleDrop} onHover={handleHover}>
      <div ref={containerRef} className={`${prefixCls}-flow-layout`}>
        {renderItems()}
      </div>
    </Droppable>
  );
});

export default FlowLayout;
