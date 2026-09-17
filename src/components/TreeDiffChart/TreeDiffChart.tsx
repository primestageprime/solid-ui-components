// lastReviewedAt: 2026-09-17
// lastReviewedBy: adlai.arnold
/**
 * TreeDiffChart — Composite (Depth 2).
 *
 * Draws a pre-computed diff of two scenario trees: the baseline root on the
 * left, the comparison root on the right, one band per root entry between
 * them, and a pruned [SAME] node for every identical entry.
 *
 * ## What this module is, and is not
 *
 * It owns NO CSS and renders NO intrinsic element. It composes four SUI
 * components and nothing else:
 *
 * - `TreeDiffCanvas` (Structural Primitive, Depth 1) — the picture. Every
 *   `<svg>`, `<rect>`, `<text>`, `<path>` and `<foreignObject>` lives there,
 *   with `TreeDiffCanvas.css`, which is the only place stroke widths, fills
 *   and label clipping can be expressed.
 * - `Tooltip` + `EllipsizedNodeLabel` — the label device, supplied INTO the
 *   canvas's `<foreignObject>` slot via `renderLabel`. A Primitive may not
 *   import a sibling Primitive, so the canvas states the slot and its class
 *   hooks and this module fills it. ADR 0010's core/adapter split, at the
 *   element level; the same seam `ScrubChart`'s render callbacks are.
 * - `Legend` — the change-kind key.
 * - `TightStack` — the stack of the two, and the element that gets measured.
 *
 * What is left here is exactly the orchestration: measure the box, compute
 * the layout (`layout.ts`) and the pair selection (`highlight.ts`), derive
 * the legend, and decide whether there is a key to show. No number is
 * decided in this file and no pixel is painted by it.
 *
 * Colour means SIDE by default and CHANGE when the consumer supplies a
 * `kind` per entry (`kinds.ts`). The chart never infers a kind.
 *
 * Responsive: the stack is measured and the layout mode follows its width
 * (`frame.ts`). The canvas's viewBox is the measured width, so boxes render
 * 1:1 until the wide cap, then scale up with the container.
 */
import {
  type Component,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";
import { TightStack } from "../Layout";
import { Legend } from "../Legend/Legend";
import { EllipsizedNodeLabel } from "../Text";
import { Tooltip } from "../Tooltip";
import { computeHighlight } from "./highlight";
import { kindLegendItems } from "./kinds";
import { computeTreeDiffLayout } from "./layout";
import type { TreeDiffLayout } from "./layout-types";
import { TreeDiffCanvas, type TreeDiffLabelSlot } from "./TreeDiffCanvas";
import type { TreeDiffChartProps } from "./types";

export type { TreeDiffChartProps } from "./types";

export function TreeDiffChart(props: TreeDiffChartProps): JSX.Element {
  let hostRef: HTMLDivElement | undefined;
  const [width, setWidth] = createSignal(0);
  onMount(() => {
    if (!hostRef) return;
    onCleanup(observeSize(hostRef, (size) => setWidth(size.width)));
  });

  const layout = createMemo<TreeDiffLayout>(() =>
    computeTreeDiffLayout({
      baseline: props.baseline,
      compare: props.compare,
      bands: props.bands,
      mode: props.mode ?? "differences",
      width: width(),
    }),
  );
  // Pair selection: the clicked node, its counterpart, the chain to the
  // spine on both sides, and one level down. Everything else dims.
  const highlight = createMemo(() =>
    computeHighlight(props.selectedId, props.bands, layout().edges),
  );
  const legendItems = createMemo(() => kindLegendItems(layout().nodes));
  // Default on whenever the data carries kinds; a chart with none has
  // nothing to key, so it must not sprout an empty legend.
  const showLegend = () => props.legend ?? legendItems().length > 0;

  /**
   * The label device, dropped into the canvas's `<foreignObject>` slot.
   *
   * A span trigger, not the default button: the node `<g>` is already
   * `role="button"`, and its `aria-label` already carries the full label, so
   * the keyboard path this costs is already covered.
   */
  const renderLabel = (slot: TreeDiffLabelSlot): JSX.Element => (
    <Tooltip content={slot.text} triggerAs="span" class={slot.triggerClass}>
      <EllipsizedNodeLabel class={slot.textClass}>
        {slot.text}
      </EllipsizedNodeLabel>
    </Tooltip>
  );

  return (
    <TightStack ref={hostRef}>
      <TreeDiffCanvas
        layout={layout()}
        highlight={highlight()}
        selectedId={props.selectedId}
        onNodeClick={props.onNodeClick}
        ariaLabel={`Tree diff of ${props.baseline.label} against ${props.compare.label}`}
        renderLabel={renderLabel}
      />
      <Show when={showLegend()}>
        <Legend items={legendItems()} />
      </Show>
    </TightStack>
  );
}

// ── The curried seam ─────────────────────────────────────────────────────────
// Almost nothing about this chart is presentational: `baseline`, `compare`,
// `bands`, `mode`, `selectedId` and `onNodeClick` are all DATA or callbacks —
// `mode` included, because "show me only the differences" is a question the
// consumer's UI asks, not a look the design system picks. The chart mints no
// label text of its own beyond an enumerated set (`commit`, `root tree`,
// `[SAME]`), so there is no formatter to curry either.
//
// That leaves `legend`. It is the one prop that says how the chart LOOKS
// rather than what it shows, and a consumer with its own key beside the chart
// wants it off everywhere at once rather than per call site.

/**
 * The presentational half: what a design-system layer bakes once.
 *
 * Deliberately one prop — see the note above. A second override would have to
 * be something the chart draws that the data does not decide.
 */
export type TreeDiffChartOverrides = Pick<TreeDiffChartProps, "legend">;

/** The data half: what a call site still says, every time. */
export type TreeDiffChartDataProps = Omit<
  TreeDiffChartProps,
  keyof TreeDiffChartOverrides
>;

/** Bake the legend decision into a named variant. */
export function createTreeDiffChart(
  defaults: TreeDiffChartOverrides,
): Component<TreeDiffChartDataProps> {
  return (props) => {
    const merged = mergeProps(defaults, props);
    return <TreeDiffChart {...merged} />;
  };
}
