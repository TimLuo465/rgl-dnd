import React, { useImperativeHandle } from 'react';
import { prefixCls } from '../constants';
import { LayoutItem, PositionParams } from '../types';
import { calcGridItemPosition, setTransform } from '../utils';

export type ResizeSnapLineRef = {
  updateSnapLine: (snapLine: LayoutItem | null, positionParams?: PositionParams) => void;
};

const ResizeSnapLine = React.forwardRef((props, ref) => {
  const resizeSnapLineRef = React.createRef<HTMLDivElement>();

  const updateSnapLine = (snapLine: LayoutItem | null, positionParams?: PositionParams) => {
    const dom: any = resizeSnapLineRef.current;

    if (!snapLine) {
      dom.style.display = 'none';
      return;
    }

    const { x, y, w, h } = snapLine;
    const position = calcGridItemPosition(positionParams!, x, y, w, h);
    const style: any = setTransform({ ...position, top: position.top - positionParams.margin[1] });

    style.display = 'block';
    style.width += 'px';
    style.height = '0px';

    Object.assign(dom.style, style);
  };

  useImperativeHandle(ref, () => ({
    updateSnapLine,
  }));

  return (
    <div className={`${prefixCls}-snapline`} ref={resizeSnapLineRef} style={{ display: 'none' }} />
  );
});

export default ResizeSnapLine;
