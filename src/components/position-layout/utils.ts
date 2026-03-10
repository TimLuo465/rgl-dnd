import { DEFAULT_GROUP, prefixCls } from '../../constants';
import { XYCoord } from '../../types';
import { BoundingBox } from './types';

const placeholderClsName = `${prefixCls}-position-placeholder`;

export function renderPlaceholder() {
  const placeholder = document.querySelector(`.${placeholderClsName}`);

  if (!placeholder) {
    const placeholder = document.createElement('div');

    placeholder.classList.add(placeholderClsName);
    document.body.appendChild(placeholder);
  }
}

let cachedRect: BoundingBox | null = null;
let placeholderEl: HTMLElement | null = null;

function getElementSize(el?: HTMLElement) {
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const width = rect.width || el.offsetWidth || parseFloat(el.style.width || '0');
  const height = rect.height || el.offsetHeight || parseFloat(el.style.height || '0');

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

export function calcRect(
  position: XYCoord,
  bounds: BoundingBox,
  el?: HTMLElement,
  useElementSize = true,
  preferredSize?: { width: number; height: number } | null
) {
  if (!cachedRect) {
    const size = preferredSize || (useElementSize ? getElementSize(el) : null);

    cachedRect = {
      x: 0,
      y: 0,
      width: size?.width || parseFloat(el?.style.width || '100'),
      height: size?.height || parseFloat(el?.style.height || '50'),
    };
  }

  const { x, y } = position;
  const { x: bx, y: by, width, height } = bounds;
  const { width: pw, height: ph } = cachedRect;
  const px = Math.min(bx + width - pw, Math.max(x, bx));
  const py = Math.min(by + height - ph, Math.max(y, by));

  cachedRect.x = px - bounds.x;
  cachedRect.y = py - bounds.y;

  return {
    x: px,
    y: py,
    width: pw,
    height: ph,
  };
}

export function moveItem(el: HTMLElement, rect: BoundingBox) {
  const { x, y, width, height } = rect;

  Object.assign(cachedRect, rect);
  el.setAttribute(
    'style',
    `transform: translate(${x}px, ${y}px); width: ${width}px; height: ${height}px;`
  );
}

export function getPlaceholderRect() {
  return cachedRect;
}

/**
 * 将吸附后的相对坐标 relRect 写入 cachedRect，并以绝对坐标 absRect 更新 placeholder 样式。
 * movePlaceholder 内部使用绝对坐标定位 placeholder（因其挂载在 document.body），
 * 而 cachedRect / snapRects 均为相对容器的坐标，两者必须分开处理。
 */
export function movePlaceholder(relRect: BoundingBox, absRect: BoundingBox) {
  if (!placeholderEl) {
    placeholderEl = document.querySelector(`.${placeholderClsName}`);
  }
  if (!placeholderEl) return;

  Object.assign(cachedRect, relRect);
  placeholderEl.setAttribute(
    'style',
    `display: block; transform: translate(${absRect.x}px, ${absRect.y}px); width: ${absRect.width}px; height: ${absRect.height}px;`
  );
}

export function resetPlaceholder() {
  cachedRect = null;

  if (!placeholderEl) return;

  placeholderEl.removeAttribute('style');
  placeholderEl = null;
}

export function getDraggingEl(el: HTMLElement, itemType: string) {
  if (itemType.indexOf(DEFAULT_GROUP) === 0) {
    return el.parentElement;
  }
  return el;
}

export function uniqueNumbers(numbers: number[]) {
  return numbers.reduce((acc, curr) => {
    if (!acc.includes(curr)) {
      acc.push(curr);
    }
    return acc;
  }, []);
}
