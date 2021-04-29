import { isValidElement } from 'react';
import { useDrop } from 'react-dnd';
import { DroppableProps } from '../types';

const Droppable: React.FC<DroppableProps> = (props) => {
  const { accept, children, onDrop, onHover, onEnter } = props;
  const [, connect] = useDrop(
    () => ({
      accept,
      drop(_item: unknown, monitor) {
        const item = monitor.getItem();

        onDrop?.(item);
      },
      hover: (item, monitor) => {
        const offset = monitor.getSourceClientOffset();

        if (monitor.isOver({ shallow: true })) {
          onHover?.(item, offset);
        } else {
          onEnter?.(item, offset);
        }
      },
    }),
    [accept, onDrop, onHover]
  );

  if (isValidElement(children)) {
    return connect(children);
  }

  return null;
};

export default Droppable;
