import React, { CSSProperties, ReactNode } from 'react';
import { XYCoord } from 'react-dnd';
import { ResizeHandle } from 'react-resizable';

export interface DragItem {
  i?: string;
  static?: boolean;
  [key: string]: any;
}

export interface LayoutItem extends DragItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  placeholder?: boolean;
}

export interface DroppingItem {
  i: string;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
}

export interface DroppableProps {
  group?: string;
  accept?: string[];
  canDrop?: boolean;
  onDrop?: (item: unknown, itemType: string) => void;
  onHover?: (item: unknown, offset: XYCoord, itemType: string) => void;
  children?: ReactNode;
}

export type DragInfo = {
  item: DragItem;
  type: string;
};

export interface LayoutProps extends Omit<DroppableProps, 'onDrop' | 'ref'> {
  style?: CSSProperties;
  layouts: LayoutItem[];
  margin?: [number, number];
  nested?: boolean;
  droppable?: boolean;
  containerPadding?: number[];
  className?: string;
  cols?: number;
  resizeHandles?: ResizeHandle[];
  rowHeight?: number;
  maxRows?: number;
  droppingItem?: DroppingItem;
  preventCollision?: boolean;
  compactType?: CompactType;
  /** 组件拖动的时候超出设计器区域之外时总是被禁止,不会触发onDrop事件，默认true */
  canOutLayoutDrop?: boolean;
  onLayoutChange?: (layouts: LayoutItem[], isUserAction: boolean) => void;
  onDragStart?: (layoutItem: LayoutItem) => void;
  onDragOver?: (layoutItem: LayoutItem) => void;
  onResizeStop?: (layouts: LayoutItem[]) => void;
  onDrop?: (
    layouts: LayoutItem[],
    droppedItem: LayoutItem,
    dragInfo: DragInfo,
    group: string
  ) => void;
}

export type PositionParams = {
  margin: [number, number];
  containerPadding: number[];
  containerWidth: number;
  cols: number;
  rowHeight: number;
  maxRows: number;
};

export type Position = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export interface DraggableProps {
  type?: string;
  data?: DragItem;
  style?: CSSProperties;
  children?: ReactNode;
  draggable?: boolean;
  onDragEnd?: (draggedItem: DragItem, didDrop: boolean, itemType: string) => void;
  onDragStart?: (draggedItem: DragItem) => void;
}

export type ItemProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onDragEnd' | 'onDragStart' | 'placeholder'
> &
  Omit<DraggableProps, 'data' | 'draggable'> &
  PositionParams & {
    data: LayoutItem;
    isDragging?: boolean;
    placeholder?: boolean;
    leftSpacing?: number;
    resizeHandles?: ResizeHandle[];
    onResizeStart?: (data: LayoutItem, w: number, h: number) => void;
    onResize?: (data: LayoutItem, w: number, h: number, direction: string) => void;
    onResizeStop?: (data: LayoutItem, w: number, h: number) => void;
  };

export type Size = {
  width: number;
  height: number;
};

export type ItemStates = {
  resizing: Size;
  direction: string;
};

export type CompactType = 'horizontal' | 'vertical';

export type InternalEventType = 'mounted';
