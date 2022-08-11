import React, { useEffect } from 'react';
import { XYCoord } from 'react-dnd';
import { DEFAULT_FLOW_LAYOUT, DEFAULT_ITEMTYPE, prefixCls } from '../../constants';
import { DragItem, FlowLayoutProps, indicatorInfo, LayoutItemType } from '../../types';
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
import FlowLayoutItem from './FlowLayoutItem';

// 记录指示线位置
let indicator: indicatorInfo = {
  el: null,
  index: -1,
  where: 'before',
};

// 记录正在拖拽的组件，是从哪个流式容器中拖过来的
let preLayoutItem: LayoutItemType | null = null;

const FlowLayout: React.FC<FlowLayoutProps> = (props) => {
  const {
    droppable = true,
    layoutItem,
    EmptyContainer,
    onDrop,
    onHover,
    onDragStart,
    onDragEnd,
    children,
  } = props;

  const containerRef = React.createRef<HTMLDivElement>();

  // 设置指示线位置
  const setIndicatorPosition = ({ height, left, top, width }) => {
    const Indicator = document.querySelector(`.${prefixCls}-indicator`) as HTMLElement;
    Indicator.style.display = 'block';
    Indicator.style.height = height;
    Indicator.style.width = width;
    Indicator.style.left = left;
    Indicator.style.top = top;
  };

  const resetIndicator = () => {
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
  };

  const calcIndicator = (targetNodes: any[], { x, y }: XYCoord) => {
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
  };

  // drop时，更新layouts
  const handleDrop = (dragItem: LayoutItemType, itemType: string) => {
    // 如果当前正在拖动的组件，就是当前容器，那么不触发drop事件
    if (dragItem.i === layoutItem.i) return;

    const draggingItem = { i: UUID(), ...dragItem };
    event.emit('onFlowLayoutDrop', draggingItem);

    const newLayoutItem = JSON.parse(JSON.stringify(layoutItem));
    let newPreLayoutItem = JSON.parse(JSON.stringify(preLayoutItem));
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

      // 如果newPreLayoutItem有值，则表示组件是从其他流式容器内拖入的，需要对之前的流式容器进行过滤，方便删除对应的组件
      if (newPreLayoutItem) {
        newPreLayoutItem.children = newPreLayoutItem?.children?.filter(
          (i: string) => i !== draggingItem.i
        );
      }
    } else {
      // 正在拖拽的组件，就在当前容器中
      newPreLayoutItem = null; // 就在当前容器内进行组件拖拽，不需要记录组件是从哪个流式容器拖拽过来的
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

    onDrop?.(newLayoutItem, newPreLayoutItem, draggingItem, itemType);
  };

  const handleHover = (
    item: LayoutItemType,
    offset: XYCoord,
    itemType: string,
    clientOffset: XYCoord
  ) => {
    // 如果当前正在拖动的组件，就是当前容器，那么不触发hover事件
    if (item.i === layoutItem.i) return;

    const targetNodes: any[] = Array.from(containerRef.current.children);
    calcIndicator(targetNodes, clientOffset);

    event.emit('onFlowLayoutHover', itemType);
    onHover?.(item, itemType);
  };

  const handleDragStart = (draggedItem: DragItem) => {
    preLayoutItem = layoutItem;
    onDragStart?.(draggedItem);
  };

  const handleDragEnd = (draggedItem: DragItem, didDrop: boolean, itemType: string) => {
    preLayoutItem = null;
    onDragEnd?.(draggedItem, didDrop, itemType);
  };

  // const handleDragOver = throttle((e: any) => {
  //   console.log('flow-layout-dragover', e);
  //   e.rgl.stopPropagation();
  //   e.preventDefault();
  //   indicator = {
  //     el: e.target,
  //     index: -1,
  //     where: 'before',
  //   };
  // }, 1000 / 60);

  // useEffect(() => {
  //   const dragOverhandlers = [];
  //   // 给当前容器的子节点，注册dragover事件
  //   containerRef.current?.childNodes?.forEach((el: HTMLElement) => {
  //     // 只有标签节点并且可拖拽的组件，才注册dragover事件
  //     if (el.nodeType === 1 && el.getAttribute('draggable')) {
  //       const dragOverhandler = addRGLEventListener(el, 'dragover', handleDragOver);
  //       dragOverhandlers.push(dragOverhandler);
  //     }
  //   });

  //   return () => {
  //     dragOverhandlers.forEach((item: any) => item());
  //   };
  // }, [containerRef]);

  useEffect(() => {
    // 渲染指示线
    renderIndicator();
    event.on('dragEnd.cardItem', resetIndicator);
    event.on('onLayoutHover', resetIndicator);
    return () => {
      event.off('dragEnd.cardItem', resetIndicator);
      event.off('onLayoutHover', resetIndicator);
    };
  }, []);

  const renderItems = () => {
    if (!checkArray(layoutItem?.children)) {
      // 如果容器内没有子组件，那么默认渲染空容器
      return <EmptyContainer />;
    }

    return React.Children.map(children, (child: React.ReactElement) => {
      if (!child) return null;
      const item = child.props['data-flow'];
      return (
        <FlowLayoutItem
          key={item.i}
          data={item}
          type={DEFAULT_FLOW_LAYOUT}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {React.cloneElement(child, {
            ...child.props,
          })}
        </FlowLayoutItem>
      );
    });
  };

  const { groups } = useLayoutContext();
  return (
    <Droppable canDrop={droppable} accept={groups} onDrop={handleDrop} onHover={handleHover}>
      <div ref={containerRef} className={`${prefixCls}-flow-layout`} style={{ height: '100%' }}>
        {renderItems()}
      </div>
    </Droppable>
  );
};

export default FlowLayout;
