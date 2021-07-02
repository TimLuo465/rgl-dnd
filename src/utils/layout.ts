import lodashEqual from 'lodash.isequal';
import { CompactType, DragItem, LayoutItem, PositionParams } from '../types';
import { calcCP } from './calclate';

/**
 * Return the bottom coordinate of the layout.
 *
 * @param  {Array} layout Layout array.
 * @return {Number}       Bottom coordinate.
 */
export function bottom(layouts: LayoutItem[]): number {
  let max = 0;
  let bottomY: number;

  layouts.forEach((l) => {
    bottomY = l.y + l.h;

    if (bottomY > max) {
      max = bottomY;
    }
  });

  return max;
}

export function getContainerHeight(
  layouts: LayoutItem[],
  params: Omit<PositionParams, 'maxRows' | 'cols' | 'containerWidth'>
): string {
  const nbRow = bottom(layouts);
  const { containerPadding, margin, rowHeight } = params;
  const cp = calcCP(containerPadding, 'y');
  const [, mY] = margin;

  return nbRow * rowHeight + (nbRow - 1) * mY + cp + 'px';
}

export function getLayoutItem(layouts: LayoutItem[], i: string): LayoutItem | null {
  return layouts.find((l) => l.i === i);
}

/**
 * Sort layout items by column ascending then row ascending.
 *
 * Does not modify Layout.
 */
export function sortLayoutItemsByColRow(layout: LayoutItem[]): LayoutItem[] {
  return layout.slice(0).sort(function sort(a, b) {
    if (a.x > b.x || (a.x === b.x && a.y > b.y)) {
      return 1;
    }
    return -1;
  });
}

/**
 * Sort layout items by row ascending and column ascending.
 *
 * Does not modify Layout.
 */
export function sortLayoutItemsByRowCol(layout: LayoutItem[]): LayoutItem[] {
  // Slice to clone array as sort modifies
  return layout.slice(0).sort(function sort(a, b) {
    if (a.y > b.y || (a.y === b.y && a.x > b.x)) {
      return 1;
    } else if (a.y === b.y && a.x === b.x) {
      // Without this, we can get different sort results in IE vs. Chrome/FF
      return 0;
    }
    return -1;
  });
}

/**
 * Get layout items sorted from top left to right and down.
 *
 * @return {Array} Array of layout objects.
 * @return {Array}        Layout, sorted static items first.
 */
export function sortLayoutItems(layout: LayoutItem[], compactType: CompactType): LayoutItem[] {
  if (compactType === 'horizontal') {
    return sortLayoutItemsByColRow(layout);
  }
  return sortLayoutItemsByRowCol(layout);
}

/**
 * Given two layoutitems, check if they collide.
 */
export function collides(l1: LayoutItem, l2: LayoutItem): boolean {
  if (l1.i === l2.i) return false; // same element
  if (l1.x + l1.w <= l2.x) return false; // l1 is left of l2
  if (l1.x >= l2.x + l2.w) return false; // l1 is right of l2
  if (l1.y + l1.h <= l2.y) return false; // l1 is above l2
  if (l1.y >= l2.y + l2.h) return false; // l1 is below l2
  return true; // boxes overlap
}

export function getAllCollisions(layouts: LayoutItem[], layoutItem: LayoutItem): LayoutItem[] {
  return layouts.filter((l) => collides(l, layoutItem));
}

/**
 * Returns the first item this layout collides with.
 * It doesn't appear to matter which order we approach this from, although
 * perhaps that is the wrong thing to do.
 *
 * @param  {Object} layoutItem Layout item.
 * @return {Object|undefined}  A colliding layout item, or undefined.
 */
export function getFirstCollision(layouts: LayoutItem[], layoutItem: LayoutItem): LayoutItem {
  for (let i = 0, len = layouts.length; i < len; i++) {
    if (collides(layouts[i], layoutItem)) {
      return layouts[i];
    }
  }
}

/**
 * This is where the magic needs to happen - given a collision, move an element away from the collision.
 * We attempt to move it up if there's room, otherwise it goes below.
 *
 * @param  {Array} layout            Full layout to modify.
 * @param  {LayoutItem} collidesWith Layout item we're colliding with.
 * @param  {LayoutItem} itemToMove   Layout item we're moving.
 */
export function moveElementAwayFromCollision(
  layouts: LayoutItem[],
  collidesWith: LayoutItem,
  itemToMove: LayoutItem,
  isUserAction: boolean,
  compactType: CompactType,
  cols: number
): LayoutItem[] {
  const compactH = compactType === 'horizontal';
  // Compact vertically if not set to horizontal
  const compactV = compactType !== 'horizontal';
  const preventCollision = collidesWith.static; // we're already colliding (not for static items)

  // If there is enough space above the collision to put this element, move it there.
  // We only do this on the main collision as this can get funky in cascades and cause
  // unwanted swapping behavior.
  if (isUserAction) {
    // Reset isUserAction flag because we're not in the main collision anymore.
    isUserAction = false;

    // Make a mock item so we don't modify the item here, only modify in moveElement.
    const fakeItem: LayoutItem = {
      x: compactH ? Math.max(collidesWith.x - itemToMove.w, 0) : itemToMove.x,
      y: compactV ? Math.max(collidesWith.y - itemToMove.h, 0) : itemToMove.y,
      w: itemToMove.w,
      h: itemToMove.h,
      i: '-1',
    };

    // No collision? If so, we can go up there; otherwise, we'll end up moving down as normal
    if (!getFirstCollision(layouts, fakeItem)) {
      return moveElement(
        layouts,
        itemToMove,
        compactH ? fakeItem.x : undefined,
        compactV ? fakeItem.y : undefined,
        isUserAction,
        preventCollision,
        compactType,
        cols
      );
    }
  }

  return moveElement(
    layouts,
    itemToMove,
    compactH ? itemToMove.x + 1 : undefined,
    compactV ? itemToMove.y + 1 : undefined,
    isUserAction,
    preventCollision,
    compactType,
    cols
  );
}

const heightWidth = { x: 'w', y: 'h' };
/**
 * Before moving item down, it will check if the movement will cause collisions and move those items down before.
 */
function resolveCompactionCollision(
  layouts: LayoutItem[],
  item: LayoutItem,
  moveToCoord: number,
  axis: 'x' | 'y'
) {
  const sizeProp = heightWidth[axis];
  item[axis] += 1;
  const itemIndex = layouts
    .map((layoutItem) => {
      return layoutItem.i;
    })
    .indexOf(item.i);

  // Go through each item we collide with.
  for (let i = itemIndex + 1; i < layouts.length; i++) {
    const otherItem = layouts[i];
    // Ignore static items
    if (otherItem.static) continue;

    // Optimization: we can break early if we know we're past this el
    // We can do this b/c it's a sorted layout
    if (otherItem.y > item.y + item.h) break;

    if (collides(item, otherItem)) {
      resolveCompactionCollision(layouts, otherItem, moveToCoord + item[sizeProp], axis);
    }
  }

  item[axis] = moveToCoord;
}

/**
 * Compact an item in the layout.
 *
 * Modifies item.
 *
 */
export function compactItem(
  compareWith: LayoutItem[],
  l: LayoutItem,
  compactType: CompactType,
  cols: number,
  fullLayout: LayoutItem[]
): LayoutItem {
  const compactV = compactType === 'vertical';
  const compactH = compactType === 'horizontal';
  if (compactV) {
    // Bottom 'y' possible is the bottom of the layout.
    // This allows you to do nice stuff like specify {y: Infinity}
    // This is here because the layout must be sorted in order to get the correct bottom `y`.
    l.y = Math.min(bottom(compareWith), l.y);
    // Move the element up as far as it can go without colliding.
    while (l.y > 0 && !getFirstCollision(compareWith, l)) {
      l.y--;
    }
  } else if (compactH) {
    // Move the element left as far as it can go without colliding.
    while (l.x > 0 && !getFirstCollision(compareWith, l)) {
      l.x--;
    }
  }

  // Move it down, and keep moving it down if it's colliding.
  let collides;
  while ((collides = getFirstCollision(compareWith, l))) {
    if (compactH) {
      resolveCompactionCollision(fullLayout, l, collides.x + collides.w, 'x');
    } else {
      resolveCompactionCollision(fullLayout, l, collides.y + collides.h, 'y');
    }
    // Since we can't grow without bounds horizontally, if we've overflown, let's move it down and try again.
    if (compactH && l.x + l.w > cols) {
      l.x = cols - l.w;
      l.y++;
    }
  }

  // Ensure that there are no negative positions
  l.y = Math.max(l.y, 0);
  l.x = Math.max(l.x, 0);

  return l;
}

/**
 * Get all static elements.
 * @param  {Array} layout Array of layout objects.
 * @return {Array}        Array of static layout items..
 */
export function getStatics(layouts: LayoutItem[]): LayoutItem[] {
  return layouts.filter((l) => l.static);
}

/**
 * Given a layout, compact it. This involves going down each y coordinate and removing gaps
 * between items.
 *
 * Does not modify layout items (clones). Creates a new layout array.
 *
 * @param  {Array} LayoutItem[] LayoutItem[].
 * @param  {Boolean} verticalCompact Whether or not to compact the layout
 *   vertically.
 * @return {Array}       Compacted Layout.
 */
export function compact(
  layouts: LayoutItem[],
  compactType: CompactType,
  cols: number
): LayoutItem[] {
  // Statics go in the compareWith array right away so items flow around them.
  const compareWith = getStatics(layouts);
  // We go through the items by row and column.
  const sorted = sortLayoutItems(layouts, compactType);
  // Holding for new items.
  const out = Array(layouts.length);

  for (let i = 0, len = sorted.length; i < len; i++) {
    let l = { ...sorted[i] };

    // Don't move static elements
    if (!l.static) {
      l = compactItem(compareWith, l, compactType, cols, sorted);

      // Add to comparison array. We only collide with items before this one.
      // Statics are already in this array.
      compareWith.push(l);
    }

    // Add to output array to make sure they still come out in the right order.
    out[layouts.indexOf(sorted[i])] = l;

    // Clear moved flag, if it exists.
    l.moved = false;
  }

  return out;
}

/**
 * Move an element. Responsible for doing cascading movements of other elements.
 *
 * Modifies layout items.
 *
 * @param  {Array}      layout            Full layout to modify.
 * @param  {LayoutItem} l                 element to move.
 * @param  {Number}     [x]               X position in grid units.
 * @param  {Number}     [y]               Y position in grid units.
 */
export function moveElement(
  layouts: LayoutItem[],
  l: LayoutItem,
  x: number,
  y: number,
  isUserAction: boolean,
  preventCollision: boolean,
  compactType: CompactType,
  cols: number
): LayoutItem[] {
  // If this is static and not explicitly enabled as draggable,
  // no move is possible, so we can short-circuit this immediately.
  if (l.static && l.isDraggable !== true) return layouts;

  // Short-circuit if nothing to do.
  if (l.y === y && l.x === x) return layouts;

  const oldX = l.x;
  const oldY = l.y;

  // This is quite a bit faster than extending the object
  if (typeof x === 'number') l.x = x;
  if (typeof y === 'number') l.y = y;
  l.moved = true;

  // If this collides with anything, move it.
  // When doing this comparison, we have to sort the items we compare with
  // to ensure, in the case of multiple collisions, that we're getting the
  // nearest collision.
  let sorted = sortLayoutItems(layouts, compactType);
  const movingUp =
    compactType === 'vertical' && typeof y === 'number'
      ? oldY >= y
      : compactType === 'horizontal' && typeof x === 'number'
      ? oldX >= x
      : false;
  // $FlowIgnore acceptable modification of read-only array as it was recently cloned
  if (movingUp) sorted = sorted.reverse();
  const collisions = getAllCollisions(sorted, l);

  // There was a collision; abort
  if (preventCollision && collisions.length) {
    l.x = oldX;
    l.y = oldY;
    l.moved = false;
    return layouts;
  }

  // Move each item that collides away from this element.
  for (let i = 0, len = collisions.length; i < len; i++) {
    const collision = collisions[i];

    // Short circuit so we can't infinite loop
    if (collision.moved) continue;

    // Don't move static items - we have to move *this* element away
    if (collision.static) {
      layouts = moveElementAwayFromCollision(
        layouts,
        collision,
        l,
        isUserAction,
        compactType,
        cols
      );
    } else {
      layouts = moveElementAwayFromCollision(
        layouts,
        l,
        collision,
        isUserAction,
        compactType,
        cols
      );
    }
  }

  return layouts;
}

/**
 * Given a layout, make sure all elements fit within its bounds.
 *
 * Modifies layout items.
 *
 * @param  {Array} layout Layout array.
 * @param  {Number} bounds Number of columns.
 */
export function correctBounds(layout: LayoutItem[], bounds: { cols: number }): LayoutItem[] {
  const collidesWith = getStatics(layout);
  for (let i = 0, len = layout.length; i < len; i++) {
    const l = layout[i];
    // Overflows right
    if (l.x + l.w > bounds.cols) l.x = bounds.cols - l.w;
    // Overflows left
    if (l.x < 0) {
      l.x = 0;
      l.w = bounds.cols;
    }
    if (!l.static) collidesWith.push(l);
    else {
      // If this is static and collides with other statics, we must move it down.
      // We have to do something nicer than just letting them overlap.
      while (getFirstCollision(collidesWith, l)) {
        l.y++;
      }
    }
  }
  return layout;
}

export function pickDroppingItem(item: DragItem): Partial<LayoutItem> {
  const droppingItem: Partial<LayoutItem> = {};

  if ('i' in item) {
    droppingItem.i = item.i;
  }

  if ('w' in item) {
    droppingItem.w = item.w;
  }

  if ('h' in item) {
    droppingItem.h = item.h;
  }

  return droppingItem;
}

export function reLayout(layouts: LayoutItem[], compactType: CompactType, cols: number) {
  const newLayouts = correctBounds(layouts, { cols });

  return compact(newLayouts, compactType, cols);
}

// Modify a layoutItem inside a layout. Returns a new Layout,
// does not mutate. Carries over all other LayoutItems unmodified.
export function modifyLayout(layouts: LayoutItem[], layoutItem: LayoutItem): LayoutItem[] {
  const len = layouts.length;
  const newLayouts = Array(len);

  for (let i = 0, len = layouts.length; i < len; i++) {
    if (layoutItem.i === layouts[i].i) {
      newLayouts[i] = layoutItem;
    } else {
      newLayouts[i] = layouts[i];
    }
  }
  return newLayouts;
}

// Function to be called to modify a layout item.
// Does defensive clones to ensure the layout is not modified.
export function withLayoutItem(
  layouts: LayoutItem[],
  itemKey: string,
  cb: (l: LayoutItem) => LayoutItem
): [LayoutItem[], LayoutItem | null] {
  let item = getLayoutItem(layouts, itemKey);
  if (!item) return [layouts, null];
  item = cb(item); // defensive clone then modify
  // FIXME could do this faster if we already knew the index
  layouts = modifyLayout(layouts, item);
  return [layouts, item];
}

export function pickLayoutItem({ i, x, y, h, w }: LayoutItem) {
  return { i, x, y, h, w };
}

export function isEqual(layouts1: LayoutItem[], layouts2: LayoutItem[]) {
  const s1 = layouts1.map(pickLayoutItem);
  const s2 = layouts2.map(pickLayoutItem);

  return lodashEqual(s1, s2);
}

export function cloneLayouts(layouts: LayoutItem[]) {
  return JSON.parse(JSON.stringify(layouts));
}

export function getScrollbar(node: HTMLElement): HTMLElement | null {
  let target = node;

  while (target.tagName !== 'BODY') {
    const { overflow } = window.getComputedStyle(target);

    if (overflow === 'scroll' || overflow === 'auto') {
      return target;
    }

    target = target.parentElement;
  }

  return null;
}
