// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Dropdown — Atomic (Depth 1)
// Owns CSS (Dropdown.css). Composes no other Primitive; `ShapeGlyph` is a
// descriptor→SVG render helper (no state, no CSS of its own), which
// CONTEXT.md's Primitive rule exempts — the rule is about composition, not
// module boundaries.
// Trigger button with popover listbox for single selection.
// ============================================
import {
  type Component,
  For,
  Show,
  type JSX,
  createSignal,
  createUniqueId,
  onCleanup,
  mergeProps,
} from "solid-js";
import { clamp } from "../../internal/math/clamp";
import { find, findIndex } from "../../fn";
import { ShapeGlyph, type Shape } from "../Chart/shapes";
import "./Dropdown.css";

export interface DropdownItem {
  id: string;
  label: string;
  /** Optional indicator color (rendered as a dot) */
  color?: string;
  /** Optional indicator shape. With `color`, renders that shape as a glyph
   *  instead of the plain dot — for identities that are double-coded (colour
   *  *and* shape) so they survive small sizes, colour-blindness and greyscale.
   *  Without `shape`, `color` keeps rendering today's dot. */
  shape?: Shape;
}

/** Nominal px box for a shape indicator. Matches `.sui-dropdown__dot` exactly:
 *  `shape: "circle"` and a bare `color` are the same mark, so a list mixing
 *  them must not look ragged. One nominal size for every shape, as the charts
 *  do — a diamond reads a little lighter than a disc at equal width, and
 *  compensating for that is what breaks circle/dot parity. */
const INDICATOR_GLYPH_SIZE = 8;

/** The per-item identity mark: a shape glyph when `shape` is set, else the
 *  plain colour dot. Renders nothing without a `color`. */
const Indicator: Component<{ color?: string; shape?: Shape }> = (props) => (
  <Show when={props.color}>
    {(color) => (
      <Show
        when={props.shape}
        fallback={
          <span class="sui-dropdown__dot" style={{ background: color() }} />
        }
      >
        {(shape) => (
          <svg
            class="sui-dropdown__glyph"
            width={INDICATOR_GLYPH_SIZE}
            height={INDICATOR_GLYPH_SIZE}
            viewBox={`0 0 ${INDICATOR_GLYPH_SIZE} ${INDICATOR_GLYPH_SIZE}`}
            aria-hidden="true"
          >
            <ShapeGlyph
              descriptor={{ color: color(), shape: shape() }}
              cx={INDICATOR_GLYPH_SIZE / 2}
              cy={INDICATOR_GLYPH_SIZE / 2}
              size={INDICATOR_GLYPH_SIZE}
            />
          </svg>
        )}
      </Show>
    )}
  </Show>
);

export interface DropdownProps {
  /** Items to display in the dropdown menu */
  items: DropdownItem[];
  /** Currently selected item id */
  value?: string;
  /** Callback when an item is selected */
  onChange: (id: string) => void;
  /** Placeholder text when no item is selected */
  placeholder?: string;
  /** Optional footer element (e.g. "Add new" action) */
  footer?: JSX.Element;
  /** Size variant */
  size?: "sm" | "md";
  /** Subtle mode: trigger looks like read-only text until hovered */
  subtle?: boolean;
  /** Optional class for the container */
  class?: string;
}

export const Dropdown: Component<DropdownProps> = (props) => {
  const merged = mergeProps(
    { size: "md" as const, placeholder: "Select..." },
    props,
  );
  const [open, setOpen] = createSignal(false);
  // Which option currently holds the single tab stop / DOM focus (roving
  // tabindex). -1 while closed.
  const [activeIndex, setActiveIndex] = createSignal(-1);
  let containerRef: HTMLDivElement | undefined;
  let triggerRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;
  const menuId = createUniqueId();
  const triggerId = createUniqueId();

  const selected = () => find((item) => item.id === merged.value, merged.items);

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      closeMenu(false);
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeMenu();
  };

  // Global listeners live only while the menu is open.
  const setupListeners = () => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
  };

  const teardownListeners = () => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleKeydown);
  };

  onCleanup(teardownListeners);

  // Focus the option at `i` (clamped), updating the roving tab stop.
  const focusOption = (i: number) => {
    const opts = menuRef?.querySelectorAll<HTMLElement>('[role="option"]');
    if (!opts || opts.length === 0) return;
    const idx = clamp(i, 0, opts.length - 1);
    setActiveIndex(idx);
    opts[idx]?.focus();
  };

  const openMenu = (focus: "first" | "last" | "selected") => {
    setOpen(true);
    setupListeners();
    // Defer until the listbox has rendered, then place focus.
    queueMicrotask(() => {
      const count = merged.items.length;
      if (count === 0) return;
      let i = 0;
      if (focus === "last") i = count - 1;
      else if (focus === "selected") {
        const sel = findIndex((it) => it.id === merged.value, merged.items);
        i = sel >= 0 ? sel : 0;
      }
      focusOption(i);
    });
  };

  const closeMenu = (refocusTrigger = true) => {
    setOpen(false);
    teardownListeners();
    setActiveIndex(-1);
    if (refocusTrigger) triggerRef?.focus();
  };

  const toggle = () => {
    if (open()) closeMenu(false);
    else openMenu("selected");
  };

  const select = (id: string) => {
    merged.onChange(id);
    closeMenu(); // returns focus to the trigger
  };

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    // Enter/Space open via the native button click (onClick={toggle}); arrows
    // open and land focus on the first/last option.
    if (e.key === "ArrowDown") {
      e.preventDefault();
      open()
        ? focusOption(activeIndex() < 0 ? 0 : activeIndex())
        : openMenu("first");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      open() ? focusOption(activeIndex()) : openMenu("last");
    }
  };

  const onOptionKeyDown = (e: KeyboardEvent, index: number) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusOption(index + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusOption(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusOption(0);
        break;
      case "End":
        e.preventDefault();
        focusOption(merged.items.length - 1);
        break;
      case "Tab":
        // Tab leaves the widget — close without stealing focus back.
        closeMenu(false);
        break;
      // Enter/Space activate the native button (onClick={select}); Escape is
      // handled by the global keydown listener (closes + refocuses the trigger).
    }
  };

  const containerClass = () => {
    const classes = ["sui-dropdown"];
    if (merged.size) classes.push(`sui-dropdown--${merged.size}`);
    if (merged.subtle) classes.push("sui-dropdown--subtle");
    if (open()) classes.push("sui-dropdown--open");
    if (merged.class) classes.push(merged.class);
    return classes.join(" ");
  };

  return (
    <div class={containerClass()} ref={containerRef}>
      <button
        id={triggerId}
        ref={triggerRef}
        class="sui-dropdown__trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-controls={open() ? menuId : undefined}
        onClick={toggle}
        onKeyDown={onTriggerKeyDown}
      >
        <Indicator color={selected()?.color} shape={selected()?.shape} />
        <span class="sui-dropdown__label">
          {selected()?.label ?? merged.placeholder}
        </span>
        <span class="sui-dropdown__caret" aria-hidden="true">
          &#9660;
        </span>
      </button>

      <Show when={open()}>
        <div
          id={menuId}
          ref={menuRef}
          class="sui-dropdown__menu"
          role="listbox"
          aria-labelledby={triggerId}
        >
          <For each={merged.items}>
            {(item, index) => (
              <button
                class={`sui-dropdown__item ${item.id === merged.value ? "sui-dropdown__item--active" : ""}`}
                type="button"
                role="option"
                aria-selected={item.id === merged.value}
                tabindex={index() === activeIndex() ? 0 : -1}
                onClick={() => select(item.id)}
                onKeyDown={(e) => onOptionKeyDown(e, index())}
              >
                <Indicator color={item.color} shape={item.shape} />
                {item.label}
              </button>
            )}
          </For>
          <Show when={merged.footer}>
            <div class="sui-dropdown__footer">{merged.footer}</div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

// ── currying ─────────────────────────────────────────────────────────────

export type DropdownOverrides = Pick<DropdownProps, "size" | "subtle">;
export type DropdownDataProps = Omit<DropdownProps, keyof DropdownOverrides>;

export function createDropdown(
  defaults: DropdownOverrides,
): Component<DropdownDataProps> {
  return (props) => <Dropdown {...mergeProps(defaults, props)} />;
}

/** Compact inline picker: small trigger that reads as plain text until
 *  hovered. The form used beside values in dense editors/panes
 *  (option editors, explore panes). */
export const InlineSubtleDropdown = createDropdown({
  size: "sm",
  subtle: true,
});
