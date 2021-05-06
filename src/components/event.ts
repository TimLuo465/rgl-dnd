import { EventEmitter } from 'eventemitter3';

type EventType = 'dragEnd.cardItem';

const event = new EventEmitter<EventType>();

export default event;
