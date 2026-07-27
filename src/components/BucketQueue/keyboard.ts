/* BucketQueue — keyboard navigation & roving tabindex.
 *
 * Buckets are exposed as `role="listbox"`es of `role="option"` rows so
 * assistive tech announces each as a selectable list. Rows are reachable via a
 * ROVING TABINDEX: exactly one row is in the tab order (tabindex 0), the rest
 * are -1. Arrow/Home/End move DOM focus, treating every bucket as one
 * top→bottom sequence, and DO NOT WRAP (movement clamps at both ends).
 * Enter/Space activate the row through the shell's select-vs-toggle branch.
 *
 * Ported from SplitQueueList/keyboard.ts with three changes: `onFocusChange`
 * emission, the injected `onActivate`, and the tab-stop precedence — the port
 * checks `focusedKey` before `selectedKey`, where the original checked
 * `selectedKey` first. */
import { createMemo, createSignal } from "solid-js";
import { clamp } from "../../internal/math/clamp";

export interface RowKeyboardDeps {
  /** The component root the rows are queried within (may be undefined pre-mount). */
  getRootEl: () => HTMLElement | undefined;
  /** Interactive row keys only, in render order, top bucket first. A row with
   *  no way to activate it (no onSelect, not checkable) never joins the roving
   *  sequence — it is neither a tab-stop candidate nor an arrow-key target. */
  allKeys: () => string[];
  /** The controlled focus, if any. */
  focusedKey: () => string | undefined;
  /** The controlled selection, if any. */
  selectedKey: () => string | undefined;
  /** Activate a row (mirrors a click — selects, or toggles in select mode). */
  onActivate: (key: string) => void;
  /** Report that keyboard focus moved. */
  onFocusChange: (key: string | null) => void;
}

export interface RowKeyboard {
  /** Which row currently holds the tab stop (tabindex 0). */
  tabbableKey: () => string | null;
  /** Record the row the user focused (e.g. from the row's onFocus). */
  setActiveKey: (key: string | null) => void;
  /** keydown handler for a row, bound to its key. */
  onRowKeyDown: (e: KeyboardEvent, key: string) => void;
}

export function createRowKeyboard(deps: RowKeyboardDeps): RowKeyboard {
  const [activeKey, setActiveKey] = createSignal<string | null>(null);

  // Exactly one tab stop, chosen by precedence: the row the user last focused,
  // then the controlled focus, then the controlled selection, then the first
  // interactive row — or none, if there is no interactive row at all. A stale
  // key that is no longer rendered (or not interactive) is skipped.
  const tabbableKey = createMemo(() => {
    const allKeys = deps.allKeys();
    const active = activeKey();
    if (active && allKeys.includes(active)) return active;
    const fk = deps.focusedKey();
    if (fk && allKeys.includes(fk)) return fk;
    const sel = deps.selectedKey();
    if (sel && allKeys.includes(sel)) return sel;
    return allKeys[0] ?? null;
  });

  // Move DOM focus across ALL buckets as one sequence, driven off live DOM
  // order so it tracks the rendered rows without threading indices through
  // state. Clamped — the queue does not wrap. Scoped to [data-bq-interactive]
  // so a non-interactive row (rendered with [data-bq-key] for scrollToKey /
  // the transfer animation, but no way to activate it) is never an arrow-key
  // target.
  const moveFocus = (fromKey: string, dir: 1 | -1 | "home" | "end") => {
    const rootEl = deps.getRootEl();
    if (!rootEl) return;
    const rows = [...rootEl.querySelectorAll<HTMLElement>("[data-bq-interactive]")];
    if (rows.length === 0) return;
    const idx = rows.findIndex((r) => r.dataset.bqKey === fromKey);
    const target =
      dir === "home"
        ? rows[0]
        : dir === "end"
          ? rows[rows.length - 1]
          : rows[clamp(idx + dir, 0, rows.length - 1)];
    if (!target) return;
    const key = target.dataset.bqKey ?? null;
    setActiveKey(key);
    target.focus();
    deps.onFocusChange(key);
  };

  const onRowKeyDown = (e: KeyboardEvent, key: string) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault(); // Space would otherwise scroll the bucket body
        deps.onActivate(key);
        break;
      case "ArrowDown":
        e.preventDefault();
        moveFocus(key, 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(key, -1);
        break;
      case "Home":
        e.preventDefault();
        moveFocus(key, "home");
        break;
      case "End":
        e.preventDefault();
        moveFocus(key, "end");
        break;
    }
  };

  return { tabbableKey, setActiveKey, onRowKeyDown };
}
