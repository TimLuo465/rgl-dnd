import throttle from 'lodash.throttle';
import React, { useEffect, useState } from 'react';
import { prefixCls } from '../constants';
import { FlowLayoutProps, LayoutItem } from '../types';
import {
  addRGLEventListener,
  checkArray,
  checkObject,
  findPosition,
  getDOMInfo,
  getFlowLayoutItem,
  getNewLayouts,
  movePlaceholder,
} from '../utils';
import Droppable from './Droppable';
import event from './event';
import FlowLayoutItem from './FlowLayoutItem';

const group = new Array(20).fill(1).map((item, index) => {
  return `rgl-dnd-group_${index}`;
});
let indicator = {
  index: -1,
  where: 'before',
};

let preLayoutItem = null;

const FlowLayout: React.FC<FlowLayoutProps> = (props) => {
  const {
    droppable = true,
    layouts: _layouts,
    layoutItem,
    droppingItem,
    empty,
    onDrop,
    onHover,
    onMouseEnter,
    onMouseLeave,
    children,
  } = props;
  const [layouts, setLayouts] = useState<any[]>(_layouts);
  const [flowContainer, setFlowContainer] = useState<any>(null);
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
    const Indicator = document.querySelector(`.${prefixCls}-indicator`) as HTMLElement;
    Indicator.style.display = 'none';
    indicator = {
      index: -1,
      where: 'before',
    };
  };

  // drop时，更新layouts
  const handleDrop = (dragItem: LayoutItem, itemType: string) => {
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
    onDrop?.(newLayouts, dragItem);
  };

  const handleHover = (item: any, offset: any, itemType: string) => {
    if (!checkArray(layoutItem.children)) {
      const position = movePlaceholder(null, flowContainer);
      setIndicatorPosition(position);
    } else {
      if (indicator.index === -1) {
        const index = flowContainer.childNodes.length - 1;
        const el = flowContainer.childNodes[index];
        const position = movePlaceholder({ el, where: 'after' });
        setIndicatorPosition(position);
        indicator = {
          index: index,
          where: 'after',
        };
      }
    }
    event.emit('overFlowLayout');
    onHover?.();
  };

  const handleDragStart = () => {
    preLayoutItem = layoutItem;
  };

  const handleDragEnd = () => {
    preLayoutItem = null;
  };

  const renderItems = () => {
    return React.Children.map(children, (child: any, index: number) => {
      const item = child.props['data-flow'];

      return (
        <FlowLayoutItem
          key={index}
          data={getFlowLayoutItem(layouts, item.i)}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
        >
          {React.cloneElement(child, {
            ...child.props,
          })}
        </FlowLayoutItem>
      );
    });
  };

  const handleDragOver = (index?: number) => {
    return throttle((e) => {
      // console.log('dragover----------', index);
      const { clientX: x, clientY: y } = e;
      const indicatorInfo = findPosition(e.target, getDOMInfo(e.target), x, y);
      const position = movePlaceholder(indicatorInfo);
      setIndicatorPosition(position);
      indicator = {
        index,
        where: indicatorInfo.where,
      };
    }, 1000 / 60);
  };

  useEffect(() => {
    // console.log(_layouts, '_layouts_layouts_layouts_layouts_layouts');
    setLayouts(_layouts);
    const dragOverhandlers = [];
    setFlowContainer(containerRef.current);
    containerRef.current?.childNodes?.forEach((el: HTMLElement, index: number) => {
      const dragOverhandler = addRGLEventListener(el, 'dragover', (e) => {
        e.rgl.stopPropagation();
        e.preventDefault();
        handleDragOver(index)(e);
      });
      dragOverhandlers.push(dragOverhandler);
    });

    return () => {
      dragOverhandlers.forEach((item) => item());
    };
  }, [_layouts]);

  useEffect(() => {
    event.on('dragEnd.cardItem', resetIndicator);
    event.on('overLayout', resetIndicator);
    const Indicator = document.createElement('div');
    Indicator.classList.add(`${prefixCls}-indicator`);
    document.body.appendChild(Indicator);
    return () => {
      Indicator.parentNode.removeChild(Indicator);
      event.off('dragEnd.cardItem', resetIndicator);
      event.off('overLayout', resetIndicator);
    };
  }, []);

  return (
    <Droppable
      canDrop={droppable}
      // accept={[DEFAULT_ITEMTYPE]}
      accept={[...group, 'rgl-dnd-card']}
      onDrop={handleDrop}
      onHover={handleHover}
    >
      <div
        ref={containerRef}
        id="flow-layout"
        className={`${prefixCls}-flow-layout-container`}
        style={{ height: '100%' }}
      >
        {empty ? '请拖入组件' : renderItems()}
      </div>
    </Droppable>
  );
};

export default FlowLayout;
