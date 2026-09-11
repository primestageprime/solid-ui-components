// lastReviewedAt: 2026-09-11
// lastReviewedBy: adlai.arnold
// ScrubChartLabels — Structural (Depth 1). SVG chart mark; composes no
// library components.
// ============================================
// The `ScrubChart` ADAPTER for the label-ladder mark, per
// docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md.
//
// `placeLabels` (`../Chart/labelPlacement.ts`) is the CORE: it takes an
// explicit pixel plot rect and returns where each label lands — data, never
// JSX. This adapter converts `ctx`'s FRAME-ABSOLUTE plot edges (`plotLeft`,
// `plotTop`, `plotRight`, `plotBottom`) into that rect, calls the core, pairs
// the result with each label's text through `drawnLabels` (also the core —
// a `Chart` Labels slot child does the identical pairing), then draws what
// comes back. `Chart`'s own Labels slot child is the other adapter; it
// supplies PLOT-LOCAL pixels from `useChart()` instead — the coordinate
// difference the two adapters exist to absorb.
//
// `ScrubChart` has no Solid context (mounting one is rejected by the ADR —
// see its "A bridge" option); a caller reaches this component by passing its
// own `ctx: ScrubChartContext<C>`, the same convention `ruleMarker.tsx` and
// `ScrubChartBand` use.
//
// WHICH labels exist, and WHAT they say, is not this adapter's job.
// `CashflowScrubChart`'s `labelCandidates` / `drawnPolylines`
// (`../CashflowScrubChart/labelCandidates.ts`) build the `labels` and
// `polylines` props from its own cashflow types — reading `ScrubChart` FROM
// `CashflowScrubChart`, the direction every other adapter already imports
// in. This module reads no cashflow type in return: `labels` arrives as the
// CORE's own generic `ChartLabel[]`.
//
// `classPrefix` carries NO default: `CashflowScrubChart` passes its own
// `"sui-cashflow-scrub-chart"` so the class names this paints stay exactly
// what the pre-move `ChartLabelLayer` painted.
// ============================================
import { For, Show, createMemo } from "solid-js";
import type { Cell } from "../DateAxis";
import {
  type ChartLabel,
  type DrawnLabel,
  type PlotRect,
  type Polyline,
  type ReservedSpace,
  drawnLabels,
  placeLabels,
} from "../Chart/labelPlacement";
import { emphasisClassName } from "./emphasis";
import type { ScrubChartContext } from "./types";

export interface ScrubChartLabelsProps<C extends Cell> {
  /** The current frame's geometry, passed by the caller — there is no
   *  Solid context for `ScrubChart` (see the ADR). */
  ctx: ScrubChartContext<C>;
  /** One candidate per label the caller wants placed, in the order
   *  `placeLabels` should try them. */
  labels: readonly ChartLabel[];
  /** Every drawn series, as pixel polylines — a body label may not cross one. */
  polylines: readonly Polyline[];
  /** The space `reserveLabelSpace` bought for this frame. */
  reservedSpace: ReservedSpace;
  /** BEM block the drawn class names are built from, e.g.
   *  `"sui-cashflow-scrub-chart"` for `${classPrefix}__label`. No default —
   *  every caller states its own. */
  classPrefix: string;
  /** Id of the label the pointer rests on, or `null` when it rests on none. */
  highlightedId?: string | null;
  /** Called with a label id on pointer enter, and with `null` on leave. */
  onHoverLabel?: (id: string | null) => void;
  /** Colour of the line a label names, or `undefined` when none resolves. */
  colorOf?: (id: string) => string | undefined;
}

/** Clear space added around a label's text box to make it easy to point at. */
const LABEL_HIT_PAD = 3;

/**
 * The left edge of a label's text box.
 *
 * `placed.x` is an anchor point, not a left edge: the ladder pairs it with a
 * `text-anchor`, and the three anchors put the text on three different sides
 * of that number. The hit box has to cover the glyphs, so it reads the anchor
 * back.
 */
const hitLeft = (label: DrawnLabel): number =>
  label.placed.anchor === "start"
    ? label.placed.x
    : label.placed.anchor === "end"
      ? label.placed.x - label.width
      : label.placed.x - label.width / 2;

/**
 * Draws the label ladder inside a `ScrubChart` render callback: one `<text>`
 * per label `placeLabels` found room for, in one `<g>`.
 *
 * A label NAMES a line, so pointing at it asks which line. `onHoverLabel`
 * turns that question on: each label gets a padded transparent hit box and
 * reports its id on enter and `null` on leave, and `highlightedId` comes back
 * as the emphasis class. Without the callback the layer takes no pointer
 * event at all — it must not eat the scrub gesture it sits over.
 *
 * `colorOf` answers the same question at rest: the caller reads the drawn
 * line's colour and the label takes it, as an INLINE STYLE so it beats a
 * plain class rule with no `!important` — see `CashflowScrubChart`'s call
 * site for why that matters. No style is set at all when no colour resolves,
 * so the caller's CSS default applies.
 */
export function ScrubChartLabels<C extends Cell>(
  props: ScrubChartLabelsProps<C>,
) {
  const placed = createMemo(() => {
    const plot: PlotRect = {
      left: props.ctx.plotLeft,
      top: props.ctx.plotTop,
      right: props.ctx.plotRight,
      bottom: props.ctx.plotBottom,
    };
    const results = placeLabels(
      props.labels,
      plot,
      props.polylines,
      props.reservedSpace,
    );
    return drawnLabels(props.labels, results);
  });

  // Delegates to the shared pure core (`./emphasis.ts`) rather than
  // classifying highlighted/muted by hand — the same core
  // `createScrubChartEmphasis`'s `classFor` calls, so a label and the line it
  // names always agree on which state wins.
  const emphasis = (id: string): string =>
    emphasisClassName(
      `${props.classPrefix}__label`,
      props.highlightedId ?? null,
      id,
    );
  const colorStyle = (id: string) => {
    const color = props.colorOf?.(id);
    return color === undefined ? undefined : { fill: color };
  };

  return (
    <g class={`${props.classPrefix}__labels`}>
      <For each={placed()}>
        {(label) => (
          <g
            class={`${props.classPrefix}__label-group`}
            onPointerEnter={() => props.onHoverLabel?.(label.placed.id)}
            onPointerLeave={() => props.onHoverLabel?.(null)}
          >
            <Show when={props.onHoverLabel}>
              <rect
                class={`${props.classPrefix}__label-hit`}
                x={hitLeft(label) - LABEL_HIT_PAD}
                y={label.placed.y - label.height / 2 - LABEL_HIT_PAD}
                width={label.width + LABEL_HIT_PAD * 2}
                height={label.height + LABEL_HIT_PAD * 2}
              />
            </Show>
            <text
              class={`${props.classPrefix}__label ${props.classPrefix}__label--${label.placed.zone}${emphasis(label.placed.id)}`}
              x={label.placed.x}
              y={label.placed.y}
              text-anchor={label.placed.anchor}
              style={colorStyle(label.placed.id)}
            >
              {label.text}
            </text>
          </g>
        )}
      </For>
    </g>
  );
}
