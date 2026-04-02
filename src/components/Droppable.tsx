import React, { isValidElement, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { DroppableProps } from '../types';
import { useDndScrolling } from './scroller';

const Droppable: React.FC<DroppableProps> = (props) => {
  const {
    accept,
    children,
    canDrop,
    scrollbarContainer,
    onDrop,
    onHover,
    onDragLeave,
    onDragEnter,
  } = props;
  const [{ canDrop: _canDrop, isOver }, connect] = useDrop(
    () => ({
      accept: canDrop ? accept : [],
      drop(_item: any, monitor) {
        if (monitor.isOver({ shallow: true })) {
          const { extra, ...pureItem } = monitor.getItem();
          const itemType = monitor.getItemType() as string;

          onDrop?.(pureItem, itemType);
        }
      },
      hover: (item: any, monitor) => {
        if (monitor.isOver({ shallow: true })) {
          const itemType = monitor.getItemType() as string;
          const { x, y } = item.extra.dragOffset;
          let offset = monitor.getSourceClientOffset();
          let clientOffset = monitor.getClientOffset();

          clientOffset = {
            x: clientOffset.x - x,
            y: clientOffset.y - y,
          };
          offset = {
            x: offset.x + x,
            y: offset.y + y,
          };
          onHover?.(item, clientOffset, itemType, offset);
        }
      },
      collect: (monitor) => {
        return {
          isOver: monitor.isOver({ shallow: true }),
          canDrop: monitor.canDrop(),
        };
      },
    }),
    [accept, canDrop, onDrop, onHover]
  );

  useDndScrolling(scrollbarContainer);

  useEffect(() => {
    if (_canDrop && !isOver) {
      onDragLeave?.();
    }
  }, [onDragLeave, _canDrop, isOver]);

  useEffect(() => {
    if (_canDrop && isOver) {
      onDragEnter?.();
    }
  }, [onDragEnter, _canDrop, isOver]);

  if (isValidElement(children)) {
    return connect(children);
  }

  return null;
};

export default Droppable;
