import { EventEmitter } from 'eventemitter3';

type EventType = 'dragEnd.cardItem' | 'onFlowLayoutHover' | 'onLayoutHover' | 'onFlowLayoutDrop';

const event = new EventEmitter<EventType>();

export default event;
