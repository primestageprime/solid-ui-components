// ============================================
// PivotTreemap — Composed (Depth 2).
// Outer columns × inner leaves treemap. Composes ProportionalStack +
// SlotFillBar. Generic over a row type T and a string-tagged Dim union;
// caller hands in `accessors` describing how rows expose dimension values.
//
// Multi-valued tag honesty: if `accessors.values(row, dim)` returns more
// than one value, the row contributes to multiple buckets — so summed
// child counts can exceed the parent's `total`. This is intentional; we
// surface the raw tally so callers can decide how to display it.
//
// Selection lifts to the caller via `selection` + `onSelect`. Filtering
// the underlying table from a selection stays in the consumer.
// ============================================
import { Component, For, Show } from "solid-js";
import { ProportionalStack, ProportionalItem } from "../Layout";
import { SlotFillBar } from "../SlotFillBar";
import { bucketByDims, PivotAccessors, PivotBucket, PivotMetrics } from "./bucketByDims";
import "./PivotTreemap.css";

export interface PivotSelection {
  outerKey: string;
  /** `null` = whole outer bucket; otherwise pinned to a specific leaf. */
  innerKey: string | null;
  scope: "tagged" | "untagged";
}

export interface PivotTreemapProps<T, Dim extends string> {
  rows: readonly T[];
  outer: Dim;
  inner: Dim;
  accessors: PivotAccessors<T, Dim>;
  /** Optional per-bucket SlotFillBar feed. */
  metrics?: PivotMetrics<T>;
  /** Number of rows in the dataset that don't appear under any tagged
   *  bucket — rendered as a sidebar. Pass `0` to omit. Default 0. */
  untaggedCount?: number;
  selection?: PivotSelection | null;
  onSelect?: (sel: PivotSelection | null) => void;
}

export function PivotTreemap<T, Dim extends string>(
  p: PivotTreemapProps<T, Dim>,
): ReturnType<Component> {
  const buckets = () =>
    bucketByDims(p.rows, p.outer, p.inner, p.accessors, p.metrics);
  const untagged = () => p.untaggedCount ?? 0;

  const isLeafSelected = (ok: string, ik: string) =>
    p.selection?.scope === "tagged" &&
    p.selection.outerKey === ok &&
    p.selection.innerKey === ik;

  const isOuterSelected = (ok: string) =>
    p.selection?.scope === "tagged" &&
    p.selection.outerKey === ok &&
    p.selection.innerKey === null;

  const isUntaggedSelected = () => p.selection?.scope === "untagged";

  const select = (sel: PivotSelection | null) => {
    p.onSelect?.(sel);
  };
  const toggleLeaf = (ok: string, ik: string) => {
    if (isLeafSelected(ok, ik)) select(null);
    else select({ outerKey: ok, innerKey: ik, scope: "tagged" });
  };
  const toggleOuter = (ok: string) => {
    if (isOuterSelected(ok)) select(null);
    else select({ outerKey: ok, innerKey: null, scope: "tagged" });
  };
  const toggleUntagged = () => {
    if (isUntaggedSelected()) select(null);
    else select({ outerKey: "", innerKey: null, scope: "untagged" });
  };

  // Sum child metrics for the outer SlotFillBar. We use child sums (not the
  // parent's tally) so the bar visually reflects the children below; that
  // can over-count when an axis is multi-valued, which is honest.
  const outerSlots = (b: PivotBucket) => {
    let slots = 0;
    let done = 0;
    let doing = 0;
    for (const c of b.children) {
      slots += c.total;
      if (c.metrics) {
        done += c.metrics.done;
        doing += c.metrics.doing;
      }
    }
    return { slots, done, doing };
  };

  const untaggedWeight = () => {
    const totals = buckets()
      .map((b) => b.total)
      .sort((a, b) => a - b);
    const median = totals[Math.floor(totals.length / 2)] ?? untagged();
    return Math.min(untagged(), Math.max(1, median));
  };

  return (
    <ProportionalStack direction="row" gap="sm" class="sui-pivot-treemap">
      <For each={buckets()}>
        {(b) => (
          <ProportionalItem
            weight={b.total}
            scrollWhenSmall={false}
            class={`sui-pivot-treemap__outer${isOuterSelected(b.key) ? " sui-pivot-treemap__outer--selected" : ""}`}
          >
            <div
              class="sui-pivot-treemap__outer-title"
              onClick={(e) => {
                e.stopPropagation();
                toggleOuter(b.key);
              }}
              title={`Click to filter to ${p.outer}=${b.key}`}
            >
              <span class="sui-pivot-treemap__outer-key">{b.key}</span>
              <span class="sui-pivot-treemap__outer-meta">
                <span>· {b.total}</span>
              </span>
            </div>
            <Show when={p.metrics}>
              {(() => {
                const s = outerSlots(b);
                return (
                  <div class="sui-pivot-treemap__outer-bar">
                    <SlotFillBar
                      slots={s.slots}
                      done={s.done}
                      doing={s.doing}
                      active={null}
                      height={4}
                      maxWidth={null}
                      label={`${s.done}/${s.slots} done · ${s.doing} in progress (sum of children)`}
                    />
                  </div>
                );
              })()}
            </Show>
            <div class="sui-pivot-treemap__leaves">
              <For each={b.children}>
                {(c) => (
                  <div
                    class={`sui-pivot-treemap__leaf${isLeafSelected(b.key, c.key) ? " sui-pivot-treemap__leaf--selected" : ""}`}
                    style={{ flex: `${c.total} 1 15ch` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLeaf(b.key, c.key);
                    }}
                    title={`Click to filter to ${p.outer}=${b.key}, ${p.inner}=${c.key}`}
                  >
                    <div class="sui-pivot-treemap__leaf-title">
                      <span class="sui-pivot-treemap__leaf-key">{c.key}</span>
                      <span class="sui-pivot-treemap__leaf-count">{c.total}</span>
                    </div>
                    <Show when={p.metrics && c.metrics}>
                      <SlotFillBar
                        slots={c.total}
                        done={c.metrics!.done}
                        doing={c.metrics!.doing}
                        active={null}
                        height={6}
                        maxWidth={null}
                        label={`${c.metrics!.done}/${c.total} done · ${c.metrics!.doing} doing`}
                      />
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </ProportionalItem>
        )}
      </For>
      <Show when={untagged() > 0}>
        <ProportionalItem
          weight={untaggedWeight()}
          scrollWhenSmall={false}
          class={`sui-pivot-treemap__untagged${isUntaggedSelected() ? " sui-pivot-treemap__untagged--selected" : ""}`}
          onClick={() => toggleUntagged()}
          title="Click to filter to untagged rows"
        >
          <div class="sui-pivot-treemap__untagged-label">untagged</div>
          <div class="sui-pivot-treemap__untagged-count">{untagged()} rows</div>
        </ProportionalItem>
      </Show>
    </ProportionalStack>
  );
}
