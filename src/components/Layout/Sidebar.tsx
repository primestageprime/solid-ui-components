// ============================================
// Sidebar — Resizable, width-persisting side column.
//
// A fixed-but-draggable vertical column for the side of a two-pane layout.
// Bakes the layout plumbing (fixed width, flex-shrink:0, full-height stretch,
// internal vertical scroll) so call sites never specify width/flex/overflow.
//
// - Canonical default width until the user drags it.
// - Drag the inner edge to resize (clamped to [MIN, MAX]).
// - The chosen width persists in localStorage, keyed by `id`, so it survives
//   reloads and stays local to the machine (different screens keep their own
//   preference). Double-click the handle to reset to the default.
// ============================================
import { type Component, type JSX, createSignal, onMount, splitProps } from "solid-js";
import { Stack } from "./Stack";
import "./Sidebar.css";

const DEFAULT_WIDTH = 300;
const MIN_WIDTH = 200;
const MAX_WIDTH = 720;

const clampWidth = (n: number) => Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, n));
const storageKey = (id: string) => `sui-sidebar-width:${id}`;

export interface SidebarProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "id"> {
  /** Stable key for persisting the user-chosen width in localStorage. Required. */
  id: string;
  /**
   * Which edge carries the drag handle. `"right"` (default) for a left-docked
   * sidebar (resizes on its right edge); `"left"` for a right-docked sidebar.
   */
  handle?: "left" | "right";
  /** Gap between stacked children. Defaults to `sm`. */
  gap?: "xs" | "sm";
  children?: JSX.Element;
}

export const Sidebar: Component<SidebarProps> = (props) => {
  const [local, others] = splitProps(props, [
    "id",
    "handle",
    "gap",
    "children",
    "class",
    "style",
  ]);

  const side = () => local.handle ?? "right";
  const [width, setWidth] = createSignal(DEFAULT_WIDTH);

  // Restore the persisted width on the client (SSR renders the default).
  onMount(() => {
    try {
      const saved = window.localStorage.getItem(storageKey(local.id));
      if (saved) {
        const n = parseInt(saved, 10);
        if (!Number.isNaN(n)) setWidth(clampWidth(n));
      }
    } catch {
      /* localStorage unavailable (private mode / SSR) — keep default */
    }
  });

  const persist = (w: number) => {
    try {
      window.localStorage.setItem(storageKey(local.id), String(w));
    } catch {
      /* ignore */
    }
  };

  const onHandlePointerDown = (e: PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width();
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const delta = side() === "right" ? dx : -dx;
      setWidth(clampWidth(startW + delta));
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      persist(width());
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Double-click the handle to reset to the canonical default width.
  const onHandleDblClick = () => {
    setWidth(DEFAULT_WIDTH);
    persist(DEFAULT_WIDTH);
  };

  const classes = () => ["sidebar", local.class].filter(Boolean).join(" ");

  return (
    <div
      class={classes()}
      style={{ width: `${width()}px`, ...(local.style as JSX.CSSProperties) }}
      {...others}
    >
      <Stack gap={local.gap ?? "sm"} class="sidebar__content">
        {local.children}
      </Stack>
      <div
        class={`sidebar__handle sidebar__handle--${side()}`}
        role="separator"
        aria-orientation="vertical"
        onPointerDown={onHandlePointerDown}
        onDblClick={onHandleDblClick}
      />
    </div>
  );
};
