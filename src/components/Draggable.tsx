import React, {
  DragEvent as ReactDragEvent,
  isValidElement,
  memo,
  MouseEvent as ReactMouseEvent,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { ConnectDragSource, useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { DEFAULT_ITEMTYPE } from '../constants';
import { DraggableProps, DragItem } from '../types';
import { getDragOffset } from '../utils';
import event from './event';

type PointerLikeEvent =
  | ReactMouseEvent<HTMLElement>
  | ReactDragEvent<HTMLElement>
  | MouseEvent
  | DragEvent;

const Draggable: React.FC<DraggableProps> = memo((props) => {
  const {
    type = DEFAULT_ITEMTYPE,
    style,
    data,
    draggable = true,
    children,
    useDragPreview = true,
    connectDrag,
    onDragEnd,
    onDragStart,
  } = props;
  const dragData = useMemo<DragItem>(() => data || {}, [data]);
  const sourceElRef = useRef<HTMLElement | null>(null);
  const pointerEventRef = useRef<MouseEvent | DragEvent | null>(null);

  const rememberPointerEvent = useCallback((e?: PointerLikeEvent) => {
    if (!e) {
      return;
    }

    const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e;
    pointerEventRef.current = nativeEvent as MouseEvent | DragEvent;

    if ('currentTarget' in e && e.currentTarget instanceof HTMLElement) {
      sourceElRef.current = e.currentTarget;
    }
  }, []);

  const resolveDragSourceEl = useCallback(() => {
    if (sourceElRef.current) {
      return sourceElRef.current;
    }

    const fallback =
      typeof window !== 'undefined'
        ? ((window.event as Event | undefined)?.target as HTMLElement | null)
        : null;
    return fallback;
  }, []);

  const [, drag, dragPreview] = useDrag(
    () => ({
      type,
      canDrag: draggable,
      item() {
        const sourceEl = resolveDragSourceEl();

        onDragStart?.(dragData);

        return {
          ...dragData,
          extra: {
            el: sourceEl,
            dragOffset: getDragOffset(sourceEl, pointerEventRef.current || undefined),
          },
        };
      },
      end(draggedItem: DragItem, monitor) {
        const didDrop = monitor.didDrop();
        const itemType = monitor.getItemType() as string;
        const item = monitor.getItem();

        onDragEnd?.(item, didDrop, itemType);
        event.emit('dragEnd.cardItem', item, didDrop, itemType);
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
        item: monitor.getItem(),
        didDrop: monitor.didDrop(),
      }),
    }),
    [type, dragData, draggable, onDragEnd, onDragStart, resolveDragSourceEl]
  );

  const connectDragSource = useCallback<ConnectDragSource>(
    (nodeOrElement, options) => {
      if (nodeOrElement instanceof HTMLElement) {
        sourceElRef.current = nodeOrElement;
      }

      return drag(nodeOrElement, options);
    },
    [drag]
  );

  useEffect(() => {
    connectDrag?.(dragData, connectDragSource);
  }, [connectDrag, connectDragSource, dragData]);

  useEffect(() => {
    if (!useDragPreview) {
      dragPreview(getEmptyImage(), { captureDraggingState: true });
      return;
    }

    const selector =
      typeof dragData.selector === 'string' ? dragData.selector : '.custom-drag-layer';
    const el = document.querySelector(selector);

    if (el) {
      dragPreview(el, { offsetX: 0, offsetY: 0 });
    }
  }, [dragData, dragPreview, useDragPreview]);

  if (typeof children === 'string') {
    return (
      <div
        ref={connectDragSource}
        style={style}
        onMouseDownCapture={rememberPointerEvent}
        onDragStartCapture={rememberPointerEvent}
      >
        {children}
      </div>
    );
  }

  if (isValidElement(children)) {
    if (typeof children.type !== 'string') {
      const child = React.Children.only(children) as ReactElement<any>;
      const content = React.cloneElement(child, {
        ...child.props,
        drag: connectDragSource,
      });
      return content;
    }

    const child = React.Children.only(children) as ReactElement<any>;
    const childRef = (child as ReactElement<any> & { ref?: React.Ref<HTMLElement> }).ref;
    const content = React.cloneElement(child, {
      ...child.props,
      ref: (node: HTMLElement | null) => {
        connectDragSource(node);
        if (typeof childRef === 'function') {
          childRef(node);
        } else if (childRef && typeof childRef === 'object') {
          (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      },
      onMouseDownCapture: (e: ReactMouseEvent<HTMLElement>) => {
        child.props?.onMouseDownCapture?.(e);
        rememberPointerEvent(e);
      },
      onDragStartCapture: (e: ReactDragEvent<HTMLElement>) => {
        child.props?.onDragStartCapture?.(e);
        rememberPointerEvent(e);
      },
    });

    return content;
  }

  return null;
});

export default Draggable;
