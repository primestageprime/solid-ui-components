// ProgressionQueue — Composite (Depth 2). N always-present sections stacked as
// one full-height progression bar, each bucketing the items by `bucketOf`.
//
// Sizing (ruled 2026-07-22): an empty section collapses to just its summary line
// (label + count); a populated section shrink-wraps to its content; when the
// populated sections overflow the available height they share it by `weight`,
// each capped at its content, with the surplus from any section that shrinks
// redistributed to the ones still short (see ./layout). The bar fills its
// parent's height (or an explicit `height`). Chrome is neutral — the only role
// color is a dot beside each section label.
import {
  For,
  Show,
  type JSX,
  createMemo,
  createSignal,
  onMount,
  onCleanup,
} from "solid-js";
import { allocateHeights } from "./layout";
import { filter, map } from "../../fn";
import type { ProgressionQueueProps } from "./types";
import "./ProgressionQueue.css";

export type { ProgressionQueueProps, ProgressionSection } from "./types";

// Pre-measure fallbacks (jsdom / first paint) — real values are measured.
const HEADER_FALLBACK = 34;
const ROW_FALLBACK = 54;
const GAP = 8;

export function ProgressionQueue<T>(props: ProgressionQueueProps<T>): JSX.Element {
  const itemsIn = (key: string) =>
    filter((it: T) => props.bucketOf(it) === key, props.items);
  const counts = createMemo(() =>
    map((s) => itemsIn(s.key).length, props.sections),
  );

  // The bar fills its allotted height; the natural height of each section is
  // deterministic from its row count (one measured row + header, recalibrated on
  // resize) — no per-section body measurement, which goes stale when a body
  // unmounts. A ResizeObserver on the root supplies the allotted height and
  // fires on mount, so the first paint is already sized.
  let rootRef: HTMLDivElement | undefined;
  let rowRef: HTMLDivElement | undefined;
  let headRef: HTMLDivElement | undefined;
  const [availH, setAvailH] = createSignal(props.height ?? 0);
  const [rowH, setRowH] = createSignal(ROW_FALLBACK);
  const [headH, setHeadH] = createSignal(HEADER_FALLBACK);

  const measure = () => {
    if (props.height == null && rootRef) setAvailH(rootRef.clientHeight);
    if (rowRef?.offsetHeight) setRowH(rowRef.offsetHeight);
    if (headRef?.offsetHeight) setHeadH(headRef.offsetHeight);
  };

  onMount(() => {
    if (props.height != null) {
      setAvailH(props.height);
      measure();
      return;
    }
    const ro = new ResizeObserver(() => measure());
    if (rootRef) ro.observe(rootRef);
    measure();
    onCleanup(() => ro.disconnect());
  });

  const natural = createMemo(() =>
    map((c) => (c === 0 ? headH() + 2 : headH() + c * rowH() + 2), counts()),
  );
  const heights = createMemo(() =>
    allocateHeights({
      natural: natural(),
      counts: counts(),
      weights: map((s) => s.weight ?? 1, props.sections),
      available: props.height ?? availH(),
      gap: GAP,
    }),
  );

  return (
    <div
      class={`prog-queue${props.class ? ` ${props.class}` : ""}`}
      ref={(el) => (rootRef = el)}
      style={props.height != null ? { height: `${props.height}px` } : undefined}
    >
      <For each={props.sections}>
        {(section, i) => {
          const count = () => counts()[i()];
          return (
            <div class="prog-queue__section" style={{ height: `${Math.round(heights()[i()] ?? 0)}px` }}>
              <div class="prog-queue__header" ref={(el) => (i() === 0 ? (headRef = el) : undefined)}>
                <span class="prog-queue__title">
                  <span class={`prog-queue__dot prog-queue__dot--${section.tone}`} />
                  {section.label}
                </span>
                <span class="prog-queue__count">{count()}</span>
              </div>
              <Show when={count() > 0}>
                <div class="prog-queue__body">
                  <For each={itemsIn(section.key)}>
                    {(it, ri) => {
                      const key = props.keyOf(it);
                      const interactive = () => props.onSelect != null;
                      const selected = () => props.selectedKey != null && props.selectedKey === key;
                      return (
                        <div
                          ref={(el) => (i() === 0 && ri() === 0 ? (rowRef = el) : undefined)}
                          class={
                            "prog-queue__row" +
                            (interactive() ? " prog-queue__row--interactive" : "") +
                            (selected() ? " prog-queue__row--selected" : "")
                          }
                          onClick={interactive() ? () => props.onSelect?.(key) : undefined}
                        >
                          {props.renderItem(it)}
                        </div>
                      );
                    }}
                  </For>
                </div>
              </Show>
            </div>
          );
        }}
      </For>
    </div>
  );
}
