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
  untrack,
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
  /** Render the row as unavailable. The whole row dims — label and indicator
   *  together — the row reports `aria-disabled="true"`, a click or an
   *  Enter/Space does not select it and does not close the menu, and the
   *  keyboard navigation steps over it. */
  disabled?: boolean;
  /** Why the row reads as it does — most often why `disabled` refuses it. The
   *  row carries it as the native `title`, so a mouse user reads it on hover,
   *  and as `aria-describedby` pointing at a screen-reader-only element, so a
   *  keyboard or touch user hears it. It is independent of `disabled`: an
   *  available row may carry a reason too. */
  reason?: string;
}

/** A row the user can choose. `disabled` is optional, so only an explicit
 *  `true` makes a row unavailable. */
const isSelectable = (item: DropdownItem): boolean => item.disabled !== true;

/** The index of the first selectable item at `from` or beyond it, in the
 *  `step` direction. Returns -1 when the search finds none, which is what an
 *  all-disabled list gives — the caller then leaves the focus where it is. */
const seekSelectable = (
  items: readonly DropdownItem[],
  from: number,
  step: 1 | -1,
): number =>
  find(
    (i: number) => i >= 0 && i < items.length && isSelectable(items[i]),
    Array.from({ length: items.length }, (_, n) => from + n * step),
  ) ?? -1;

/** The id of the element that carries an item's `reason`. The row points at
 *  it with `aria-describedby`. `prefix` is the Dropdown's own unique id, so
 *  two Dropdowns showing the same item never collide, and
 *  `encodeURIComponent` maps each item id to one id and escapes the
 *  whitespace that `aria-describedby`'s space-separated list would split on. */
const reasonElementId = (prefix: string, itemId: string): string =>
  `${prefix}-reason-${encodeURIComponent(itemId)}`;

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

/** What a `trigger` render prop receives: the live open state, the resolved
 *  selection, and the three commands that drive the menu. The consumer draws
 *  the whole trigger — indicator, label and caret — and calls `toggle` itself,
 *  because the wrapper binds no click handler. */
export interface DropdownTriggerState {
  /** True while the listbox is open. */
  open: boolean;
  /** The item whose `id` matches `value`, or `undefined`. */
  selected: DropdownItem | undefined;
  /** Open the menu when it is closed; close it when it is open. */
  toggle: () => void;
  /** Open the menu. */
  openMenu: () => void;
  /** Close the menu. */
  close: () => void;
}

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
  /** Render the trigger yourself. The slot replaces the whole trigger content
   *  — indicator, label and caret — inside a `div[role="combobox"]` that keeps
   *  the ARIA wiring and the arrow-key handler. The wrapper binds no click, so
   *  every click reaches your element and a caret lands where the user aims;
   *  call `toggle` from the state to open the menu. Enter stays unclaimed, so
   *  an `<input>` in an ancestor `<form>` still submits. */
  trigger?: (state: DropdownTriggerState) => JSX.Element;
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
  // What held focus when a slot trigger opened the menu. `closeMenu` gives the
  // focus back to it, because a slot leaves `triggerRef` undefined and the
  // ARIA combobox pattern returns focus to the consumer's own element.
  let focusOnClose: Element | null = null;
  const menuId = createUniqueId();
  const triggerId = createUniqueId();

  const selected = () => find((item) => item.id === merged.value, merged.items);

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      closeMenu(false);
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    closeMenu();
    // A slot trigger owns the second Escape. This listener binds only while the
    // menu is open, so the first Escape closes the menu and stops here; the
    // next one reaches the consumer's own element and can mean "revert".
    if (merged.trigger) e.stopPropagation();
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

  // Focus the option at `i` (clamped), updating the roving tab stop. A
  // disabled row never takes the tab stop: the search steps over it in the
  // `step` direction and stops at the end of the list. With no selectable row
  // in that direction — an all-disabled list included — the focus stays put,
  // so the search always terminates.
  const focusOption = (i: number, step: 1 | -1 = 1) => {
    const opts = menuRef?.querySelectorAll<HTMLElement>('[role="option"]');
    if (!opts || opts.length === 0) return;
    const from = clamp(i, 0, opts.length - 1);
    const idx = seekSelectable(merged.items, from, step);
    if (idx < 0) return;
    setActiveIndex(idx);
    opts[idx]?.focus();
  };

  const openMenu = (focus: "first" | "last" | "selected") => {
    if (merged.trigger) focusOnClose = document.activeElement;
    setOpen(true);
    setupListeners();
    // A slot trigger owns the focus. `toggle` and `openMenu` ask for
    // `"selected"`, and stealing focus there blurs the consumer's input
    // mid-typing — so open with no option focused and `activeIndex` at -1.
    // The arrow keys ask for `"first"`/`"last"` and still place focus.
    if (merged.trigger && focus === "selected") return;
    // Defer until the listbox has rendered, then place focus.
    queueMicrotask(() => {
      const count = merged.items.length;
      if (count === 0) return;
      // `"selected"` opens on the value's own row. When that row is disabled,
      // the search runs forwards first and falls back to backwards, so the
      // menu still opens on a row the user can choose.
      switch (focus) {
        case "last":
          focusOption(count - 1, -1);
          return;
        case "first":
          focusOption(0, 1);
          return;
        case "selected": {
          const sel = findIndex((it) => it.id === merged.value, merged.items);
          const from = sel >= 0 ? sel : 0;
          if (seekSelectable(merged.items, from, 1) >= 0) focusOption(from, 1);
          else focusOption(from, -1);
          return;
        }
      }
    });
  };

  const closeMenu = (refocusTrigger = true) => {
    setOpen(false);
    teardownListeners();
    setActiveIndex(-1);
    const restore = focusOnClose;
    focusOnClose = null;
    if (!refocusTrigger) return;
    // A slot trigger hands the focus back to whatever held it at open time —
    // the consumer's own input. This covers every close path that returns
    // focus: a pick and Escape alike. The element can have left the DOM in the
    // meantime, so check it first.
    if (
      restore !== null &&
      restore !== document.body &&
      document.contains(restore) &&
      restore instanceof HTMLElement
    ) {
      restore.focus();
      return;
    }
    // `triggerRef` holds the button only. A slot trigger leaves it undefined,
    // which guards the refocus: the wrapper `div` carries no tabindex, so
    // focusing it would do nothing anyway.
    triggerRef?.focus();
  };

  const toggle = () => {
    if (open()) closeMenu(false);
    else openMenu("selected");
  };

  // A disabled row keeps its click handler, because it stays a real option in
  // the listbox (`aria-disabled`, not the native `disabled` attribute, so
  // assistive tech still announces it). The guard lives here: a click or an
  // Enter/Space on such a row changes nothing and leaves the menu open.
  const select = (item: DropdownItem) => {
    if (!isSelectable(item)) return;
    merged.onChange(item.id);
    closeMenu(); // returns focus to the trigger
  };

  const itemClass = (item: DropdownItem): string => {
    const classes = ["sui-dropdown__item"];
    if (item.id === merged.value) classes.push("sui-dropdown__item--active");
    if (!isSelectable(item)) classes.push("sui-dropdown__item--disabled");
    return classes.join(" ");
  };

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    // Enter/Space open via the native button click (onClick={toggle}); arrows
    // open and land focus on the first/last option.
    if (e.key === "ArrowDown") {
      e.preventDefault();
      open()
        ? focusOption(activeIndex() < 0 ? 0 : activeIndex(), 1)
        : openMenu("first");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      open() ? focusOption(activeIndex(), -1) : openMenu("last");
    }
  };

  const onOptionKeyDown = (e: KeyboardEvent, index: number) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusOption(index + 1, 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusOption(index - 1, -1);
        break;
      case "Home":
        // Home and End land on the first and the last row the user can
        // choose, so a disabled row at either end is stepped over.
        e.preventDefault();
        focusOption(0, 1);
        break;
      case "End":
        e.preventDefault();
        focusOption(merged.items.length - 1, -1);
        break;
      case "Tab":
        // Tab leaves the widget — close without stealing focus back.
        closeMenu(false);
        break;
      // Enter/Space activate the native button (onClick={select}); Escape is
      // handled by the global keydown listener (closes + refocuses the trigger).
    }
  };

  /** The state a `trigger` render prop reads. `open` and `selected` are
   *  getters, so a consumer that reads them inside its own JSX gets a
   *  fine-grained binding that updates in place. That matters: the slot is
   *  invoked once, under `untrack`, or every open would rebuild the consumer's
   *  element and throw away its focus, its caret and its IME state. */
  const triggerState = (): DropdownTriggerState => ({
    get open() {
      return open();
    },
    get selected() {
      return selected();
    },
    toggle,
    openMenu: () => openMenu("selected"),
    close: () => closeMenu(false),
  });

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
      <Show
        when={merged.trigger}
        fallback={
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
        }
      >
        {(trigger) => (
          // The wrapper must stay unfocusable. The consumer's own element
          // inside the slot (an input, say) is the focus target and the tab
          // stop; a tabindex here would add a second, empty stop before it.
          // biome-ignore lint/a11y/useFocusableInteractive: see above
          <div
            class="sui-dropdown__trigger sui-dropdown__trigger--slot"
            id={triggerId}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open()}
            aria-controls={open() ? menuId : undefined}
            onKeyDown={onTriggerKeyDown}
          >
            {untrack(() => trigger()(triggerState()))}
          </div>
        )}
      </Show>

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
              <>
                <button
                  class={itemClass(item)}
                  type="button"
                  role="option"
                  aria-selected={item.id === merged.value}
                  aria-disabled={isSelectable(item) ? undefined : true}
                  title={item.reason}
                  aria-describedby={
                    item.reason === undefined
                      ? undefined
                      : reasonElementId(menuId, item.id)
                  }
                  tabindex={index() === activeIndex() ? 0 : -1}
                  onClick={() => select(item)}
                  onKeyDown={(e) => onOptionKeyDown(e, index())}
                >
                  <Indicator color={item.color} shape={item.shape} />
                  {item.label}
                </button>
                {/* The description sits outside the option, because a child
                    of the button would join its accessible name. `sui-sr-only`
                    takes it out of flow, so the menu's box is unchanged. */}
                <Show when={item.reason}>
                  {(reason) => (
                    <span
                      class="sui-sr-only"
                      id={reasonElementId(menuId, item.id)}
                    >
                      {reason()}
                    </span>
                  )}
                </Show>
              </>
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
