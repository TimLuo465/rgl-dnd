import { DEFAULT_GROUP, DEFAULT_ITEMTYPE, prefixCls } from '../constants';
import { LayoutItem, LayoutItemType } from '../types';

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
export const getNewLayouts = (
  data: LayoutItem[],
  layoutItem: LayoutItem,
  preLayoutItem?: LayoutItem
) => {
  if (!checkArray(data)) return data;

  const cloneData = JSON.parse(JSON.stringify(data));
  for (let index = 0; index < cloneData.length; index++) {
    const item = cloneData[index];
    if (item.i === layoutItem.i) {
      item.children = layoutItem.children;
    }
    if (item.i === preLayoutItem?.i) {
      item.children = preLayoutItem.children;
    }
    // if (checkArray(item.children)) {
    //   item.children = getNewLayouts(item.children, layoutItem, preLayoutItem);
    // }
  }
  return cloneData;
};

/**
 * 获取layoutItem
 */
export const getFlowLayoutItem = (layouts: LayoutItemType[], id: string) => {
  let layoutItem: LayoutItemType | null = null;
  for (let index = 0; index < layouts.length; index++) {
    const item: LayoutItemType = layouts[index];
    if (item.i === id) {
      layoutItem = item;
      break;
    }
    if (checkArray(item.children)) {
      const tempItem = getFlowLayoutItem(item.children, id);
      if (tempItem) {
        layoutItem = tempItem;
      }
    }
  }
  return layoutItem;
};

/**
 * 渲染指示线
 */
export const renderIndicator = () => {
  const el = document.querySelector(`.${prefixCls}-indicator`);
  if (el) return;
  const Indicator = document.createElement('div');
  Indicator.classList.add(`${prefixCls}-indicator`);
  document.body.appendChild(Indicator);
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

/**
 * 封装事件注册，添加阻止冒泡方法
 */
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

// 根据groupIndex获取accept
export const getGroupKeys = (index) => {
  const groupKeys = [DEFAULT_ITEMTYPE];
  for (let i = 0; i <= index; i++) {
    groupKeys.push(`${DEFAULT_GROUP}_${i}`);
  }
  return groupKeys;
};
