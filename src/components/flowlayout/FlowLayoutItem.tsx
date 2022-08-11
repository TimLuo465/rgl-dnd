import React from 'react';
import { FlowLayoutItemProps } from '../../types';
import Draggable from '../Draggable';

const FlowLayoutItem: React.FC<FlowLayoutItemProps> = (props) => {
  const { children, onDragStart, onDragEnd, data, type } = props;

  return (
    <Draggable onDragStart={onDragStart} onDragEnd={onDragEnd} data={data} type={type}>
      {children}
    </Draggable>
  );
};

export default FlowLayoutItem;
