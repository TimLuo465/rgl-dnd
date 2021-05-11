import { isValidElement } from 'react';
import { useDrop } from 'react-dnd';
import { DroppableProps } from '../types';

const Droppable: React.FC<DroppableProps> = (props) => {
  const { accept, children, canDrop, onDrop, onHover } = props;
  const [, connect] = useDrop(
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

        if (monitor.isOver({ shallow: true })) {
          onHover?.(item, offset, itemType);
        }
      },
    }),
    [accept, canDrop, onDrop, onHover]
  );

  if (isValidElement(children)) {
    return connect(children);
  }

  return null;
};

export default Droppable;
