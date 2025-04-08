import hoist from 'hoist-non-react-statics';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useRef } from 'react';
import { DndContext } from 'react-dnd';
import ScrollingMonitor from './ScrollingMonitor';
import { noop } from './util';

const DEFAULT_BUFFER = 150;

const getDisplayName = (PassedComponent) =>
  PassedComponent.displayName ||
  PassedComponent.name ||
  (typeof PassedComponent === 'string' && PassedComponent.length > 0 ? PassedComponent : 'Unknown');

export function createHorizontalStrength(_buffer) {
  return function defaultHorizontalStrength({ x, w, y, h }, point) {
    const buffer = Math.min(w / 2, _buffer);
    const inRange = point.x >= x && point.x <= x + w;
    const inBox = inRange && point.y >= y && point.y <= y + h;

    if (inBox) {
      if (point.x < x + buffer) {
        return (point.x - x - buffer) / buffer;
      } else if (point.x > x + w - buffer) {
        return -(x + w - point.x - buffer) / buffer;
      }
    }

    return 0;
  };
}

export function createVerticalStrength(_buffer) {
  return function defaultVerticalStrength({ y, h, x, w }, point) {
    const buffer = Math.min(h / 2, _buffer);
    const inRange = point.y >= y && point.y <= y + h;
    const inBox = inRange && point.x >= x && point.x <= x + w;

    if (inBox) {
      if (point.y < y + buffer) {
        return (point.y - y - buffer) / buffer;
      } else if (point.y > y + h - buffer) {
        return -(y + h - point.y - buffer) / buffer;
      }
    }

    return 0;
  };
}

export const defaultHorizontalStrength = createHorizontalStrength(DEFAULT_BUFFER);

export const defaultVerticalStrength = createVerticalStrength(DEFAULT_BUFFER);

const defaultOptions = {
  onScrollChange: noop,
  verticalStrength: defaultVerticalStrength,
  horizontalStrength: defaultHorizontalStrength,
  strengthMultiplier: 30,
};

export function useDndScrolling(scrollbarContainer, scrollingOptions = {}) {
  const { dragDropManager } = useContext(DndContext);
  if (!dragDropManager) {
    throw new Error('Unable to get dragDropManager from context. Wrap this in <DndProvider>.');
  }
  useEffect(() => {
    const container =
      typeof scrollbarContainer === 'function' ? scrollbarContainer() : scrollbarContainer;

    if (!container) {
      return;
    }

    const options = { ...defaultOptions, ...scrollingOptions };
    const monitor = new ScrollingMonitor(dragDropManager, container, options);
    monitor.start();
    return () => {
      monitor.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollbarContainer, dragDropManager]);
}

export default function withScrolling(WrappedComponent) {
  function ScrollingComponent({
    onScrollChange = defaultOptions.onScrollChange,
    verticalStrength = defaultOptions.verticalStrength,
    horizontalStrength = defaultOptions.horizontalStrength,
    strengthMultiplier = defaultOptions.strengthMultiplier,

    ...restProps
  }) {
    const ref = useRef(null);
    useDndScrolling(ref, {
      strengthMultiplier,
      verticalStrength,
      horizontalStrength,
      onScrollChange,
    });

    return <WrappedComponent {...restProps} ref={ref} />;
  }

  ScrollingComponent.displayName = `Scrolling(${getDisplayName(WrappedComponent)})`;
  ScrollingComponent.propTypes = {
    onScrollChange: PropTypes.func,
    verticalStrength: PropTypes.func,
    horizontalStrength: PropTypes.func,
    strengthMultiplier: PropTypes.number,
  };

  return hoist(ScrollingComponent, WrappedComponent);
}
