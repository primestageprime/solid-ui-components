/* SplitQueueList — keyboard navigation & roving tabindex.
 *
 * The two panes are exposed as `role="listbox"`es of `role="option"` rows so
 * assistive tech announces them as a selectable list and reads each row's
 * selected state. Rows are reachable and actionable from the keyboard via a
 * ROVING TABINDEX: exactly one row is in the tab order (tabindex 0) and the rest
 * are -1; Arrow/Home/End move DOM focus between rows (treating the two panes as
 * one top→bottom sequence), and Enter/Space select the focused row (mirroring a
 * click). This keeps the whole queue operable without a mouse.
 *
 * Factored out of the component so the (self-contained) roving-tabindex state
 * machine is testable in isolation; it reads the live DOM order for movement and
 * takes the rest of its inputs as accessors. */
import { createMemo, createSignal } from "solid-js";
import { clamp } from "../../internal/math/clamp";

export interface RowKeyboardDeps {
  /** The component root the rows are queried within (may be undefined pre-mount). */
  getRootEl: () => HTMLElement | undefined;
  /** All row keys in DOM order (resolved pane first, then unresolved). */
  allKeys: () => string[];
  /** The focused unresolved head, if any (drives the default tab stop). */
  focusedKey: () => string | null;
  /** The controlled selection, if any. */
  selectedKey: () => string | undefined;
  /** Select a row (mirrors a click). */
  onSelect: (key: string) => void;
}

export interface RowKeyboard {
  /** Which row currently holds the single tab stop (tabindex 0). */
  tabbableKey: () => string | null;
  /** Record the row the user focused (e.g. from the row's onFocus). */
  setActiveKey: (key: string | null) => void;
  /** keydown handler for a row, bound to its key. */
  onRowKeyDown: (e: KeyboardEvent, key: string) => void;
}

export function createRowKeyboard(deps: RowKeyboardDeps): RowKeyboard {
  const [activeKey, setActiveKey] = createSignal<string | null>(null);

  // Which row currently holds the tab stop. Prefer the row the user last focused
  // (`activeKey`), then the controlled selection, then the focused unresolved
  // head, then the first row overall — so there's always exactly one tab stop and
  // it lands somewhere sensible before any interaction. Falls back cleanly as
  // rows come and go (a stale key that's no longer rendered is ignored).
  const tabbableKey = createMemo(() => {
    const allKeys = deps.allKeys();
    const active = activeKey();
    if (active && allKeys.includes(active)) return active;
    const sel = deps.selectedKey();
    if (sel && allKeys.includes(sel)) return sel;
    const fk = deps.focusedKey();
    if (fk && allKeys.includes(fk)) return fk;
    return allKeys[0] ?? null;
  });

  // Move DOM focus to the previous/next row (or the first/last), across BOTH
  // panes as one sequence. Driven off the live DOM order so it tracks the
  // rendered rows without threading indices through state.
  const moveFocus = (fromKey: string, dir: 1 | -1 | "home" | "end") => {
    const rootEl = deps.getRootEl();
    if (!rootEl) return;
    const rows = [...rootEl.querySelectorAll<HTMLElement>("[data-sql-key]")];
    if (rows.length === 0) return;
    const idx = rows.findIndex((r) => r.dataset.sqlKey === fromKey);
    const target =
      dir === "home"
        ? rows[0]
        : dir === "end"
          ? rows[rows.length - 1]
          : rows[clamp(idx + dir, 0, rows.length - 1)];
    if (!target) return;
    setActiveKey(target.dataset.sqlKey ?? null);
    target.focus();
  };

  const onRowKeyDown = (e: KeyboardEvent, key: string) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault(); // Space would otherwise scroll the pane
        deps.onSelect(key);
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
