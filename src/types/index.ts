import React, { CSSProperties, ReactNode } from 'react';
import { ConnectDragSource } from 'react-dnd';
import { ResizeCallbackData, ResizeHandle } from 'react-resizable';

export type RefType = { drag: ConnectDragSource };
export interface XYCoord {
  x: number;
  y: number;
}
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
  zIndex?: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  autoHeight?: boolean;
  placeholder?: boolean;
  children?: string[];
  /** 内部数据传递使用 */
  extra?: {
    el: HTMLElement;
    dragOffset: XYCoord;
  };
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
  weId?: string;
  group?: string;
  accept?: string[];
  canDrop?: boolean;
  scrollbarContainer?: HTMLElement | (() => HTMLElement);
  onDrop?: (item: unknown, itemType: string) => void;
  onHover?: (item: unknown, offset: XYCoord, itemType: string, clientOffset?: XYCoord) => void;
  onDragLeave?: () => void;
  onDragEnter?: () => void;
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
  allowOutBoundedDrop?: boolean;
  isResetLayout?: boolean;
  scrollbarContainer?: HTMLElement | (() => HTMLElement);
  enableSnapLine?: boolean;
  onLayoutChange?: (layouts: LayoutItem[], isUserAction: boolean, isLayoutChange?: boolean) => void;
  onDragStart?: (layoutItem: LayoutItem) => void;
  onDragOver?: (layoutItem: LayoutItem) => void;
  onResizeStop?: (layoutItem: LayoutItem, layouts: LayoutItem[]) => void;
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
  height: number | 'auto';
};

export interface DraggableProps {
  type?: string;
  data?: DragItem;
  style?: CSSProperties;
  children?: ReactNode;
  draggable?: boolean;
  useDragPreview?: boolean;
  connectDrag?(item: DragItem, drag: ConnectDragSource): void;
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
    leftSpacing?: number;
    resizeHandles?: ResizeHandle[];
    onResizeStart?: (
      data: LayoutItem,
      direction: string,
      setResizing: (size: Size) => void
    ) => void;
    onResize?: (data: LayoutItem, w: number, h: number, direction: string) => void;
    onResizeStop?: (data: LayoutItem, direction: string) => void;
    onMount?: (data: LayoutItem, item: HTMLDivElement) => void;
    onUnmount?: (data: LayoutItem, item: HTMLDivElement) => void;
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
export interface FlowLayoutProps extends React.Attributes {
  layoutItem: LayoutItem;
  canDrop?: boolean;
  classNameStr?: string;
  id?: string;
  droppable?: boolean;
  itemDraggable?: boolean;
  allowOutBoundedDrop?: boolean;
  isEmpty?: boolean;
  empty: React.ReactNode;
  collectDrag?: (item: DragItem, drag: ConnectDragSource) => void;
  onDrop?: (layoutItem: LayoutItem | null, item: LayoutItem, itemType: string) => void;
  onHover?: (item: LayoutItem, itemType: string) => void;
  onDragStart?: (draggedItem: DragItem) => void;
  onDragEnd?: (
    draggedItem: DragItem,
    didDrop: boolean,
    itemType: string,
    isMoveOut: boolean
  ) => void;
  [key: string]: any;
}

export interface FlowLayoutItemProps {
  data: LayoutItem;
  type?: string;
  children?: ReactNode;
  draggable?: boolean;
  onDragStart?: (draggedItem: DragItem) => void;
  connectDrag?: (item: DragItem, drag: ConnectDragSource) => void;
  onDragEnd?: (draggedItem: DragItem, didDrop: boolean, itemType: string) => void;
}

export interface indicatorInfo {
  el: HTMLElement | null;
  index: number;
  where: 'before' | 'after';
}

export interface PositionLayoutRef {
  /** 上移一层：与上方相邻层交换，结果会重新归一化。 */
  bringForward: (itemId: string) => void;
  /** 下移一层：与下方相邻层交换，结果会重新归一化。 */
  sendBackward: (itemId: string) => void;
  /** 置于顶层：移动到最高层，结果会重新归一化。 */
  bringToFront: (itemId: string) => void;
  /** 置于底层：移动到最低层，结果会重新归一化。 */
  sendToBack: (itemId: string) => void;
  /** 选中指定子项。 */
  selectItem: (itemId: string) => void;
  /** 清空当前选中项。 */
  clearSelection: () => void;
}

export interface PositionLayoutProps
  extends Pick<
    FlowLayoutProps,
    'layoutItem' | 'canDrop' | 'droppable' | 'isEmpty' | 'empty' | 'onDrop'
  > {
  children?: ReactNode;
  className?: string;
  /** 悬停前回调，返回false则阻止悬停 */
  onBeforeHover?: (item: LayoutItem, itemType: string) => Boolean;
  onResizeStop?: (data: LayoutItem) => void;
  /** 子项位置发生变更时触发，例如键盘微调。 */
  onItemPosChange?: (data: LayoutItem) => void;
  /** 选中项变化时触发。 */
  onSelectedItemChange?: (item: LayoutItem | null) => void;
  /**
   * 层级变化回调（批量）。
   * 返回值是“本次操作后所有受影响元素”的最新数据，zIndex 已保证为连续唯一值 1..N。
   */
  onZIndexChange?: (data: LayoutItem[]) => void;
}

export interface PositionLayoutItemProps extends Omit<FlowLayoutItemProps, 'connectDrag'> {
  source: HTMLElement;
  selected?: boolean;
  resizeHandles?: ResizeHandle[];
  onResize?: (
    data: LayoutItem,
    resizeBox: HTMLElement,
    resizeCallbackData: ResizeCallbackData
  ) => void;
  onResizeStop?: (data: LayoutItem) => void;
  onSelect?: (data: LayoutItem) => void;
  /** 自定义调整手柄方向，默认为所有八个方向 */
}
