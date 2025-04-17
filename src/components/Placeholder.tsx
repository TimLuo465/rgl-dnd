import React, { useImperativeHandle } from 'react';
import { prefixCls } from '../constants';
import { LayoutItem, PositionParams } from '../types';
import {
  calcGridItemPosition,
  calcLeftSpacing,
  getWH,
  isLayoutChange,
  setTransform,
} from '../utils';

export type PlaceholderRef = {
  updatePlaceholder: (
    placeholder: LayoutItem | null,
    layouts?: LayoutItem[],
    positionParams?: PositionParams
  ) => void;
};

const Placeholder = React.forwardRef((props, ref) => {
  const placeholderRef = React.createRef<HTMLDivElement>();

  const updatePlaceholder = (
    newPlaceholder: LayoutItem,
    layouts: LayoutItem[],
    positionParams: PositionParams
  ) => {
    const dom: any = placeholderRef.current;
    const prevPlaceholder = dom.placeholder;

    if (!isLayoutChange(prevPlaceholder, newPlaceholder)) {
      return;
    }

    if (!newPlaceholder) {
      dom.style.display = 'none';
      dom.placeholder = null;
      return;
    }

    const { x, y } = newPlaceholder;
    const leftSpacing = calcLeftSpacing(layouts, newPlaceholder);
    const { w, h } = getWH(newPlaceholder, positionParams, leftSpacing);
    const position = calcGridItemPosition(positionParams, x, y, w, h);
    const style: any = setTransform(position);

    style.display = 'block';
    style.width += 'px';
    style.height += 'px';
    dom.placeholder = newPlaceholder;

    Object.assign(dom.style, style);
  };

  useImperativeHandle(ref, () => ({
    updatePlaceholder,
  }));

  return (
    <div className={`${prefixCls}-placeholder`} ref={placeholderRef} style={{ display: 'none' }} />
  );
});

export default Placeholder;
