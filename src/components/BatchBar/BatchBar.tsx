// lastReviewedAt: 2026-06-16
// lastReviewedBy: peter.stradinger
// ============================================
// BatchBar — Atomic (Depth 1)
// Owns CSS (BatchBar.css), no component imports.
// A single horizontal progress bar representing one table being extracted
// by N parallel batches. Three regions, left → right:
//
//   - done    : a solid GREEN fill, width = `donePct` (% already transferred).
//   - inFlight : a BLUE region, width = `inFlightPct`, sub-divided into N
//                stacked horizontal stripes (one per parallel batch). Each
//                stripe is a blue fill grown to `batches[i]` (0..1) of the
//                region width — so 4 batches → 4 thin stripes, each at its
//                own progress level.
//   - todo    : the leftover width (100 - donePct - inFlightPct), a muted
//                track.
//
// Design notes
// ------------
// * Region widths are flex-basis percentages; stripe fills use
//   `transform: scaleX` (compositor-friendly, no per-frame layout).
// * `donePct + inFlightPct` is clamped to ≤ 100; the remainder is track.
// * Honours `prefers-reduced-motion: reduce` — stripe transitions go to 0s.
// ============================================
import { Component, For, JSX, mergeProps, splitProps } from "solid-js";
import "./BatchBar.css";

export interface BatchBarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Width of the green "done" segment, 0..100 (% already transferred). */
  donePct: number;
  /** Width of the blue in-flight region, 0..100. Clamped so
   *  `donePct + inFlightPct` ≤ 100; the remainder is the todo track. */
  inFlightPct: number;
  /** Per-batch progress, each 0..1. Renders one stacked stripe per entry. */
  batches: number[];
  /** Bar pixel height. Default 24. */
  height?: number;
  /** Pixel cap on bar width. Below this the bar fills its parent.
   *  Default 400. Pass `null` to remove the cap. */
  maxWidth?: number | null;
  /** CSS color of the done segment. Default the success accent. */
  doneColor?: string;
  /** CSS color of the in-flight batch stripes. Default the info accent. */
  batchColor?: string;
  /** CSS color of the unfinished/todo track (the bar's background).
   *  Default: `var(--sui-text-muted)`. */
  todoColor?: string;
  /** Optional accessibility / hover label. Defaults to a "<done>% done,
   *  <n> in flight" summary. */
  label?: string;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, n));
const clampFrac = (n: number) => Math.max(0, Math.min(1, n));

export const BatchBar: Component<BatchBarProps> = (rawProps) => {
  const props = mergeProps(
    {
      height: 24,
      maxWidth: 400 as number | null,
      doneColor: "var(--sui-success, #2a6)",
      batchColor: "var(--sui-accent)",
      todoColor: "var(--sui-text-muted)",
      batches: [] as number[],
    },
    rawProps,
  );
  const [local, others] = splitProps(props, [
    "donePct",
    "inFlightPct",
    "batches",
    "height",
    "maxWidth",
    "doneColor",
    "batchColor",
    "todoColor",
    "label",
    "class",
    "style",
  ]);

  const donePct = () => clampPct(local.donePct);
  // Never let done + in-flight exceed 100%; the remainder is the track.
  const inFlightPct = () =>
    Math.max(0, Math.min(clampPct(local.inFlightPct), 100 - donePct()));

  const tipText = () =>
    local.label ??
    `${Math.round(donePct())}% done, ${local.batches.length} in flight`;

  const wrapperClass = () => {
    const c = ["sui-batch-bar"];
    if (local.class) c.push(local.class);
    return c.join(" ");
  };

  const wrapperStyle = (): JSX.CSSProperties | string => {
    const base: JSX.CSSProperties = {
      height: `${local.height}px`,
      background: local.todoColor,
    };
    if (local.maxWidth !== null) base["max-width"] = `${local.maxWidth}px`;
    return typeof local.style === "string"
      ? local.style
      : { ...base, ...local.style };
  };

  return (
    <div
      class={wrapperClass()}
      style={wrapperStyle()}
      title={tipText()}
      {...others}
    >
      {/* Solid green done fill. */}
      <div
        class="sui-batch-bar__done"
        style={{ width: `${donePct()}%`, background: local.doneColor }}
      />
      {/* Blue in-flight region — one stacked stripe per batch. */}
      <div class="sui-batch-bar__inflight" style={{ width: `${inFlightPct()}%` }}>
        <For each={local.batches}>
          {(frac) => (
            <div class="sui-batch-bar__stripe">
              <div
                class="sui-batch-bar__stripe-fill"
                style={{
                  transform: `scaleX(${clampFrac(frac)})`,
                  background: local.batchColor,
                }}
              />
            </div>
          )}
        </For>
      </div>
      {/* Remaining todo track is the wrapper's muted background. */}
    </div>
  );
};

/** Props that are visual/static overrides — locked at variant-definition time. */
export type BatchBarOverrides = Pick<
  BatchBarProps,
  "height" | "maxWidth" | "doneColor" | "batchColor" | "todoColor"
>;

/** Props that remain available to consumers of a curried BatchBar variant. */
export type BatchBarDataProps = Omit<BatchBarProps, keyof BatchBarOverrides>;

/**
 * Curried BatchBar factory (ADR-0001). Bake the visual config in once;
 * the returned component takes data props (`donePct`, `inFlightPct`,
 * `batches`, `label`) only.
 */
export function createBatchBar(
  defaults: Partial<BatchBarProps>,
): Component<BatchBarDataProps> {
  return (props) => <BatchBar {...mergeProps(defaults, props)} />;
}
