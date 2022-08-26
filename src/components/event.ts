import { EventEmitter } from 'eventemitter3';

type EventType =
  | 'dragEnd.cardItem'
  | 'onFlowLayoutHover'
  | 'onLayoutHover'
  | 'onFlowLayoutDrop'
  | 'onFlowLayoutNotDrop';

const event = new EventEmitter<EventType>();

export default event;
