// ============================================
// Shared getBoundingClientRect double.
//
// jsdom performs no layout: every rect is all zeros. Any component that decides
// something from geometry — every drag-and-drop hit test, every overflow
// measurement — is therefore untestable until a test supplies rects. Eight test
// files did that by hand, each spying on `Element.prototype`, each
// re-remembering to delegate to the original for elements it does not model,
// each restoring by hand.
//
// That installation is what deduplicates here. The GEOMETRY does not, and
// should not: the five hand-rolled models were two genuinely different kinds.
//
//   `verticalRows` — static, keyed by `data-dnd-id`. Row i occupies
//     [i*height, i*height+height). The id keeps the geometry attached to the
//     node through a reflow, so a preview reorder does not move the rects.
//
//   `liveFlow` — reflow-aware, keyed by CURRENT DOM order. Widths vary per
//     element and a placeholder assumes the dragged item's width, so the rects
//     recompute as the preview order changes — which is exactly what
//     DnDHierarchySortBar's sweep test exists to exercise.
//
// Collapsing those into one configurable model would make the model itself the
// thing needing tests, so the policy stays a parameter.
//
// Restore is hand-rolled rather than `vi.spyOn` because `restoreMocks` is not
// set in vitest.config.ts — spies do not auto-restore, so every existing file
// already saves the original and puts it back. Keeping vitest out of this
// module also keeps it out of `dist/test-utils/*.d.ts`, which is published.
// ============================================

/** Produce a rect for `el`, or null to fall through to the real (all-zero)
 *  jsdom implementation. */
export type RectProvider = (el: Element) => DOMRect | null;

export interface RectBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Build a DOMRect from a box. Exported because a bespoke `RectProvider` — one
 *  that sizes an element from its own live textContent, say — otherwise has no
 *  way to produce the return value. */
export const rectOf = (box: RectBox): DOMRect =>
  ({
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
    right: box.left + box.width,
    bottom: box.top + box.height,
    x: box.left,
    y: box.top,
    toJSON() {},
  }) as DOMRect;

/**
 * Install `provider` over `Element.prototype.getBoundingClientRect` and return
 * the restore. Elements the provider declines (null) keep the real
 * implementation, so unmodelled nodes behave exactly as they do today.
 */
export function installRects(provider: RectProvider): () => void {
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function patched(
    this: Element,
  ): DOMRect {
    const supplied = provider(this);
    return supplied ?? original.call(this);
  };
  return () => {
    Element.prototype.getBoundingClientRect = original;
  };
}

export interface VerticalRowsOptions {
  /** Row height in px (default 100). */
  height?: number;
  /** Row width in px (default 300). */
  width?: number;
  /** Attribute carrying the row identity (default `data-dnd-id`). */
  attribute?: string;
}

/**
 * Static vertical stack keyed by identity attribute: row `i` in `ids` occupies
 * `[i*height, i*height+height)`. Because the rect follows the ID rather than
 * DOM position, a preview reorder does not shuffle the geometry — which is what
 * SortableList and MutableList's hit tests assume.
 */
export function verticalRows(
  ids: readonly string[],
  options: VerticalRowsOptions = {},
): RectProvider {
  const height = options.height ?? 100;
  const width = options.width ?? 300;
  const attribute = options.attribute ?? "data-dnd-id";

  return (el: Element): DOMRect | null => {
    const id = el.getAttribute?.(attribute);
    if (!id) return null;
    const index = ids.indexOf(id);
    if (index < 0) return null;
    return rectOf({ left: 0, top: index * height, width, height });
  };
}

export interface LiveFlowOptions {
  /** Which descendants participate in the flow. */
  selector: string;
  /** Width of a participating element. Called on every rect query, so it may
   *  read live DOM state (a placeholder assuming the dragged item's width). */
  widthOf: (el: Element) => number;
  /** Gap between adjacent elements in px (default 0). */
  gap?: number;
  /** Row height in px (default 32). */
  height?: number;
}

/**
 * Reflow-aware horizontal flow keyed by CURRENT DOM order. Positions are
 * recomputed on every query, so when the component reorders its preview the
 * rects move with it — the browser behaviour a sweep test depends on.
 */
export function liveFlow(
  root: Element,
  options: LiveFlowOptions,
): RectProvider {
  const gap = options.gap ?? 0;
  const height = options.height ?? 32;

  return (el: Element): DOMRect | null => {
    let left = 0;
    for (const candidate of root.querySelectorAll(options.selector)) {
      const width = options.widthOf(candidate);
      if (candidate === el) {
        return rectOf({ left, top: 0, width, height });
      }
      left += width + gap;
    }
    return null;
  };
}
