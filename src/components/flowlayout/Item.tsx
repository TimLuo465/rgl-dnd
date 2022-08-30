import React, { memo, ReactElement, useRef } from 'react';
import { FlowLayoutItemProps } from '../../types';
import Draggable from '../Draggable';

const FlowLayoutItem: React.FC<FlowLayoutItemProps> = memo((props) => {
  const { children, onDragStart, onDragEnd, data, type } = props;
  const ref: any = useRef();

  const child = React.Children.only(children) as ReactElement;
  const content = React.cloneElement(child, {
    ...child.props,
    drag: ref.current?.drag,
  });

  return (
    <Draggable onDragStart={onDragStart} onDragEnd={onDragEnd} data={data} type={type} ref={ref}>
      {content}
    </Draggable>
  );
});

export default FlowLayoutItem;
