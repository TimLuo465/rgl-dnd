import { prefixCls } from '../../../constants';
import { minus, plus } from '../../../utils/number-precision';
import { BoundingBox, GuideLine } from '../types';

export type SnapOptions = {
  threshold?: number;
  resizingHandle?: string;
};

type Axis = 'vertical' | 'horizontal';
type RectLine = {
  axis: Axis;
  position: number;
  index: 0 | 1 | 2;
};
type SnapCandidate = {
  diff: number;
  priority: number;
  score: number;
  guide: GuideLine;
  rect: BoundingBox;
};

function isCenterLine(index: RectLine['index']) {
  return index === 1;
}

function getCandidatePriority(
  activeLine: RectLine,
  targetLine: RectLine,
  resizingHandle = ''
) {
  if (resizingHandle) {
    return isCenterLine(targetLine.index) ? 2 : 0;
  }

  const activeCenter = isCenterLine(activeLine.index);
  const targetCenter = isCenterLine(targetLine.index);

  if (!activeCenter && !targetCenter) return 0;
  if (activeCenter && targetCenter) return 3;

  return 2;
}

function getCandidateThreshold(
  threshold: number,
  activeLine: RectLine,
  targetLine: RectLine,
  resizingHandle = ''
) {
  if (resizingHandle) {
    return isCenterLine(targetLine.index) ? Math.max(2, threshold - 2) : threshold;
  }

  const activeCenter = isCenterLine(activeLine.index);
  const targetCenter = isCenterLine(targetLine.index);

  if (activeCenter && targetCenter) {
    return Math.max(3, threshold - 2);
  }

  if (activeCenter || targetCenter) {
    return Math.max(3, threshold - 1);
  }

  return threshold;
}

function getCandidateScore(diff: number, priority: number) {
  return diff + priority;
}

function getRectLines(rect: BoundingBox) {
  const centerX = plus(rect.x, rect.width / 2);
  const right = plus(rect.x, rect.width);
  const centerY = plus(rect.y, rect.height / 2);
  const bottom = plus(rect.y, rect.height);

  return {
    vertical: [
      { axis: 'vertical' as const, position: rect.x, index: 0 as const },
      { axis: 'vertical' as const, position: centerX, index: 1 as const },
      { axis: 'vertical' as const, position: right, index: 2 as const },
    ],
    horizontal: [
      { axis: 'horizontal' as const, position: rect.y, index: 0 as const },
      { axis: 'horizontal' as const, position: centerY, index: 1 as const },
      { axis: 'horizontal' as const, position: bottom, index: 2 as const },
    ],
  };
}

function getResizeActiveIndexes(handle: string, axis: Axis) {
  if (axis === 'vertical') {
    if (handle.indexOf('w') > -1) return [0];
    if (handle.indexOf('e') > -1) return [2];
    return [];
  }

  if (handle.indexOf('n') > -1) return [0];
  if (handle.indexOf('s') > -1) return [2];

  return [];
}

function pickClosestCandidate(candidates: SnapCandidate[]) {
  return candidates.reduce((closest, current) => {
    if (!closest) {
      return current;
    }

    if (current.score < closest.score) {
      return current;
    }

    if (current.score === closest.score && current.diff < closest.diff) {
      return current;
    }

    if (
      current.score === closest.score &&
      current.diff === closest.diff &&
      current.priority < closest.priority
    ) {
      return current;
    }

    return closest;
  }, null as SnapCandidate | null);
}

function createDragCandidate(
  rect: BoundingBox,
  activeLine: RectLine,
  targetLine: RectLine,
  diff: number
): SnapCandidate {
  if (activeLine.axis === 'vertical') {
    const snappedX =
      activeLine.index === 0
        ? targetLine.position
        : activeLine.index === 1
        ? minus(targetLine.position, rect.width / 2)
        : minus(targetLine.position, rect.width);

    return {
      diff,
      priority: 0,
      score: 0,
      guide: { type: 'vertical', position: targetLine.position },
      rect: {
        x: snappedX,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    };
  }

  const snappedY =
    activeLine.index === 0
      ? targetLine.position
      : activeLine.index === 1
      ? minus(targetLine.position, rect.height / 2)
      : minus(targetLine.position, rect.height);

  return {
    diff,
    priority: 0,
    score: 0,
    guide: { type: 'horizontal', position: targetLine.position },
    rect: {
      x: rect.x,
      y: snappedY,
      width: rect.width,
      height: rect.height,
    },
  };
}

function createResizeCandidate(
  rect: BoundingBox,
  handle: string,
  activeLine: RectLine,
  targetLine: RectLine,
  diff: number
): SnapCandidate {
  const nextRect = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };

  if (activeLine.axis === 'vertical') {
    if (handle.indexOf('w') > -1) {
      nextRect.x = targetLine.position;
      nextRect.width = minus(plus(rect.x, rect.width), targetLine.position);
    } else if (handle.indexOf('e') > -1) {
      nextRect.width = minus(targetLine.position, rect.x);
    }
  } else if (handle.indexOf('n') > -1) {
    nextRect.y = targetLine.position;
    nextRect.height = minus(plus(rect.y, rect.height), targetLine.position);
  } else if (handle.indexOf('s') > -1) {
    nextRect.height = minus(targetLine.position, rect.y);
  }

  return {
    diff,
    priority: 0,
    score: 0,
    guide: { type: activeLine.axis, position: targetLine.position },
    rect: nextRect,
  };
}

function resolveAxisCandidate(
  rect: BoundingBox,
  targetRects: BoundingBox[],
  axis: Axis,
  threshold: number,
  resizingHandle = ''
) {
  const rectLines = getRectLines(rect);
  const activeLines =
    resizingHandle && axis === 'vertical'
      ? rectLines.vertical.filter((line) => getResizeActiveIndexes(resizingHandle, axis).includes(line.index))
      : resizingHandle && axis === 'horizontal'
      ? rectLines.horizontal.filter((line) => getResizeActiveIndexes(resizingHandle, axis).includes(line.index))
      : rectLines[axis];

  const candidates: SnapCandidate[] = [];

  targetRects.forEach((targetRect) => {
    const targetLines = getRectLines(targetRect)[axis];

    activeLines.forEach((activeLine) => {
      targetLines.forEach((targetLine) => {
        const diff = Math.abs(minus(activeLine.position, targetLine.position));
        const candidateThreshold = getCandidateThreshold(
          threshold,
          activeLine,
          targetLine,
          resizingHandle
        );

        if (diff > candidateThreshold) {
          return;
        }

        const candidate = resizingHandle
          ? createResizeCandidate(rect, resizingHandle, activeLine, targetLine, diff)
          : createDragCandidate(rect, activeLine, targetLine, diff);

        candidate.priority = getCandidatePriority(activeLine, targetLine, resizingHandle);
        candidate.score = getCandidateScore(candidate.diff, candidate.priority);
        candidates.push(candidate);
      });
    });
  });

  return pickClosestCandidate(candidates);
}

function calculateDragSnap(
  rect: BoundingBox,
  targetRects: BoundingBox[],
  threshold: number
): { snappedRect: BoundingBox; guides: GuideLine[] } {
  const verticalCandidate = resolveAxisCandidate(rect, targetRects, 'vertical', threshold);
  const horizontalCandidate = resolveAxisCandidate(rect, targetRects, 'horizontal', threshold);

  const snappedRect = {
    x: verticalCandidate ? verticalCandidate.rect.x : rect.x,
    y: horizontalCandidate ? horizontalCandidate.rect.y : rect.y,
    width: rect.width,
    height: rect.height,
  };
  const guides = [verticalCandidate?.guide, horizontalCandidate?.guide].filter(Boolean) as GuideLine[];

  return {
    snappedRect,
    guides,
  };
}

function calculateResizeSnap(
  rect: BoundingBox,
  targetRects: BoundingBox[],
  threshold: number,
  resizingHandle: string
): { snappedRect: BoundingBox; guides: GuideLine[] } {
  const verticalCandidate = resolveAxisCandidate(
    rect,
    targetRects,
    'vertical',
    threshold,
    resizingHandle
  );
  const horizontalCandidate = resolveAxisCandidate(
    rect,
    targetRects,
    'horizontal',
    threshold,
    resizingHandle
  );

  let snappedRect = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };

  if (verticalCandidate) {
    snappedRect = {
      ...snappedRect,
      x: verticalCandidate.rect.x,
      width: verticalCandidate.rect.width,
    };
  }

  if (horizontalCandidate) {
    snappedRect = {
      ...snappedRect,
      y: horizontalCandidate.rect.y,
      height: horizontalCandidate.rect.height,
    };
  }

  const guides = [verticalCandidate?.guide, horizontalCandidate?.guide].filter(Boolean) as GuideLine[];

  return {
    snappedRect,
    guides,
  };
}

export function calculateSnapAndGuides(
  rawActiveRect: BoundingBox,
  cachedTargetRects: BoundingBox[],
  opts: SnapOptions = {}
): { snappedRect: BoundingBox; guides: GuideLine[] } {
  const { threshold = 5, resizingHandle = '' } = opts;
  const targetRects = cachedTargetRects || [];
  const result = resizingHandle
    ? calculateResizeSnap(rawActiveRect, targetRects, threshold, resizingHandle)
    : calculateDragSnap(rawActiveRect, targetRects, threshold);

  return {
    guides: result.guides,
    snappedRect: {
      ...result.snappedRect,
      x: Math.max(0, result.snappedRect.x),
      y: Math.max(0, result.snappedRect.y),
    },
  };
}

export function isGuideLine(elem: HTMLElement) {
  return elem.classList.contains(`${prefixCls}-guide-line`);
}
