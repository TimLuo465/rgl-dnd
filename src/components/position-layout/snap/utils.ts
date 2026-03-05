// utils/snapUtils.ts
import { prefixCls } from '../../../constants';
import { minus, plus } from '../../../utils/number-precision';
import { BoundingBox, GuideLine } from '../types';

export type SnapOptions = {
  threshold?: number;
  resizingHandle?: string;
};

function getOffset(offsets: number[][], rel: 'min' | 'max') {
  const isMin = rel === 'min';
  let final = isMin ? Infinity : -Infinity;
  let index = 0;

  offsets.forEach((offset, i) => {
    const [, distance] = offset;

    if (isMin && distance < final) {
      final = distance;
      index = i;
    } else if (!isMin && distance > final) {
      final = distance;
      index = i;
    }
  });

  return offsets[index];
}

function calcSnapDiff(handle: string, offsetsX: number[][], offsetsY: number[][]) {
  let snapDiff = { x: 0, y: 0, width: 0, height: 0 };
  const xLen = offsetsX.length;
  const yLen = offsetsY.length;

  // 右移
  if (handle.indexOf('e') > -1 && xLen) {
    const [aX, tX] = getOffset(offsetsX, 'max');

    snapDiff.width = minus(tX, aX);
  } else if (handle.indexOf('w') > -1 && xLen) {
    // 左移
    const [aX, tX] = getOffset(offsetsX, 'min');

    snapDiff.x = minus(tX, aX);
    snapDiff.width = minus(aX, tX);
  }

  // 下移
  if (handle.indexOf('s') > -1 && yLen) {
    const [aY, tY] = getOffset(offsetsY, 'max');

    snapDiff.height = minus(tY, aY);
  } else if (handle.indexOf('n') > -1 && yLen) {
    // 上移
    const [aY, tY] = getOffset(offsetsY, 'min');

    snapDiff.y = minus(tY, aY);
    snapDiff.height = minus(aY, tY);
  }

  return snapDiff;
}

function filterGuides(guides: GuideLine[], posArr: number[], type: 'vertical' | 'horizontal') {
  return guides.filter(
    (guide) => guide.type !== type || (guide.type === type && posArr.includes(guide.position))
  );
}

export function calculateSnapAndGuides(
  rawActiveRect: BoundingBox,
  cachedTargetRects: BoundingBox[],
  opts: SnapOptions = {}
): { snappedRect: BoundingBox; guides: GuideLine[] } {
  const { threshold = 5, resizingHandle = '' } = opts;
  const { x: ax, y: ay, width: aw, height: ah } = rawActiveRect;

  let snapX = ax;
  let snapY = ay;
  let snapWidth = aw;
  let snapHeight = ah;
  let guides: GuideLine[] = [];
  const guideKeys: string[] = [];
  let closestSnapX = { diff: Infinity, x: Infinity };
  let closestSnapY = { diff: Infinity, y: Infinity };

  // 拖拽元素的 3 条垂直辅助线 (左、中、右) 和 3 条水平辅助线 (上、中、下)
  const activeV = [ax, plus(ax, aw / 2), plus(ax, aw)];
  const activeH = [ay, plus(ay, ah / 2), plus(ay, ah)];

  let offsetsX: number[][] = [];
  let offsetsY: number[][] = [];

  // 遍历缓存的目标节点进行比对
  for (const t of cachedTargetRects) {
    const targetV = [t.x, plus(t.x, t.width / 2), plus(t.x, t.width)];
    const targetH = [t.y, plus(t.y, t.height / 2), plus(t.y, t.height)];

    // X轴（垂直线）比对
    activeV.forEach((aX, aIndex) => {
      targetV.forEach((tX) => {
        const diff = Math.abs(minus(aX, tX));
        const key = `vertical_${tX}`;

        if (diff > threshold) return;

        // 根据吸附的是哪条线（左0、中1、右2），反推拖拽元素的起始X坐标
        snapX = aIndex === 0 ? tX : aIndex === 1 ? minus(tX, aw / 2) : minus(tX, aw);

        if (guideKeys.includes(key) || snapX < 0) return;

        if (diff < closestSnapX.diff) {
          closestSnapX = { diff, x: snapX };
        }

        offsetsX.push([aX, tX]);
        guideKeys.push(key);
        guides.push({ type: 'vertical', position: tX });
      });
    });

    // Y轴（水平线）比对
    activeH.forEach((aY, aIndex) => {
      targetH.forEach((tY) => {
        const diff = Math.abs(minus(aY, tY));
        const key = `horizontal_${tY}`;

        if (diff > threshold) return;

        // 根据吸附的是哪条线（上0、中1、下2），反推拖拽元素的起始Y坐标
        snapY = aIndex === 0 ? tY : aIndex === 1 ? minus(tY, ah / 2) : minus(tY, ah);

        if (guideKeys.includes(key) || snapY < 0) return;

        if (diff < closestSnapY.diff) {
          closestSnapY = { diff, y: snapY };
        }

        offsetsY.push([aY, tY]);
        guideKeys.push(key);
        guides.push({ type: 'horizontal', position: tY });
      });
    });
  }

  let snappedRect = {
    x: snapX,
    y: snapY,
    width: snapWidth,
    height: snapHeight,
  };

  if (resizingHandle) {
    const diff = calcSnapDiff(resizingHandle, offsetsX, offsetsY);

    snappedRect = {
      x: plus(ax, diff.x),
      y: plus(ay, diff.y),
      width: plus(snapWidth, diff.width),
      height: plus(snapHeight, diff.height),
    };
  } else {
    if (closestSnapX.x !== Infinity) {
      const cx = closestSnapX.x;
      const lastV = [cx, plus(cx, snapWidth / 2), plus(cx, snapWidth)];

      snappedRect.x = cx;
      guides = filterGuides(guides, lastV, 'vertical');
    }

    if (closestSnapY.y !== Infinity) {
      const cy = closestSnapY.y;
      const lastH = [cy, plus(cy, snapHeight / 2), plus(cy, snapHeight)];

      snappedRect.y = cy;
      guides = filterGuides(guides, lastH, 'horizontal');
    }
  }
  return {
    guides,
    snappedRect: {
      ...snappedRect,
      x: Math.max(0, snappedRect.x),
      y: Math.max(0, snappedRect.y),
    },
  };
}

export function isGuideLine(elem: HTMLElement) {
  return elem.classList.contains(`${prefixCls}-guide-line`);
}
