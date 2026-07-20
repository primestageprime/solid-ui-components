// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// PopoverMenu — Atomic Primitive (Depth 1)
// Owns CSS (PopoverMenu.css), no component imports beyond external libs.
// Only data/type imports from sibling Primitives (ICON_PATHS, IconName).
// Trigger button with positioned action menu.
// ============================================
import {
  For,
  Show,
  type JSX,
  createSignal,
  onCleanup,
  mergeProps,
} from "solid-js";
import { Portal } from "solid-js/web";
import { ICON_PATHS } from "../Icon/Icon";
import type { IconName } from "../Icon/Icon";
import "./PopoverMenu.css";

export interface PopoverMenuItem<Id extends string = string> {
  id: Id;
  label: string;
  icon?: IconName;
}

export interface PopoverMenuProps<Id extends string = string> {
  /** Content rendered inside the trigger button */
  trigger: JSX.Element;
  /**
   * Optional non-interactive header rendered above the items (e.g. the
   * signed-in user's email in an account menu). It is excluded from the
   * keyboard navigation and the menu's a11y semantics (`role="presentation"`,
   * no focus) — purely a labelling slot. Omit it and the panel is byte-identical
   * to before.
   */
  header?: JSX.Element;
  /** Menu items (at least one required) */
  items: [PopoverMenuItem<Id>, ...PopoverMenuItem<Id>[]];
  /** Called when an item is selected */
  onSelect: (id: Id) => void;
  /** Menu alignment relative to trigger */
  align?: "left" | "right";
  /** Trigger button size */
  size?: "sm" | "md";
}

/** Pixel size matching the matching Icon size class. */
const ICON_SIZE_PX: Record<"xs" | "sm" | "md" | "lg" | "xl", number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

/** Inline an outline SVG glyph from ICON_PATHS — replaces <Icon> for Primitive purity. */
const InlineIcon = (props: {
  name: IconName;
  size: "xs" | "sm" | "md" | "lg" | "xl";
}) => {
  const px = () => ICON_SIZE_PX[props.size];
  return (
    <svg
      width={px()}
      height={px()}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      innerHTML={ICON_PATHS[props.name].outline}
    />
  );
};

export const PopoverMenu = <Id extends string = string>(
  props: PopoverMenuProps<Id>,
) => {
  const merged = mergeProps(
    { align: "right" as const, size: "md" as const },
    props,
  );
  const [open, setOpen] = createSignal(false);
  // Position of the portaled panel, in viewport (fixed) coordinates. Only one
  // of left/right is set, per the alignment.
  const [pos, setPos] = createSignal<{
    top: number;
    left?: number;
    right?: number;
  }>();
  let containerRef: HTMLDivElement | undefined;
  let triggerRef: HTMLButtonElement | undefined;
  // The panel is portaled to document.body, so it is NOT inside containerRef;
  // outside-click detection must consult it separately.
  let panelRef: HTMLUListElement | undefined;

  // The panel renders through a Portal (below), so an ancestor with
  // `overflow: clip/hidden/auto` can never clip it. That means it can't be
  // positioned relative to the trigger via CSS `position: absolute` on a shared
  // ancestor — we measure the trigger and position the panel with
  // `position: fixed` in viewport coordinates instead. Right alignment anchors
  // the panel's right edge to the trigger's right (no panel-width measurement
  // needed); left alignment anchors its left edge to the trigger's left.
  const computePosition = () => {
    if (!triggerRef) return;
    const rect = triggerRef.getBoundingClientRect();
    const top = rect.bottom + 4;
    if (merged.align === "right") {
      setPos({ top, right: window.innerWidth - rect.right });
    } else {
      setPos({ top, left: rect.left });
    }
  };

  const panelStyle = (): JSX.CSSProperties => {
    const p = pos();
    if (!p) return { position: "fixed" };
    return {
      position: "fixed",
      top: `${p.top}px`,
      left: p.left !== undefined ? `${p.left}px` : undefined,
      right: p.right !== undefined ? `${p.right}px` : undefined,
    };
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Node;
    const inContainer = containerRef?.contains(target);
    const inPanel = panelRef?.contains(target);
    if (!inContainer && !inPanel) {
      close();
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  // Keep the fixed-positioned panel pinned to the trigger as the page scrolls
  // or resizes (capture phase catches scrolling in any ancestor container).
  const handleReposition = () => computePosition();

  const setupListeners = () => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
  };

  const teardownListeners = () => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("scroll", handleReposition, true);
    window.removeEventListener("resize", handleReposition);
  };

  const close = () => {
    setOpen(false);
    teardownListeners();
  };

  onCleanup(teardownListeners);

  const toggle = () => {
    if (open()) {
      close();
    } else {
      computePosition();
      setOpen(true);
      setupListeners();
    }
  };

  const select = (id: Id) => {
    try {
      merged.onSelect(id);
    } finally {
      close();
    }
  };

  const containerClass = () => {
    const classes = ["sui-popover-menu"];
    classes.push(`sui-popover-menu--align-${merged.align}`);
    if (open()) classes.push("sui-popover-menu--open");
    return classes.join(" ");
  };

  const triggerClass = () =>
    `sui-popover-menu__trigger sui-popover-menu__trigger--${merged.size}`;

  return (
    <div class={containerClass()} ref={containerRef}>
      <button
        type="button"
        class={triggerClass()}
        onClick={toggle}
        ref={triggerRef}
      >
        <span class="sui-popover-menu__trigger-content">
          {merged.trigger}
          <span class="sui-popover-menu__caret">
            <InlineIcon name="chevron-down" size="xs" />
          </span>
        </span>
      </button>

      <Show when={open()}>
        {/* Portaled to document.body so no ancestor's overflow can clip it;
            positioned via inline fixed coords measured from the trigger. */}
        <Portal>
          <ul class="sui-popover-menu__panel" ref={panelRef} style={panelStyle()}>
            <Show when={merged.header}>
              <li class="sui-popover-menu__header" role="presentation">
                {merged.header}
              </li>
            </Show>
            <For each={merged.items}>
              {(item) => (
                <li
                  class="sui-popover-menu__item"
                  // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: intentional ARIA menu composite — <ul> panel with role="menuitem" <li>s; full keyboard support (tabIndex + Enter/Space onKeyDown) provided below
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => select(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select(item.id);
                    }
                  }}
                >
                  <Show when={item.icon}>
                    <span class="sui-popover-menu__item-icon">
                      <InlineIcon name={item.icon!} size="sm" />
                    </span>
                  </Show>
                  <span class="sui-popover-menu__item-label">{item.label}</span>
                </li>
              )}
            </For>
          </ul>
        </Portal>
      </Show>
    </div>
  );
};

/** Right-aligned, small trigger — common header use case. */
export const RightPopoverMenu = <Id extends string = string>(
  props: Omit<PopoverMenuProps<Id>, "align" | "size">,
) => {
  const merged = mergeProps(
    { align: "right" as const, size: "sm" as const },
    props,
  );
  return <PopoverMenu {...merged} />;
};
