import React, { isValidElement, memo, ReactElement } from 'react';
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
      canDrag: draggable,
      item() {
        onDragStart?.(data);
        return data
      },
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
