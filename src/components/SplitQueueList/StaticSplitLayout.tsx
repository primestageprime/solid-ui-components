/* SplitQueueList — STATIC mode.
 *
 * A non-animated "two stacked labeled sections with a seam" layout: a read-only
 * TOP list of recent items and an arbitrary BOTTOM block the consumer composes.
 * It shares the chrome (headers, seam, row styling, Surface container) with the
 * animated queue but none of its machinery — no array diffing, no FLIP, no
 * scroll-pin, no keyboard/selection. It's a genuinely separate concern, so it's
 * its own component; SplitQueueList delegates here when `static` is set, before
 * the flight engine ever spins up. */
import {
  For,
  type JSX,
  Show,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { Surface } from "../Surface/Surface";
import type { StaticSplitLayoutProps } from "./types";
import "./SplitQueueList.css";

const DEFAULT_HEADER_HEIGHT = 28;

export function StaticSplitLayout<T>(
  props: StaticSplitLayoutProps<T>,
): JSX.Element {
  const rowHeightProp = () => props.rowHeight ?? 40;
  const topCapRows = () => props.capRows ?? 3;
  const topItems = (): T[] => props.items ?? [];
  const renderItem = (item: T): JSX.Element =>
    (props.renderItem ?? (() => null))(item);

  let rootEl: HTMLDivElement | undefined;
  let headerProbeEl: HTMLLIElement | undefined;

  // Measure real header / row heights so the top pane's scroll cap tracks the
  // rendered chrome (same approach as the animated queue, minus the reflow-heavy
  // FLIP capture — here we only need the cap height).
  const [headerHeight, setHeaderHeight] = createSignal(DEFAULT_HEADER_HEIGHT);
  const [rowHeight, setRowHeight] = createSignal(rowHeightProp());
  const measure = () => {
    if (headerProbeEl) {
      const h = headerProbeEl.getBoundingClientRect().height;
      if (h > 0) setHeaderHeight(h);
    }
    const row = rootEl?.querySelector<HTMLElement>(".sui-sql__row");
    if (row) {
      const rh = row.getBoundingClientRect().height;
      if (rh > 0) setRowHeight(rh);
    }
  };
  let resizeObserver: ResizeObserver | undefined;
  onMount(() => {
    requestAnimationFrame(measure);
    if (typeof ResizeObserver !== "undefined" && rootEl) {
      resizeObserver = new ResizeObserver(() => measure());
      resizeObserver.observe(rootEl);
    }
  });
  onCleanup(() => resizeObserver?.disconnect());

  // Fill the parent by default so the rail tracks the available height; an
  // explicit `height` prop pins a fixed px height instead.
  return (
    // Container CHROME (background + 1px border) comes from the base Surface
    // primitive via the bg/borderColor props; `padding="none"`/`radius="none"`
    // keep Surface from imposing its own scale, and the theme-aware corner radius
    // (var(--sui-radius-md)) is supplied inline. The structural rest (flex column,
    // overflow, position, font/colour) stays in `.sui-sql`.
    <Surface
      ref={rootEl}
      class={`sui-sql sui-sql--static${props.class ? " " + props.class : ""}`}
      padding="none"
      radius="none"
      bg="var(--sui-bg-secondary)"
      borderColor="var(--sui-border)"
      style={{
        "border-radius": "var(--sui-radius-md)",
        height: props.height != null ? `${props.height}px` : "100%",
      }}
    >
      {/* TOP — read-only list, capped to topCapRows then scrolls. */}
      <ul
        class="sui-sql__list sui-sql__list--top"
        role="list"
        aria-label={props.label ?? "Resolved"}
        style={{
          "max-height": `${headerHeight() + topCapRows() * rowHeight()}px`,
        }}
      >
        <li
          ref={headerProbeEl}
          role="presentation"
          class="sui-sql__header sui-sql__header--top"
        >
          <span>{props.label ?? "Resolved"}</span>
          <span class="sui-sql__count">{topItems().length}</span>
        </li>
        <Show
          when={topItems().length > 0}
          fallback={
            <li role="presentation" class="sui-sql__clear">
              {props.emptyLabel ?? "Nothing yet"}
            </li>
          }
        >
          <For each={topItems()}>
            {(item) => (
              <li role="listitem" class="sui-sql__row sui-sql__row--resolved">
                <span class="sui-sql__marker" aria-hidden="true">
                  ✓
                </span>
                <span class="sui-sql__content">{renderItem(item)}</span>
              </li>
            )}
          </For>
        </Show>
      </ul>

      <div class="sui-sql__seam" aria-hidden="true" />

      {/* BOTTOM — arbitrary consumer content, takes the remaining space. */}
      <div class="sui-sql__list sui-sql__list--bottom sui-sql__static-bottom">
        {props.bottomContent}
      </div>
    </Surface>
  );
}
