// lastReviewedAt: 2026-09-11
// lastReviewedBy: adlai.arnold
// ScrubChartCrosshair — Structural (Depth 1). SVG chart mark; composes no
// library components.
// ============================================
// The `ScrubChart` ADAPTER for the hover-crosshair mark, per
// docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md.
//
// `buildCrosshair` (`../Chart/crosshairMark.ts`) is the CORE: it takes explicit
// pixel geometry and returns a guide segment plus a dot list — data, never
// JSX. This adapter converts `ctx`'s FRAME-ABSOLUTE, INDEX-addressed hover
// state into that geometry, then draws whatever the core returns. `Chart`'s
// `Crosshair` (`../Chart/Crosshair.tsx`) is the other adapter; it is
// VALUE-addressed instead — it finds each series' nearest point by
// searching data, so its points can sit at a slightly different x than the
// guide. This adapter has no such search: every line shares the SAME
// hovered cell index, so every dot sits at the guide's own x.
//
// `ScrubChart` has no Solid context (mounting one is rejected by the ADR —
// see the ADR's "A bridge" option); a caller reaches this component by
// passing its own `ctx: ScrubChartContext<C>`, the same convention
// `ruleMarker.tsx` and `ScrubChartReferenceLine` use.
//
// This component draws no `<svg>` of its own — it returns a fragment (one
// guide `<line>`, plus one `<circle>` per dot), meant to sit inside a
// caller's own `renderChart` / `renderChartOverlay` / `renderHoverOverlay`
// `<svg>`. `CashflowScrubChart`'s hover crosshair composes this adapter with
// `ScrubChartTooltip` inside its own `renderHoverOverlay`.
// ============================================
import { For, Show, createMemo } from "solid-js";
import type { Cell } from "../DateAxis";
import { buildCrosshair, type CrosshairPointInput } from "../Chart/crosshairMark";
import type { ScrubChartContext } from "./types";

/** One line to spotlight at the hovered cell. */
export interface ScrubChartCrosshairSeries<C extends Cell> {
  /** Distinguishes this line's dot — carried through to its class, and used
   *  as its list key. Not rendered. */
  id: string;
  /** Reads this line's y value (the chart's own y-domain unit) at a cell.
   *  Return `null` to draw no dot for this line at this cell — the same
   *  convention `CashflowScrubChart`'s `balanceSeries` accessors use for a
   *  gap. */
  value: (cell: C, index: number) => number | null;
  /** Extra class on THIS line's dot, alongside `dotClass` — so a consumer
   *  that styles a line through its own class can reach that line's dot the
   *  same way, and a line hidden through its class does not leave an
   *  unexplained dot behind. */
  class?: string;
}

export interface ScrubChartCrosshairProps<C extends Cell> {
  /** The current frame's geometry, passed by the caller — there is no
   *  Solid context for `ScrubChart` (see the ADR). */
  ctx: ScrubChartContext<C>;
  /** Hovered cell index. Defaults to `ctx.hoverIndex` — set only inside
   *  `renderHoverOverlay`. Pass `ctx.liveHoverIndex()` explicitly (read
   *  inside your own memo) to draw the crosshair from `renderChart` or
   *  `renderChartOverlay` instead, without that slot re-running on every
   *  pointer move. */
  hoverIndex?: number | null;
  /** One entry per line to spotlight. Multiple → multiple dots. */
  series: ScrubChartCrosshairSeries<C>[];
  /** Show the vertical guide line. Default `true`. */
  guide?: boolean;
  /** Class on the guide `<line>`. */
  class?: string;
  /** Stroke color on the guide `<line>`. No default — omitted, a
   *  stylesheet rule targeting `class` is the only styling, same
   *  convention `ScrubChartReferenceLine` follows for its own line. */
  stroke?: string;
  /** Stroke width on the guide `<line>`, in px. */
  strokeWidth?: number;
  /** Class shared by every dot, alongside each series' own `class`. */
  dotClass?: string;
  /** Fill on every dot. No default — a hollow `stroke`-only ring needs no
   *  fill; a filled dot passes one. */
  dotFill?: string;
  /** Stroke color on every dot. No default. */
  dotStroke?: string;
  /** Stroke width on every dot, in px. */
  dotStrokeWidth?: number;
  /** Opacity on every dot. No default — presentation attributes only draw
   *  what a caller actually asks for. */
  dotOpacity?: number;
  /** Dot radius in px. Default `3.5`. */
  dotRadius?: number;
}

/**
 * Draws a hover crosshair inside a `ScrubChart` render callback: a vertical
 * guide at the hovered cell, plus one dot per `series` line at that cell's
 * value. Returns a fragment — no wrapping `<g>` or `<svg>`, so the caller's
 * own group (and its classes) stays exactly what it was.
 *
 * Renders nothing when there is no hover index to draw at, `ctx.yToPlot` is
 * `null` (no `yDomain`), or `ctx.cells` is empty.
 */
export function ScrubChartCrosshair<C extends Cell>(
  props: ScrubChartCrosshairProps<C>,
) {
  const mark = createMemo(() => {
    const idx = props.hoverIndex ?? props.ctx.hoverIndex;
    const yToPlot = props.ctx.yToPlot;
    if (idx == null || !yToPlot || props.ctx.cells.length === 0) return null;
    const cell = props.ctx.cells[idx];
    const points: CrosshairPointInput[] = [];
    for (const s of props.series) {
      const v = s.value(cell, idx);
      if (v == null) continue;
      points.push({ id: s.id, y: yToPlot(v), class: s.class });
    }
    return buildCrosshair({
      x: props.ctx.cellToX(idx),
      points,
      plotTop: props.ctx.plotTop,
      plotBottom: props.ctx.plotBottom,
    });
  });

  const dotClass = (mark: string | undefined): string | undefined => {
    const classes = [props.dotClass, mark].filter((c): c is string =>
      Boolean(c),
    );
    return classes.length > 0 ? classes.join(" ") : undefined;
  };

  return (
    <Show when={mark()}>
      {(m) => (
        <>
          <Show when={props.guide ?? true}>
            <line
              class={props.class}
              x1={m().guide.x1}
              x2={m().guide.x2}
              y1={m().guide.y1}
              y2={m().guide.y2}
              stroke={props.stroke}
              stroke-width={props.strokeWidth}
            />
          </Show>
          <For each={m().dots}>
            {(d) => (
              <circle
                class={dotClass(d.class)}
                cx={d.cx}
                cy={d.cy}
                r={props.dotRadius ?? 3.5}
                fill={props.dotFill}
                stroke={props.dotStroke}
                stroke-width={props.dotStrokeWidth}
                opacity={props.dotOpacity}
              />
            )}
          </For>
        </>
      )}
    </Show>
  );
}
