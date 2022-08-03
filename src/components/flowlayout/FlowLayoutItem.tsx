import React from 'react';
import { FlowLayoutItemProps } from '../../types';
import Draggable from '../Draggable';

const FlowLayoutItem: React.FC<FlowLayoutItemProps> = (props) => {
  const { children, onDragStart, onDragEnd, data } = props;

  return (
    <Draggable onDragStart={onDragStart} onDragEnd={onDragEnd} data={data}>
      {children}
    </Draggable>
  );
};

export default FlowLayoutItem;
