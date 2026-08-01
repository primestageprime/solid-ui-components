// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// MultiSelectFilter — Atomic (Depth 1)
// Owns CSS (MultiSelectFilter.css), no component imports.
//
// Responsive multi-select: renders as a horizontal button bar when the
// container is wide enough to fit all options, otherwise collapses to a
// dropdown popover with checkboxes. Same component, same data model
// either way.
//
// Selection semantics: empty `selected` is treated as "all" — every
// chip renders inactive and the data layer applies no filter. There is
// no separate "all" chip. Clicking an inactive chip when nothing is
// selected focuses on just that one (replaces selection); clicking
// another inactive chip while some are already selected adds it;
// clicking an active chip toggles it off, possibly returning to the
// empty-as-all state.
// ============================================
import {
  type Component,
  For,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import {
  ActionSlot,
  GrowBox,
  GrowClusterRow,
  GrowWrapRow,
} from "../Layout/variants";
import { observeSize } from "../../internal/dom/observeSize";
import { filter, find } from "../../fn";
import "./MultiSelectFilter.css";

export interface MultiSelectOption {
  value: string;
  label?: string;
}

export interface MultiSelectFilterProps {
  /** Short label rendered to the left of the control. */
  label?: string;
  options: readonly MultiSelectOption[];
  /** Selected values. Empty array means "all" (no filter). */
  selected: readonly string[];
  onChange: (next: string[]) => void;
  /**
   * Text shown in the dropdown trigger when nothing is selected
   * (i.e. all are implicitly active). Default "all".
   */
  allLabel?: string;
}

const labelOf = (opt: MultiSelectOption): string => opt.label ?? opt.value;

export const MultiSelectFilter: Component<MultiSelectFilterProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;
  const [containerWidth, setContainerWidth] = createSignal(0);
  const [menuOpen, setMenuOpen] = createSignal(false);

  // Pixel budget per option for the fits-as-bar estimate (~10ch + padding).
  // Was a prop; pruned 2026-07-15 — no production caller ever tuned it.
  const optionWidth = () => 90;

  // Width budget required for full button bar mode.
  const requiredWidth = createMemo(() => {
    const labelBudget = props.label ? 70 : 0;
    return labelBudget + props.options.length * optionWidth();
  });

  const mode = createMemo<"bar" | "menu">(() =>
    containerWidth() === 0 || containerWidth() >= requiredWidth()
      ? "bar"
      : "menu",
  );

  onMount(() => {
    if (!containerRef) return;
    setContainerWidth(containerRef.clientWidth);
    onCleanup(observeSize(containerRef, (size) => setContainerWidth(size.width)));

    const onDocClick = (e: MouseEvent) => {
      if (!menuOpen()) return;
      const t = e.target as Node;
      if (menuRef && !menuRef.contains(t) && !containerRef!.contains(t)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    onCleanup(() => document.removeEventListener("mousedown", onDocClick));
  });

  const isSelected = (v: string) => props.selected.includes(v);

  // Click semantics:
  // - Click inactive chip with empty selection → focus to just that one.
  // - Click inactive chip with non-empty selection → add it.
  // - Click active chip → remove it (may go back to empty = all).
  const onChipClick = (v: string) => {
    const cur = props.selected;
    if (cur.includes(v)) {
      props.onChange(filter((x) => x !== v, cur));
    } else if (cur.length === 0) {
      props.onChange([v]);
    } else {
      props.onChange([...cur, v]);
    }
  };

  const summary = createMemo(() => {
    if (props.selected.length === 0) return props.allLabel ?? "all";
    if (props.selected.length === 1) {
      const opt = find((o) => o.value === props.selected[0], props.options);
      return opt ? labelOf(opt) : props.selected[0];
    }
    return `${props.selected.length} selected`;
  });

  return (
    <GrowClusterRow class="sui-msf" ref={containerRef}>
      <Show when={props.label}>
        <ActionSlot class="sui-msf__label">{props.label}</ActionSlot>
      </Show>

      <Show
        when={mode() === "bar"}
        fallback={
          <GrowBox class="sui-msf__menu-wrap">
            <button
              type="button"
              class="sui-msf__menu-trigger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen()}
            >
              <span>{summary()}</span>
              <span class="sui-msf__menu-caret">▾</span>
            </button>
            <Show when={menuOpen()}>
              <div class="sui-msf__menu" ref={menuRef} role="listbox">
                <For each={props.options}>
                  {(opt) => (
                    <button
                      type="button"
                      class={`sui-msf__menu-item${
                        isSelected(opt.value)
                          ? " sui-msf__menu-item--active"
                          : ""
                      }`}
                      onClick={() => onChipClick(opt.value)}
                    >
                      <span class="sui-msf__check">
                        {isSelected(opt.value) ? "✓" : ""}
                      </span>
                      <span>{labelOf(opt)}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </GrowBox>
        }
      >
        {/* a11y — a native <fieldset> carries default border/margin/padding and
            its own layout box, which would alter this styled chip-bar's visual
            output; role="group" preserves the grouping semantics without
            changing rendering. */}
        <GrowWrapRow class="sui-msf__bar" role="group">
          <For each={props.options}>
            {(opt) => (
              <button
                type="button"
                class={`sui-msf__chip${
                  isSelected(opt.value) ? " sui-msf__chip--active" : ""
                }`}
                onClick={() => onChipClick(opt.value)}
                aria-pressed={isSelected(opt.value)}
              >
                {labelOf(opt)}
              </button>
            )}
          </For>
        </GrowWrapRow>
      </Show>
    </GrowClusterRow>
  );
};
