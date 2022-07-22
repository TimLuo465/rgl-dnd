/**
 * 检查对象是否为空
 */
export const checkObject = (data: any) => {
  if (typeof data !== 'object') return false;
  const dataKeys = Object.keys(data);
  return !!dataKeys.length;
};

/**
 * 检查数组是否为空
 */
export const checkArray = (data: any) => {
  return Array.isArray(data) && data.length;
};

/**
 * 流式布局内组件更新后，获取新的layouts
 */
export const getNewLayouts = (data: any[], layoutItem: any, preLayoutItem?: any) => {
  if (!data || !Array.isArray(data)) return;
  const cloneData = JSON.parse(JSON.stringify(data));
  for (let index = 0; index < cloneData.length; index++) {
    let item = cloneData[index];
    if (item.i === layoutItem.i) {
      item.children = layoutItem.children;
    }
    if (item.i === preLayoutItem?.i) {
      item.children = preLayoutItem.children;
    }
    if (item.children) {
      item.children = getNewLayouts(item.children, layoutItem, preLayoutItem);
    }
  }
  return cloneData;
};

/**
 * 获取当前正在拖拽的layoutItem
 */
export const getFlowLayoutItem = (layouts: any, id: string) => {
  let layoutItem: any = null;
  for (let index = 0; index < layouts.length; index++) {
    const item = layouts[index];
    if (item.i === id) {
      layoutItem = item;
      break;
    }
    if (item.children && item.children.length) {
      layoutItem = getFlowLayoutItem(item.children, id);
    }
  }
  return layoutItem;
};

export const isEventBlockedByDescendant = <K extends keyof HTMLElementEventMap>(
  e: any,
  eventName: K,
  el: HTMLElement
) => {
  if (!e.rgl) {
    e.rgl = {
      stopPropagation: () => {},
      blockedEvents: {},
    };
  }

  const blockingElements = (e.rgl && e.rgl.blockedEvents[eventName]) || [];

  for (let i = 0; i < blockingElements.length; i++) {
    const blockingElement = blockingElements[i];

    if (el !== blockingElement && el.contains(blockingElement)) {
      return true;
    }
  }

  return false;
};

export const addRGLEventListener = <K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  eventName: K,
  listener: any
) => {
  const bindedListener = (e: any) => {
    if (!isEventBlockedByDescendant(e, eventName, el)) {
      e.rgl.stopPropagation = () => {
        if (!e.rgl.blockedEvents[eventName]) {
          e.rgl.blockedEvents[eventName] = [];
        }

        e.rgl.blockedEvents[eventName].push(el);
      };

      listener(e);
    }
  };

  el.addEventListener(eventName, bindedListener);

  return () => el.removeEventListener(eventName, bindedListener);
};
