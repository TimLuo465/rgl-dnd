export const getComputedStyle = (dom: HTMLElement) => {
  return window.getComputedStyle(dom);
};

export const getDOMPadding = (dom: HTMLElement) => {
  return {
    left: parseInt(getComputedStyle(dom).paddingLeft),
    right: parseInt(getComputedStyle(dom).paddingRight),
    bottom: parseInt(getComputedStyle(dom).paddingTop),
    top: parseInt(getComputedStyle(dom).paddingBottom),
  };
};

export const getDOMMargin = (dom: HTMLElement) => {
  return {
    left: parseInt(getComputedStyle(dom).marginLeft),
    right: parseInt(getComputedStyle(dom).marginRight),
    bottom: parseInt(getComputedStyle(dom).marginTop),
    top: parseInt(getComputedStyle(dom).marginBottom),
  };
};

export const getDOMInfo = (dom: HTMLElement) => {
  if (!dom) return;
  const { x, y, top, left, bottom, right, width, height } = dom?.getBoundingClientRect() as DOMRect;
  const margin = getDOMMargin(dom),
    padding = getDOMPadding(dom);

  return {
    x: Math.round(x),
    y: Math.round(y),
    top: Math.round(top),
    left: Math.round(left),
    bottom: Math.round(bottom),
    right: Math.round(right),
    width: Math.round(width),
    height: Math.round(height),
    outerWidth: Math.round(width + margin.left + margin.right),
    outerHeight: Math.round(height + margin.top + margin.bottom),
    margin,
    padding,
    inFlow: dom && dom.parentElement && !!styleInFlow(dom, dom.parentElement),
  };
};

export const movePlaceholder = (indicator: any, parentNode?: any, thickness: number = 2) => {
  const domInfo = getDOMInfo(indicator?.el || parentNode);
  let t = 0,
    l = 0,
    w = 0,
    h = 0;

  if (indicator?.el) {
    if (!domInfo.inFlow) {
      w = thickness;
      h = domInfo.height;
      t = domInfo.top;
      l = indicator.where === 'before' ? domInfo.left : domInfo.left + domInfo.outerWidth;
    } else {
      w = domInfo.width;
      h = thickness;
      t = indicator.where === 'before' ? domInfo.top : domInfo.bottom;
      l = domInfo.left;
    }
  } else {
    if (parentNode) {
      t = domInfo.top + domInfo.padding.top;
      l = domInfo.left + domInfo.padding.left;
      w =
        domInfo.outerWidth -
        domInfo.padding.right -
        domInfo.padding.left -
        domInfo.margin.left -
        domInfo.margin.right;
      h = thickness;
    }
  }

  return {
    top: `${t}px`,
    left: `${l}px`,
    width: `${w}px`,
    height: `${h}px`,
  };
};

export const findPosition = (el: any, dim: any, posX: number, posY: number) => {
  let result: any = {
    el,
    where: 'before',
  };

  let leftLimit = 0,
    xLimit = 0,
    dimRight = 0,
    yLimit = 0,
    xCenter = 0,
    yCenter = 0,
    dimDown = 0;

  // Right position of the element. Left + Width
  dimRight = dim.left + dim.outerWidth;
  // Bottom position of the element. Top + Height
  dimDown = dim.top + dim.outerHeight;
  // X center position of the element. Left + (Width / 2)
  xCenter = dim.left + dim.outerWidth / 2;
  // Y center position of the element. Top + (Height / 2)
  yCenter = dim.top + dim.outerHeight / 2;

  if (
    (xLimit && dim.left > xLimit) ||
    (yLimit && yCenter >= yLimit) || // >= avoid issue with clearfixes
    (leftLimit && dimRight < leftLimit)
  )
    return;

  if (!dim.inFlow) {
    if (posY < dimDown) yLimit = dimDown;
    if (posX < xCenter) {
      xLimit = xCenter;
      result.where = 'before';
    } else {
      leftLimit = xCenter;
      result.where = 'after';
    }
  } else {
    // If y upper than center
    if (posY < yCenter) {
      result.where = 'before';
    } else {
      result.where = 'after'; // After last element
    }
  }

  return result;
};

export const styleInFlow = (el: HTMLElement, parent: HTMLElement) => {
  const style: any = getComputedStyle(el);
  const parentStyle: any = getComputedStyle(parent);

  if (style.overflow && style.overflow !== 'visible') return;
  if (parentStyle.float !== 'none') return;
  if (parent && parentStyle.display === 'grid') {
    return;
  }
  if (parent && parentStyle.display === 'flex' && parentStyle['flex-direction'] !== 'column')
    return;
  switch (style.position) {
    case 'static':
    case 'relative':
      break;
    default:
      return;
  }
  switch (el.tagName) {
    case 'TR':
    case 'TBODY':
    case 'THEAD':
    case 'TFOOT':
      return true;
  }
  switch (style.display) {
    case 'block':
    case 'list-item':
    case 'table':
    case 'flex':
    case 'grid':
      return true;
  }
  return;
};
