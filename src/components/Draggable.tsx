import React, { forwardRef, isValidElement, memo, useEffect, useImperativeHandle } from 'react';
import { useDrag } from 'react-dnd';
import { DEFAULT_ITEMTYPE } from '../constants';
import { DraggableProps, DragItem, RefType } from '../types';
import event from './event';

const Draggable = memo(
  forwardRef<RefType, DraggableProps>((props, ref) => {
    const {
      type = DEFAULT_ITEMTYPE,
      style,
      data,
      draggable = true,
      children,
      onDragEnd,
      onDragStart,
    } = props;

    const [collected, drag] = useDrag(
      () => ({
        type,
        item: data,
        canDrag: draggable,
        end(draggedItem: DragItem, monitor) {
          const didDrop = monitor.didDrop();
          const itemType = monitor.getItemType() as string;
          event.emit('dragEnd.cardItem', draggedItem, didDrop, itemType);
          onDragEnd?.(draggedItem, didDrop, itemType);
        },
        collect: (monitor) => ({
          isDragging: monitor.isDragging(),
          item: monitor.getItem(),
          didDrop: monitor.didDrop(),
        }),
      }),
      [type, data, draggable, onDragEnd]
    );

    useImperativeHandle(
      ref,
      () => ({
        drag,
      }),
      [drag]
    );

    const { isDragging } = collected;

    useEffect(() => {
      if (isDragging) {
        onDragStart?.(collected.item);
      }
    }, [isDragging]);

    if (typeof children === 'string') {
      return (
        <div ref={drag} style={style}>
          {children}
        </div>
      );
    }

    if (isValidElement(children)) {
      if (typeof children.type !== 'string') {
        return children;
      }
      return drag(children);
    }

    return null;
  })
);

export default Draggable;
