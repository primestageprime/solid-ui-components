import {
  For,
  Show,
  type JSX,
  createMemo,
  createSignal,
  onMount,
  onCleanup,
} from "solid-js";
import { Surface } from "../Surface/Surface";
import { computeSplitLayout } from "./layout";
import { createFlightController } from "./flight";
import { createRowKeyboard } from "./keyboard";
import { StaticSplitLayout } from "./StaticSplitLayout";
import type { SplitQueueListProps } from "./types";
import "./SplitQueueList.css";

export type { SplitQueueListProps } from "./types";

const SEAM_HEIGHT = 2;

/**
 * SplitQueueList — a linked two-list "processing queue" sidebar.
 *
 * One sidebar, two stacked lists sharing a fixed height. The TOP list holds
 * *resolved* (processed) items; the BOTTOM list holds *unresolved* (to-process)
 * items. The user works the bottom; resolving an item appends it to the BOTTOM
 * of the top list (at the seam between the two), so the most-recent work sits
 * adjacent to what's next and is one click away to revisit.
 *
 * Sizing (see ./layout.ts for the testable core; the component measures the
 * real header/row heights and re-measures on container resize via ResizeObserver):
 *  - The TOP list is content-driven between a 1-row floor and a 3-row cap: 0
 *    categorized still shows 1 row of space; 1/2/3 grow to fit; 4+ caps at 3 and
 *    the pane scrolls so the NEWEST row sits flush at the seam (newest-at-seam).
 *  - The BOTTOM list gets the remaining space and scrolls when overfull.
 *  - The cap holds only while the bottom has enough content to fill its area;
 *    when the bottom is short it shrinks to its content and the freed slack flows
 *    UP, so the top may grow past 3 rows.
 *  - When the bottom is empty, it collapses to a thin "all clear" strip.
 *
 * Animation (SUI owns it — the consumer just swaps the two arrays):
 *  When a key leaves `unresolved` and appears in `resolved`, the component
 *  FLIP-animates it from its old spot up across the seam to the bottom of the
 *  resolved list. During the slide it paints TWO clipped copies — one styled
 *  as unresolved (clipped by the bottom list's top edge) and one styled as
 *  resolved (emerging from the top list's bottom edge) — so the row visually
 *  *repaints* as it crosses the seam. Honors `prefers-reduced-motion`.
 *
 * Generic over the item type `T`; pass `keyOf` for identity and `renderItem`
 * for content.
 *
 * In `static` mode this delegates to {@link StaticSplitLayout} (a non-animated
 * two-section layout) before any of the queue machinery below is set up.
 */
export function SplitQueueList<T>(props: SplitQueueListProps<T>): JSX.Element {
  // STATIC mode is a separate concern (no queue, no animation) and now a
  // standalone component; the deprecated `static` flag maps the old prop names
  // onto it and hands off before the flight engine / keyboard / measurement run.
  if (props.static)
    return StaticSplitLayout({
      items: props.topItems ?? props.resolved,
      renderItem: props.renderTop ?? props.renderItem,
      bottomContent: props.bottomContent,
      label: props.resolvedLabel,
      emptyLabel: props.allClearLabel,
      capRows: props.topCapRows,
      rowHeight: props.rowHeight,
      height: props.height,
      class: props.class,
    });

  // Internal accessors so the animated queue can read the (now optional) data
  // props safely. The animated path requires them; `static` mode ignores them.
  const resolvedItems = (): T[] => props.resolved ?? [];
  const unresolvedItems = (): T[] => props.unresolved ?? [];
  const keyOf = (item: T): string => (props.keyOf ?? ((x) => String(x)))(item);
  const renderItemFn = (item: T): JSX.Element =>
    (props.renderItem ?? (() => null))(item);

  const rowHeightProp = () => props.rowHeight ?? 40;
  const topCapRows = () => props.topCapRows ?? 3;
  const topFloorRows = () => props.topFloorRows ?? 0;
  const height = () => props.height ?? 420;
  const animationMs = () => props.animationMs ?? 800;

  let topListEl: HTMLUListElement | undefined;
  let rootEl: HTMLDivElement | undefined;
  // The top header is always rendered (the bottom one disappears when the queue
  // collapses), and both share the same `.sui-sql__header` metrics, so we
  // measure this one. We also measure a real row to size from actual rendered
  // height (the earlier clip bug was rows overflowing their configured slot).
  let headerProbeEl: HTMLLIElement | undefined;

  // Measured header / row heights. Seeded with sensible defaults so the first
  // paint (before measurement) is close; the effects below replace them with
  // exact measured values, and the container ResizeObserver re-measures on
  // resize.
  const DEFAULT_HEADER_HEIGHT = 28;
  const [headerHeight, setHeaderHeight] = createSignal(DEFAULT_HEADER_HEIGHT);
  const [rowHeight, setRowHeight] = createSignal(rowHeightProp());

  const measure = () => {
    if (headerProbeEl) {
      const h = headerProbeEl.getBoundingClientRect().height;
      if (h > 0) setHeaderHeight(h);
    }
    // Measure the first real row in either pane to learn the true row height.
    const row = rootEl?.querySelector<HTMLElement>(".sui-sql__row");
    if (row) {
      const rh = row.getBoundingClientRect().height;
      if (rh > 0) setRowHeight(rh);
    }
  };
  // Measure after mount (fonts/borders applied), and on every container resize
  // so the JS-computed pane heights track the real available space.
  let resizeObserver: ResizeObserver | undefined;
  onMount(() => {
    requestAnimationFrame(measure);
    if (typeof ResizeObserver !== "undefined" && rootEl) {
      resizeObserver = new ResizeObserver(() => measure());
      resizeObserver.observe(rootEl);
    }
  });
  onCleanup(() => resizeObserver?.disconnect());

  const layout = createMemo(() =>
    computeSplitLayout({
      totalHeight: height(),
      rowHeight: rowHeight(),
      resolvedCount: resolvedItems().length,
      unresolvedCount: unresolvedItems().length,
      seamHeight: SEAM_HEIGHT,
      headerHeight: headerHeight(),
      topCapRows: topCapRows(),
      topFloorRows: topFloorRows(),
    }),
  );

  // In topOnly mode the categorized panel is CONTENT-DRIVEN up to a CAP: it starts
  // as just the header when empty (S edge visible), grows by one row per resolved
  // card, then HOLDS at the cap (header + topCapRows rows, default 3). Past the
  // cap the panel stops growing and the list SCROLLS UP instead (handled in the
  // enter branch), so older rows glide up smoothly rather than popping. (The
  // normal two-panel layout uses layout().topHeight, unchanged.)
  const topOnlyHeight = () => {
    const rows = resolvedItems().length;
    const capHeight = headerHeight() + topCapRows() * rowHeight();
    const contentHeight = headerHeight() + rows * rowHeight();
    // Grow row-by-row up to the cap, then hold; never exceed the container.
    return Math.min(height(), capHeight, contentHeight);
  };

  const reducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // ---- Flight engine: FLIP capture, resolve/unresolve detection, the two-phase
  // forward/reverse animations, and the scroll-pin. Owns its own reactive effects
  // (registered here during setup); see ./flight.ts. Exposes only `exitingKey`,
  // which the focus memo below reads to suppress focus during an exit collapse.
  const flight = createFlightController({
    getRootEl: () => rootEl,
    getTopListEl: () => topListEl,
    height,
    rowHeight,
    headerHeight,
    topCapRows,
    topFloorRows,
    animationMs,
    seamHeight: SEAM_HEIGHT,
    topOnly: () => !!props.topOnly,
    topOnlyHeight,
    layout,
    resolvedKeys: () => resolvedItems().map(keyOf),
    unresolvedKeys: () => unresolvedItems().map(keyOf),
    reducedMotion,
    onFocusChange: (key) => props.onFocusChange?.(key),
  });

  // The focused unresolved key — controlled prop, falling back to the head of
  // the unresolved list so focus always lands on the next item to process.
  // Returns null during the exit collapse so NO real bottom row shows the
  // focused styling while the card is collapsing (only the orange clone does).
  const focusedKey = createMemo(() => {
    if (flight.exitingKey()) return null;
    const keys = unresolvedItems().map(keyOf);
    if (props.focusedKey && keys.includes(props.focusedKey))
      return props.focusedKey;
    return keys[0] ?? null;
  });

  // ---- Keyboard / ARIA -----------------------------------------------------
  // Roving-tabindex + keyboard selection for the two listbox panes; see
  // ./keyboard.ts. Reads the live DOM order for movement (resolved rows precede
  // unresolved rows) and the current selection/focus for the default tab stop.
  const keyboard = createRowKeyboard({
    getRootEl: () => rootEl,
    allKeys: () => [
      ...resolvedItems().map(keyOf),
      ...unresolvedItems().map(keyOf),
    ],
    focusedKey: () => focusedKey(),
    selectedKey: () => props.selectedKey,
    onSelect: (k) => props.onSelect?.(k),
  });

  const renderRow = (item: T, kind: "resolved" | "unresolved") => {
    const key = keyOf(item);
    const isFocused = () => kind === "unresolved" && focusedKey() === key;
    const isSelected = () => props.selectedKey === key;
    return (
      // biome-ignore lint/a11y/useFocusableInteractive: option rows carry a roving tabindex (0/-1) driven by createRowKeyboard; they are focusable.
      <li
        data-sql-key={key}
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: intentional ARIA <listbox/option> pattern — the option role belongs on the <li> row.
        role="option"
        aria-selected={isSelected()}
        tabindex={keyboard.tabbableKey() === key ? 0 : -1}
        class={`sui-sql__row sui-sql__row--${kind}`}
        classList={{
          "sui-sql__row--focused": isFocused(),
          "sui-sql__row--selected": isSelected(),
        }}
        // Use the MEASURED row height so a row's reserved slot matches what the
        // layout math sizes the panes from (the raw prop is only the pre-measure
        // seed); keeps rows and pane heights consistent, avoiding the clip bug.
        style={{ "min-height": `${rowHeight()}px` }}
        // Clicking a row only SELECTS it (emits onSelect) — it no longer resolves.
        // Resolve/unresolve are driven by the consumer mutating the arrays.
        onClick={() => props.onSelect?.(key)}
        onKeyDown={(e) => keyboard.onRowKeyDown(e, key)}
        onFocus={() => keyboard.setActiveKey(key)}
      >
        <span class="sui-sql__marker" aria-hidden="true">
          {kind === "resolved" ? "✓" : isFocused() ? "▸" : ""}
        </span>
        <span class="sui-sql__content">{renderItemFn(item)}</span>
      </li>
    );
  };

  return (
    // Container CHROME (background + 1px border) comes from the base Surface
    // primitive (see the static branch above for the full rationale); the
    // theme-aware corner radius is inline and the structural rest stays in
    // `.sui-sql`. `ref` forwards through Surface to its inner div, so `rootEl`
    // is unchanged for the FLIP's measurement/queries.
    <Surface
      ref={rootEl}
      class={`sui-sql${props.class ? ` ${props.class}` : ""}`}
      padding="none"
      radius="none"
      bg="var(--sui-bg-secondary)"
      borderColor="var(--sui-border)"
      // In topOnly the root hugs its single (top) panel so the container follows
      // the panel's content-driven / animated height — "one line" when empty,
      // growing with the panel as it reveals each card. The normal two-panel
      // layout keeps the fixed total height.
      style={{
        "border-radius": "var(--sui-radius-md)",
        height: props.topOnly ? undefined : `${height()}px`,
      }}
    >
      {/* Off-screen live region: announces the queue counts to assistive tech as
          items resolve/unresolve (the visual counts are otherwise silent). */}
      <div class="sui-sql__sr-status" aria-live="polite" aria-atomic="true">
        {`${resolvedItems().length} ${props.resolvedLabel ?? "Resolved"}, ` +
          `${unresolvedItems().length} ${props.unresolvedLabel ?? "Unresolved"}`}
      </div>

      {/* TOP — resolved ("categorized"). Content-driven height between a 1-row
          floor and a 3-row cap; absorbs slack when the bottom is short. Sized
          explicitly from the JS layout (each pane includes its own header). */}
      <ul
        ref={topListEl}
        class="sui-sql__list sui-sql__list--top"
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: intentional ARIA <listbox/option> pattern — the listbox role belongs on the <ul> owning the option rows.
        role="listbox"
        aria-label={props.resolvedLabel ?? "Resolved"}
        style={{
          height: props.topOnly
            ? `${topOnlyHeight()}px`
            : `${layout().topHeight}px`,
        }}
      >
        <li
          ref={headerProbeEl}
          role="presentation"
          class="sui-sql__header sui-sql__header--top"
        >
          <span>{props.resolvedLabel ?? "Resolved"}</span>
          <span class="sui-sql__count">{resolvedItems().length}</span>
        </li>
        <For each={resolvedItems()}>
          {(item) => renderRow(item, "resolved")}
        </For>
      </ul>

      {/* Seam + BOTTOM panel are omitted in topOnly mode — the categorized list
          takes the full height. The resolve enter/grow still plays. */}
      <Show when={!props.topOnly}>
        <div class="sui-sql__seam" aria-hidden="true" />

        {/* BOTTOM — unresolved ("to categorize"). Gets the remaining space and
            scrolls when overfull; collapses to the "all clear" strip when empty. */}
        <ul
          class="sui-sql__list sui-sql__list--bottom"
          // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: intentional ARIA <listbox/option> pattern — the listbox role belongs on the <ul> owning the option rows.
          role="listbox"
          aria-label={props.unresolvedLabel ?? "Unresolved"}
          classList={{
            "sui-sql__list--collapsed": unresolvedItems().length === 0,
          }}
          style={{ height: `${layout().bottomHeight}px` }}
        >
          <Show
            when={unresolvedItems().length > 0}
            fallback={
              <li role="presentation" class="sui-sql__clear">
                {props.allClearLabel ?? "All clear — nothing to process"}
              </li>
            }
          >
            <li
              role="presentation"
              class="sui-sql__header sui-sql__header--bottom"
            >
              <span>{props.unresolvedLabel ?? "Unresolved"}</span>
              <span class="sui-sql__count">{unresolvedItems().length}</span>
            </li>
            <For each={unresolvedItems()}>
              {(item) => renderRow(item, "unresolved")}
            </For>
          </Show>
        </ul>
      </Show>
    </Surface>
  );
}
