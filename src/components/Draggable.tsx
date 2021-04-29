import React, { isValidElement, memo, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { DEFAULT_ITEMTYPE } from '../constants';
import { DraggableProps, DragItem } from '../types';

const Draggable: React.FC<DraggableProps> = memo((props: DraggableProps) => {
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
        console.log('end----');
        onDragEnd?.(draggedItem, monitor.didDrop());
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
        item: monitor.getItem(),
        didDrop: monitor.didDrop(),
      }),
    }),
    [type, data, draggable, onDragEnd]
  );

  useEffect(() => {
    if (collected.isDragging) {
      onDragStart?.(collected.item);
    }
  }, [collected.isDragging]);

  if (typeof children === 'string') {
    return (
      <div ref={drag} style={style}>
        {children}
      </div>
    );
  }

  if (isValidElement(children)) {
    return drag(children);
  }

  return null;
});

export default Draggable;
