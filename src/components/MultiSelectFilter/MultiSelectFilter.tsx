// ============================================
// MultiSelectFilter — Atomic (Depth 1)
// Owns CSS (MultiSelectFilter.css), no component imports.
//
// Responsive multi-select: renders as a horizontal button bar when the
// container is wide enough to fit all options, otherwise collapses to a
// dropdown popover with checkboxes. Same component, same data model
// either way. Empty `selected` means "all" — the bar shows a leading
// "All" chip that clears selection.
// ============================================
import {
  Component,
  For,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import "./MultiSelectFilter.css";

export interface MultiSelectOption {
  value: string;
  label?: string;
}

export interface MultiSelectFilterProps {
  /** Short label rendered to the left of the control. */
  label?: string;
  options: readonly MultiSelectOption[];
  /** Selected values. Empty array means "all". */
  selected: readonly string[];
  onChange: (next: string[]) => void;
  /** Label for the "all" / clear chip. Default "all". */
  allLabel?: string;
  /**
   * Pixel budget per option used to estimate whether the bar fits.
   * Default 90 (room for ~10ch label + padding). Tune up for long labels.
   */
  optionWidthEstimate?: number;
}

const labelOf = (opt: MultiSelectOption): string => opt.label ?? opt.value;

export const MultiSelectFilter: Component<MultiSelectFilterProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;
  const [containerWidth, setContainerWidth] = createSignal(0);
  const [menuOpen, setMenuOpen] = createSignal(false);

  const optionWidth = () => props.optionWidthEstimate ?? 90;

  // Width budget required for full button bar mode.
  const requiredWidth = createMemo(() => {
    const labelBudget = props.label ? 70 : 0;
    const allChip = 56;
    return labelBudget + allChip + props.options.length * optionWidth();
  });

  const mode = createMemo<"bar" | "menu">(() =>
    containerWidth() === 0 || containerWidth() >= requiredWidth() ? "bar" : "menu",
  );

  onMount(() => {
    if (!containerRef) return;
    setContainerWidth(containerRef.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerWidth(e.contentRect.width);
    });
    ro.observe(containerRef);
    onCleanup(() => ro.disconnect());

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

  const toggle = (v: string) => {
    const cur = props.selected;
    if (cur.includes(v)) {
      props.onChange(cur.filter((x) => x !== v));
    } else {
      props.onChange([...cur, v]);
    }
  };

  const clear = () => props.onChange([]);

  const summary = createMemo(() => {
    if (props.selected.length === 0) return props.allLabel ?? "all";
    if (props.selected.length === 1) {
      const opt = props.options.find((o) => o.value === props.selected[0]);
      return opt ? labelOf(opt) : props.selected[0];
    }
    return `${props.selected.length} selected`;
  });

  return (
    <div class="sui-msf" ref={containerRef}>
      <Show when={props.label}>
        <span class="sui-msf__label">{props.label}</span>
      </Show>

      <Show
        when={mode() === "bar"}
        fallback={
          <div class="sui-msf__menu-wrap">
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
                <button
                  type="button"
                  class={`sui-msf__menu-item${
                    props.selected.length === 0 ? " sui-msf__menu-item--active" : ""
                  }`}
                  onClick={() => {
                    clear();
                    setMenuOpen(false);
                  }}
                >
                  <span class="sui-msf__check">
                    {props.selected.length === 0 ? "✓" : ""}
                  </span>
                  <span>{props.allLabel ?? "all"}</span>
                </button>
                <For each={props.options}>
                  {(opt) => (
                    <button
                      type="button"
                      class={`sui-msf__menu-item${
                        isSelected(opt.value) ? " sui-msf__menu-item--active" : ""
                      }`}
                      onClick={() => toggle(opt.value)}
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
          </div>
        }
      >
        <div class="sui-msf__bar" role="group">
          <button
            type="button"
            class={`sui-msf__chip${
              props.selected.length === 0 ? " sui-msf__chip--active" : ""
            }`}
            onClick={clear}
          >
            {props.allLabel ?? "all"}
          </button>
          <For each={props.options}>
            {(opt) => (
              <button
                type="button"
                class={`sui-msf__chip${
                  isSelected(opt.value) ? " sui-msf__chip--active" : ""
                }`}
                onClick={() => toggle(opt.value)}
                aria-pressed={isSelected(opt.value)}
              >
                {labelOf(opt)}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
