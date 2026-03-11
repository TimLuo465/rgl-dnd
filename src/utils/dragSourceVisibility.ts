import { prefixCls } from '../constants';
import { DragItem } from '../types';

type HiddenTarget = {
  el: HTMLElement;
  prevDisplay: string;
};

export class DragSourceVisibilityController {
  private hidden: HiddenTarget | null = null;
  private activeSourceEl: HTMLElement | null = null;
  private sourceToTarget = new WeakMap<HTMLElement, HTMLElement>();

  private resolveTarget(sourceEl: HTMLElement) {
    const cached = this.sourceToTarget.get(sourceEl);
    if (cached) {
      return cached;
    }

    const targetEl =
      (sourceEl?.closest?.(`.${prefixCls}-position-layout-item`) as HTMLElement) || sourceEl;

    if (targetEl) {
      this.sourceToTarget.set(sourceEl, targetEl);
    }

    return targetEl;
  }

  hide(item: DragItem) {
    const sourceEl = item?.extra?.el as HTMLElement;
    if (!sourceEl) {
      return;
    }

    // hide() is called by hover; avoid repeated DOM traversal for the same drag source.
    const nextEl =
      this.activeSourceEl === sourceEl && this.hidden
        ? this.hidden.el
        : this.resolveTarget(sourceEl);

    if (!nextEl) {
      return;
    }

    if (this.hidden?.el && this.hidden.el !== nextEl) {
      this.hidden.el.style.display = this.hidden.prevDisplay;
      this.hidden = null;
    }

    if (!this.hidden) {
      this.hidden = {
        el: nextEl,
        prevDisplay: nextEl.style.display,
      };
    }
    this.activeSourceEl = sourceEl;

    // Force hide every time it re-enters another droppable layout.
    if (this.hidden.el.style.display !== 'none') {
      this.hidden.el.style.display = 'none';
    }
  }

  restore() {
    if (!this.hidden) {
      return;
    }

    this.hidden.el.style.display = '';
    this.hidden = null;
    this.activeSourceEl = null;
  }
}
