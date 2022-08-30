import { EventEmitter } from 'eventemitter3';

type EventType = 'dragEnd.cardItem' | 'hover.flowLayout' | 'hover.layout' | 'drop.flowLayout';

const event = new EventEmitter<EventType>();

export default event;
