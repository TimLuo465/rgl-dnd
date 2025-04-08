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
      drop(_item: unknown, monitor) {
        const item = monitor.getItem();
        const itemType = monitor.getItemType() as string;

        if (monitor.isOver({ shallow: true })) {
          onDrop?.(item, itemType);
        }
      },
      hover: (item, monitor) => {
        const offset = monitor.getSourceClientOffset();
        const itemType = monitor.getItemType() as string;
        const clientOffset = monitor.getClientOffset();
        if (monitor.isOver({ shallow: true })) {
          onHover?.(item, offset, itemType, clientOffset);
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
