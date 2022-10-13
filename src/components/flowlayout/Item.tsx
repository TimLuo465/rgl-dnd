import React from 'react';
import { FlowLayoutItemProps } from '../../types';
import Draggable from '../Draggable';

const FlowLayoutItem: React.FC<FlowLayoutItemProps> = (props) => {
  const { children, onDragStart, onDragEnd, data, type, draggable = true } = props;

  return (
    <Draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      draggable={draggable && data.draggable !== false}
      data={data}
      type={type}
    >
      {children}
    </Draggable>
  );
};

export default FlowLayoutItem;
