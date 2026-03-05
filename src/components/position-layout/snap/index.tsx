// components/SmartGuides.tsx
import React, { useEffect, useImperativeHandle, useState } from 'react';
import { prefixCls } from '../../../constants';
import { GuideLine } from '../types';

export interface SmartGuidesRef {
  setGuides: (guides: GuideLine[]) => void;
}

interface SmartGuidesProps {
  guides?: GuideLine[];
  /** 辅部线颜色，默认主题色 */
  color?: string;
  /** 辅部线粗细，默认 1px */
  thickness?: number;
}

export const SmartGuides = React.forwardRef<SmartGuidesRef, SmartGuidesProps>(
  ({ guides: propGuides, color = '#E91E63', thickness = 1 }, ref) => {
    const [guides, setGuidesState] = useState<GuideLine[]>(propGuides || []);

    // 暴露给外部的 ref
    useImperativeHandle(ref, () => ({
      setGuides: (newGuides: GuideLine[]) => {
        setGuidesState(newGuides);
      },
    }));

    // 如果传入了 propGuides（保持向后兼容），同步到 state
    useEffect(() => {
      if (propGuides !== undefined) {
        setGuidesState(propGuides);
      }
    }, [propGuides]);

    if (!guides || guides.length === 0) return null;

    return (
      <>
        {guides.map((guide, index) => {
          const isVertical = guide.type === 'vertical';
          return (
            <div
              key={`${guide.type}-${guide.position}-${index}`}
              className={`${prefixCls}-guide-line`}
              style={{
                position: 'absolute',
                zIndex: 9999, // 确保在最顶层
                backgroundColor: color,
                pointerEvents: 'none', // 核心：不允许辅助线阻挡鼠标事件
                ...(isVertical
                  ? {
                      top: 0,
                      bottom: 0, // 贯穿整个容器高度
                      left: guide.position,
                      width: thickness,
                    }
                  : {
                      left: 0,
                      right: 0, // 贯穿整个容器宽度
                      top: guide.position,
                      height: thickness,
                    }),
              }}
            />
          );
        })}
      </>
    );
  }
);
