import React, { isValidElement, memo, ReactElement, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { DEFAULT_ITEMTYPE } from '../constants';
import { DraggableProps, DragItem } from '../types';
import event from './event';

const Draggable: React.FC<DraggableProps> = memo((props) => {
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
        onDragEnd?.(draggedItem, didDrop, itemType);
        event.emit('dragEnd.cardItem', draggedItem, didDrop, itemType);
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
        item: monitor.getItem(),
        didDrop: monitor.didDrop(),
      }),
    }),
    [type, data, draggable, onDragEnd]
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
      const child = React.Children.only(children) as ReactElement;
      const content = React.cloneElement(child, {
        ...child.props,
        drag,
      });
      return content;
    }
    return drag(children);
  }

  return null;
});

export default Draggable;
