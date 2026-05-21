// ============================================
// PivotTreemap — Pure Composite (Depth 2).
// Composes Treemap + SlotFillBar (via render callback). Owns zero CSS —
// the outer/inner cell grid layout lives in the Treemap Primitive; the
// progress bar styling lives in SlotFillBar. This file is wiring only:
// bucket the rows, supply render callbacks, lift selection to the caller.
//
// Generic over a row type T and a string-tagged Dim union; caller hands in
// `accessors` describing how rows expose dimension values.
//
// Multi-valued tag honesty: if `accessors.values(row, dim)` returns more
// than one value, the row contributes to multiple buckets — so summed
// child counts can exceed the parent's `total`. This is intentional; we
// surface the raw tally so callers can decide how to display it.
//
// Selection lifts to the caller via `selection` + `onSelect`. Filtering
// the underlying table from a selection stays in the consumer.
// ============================================
import { Component, Show } from "solid-js";
import { SlotFillBar } from "../SlotFillBar";
import { Treemap, TreemapSidebar } from "../Treemap";
import { bucketByDims, PivotAccessors, PivotBucket, PivotMetrics } from "./bucketByDims";

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

/** Bucket carrying its weight as a `weight` alias of `total` so it satisfies
 *  the Treemap Primitive's `TreemapCellData` contract without mutating the
 *  original bucket shape. */
interface WeightedBucket extends PivotBucket {
  weight: number;
  children: WeightedBucket[];
}

const toWeighted = (b: PivotBucket): WeightedBucket => ({
  ...b,
  weight: b.total,
  children: b.children.map(toWeighted),
});

/** Sum child metrics for the outer SlotFillBar. We use child sums (not the
 *  parent's tally) so the bar visually reflects the children below; that
 *  can over-count when an axis is multi-valued, which is honest. `doing`
 *  is kept for the hover label even though SlotFillBar doesn't render it
 *  directly (it derives the in-flight slot from the `active` prop, which
 *  PivotTreemap doesn't drive). */
const outerSlots = (
  b: PivotBucket,
): { slots: number; done: number; doing: number } =>
  b.children.reduce(
    (acc, c) => ({
      slots: acc.slots + c.total,
      done: acc.done + (c.metrics?.done ?? 0),
      doing: acc.doing + (c.metrics?.doing ?? 0),
    }),
    { slots: 0, done: 0, doing: 0 },
  );

export function PivotTreemap<T, Dim extends string>(
  p: PivotTreemapProps<T, Dim>,
): ReturnType<Component> {
  const buckets = () =>
    bucketByDims(p.rows, p.outer, p.inner, p.accessors, p.metrics).map(toWeighted);
  const untagged = () => p.untaggedCount ?? 0;

  const isLeafSelected = (ok: string, ik: string): boolean =>
    p.selection?.scope === "tagged" &&
    p.selection.outerKey === ok &&
    p.selection.innerKey === ik;

  const isOuterSelected = (ok: string): boolean =>
    p.selection?.scope === "tagged" &&
    p.selection.outerKey === ok &&
    p.selection.innerKey === null;

  const isUntaggedSelected = (): boolean => p.selection?.scope === "untagged";

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

  // Sidebar weight tracks the median bucket size so the "untagged" column
  // never dominates or vanishes. Lifted out of render-callback territory
  // because it depends on the full bucket list.
  const untaggedWeight = (): number => {
    const totals = buckets()
      .map((b) => b.total)
      .sort((a, b) => a - b);
    const median = totals[Math.floor(totals.length / 2)] ?? untagged();
    return Math.min(untagged(), Math.max(1, median));
  };

  const sidebar = (): TreemapSidebar | undefined =>
    untagged() > 0
      ? {
          weight: untaggedWeight(),
          selected: isUntaggedSelected(),
          onClick: () => toggleUntagged(),
          title: "Click to filter to untagged rows",
          content: (
            <>
              <div
                class="sui-pivot-treemap__untagged-label"
                style={{ "font-size": "11px", "font-weight": 600 }}
              >
                untagged
              </div>
              <div
                class="sui-pivot-treemap__untagged-count"
                style={{
                  "font-size": "10px",
                  color: "var(--sui-text-muted, #888)",
                }}
              >
                {untagged()} rows
              </div>
            </>
          ),
        }
      : undefined;

  return (
    <Treemap<WeightedBucket, WeightedBucket>
      class="sui-pivot-treemap"
      cells={buckets()}
      isOuterSelected={(c) => isOuterSelected(c.key)}
      isInnerSelected={(c, i) => isLeafSelected(c.key, i.key)}
      onOuterClick={(c) => toggleOuter(c.key)}
      onInnerClick={(c, i) => toggleLeaf(c.key, i.key)}
      outerTitle={(c) => `Click to filter to ${p.outer}=${c.key}`}
      innerTitle={(c, i) =>
        `Click to filter to ${p.outer}=${c.key}, ${p.inner}=${i.key}`
      }
      renderOuterHeader={(c) => (
        <>
          <span
            class="sui-pivot-treemap__outer-key"
            style={{
              "font-size": "11px",
              "font-weight": 600,
              "white-space": "nowrap",
              overflow: "hidden",
              "text-overflow": "ellipsis",
            }}
          >
            {c.key}
          </span>
          <span
            class="sui-pivot-treemap__outer-meta"
            style={{
              display: "inline-flex",
              "align-items": "baseline",
              gap: "6px",
              "font-size": "10px",
              color: "var(--sui-text-muted, #888)",
            }}
          >
            <span>· {c.total}</span>
          </span>
        </>
      )}
      renderOuterToolbar={
        p.metrics
          ? (c) => {
              const s = outerSlots(c);
              return (
                <SlotFillBar
                  slots={s.slots}
                  done={s.done}
                  active={null}
                  height={4}
                  maxWidth={null}
                  label={`${s.done}/${s.slots} done · ${s.doing} in progress (sum of children)`}
                />
              );
            }
          : undefined
      }
      renderInnerContent={(_c, i) => (
        <>
          <div
            class="sui-pivot-treemap__leaf-title"
            style={{
              display: "flex",
              "justify-content": "space-between",
              "font-size": "10px",
              "min-width": 0,
              gap: "4px",
            }}
          >
            <span
              class="sui-pivot-treemap__leaf-key"
              style={{
                "white-space": "nowrap",
                overflow: "hidden",
                "text-overflow": "ellipsis",
                "font-weight": 500,
              }}
            >
              {i.key}
            </span>
            <span
              class="sui-pivot-treemap__leaf-count"
              style={{ color: "var(--sui-text-muted, #888)" }}
            >
              {i.total}
            </span>
          </div>
          <Show when={p.metrics && i.metrics}>
            <SlotFillBar
              slots={i.total}
              done={i.metrics!.done}
              active={null}
              height={6}
              maxWidth={null}
              label={`${i.metrics!.done}/${i.total} done · ${i.metrics!.doing} doing`}
            />
          </Show>
        </>
      )}
      sidebar={sidebar()}
    />
  );
}
