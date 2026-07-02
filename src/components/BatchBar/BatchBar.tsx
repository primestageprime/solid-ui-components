// lastReviewedAt: 2026-06-22
// lastReviewedBy: veronica (design-system)
// ============================================
// BatchBar — Atomic (Depth 1)
// Owns CSS (BatchBar.css), no component imports.
//
// A single horizontal progress bar for one table being extracted by N batches.
//
// TWO APIs, one component:
//
//  • DECLARATIVE (preferred). Pass `batches: { rows, state }[]` (discrete —
//    `pending | running | done`, NO fractions) + `totalRows` + `committedRows`
//    (rows already committed). BatchBar OBSERVES the batch lifecycle, MEASURES
//    each batch's wall-clock duration, learns an estimate, and EASES the fill
//    itself on an internal requestAnimationFrame loop (race → creep → snap; see
//    src/internal/progress). The app supplies only declarative data — never a
//    fraction, estimate, duration, or interpolation. The bar reads as a solid
//    green fill at `(committedRows + Σ p(e)·batchRows) / totalRows`; the
//    in-flight remainder animates smoothly and only ever reaches 100% on a real
//    `done` event.
//    To SHARE one learned model across many bars (a whole board), pass a
//    `controller` from `useBatchProgress()`; otherwise each bar learns its own.
//
//  • LEGACY (deprecated). Pass numeric `donePct` / `inFlightPct` /
//    `batches: number[]`. Renders the old three-region stacked-stripe bar with
//    no internal estimation. Kept for backward compatibility; migrate to the
//    declarative API (the app no longer computes fractions).
//
// Design notes
// ------------
// * Honours `prefers-reduced-motion: reduce` — the legacy stripe transitions
//   go to 0s; the declarative bar's rAF easing is unaffected by the media query
//   (it is itself the "motion", and is cheap / compositor-friendly).
// ============================================
import {
  type Component,
  For,
  type JSX,
  Show,
  createEffect,
  createMemo,
  mergeProps,
  splitProps,
} from "solid-js";
import { clamp } from "../../internal/math/clamp";
import "./BatchBar.css";
import {
  useProgressEngine,
  type ProgressClock,
  type ProgressController,
} from "../../internal/progress/useProgressEngine";
import type { BatchState } from "../../internal/progress/engine";

/** One declarative batch — discrete state, NO fraction. */
export interface BatchSpec {
  rows: number;
  state: BatchState;
}

export interface BatchBarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  // --- declarative API (preferred) ---------------------------------------
  /** Stable id for this bar (keys its batches in a shared controller). When a
   *  `controller` is shared across bars this MUST be unique per bar. */
  id?: string;
  /** Total rows for the whole table — the denominator of the fill. */
  totalRows?: number;
  /** Rows already COMMITTED (jumps on batch completion). The bar adds the
   *  eased in-flight portion of running batches on top of this. */
  committedRows?: number;
  /** Discrete per-batch states. Presence selects the declarative API. */
  batches?: BatchSpec[] | number[];
  /** Optional shared progress controller (one learned model across many bars).
   *  Omit to let this bar learn its own. */
  controller?: ProgressController;
  /** Test-only clock seam (never set in app code). */
  clock?: ProgressClock;

  // --- legacy numeric API (deprecated) -----------------------------------
  /** @deprecated Width of the green "done" segment, 0..100. */
  donePct?: number;
  /** @deprecated Width of the blue in-flight region, 0..100. */
  inFlightPct?: number;

  // --- presentational (both APIs) ----------------------------------------
  /** Bar pixel height. Default 24. */
  height?: number;
  /** Pixel cap on bar width. Default 400. `null` removes the cap. */
  maxWidth?: number | null;
  /** CSS color of the done/committed fill. Default the success accent. */
  doneColor?: string;
  /** CSS color of the in-flight portion. Default the info accent. */
  batchColor?: string;
  /** CSS color of the unfinished/todo track. Default `var(--sui-text-muted)`. */
  todoColor?: string;
  /** Optional accessibility / hover label. */
  label?: string;
}

const clampPct = (n: number) => clamp(n, 0, 100);
const clampFrac = (n: number) => clamp(n, 0, 1);

/** A batches array uses the declarative API iff its entries are `{rows,state}` */
function isDeclarative(
  b: BatchSpec[] | number[] | undefined,
): b is BatchSpec[] {
  return Array.isArray(b) && b.length > 0 && typeof b[0] === "object";
}

export const BatchBar: Component<BatchBarProps> = (rawProps) => {
  const props = mergeProps(
    {
      height: 24,
      maxWidth: 400 as number | null,
      doneColor: "var(--sui-success, #2a6)",
      batchColor: "var(--sui-accent)",
      todoColor: "var(--sui-text-muted)",
    },
    rawProps,
  );
  const [local, others] = splitProps(props, [
    "id",
    "totalRows",
    "committedRows",
    "batches",
    "controller",
    "clock",
    "donePct",
    "inFlightPct",
    "height",
    "maxWidth",
    "doneColor",
    "batchColor",
    "todoColor",
    "label",
    "class",
    "style",
  ]);

  const declarative = createMemo(() => isDeclarative(local.batches));

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

  // ---- declarative path: internally-eased single green fill --------------
  // A bar without its own `controller` gets a private one. Either way the
  // batches register into the engine, which measures + eases them for us.
  const ownController = !local.controller
    ? useProgressEngine(local.clock)
    : null;
  const controller = () => local.controller ?? ownController!;

  const barId = () => local.id ?? "batchbar";
  const specs = createMemo<BatchSpec[]>(() =>
    declarative() ? (local.batches as BatchSpec[]) : [],
  );

  // Feed the engine the declarative batch states whenever they change.
  createEffect(() => {
    if (!declarative()) return;
    const inputs = specs().map((b, i) => ({
      id: `${barId()}#${i}`,
      rows: b.rows,
      state: b.state,
    }));
    controller().observe(inputs);
  });

  // The eased fill fraction (0..1) over the whole table. Re-reads every frame
  // via the controller's reactive `tick`.
  const fillFrac = createMemo(() => {
    if (!declarative()) return 0;
    controller().tick(); // re-run each animation frame
    const total = Math.max(1, local.totalRows ?? 0);
    const committed = Math.max(0, local.committedRows ?? 0);
    let inflight = 0;
    specs().forEach((b, i) => {
      inflight += controller().engine.fractionOf(`${barId()}#${i}`) * b.rows;
    });
    return clampFrac((committed + inflight) / total);
  });

  const declTip = () =>
    local.label ?? `${Math.round(fillFrac() * 100)}% complete`;

  // ---- legacy numeric path ----------------------------------------------
  const donePct = () => clampPct(local.donePct ?? 0);
  const inFlightPct = () =>
    Math.max(0, Math.min(clampPct(local.inFlightPct ?? 0), 100 - donePct()));
  const legacyBatches = () =>
    (declarative() ? [] : (local.batches as number[] | undefined)) ?? [];
  const legacyTip = () =>
    local.label ??
    `${Math.round(donePct())}% done, ${legacyBatches().length} in flight`;

  return (
    <Show
      when={declarative()}
      fallback={
        <div
          class={wrapperClass()}
          style={wrapperStyle()}
          title={legacyTip()}
          {...others}
        >
          <div
            class="sui-batch-bar__done"
            style={{ width: `${donePct()}%`, background: local.doneColor }}
          />
          <div
            class="sui-batch-bar__inflight"
            style={{ width: `${inFlightPct()}%` }}
          >
            <For each={legacyBatches()}>
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
        </div>
      }
    >
      <div
        class={wrapperClass()}
        style={wrapperStyle()}
        title={declTip()}
        {...others}
      >
        {/* One smoothly-eased green fill — committed rows + in-flight easing. */}
        <div
          class="sui-batch-bar__fill"
          style={{
            transform: `scaleX(${fillFrac()})`,
            background: local.doneColor,
          }}
        />
      </div>
    </Show>
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
 * Curried BatchBar factory (ADR-0001). Bake the visual config in once; the
 * returned component takes data props only.
 */
export function createBatchBar(
  defaults: Partial<BatchBarProps>,
): Component<BatchBarDataProps> {
  return (props) => <BatchBar {...mergeProps(defaults, props)} />;
}
