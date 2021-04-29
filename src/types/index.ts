import { CSSProperties, ReactNode } from 'react';
import { XYCoord } from 'react-dnd';
import { ResizeHandle } from 'react-resizable';

export interface DragItem {
  i: string;
  group?: string;
  static?: boolean;
  [key: string]: any;
}

export interface LayoutItem extends DragItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  placeholder?: boolean;
  group?: string;
}

export interface DroppingItem {
  i: string;
  w: number;
  h: number;
}

export interface DroppableProps {
  group?: string;
  accept?: string[];
  onDrop?: (item: unknown) => void;
  onHover?: (item: unknown, offset: XYCoord) => void;
  onEnter?: (item: unknown, offset: XYCoord) => void;
  children?: ReactNode;
}

export interface LayoutProps extends Omit<DroppableProps, 'onDrop' | 'ref'> {
  style?: CSSProperties;
  layouts: LayoutItem[];
  margin?: [number, number];
  containerPadding?: [number, number];
  cols?: number;
  resizeHandles?: ResizeHandle[];
  rowHeight?: number;
  maxRows?: number;
  droppingItem?: DroppingItem;
  preventCollision?: boolean;
  compactType?: CompactType;
  renderItem: (item: LayoutItem) => ReactNode;
  onLayoutChange?: (layouts: LayoutItem[]) => void;
  onDrop?: (layouts: LayoutItem[], droppedItem: LayoutItem, fromGroup: string) => void;
}

export type PositionParams = {
  margin: [number, number];
  containerPadding: [number, number];
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
  onDragEnd?: (draggedItem: DragItem, didDrop: boolean) => void;
  onDragStart?: (draggedItem: DragItem) => void;
}

export type ItemProps = Omit<DraggableProps, 'data' | 'draggable'> &
  PositionParams & {
    data: LayoutItem;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    resizeHandles?: ResizeHandle[];
    onResize?: (data: LayoutItem, w: number, h: number) => void;
    onResizeStop?: (data: LayoutItem, w: number, h: number) => void;
  };

export type Size = {
  width: number;
  height: number;
};

export type ItemStates = {
  resizing: Size;
  dragging?: {
    left: number;
    top: number;
  };
};

export type CompactType = 'horizontal' | 'vertical';
