import React, { isValidElement, memo, ReactElement, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { DEFAULT_ITEMTYPE } from '../constants';
import { DraggableProps, DragItem } from '../types';
import { getDragOffset } from '../utils';
import event from './event';

const Draggable: React.FC<DraggableProps> = memo((props) => {
  const {
    type = DEFAULT_ITEMTYPE,
    style,
    data,
    dragOffset,
    draggable = true,
    children,
    connectDrag,
    onDragEnd,
    onDragStart,
  } = props;

  const [, drag, dragPreview] = useDrag(
    () => ({
      type,
      canDrag: draggable,
      item() {
        onDragStart?.(data);

        if (dragOffset) {
          return {
            ...data,
            dragOffset: getDragOffset(),
          };
        }

        return data;
      },
      end(draggedItem: DragItem, monitor) {
        const didDrop = monitor.didDrop();
        const itemType = monitor.getItemType() as string;
        const item = monitor.getItem();

        onDragEnd?.(item, didDrop, itemType);
        event.emit('dragEnd.cardItem', item, didDrop, itemType);
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
    connectDrag?.(data, drag);
  }, []);

  useEffect(() => {
    const { selector = '.custom-drag-layer' } = data;
    const el = document.querySelector(selector);

    if (el) {
      dragPreview(el, { offsetX: 0, offsetY: 0 });
    }
  }, [data]);

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
