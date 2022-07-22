import { EventEmitter } from 'eventemitter3';

type EventType = 'dragEnd.cardItem' | 'overFlowLayout' | 'overLayout';

const event = new EventEmitter<EventType>();

export default event;
