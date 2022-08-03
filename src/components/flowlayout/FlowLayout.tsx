import throttle from 'lodash.throttle';
import React, { useEffect, useState } from 'react';
import { XYCoord } from 'react-dnd';
import { prefixCls } from '../../constants';
import { FlowLayoutProps, indicatorInfo, ItemType, LayoutItem } from '../../types';
import {
  addRGLEventListener,
  checkArray,
  checkObject,
  findPosition,
  getDOMInfo,
  getFlowLayoutItem,
  getNewLayouts,
  movePlaceholder,
  renderIndicator,
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
let preLayoutItem: ItemType | null = null;

const FlowLayout: React.FC<FlowLayoutProps> = (props) => {
  const {
    droppable = true,
    layouts: _layouts,
    layoutItem,
    droppingItem,
    EmptyContainer,
    onDrop,
    onHover,
    children,
  } = props;

  const [layouts, setLayouts] = useState<LayoutItem[]>(_layouts);
  const [flowContainer, setFlowContainer] = useState<HTMLElement | null>(null);
  const containerRef = React.createRef<HTMLDivElement>();

  const moveCardItem = () => {
    return {
      ...droppingItem,
      parentId: layoutItem.i,
    };
  };

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

    const indicatorInfo = findPosition(targetNodes, dimensionsInContainer, x, y);

    const position = movePlaceholder(indicatorInfo);
    console.log(position, 'positionposition');
    setIndicatorPosition(position);
    indicator = indicatorInfo;
  };

  // drop时，更新layouts
  const handleDrop = (dragItem: ItemType, itemType: string) => {
    // 如果当前正在拖动的组件，就是当前容器，那么不触发drop事件
    if (dragItem.i === layoutItem.i && dragItem.isContainer) return;
    const newItem = moveCardItem();
    const newLayoutItem = JSON.parse(JSON.stringify(layoutItem));
    let newPreLayoutItem = JSON.parse(JSON.stringify(preLayoutItem));
    const itemIndex = newLayoutItem.children?.findIndex((item) => item.i === dragItem.i);
    if (itemIndex > -1) {
      newPreLayoutItem = null;
      // 如果dragover的下标和当前正在拖拽dragItem下标相同，则表示不需要更换位置，直接return
      if (indicator.index === itemIndex) return;
      // 正在拖拽的dragItem，正在当前flow-layout中
      if (indicator.index > itemIndex) {
        const insertIndex = indicator.where === 'before' ? indicator.index - 1 : indicator.index;
        const insertItem = newLayoutItem.children.splice(itemIndex, 1)[0];
        newLayoutItem.children.splice(insertIndex, 0, insertItem);
      } else {
        const insertIndex = indicator.where === 'before' ? indicator.index : indicator.index + 1;
        const insertItem = newLayoutItem.children.splice(itemIndex, 1)[0];
        newLayoutItem.children.splice(insertIndex, 0, insertItem);
      }
    } else {
      // 正在拖拽的dragItem，不在当前flow-layout中，此时可能是新拖入的，也可能是别的flow-layout中拖入的
      if (checkArray(newLayoutItem.children)) {
        const insertIndex = indicator.where === 'before' ? indicator.index : indicator.index + 1;
        if (checkObject(dragItem)) {
          dragItem.parentId = newLayoutItem.i;
          newLayoutItem.children.splice(insertIndex, 0, dragItem);
        } else {
          // 新拖入的组件，直接插入children即可
          newLayoutItem.children.splice(insertIndex, 0, newItem);
        }
      } else {
        // children属性不存在的情况，直接插入对应组件即可
        if (checkObject(dragItem)) {
          dragItem.parentId = newLayoutItem.i;
          newLayoutItem.children = [dragItem];
        } else {
          // 新拖入的组件，直接插入children即可
          newLayoutItem.children = [newItem];
        }
      }
      if (newPreLayoutItem) {
        newPreLayoutItem.children = newPreLayoutItem?.children?.filter(
          (item) => item.i !== dragItem.i
        );
      }
    }
    const newLayouts = getNewLayouts(layouts, newLayoutItem, newPreLayoutItem);
    event.emit('onFlowLayoutDrop', dragItem);
    onDrop?.(newLayouts, dragItem);
  };

  const handleHover = (
    item: ItemType,
    offset: XYCoord,
    itemType: string,
    clientOffset: XYCoord
  ) => {
    // 如果当前正在拖动的组件，就是当前容器，那么不触发hover事件
    if (item.isContainer && item.i === layoutItem.i) return;

    const { x, y } = clientOffset;
    const targetNodes: any[] = indicator.el
      ? Array.from(indicator.el.parentNode.children)
      : Array.from(flowContainer.children);

    calcIndicator(targetNodes, clientOffset);

    event.emit('onFlowLayoutHover');
    onHover?.(item, itemType);
  };

  const handleDragStart = () => {
    preLayoutItem = layoutItem;
  };

  const handleDragEnd = () => {
    preLayoutItem = null;
  };

  const handleDragOver = throttle((e: any) => {
    e.rgl.stopPropagation();
    e.preventDefault();
    indicator = {
      el: e.target,
      index: -1,
      where: 'before',
    };
  }, 1000 / 60);

  useEffect(() => {
    setLayouts(_layouts);
    setFlowContainer(containerRef.current);

    const dragOverhandlers = [];
    // 给当前容器的子节点，注册dragover事件
    containerRef.current?.childNodes?.forEach((el: HTMLElement, index: number) => {
      // 只有标签节点并且可拖拽的组件，才注册dragover事件
      if (el.nodeType === 1 && el.getAttribute('draggable')) {
        const dragOverhandler = addRGLEventListener(el, 'dragover', handleDragOver);
        dragOverhandlers.push(dragOverhandler);
      }
    });

    return () => {
      dragOverhandlers.forEach((item: any) => item());
    };
  }, [_layouts]);

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
    if (!checkArray(layoutItem.children)) {
      // 如果容器内没有子组件，那么默认渲染空容器
      return <EmptyContainer />;
    }

    return React.Children.map(children, (child: React.ReactElement, index: number) => {
      const item = child.props['data-flow'];
      return (
        <FlowLayoutItem
          key={index}
          data={getFlowLayoutItem(layouts, item.i)}
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

  // 获取layout组件中的分组数据，设置accept
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
