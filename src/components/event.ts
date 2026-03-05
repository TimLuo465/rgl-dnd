import { EventEmitter } from 'eventemitter3';

type EventType = 'dragEnd.cardItem' | 'hover.otherLayout' | 'hover.layout' | 'drop.otherLayout';

const event = new EventEmitter<EventType>();

export default event;
