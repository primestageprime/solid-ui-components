// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// CashflowScrubChart — Domain Composite (Depth 3).
// Composes `ScrubChart` (Depth 2) with a baked-in cashflow day-cell renderer
// (date corner + diverging green/red bar + dollar amount) and a baked-in
// running-balance line drawing. Zero-config at the call site: consumer just
// passes `cells: CashflowCell[]` + `selected` + `onScrub`.
//
// Compared to `ConversationTree` (the other domain composite that bundles a
// fixed visual experience), CashflowScrubChart is narrower in scope —
// it ships exactly one chart shape (running-balance line) tied to one cell
// payload shape (cashflow + balance in cents). If you need a different
// visualisation on the same date range, drop down to bare `ScrubChart` and
// supply your own `renderChart` / `renderCell`.
//
// The day-cell ribbon stays single-account (one diverging bar + amount per
// day, driven by `cell.cashflowCents`). When you need to overlay more than
// one balance line on the chart — scenario forecasts, a prior period, a
// second account's running balance — pass `balanceSeries`. Each entry is a
// `(cell, index) => number | null` accessor (null breaks the line into a
// gap) plus a CSS class for styling; the y-domain widens to span them all.
// Paint order is the array order, beneath the primary line — set
// `layer: "over"` on a series to lift it above the primary instead, which is
// what makes a dashed scenario laid exactly over the solid baseline readable
// rather than hidden. Per-series, so one chart can hold both.
// ============================================

import {
  type Component,
  For,
  Show,
  createMemo,
  createUniqueId,
} from "solid-js";
import { ScrubChart } from "../ScrubChart";
import { buildDeviationBand } from "./deviationBand";
import {
  ChartLabelLayer,
  drawnPolylines,
  labelCandidates,
  labelReservations,
  markerJoinsLadder,
} from "./labelLayer";
import {
  belowExtraHeight,
  placeLabels,
  reserveLabelSpace,
} from "./labelPlacement";
import {
  barFraction,
  buildLineSegments,
  fmtAxisDollars,
  fmtDollars,
  formatCornerLabel,
} from "./helpers";
import type {
  CashflowBalanceSeries,
  CashflowCell,
  CashflowChartMarker,
  CashflowLabelZone,
  CashflowScrubChartProps,
  CashflowSeriesFill,
} from "./types";
import "./CashflowScrubChart.css";
import { filter, flatMap, join, map, pipe } from "../../fn";

// Re-export the public type surface so the folder barrel (and existing
// consumers importing from this module) keep resolving the same names.
export type {
  CashflowBalanceSeries,
  CashflowCell,
  CashflowChartMarker,
  CashflowLabelZone,
  CashflowScrubChartProps,
  CashflowSeriesFill,
};

// Lowest and highest of a non-empty series in ONE pass. A named step rather
// than a pair of `.reduce`s (function-first convention), and a loop rather
// than `Math.min(...values)` — a long range would blow the argument limit.
function extentOf(values: readonly number[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}

export const CashflowScrubChart: Component<CashflowScrubChartProps> = (
  props,
) => {
  const chartHeight = () => props.chartHeight ?? 200;
  const cellWidth = () => props.cellWidth ?? 60;
  // Source for the PRIMARY balance line + its dots/markers. Defaults to the
  // ribbon `cells`; when `balanceLineCells` is supplied the line is DECOUPLED
  // from the ribbon (same geometry, different balances). Indexed positionally.
  const lineCells = (): CashflowCell[] => props.balanceLineCells ?? props.cells;
  // Unique clipPath id per instance — multiple charts on one page must not
  // share a clip rect (each has its own plot geometry). createUniqueId (the
  // same mechanism Chart.tsx uses) keeps the id deterministic across
  // server/client renders, unlike the Math.random id it replaces.
  const clipId = `sui-cashflow-clip-${createUniqueId()}`;

  // Y-domain is forced to include zero so the zero-line + diverging axis
  // labels read consistently regardless of whether the running balance
  // dips negative. The domain spans the primary balance plus every extra
  // series so no overlaid line clips. When `yMax` is provided (non-null) the
  // upper bound is instead pinned to it (fixed-range mode); the lower bound is
  // always auto-derived and pulled to ≤ 0 so the zero-line stays visible.
  const yDomain = createMemo<[number, number]>(() => {
    const manualMax = props.yMax;
    const hasManualMax = manualMax != null;
    if (props.cells.length === 0) return [0, hasManualMax ? manualMax : 1];
    const series = props.balanceSeries ?? [];
    // Domain keys off the LINE (balanceLineCells when decoupled) plus the
    // overlay series — NOT the ribbon `cells` — so the y-scale fits the drawn
    // lines even when the ribbon shows a different scenario.
    const line = lineCells();
    const values = flatMap(
      (c, i) => [
        ...(line[i] ? [line[i].balanceCents] : []),
        ...filter(
          (v): v is number => v != null,
          map((s) => s.balanceCents(c, i), series),
        ),
      ],
      props.cells,
    );
    // Tight, zero-independent domain: frame the visible line(s) with symmetric
    // padding so a narrow-band line uses the full height. `yMax` still wins.
    if (!hasManualMax && props.yPadFraction != null && values.length) {
      const [dataLo, dataHi] = extentOf(values);
      // Flat series → pad around the value itself (or ±1 when it's zero).
      const spread = dataHi - dataLo || Math.abs(dataHi) || 1;
      const pad = spread * props.yPadFraction;
      return [dataLo - pad, dataHi + pad];
    }
    // Zero-floored min/max in one pass via extentOf (not Math.min/max(...spread),
    // which would blow the argument limit on a long range).
    const [lo, autoHi] = extentOf([0, ...values]);
    const hi = hasManualMax ? manualMax : autoHi;
    return [lo, hi];
  });

  // ── Label space, reserved BEFORE the geometry exists ─────────────────
  // The right gutter feeds the x scale and the below rows feed the y scale, so
  // the space a label needs can never be sized from where the label landed —
  // the placement pass needs the very scales the gutter would change. This
  // memo reads the label TEXT and the stated zone only, which is all
  // `reserveLabelSpace` is allowed to see, and its answer builds the frame
  // that `placeLabels` then works inside.
  //
  // Only an EXPLICIT zone buys space. A chart with no labels, or with "auto"
  // labels alone, reserves nothing and keeps every pixel it had.
  const reservedSpace = createMemo(() =>
    reserveLabelSpace(
      labelReservations(props.balanceSeries ?? [], props.markers ?? []),
    ),
  );

  // Largest |cashflow| across the strip — the 100%-height reference bar.
  const maxAbsCashflow = createMemo(() => {
    const abs = map(
      (c: CashflowCell) => Math.abs(c.cashflowCents),
      props.cells,
    );
    return extentOf([0, ...abs])[1];
  });

  // ── Per-day cell renderer ────────────────────────────────────────────
  const renderCashflowCell = (cell: CashflowCell) => {
    const v = cell.cashflowCents;
    // Exactly-zero days get a neutral/grey treatment: no colour tint, no bar,
    // no amount label. Non-zero positive = green, non-zero negative = red.
    const isZero = v === 0;
    const up = v > 0;
    const frac = barFraction(v, maxAbsCashflow());
    const polarity = isZero ? "neutral" : up ? "positive" : "negative";
    return (
      <div class={`sui-cashflow-cell sui-cashflow-cell--${polarity}`}>
        <div class="sui-cashflow-cell__date">{formatCornerLabel(cell)}</div>
        <div class="sui-cashflow-cell__bar-track">
          <div class="sui-cashflow-cell__zero" />
          {!isZero && (
            <div
              class={`sui-cashflow-cell__bar sui-cashflow-cell__bar--${
                up ? "up" : "down"
              }`}
              style={{ height: `${(frac * 50).toFixed(1)}%` }}
            />
          )}
        </div>
        {/* Zero cells keep an invisible spacer where the amount label would
            be: the midline sits at 50% of the flex-grown bar-track, so the
            amount row must occupy space in EVERY cell or the midline shifts
            and breaks continuity across the strip. */}
        {isZero ? (
          <div class="sui-cashflow-cell__amount-spacer" aria-hidden="true">
            {"\u00A0"}
          </div>
        ) : (
          <div class="sui-cashflow-cell__amount">{fmtDollars(v)}</div>
        )}
      </div>
    );
  };

  // ── Running-balance line chart ───────────────────────────────────────
  const renderBalanceChart = (
    ctx: import("../ScrubChart").ScrubChartContext<CashflowCell>,
  ) => {
    if (ctx.cells.length === 0 || !ctx.yToPlot) return null;
    const yToPlot = ctx.yToPlot;
    const zeroY = yToPlot(0);

    // The primary line reads its balance from lineCells (decoupled from the
    // ribbon when balanceLineCells is set); geometry (x) stays from ctx.
    const line = lineCells();
    const points = pipe(
      ctx.cells,
      map((_, i) =>
        line[i]
          ? `${ctx.cellToX(i).toFixed(1)},${yToPlot(line[i].balanceCents).toFixed(1)}`
          : null,
      ),
      filter((p): p is string => p !== null),
      join(" "),
    );

    // Extra balance lines (forecasts, prior periods, other accounts). Each may
    // break into multiple segments where its accessor returns null. `layer`
    // sorts them into two groups — painted beneath the primary line by default,
    // above it when the series asks for `"over"` (see CashflowBalanceSeries).
    const extraSeries = map(
      (s: CashflowBalanceSeries) => ({
        id: s.id,
        class: s.class,
        over: s.layer === "over",
        segments: buildLineSegments(
          ctx.cells,
          ctx.cellToX,
          yToPlot,
          s.balanceCents,
        ),
      }),
      props.balanceSeries ?? [],
    );
    const seriesUnder = filter((s) => !s.over, extraSeries);
    const seriesOver = filter((s) => s.over, extraSeries);
    // One polyline set per series, shared by both layers.
    const seriesLines = (list: typeof extraSeries) => (
      <For each={list}>
        {(series) => (
          <For each={series.segments}>
            {(seg) => (
              <polyline
                class={`sui-cashflow-scrub-chart__line sui-cashflow-scrub-chart__line--series${
                  series.class ? ` ${series.class}` : ""
                }`}
                points={seg}
              />
            )}
          </For>
        )}
      </For>
    );

    // Deviation bands — the coloured area between a `fill`-bearing series and
    // its reference line (primary line by default). Drawn at the very back so
    // the lines and decorations sit on top. Split at crossings by the geometry
    // helper, so each polygon is uniformly green (series above reference) or
    // red (series below reference).
    const bands = pipe(
      props.balanceSeries ?? [],
      filter((s) => Boolean(s.fill)),
      flatMap((s) => {
        const fill = s.fill!;
        const reference =
          fill.baseline ?? ((c: CashflowCell) => c.balanceCents);
        const overrideClass = (sign: "positive" | "negative") =>
          sign === "positive" ? fill.positiveClass : fill.negativeClass;
        return map(
          (run, i) => ({
            key: `${s.id}-${i}`,
            sign: run.sign,
            points: run.points,
            overrideClass: overrideClass(run.sign),
          }),
          buildDeviationBand(
            ctx.cells,
            ctx.cellToX,
            yToPlot,
            s.balanceCents,
            reference,
          ),
        );
      }),
    );

    // Selection decorations are part of the scrub layer — omitted in plain
    // mode (and whenever the selected index is out of range).
    const selectedCell =
      props.scrub !== false ? ctx.cells[ctx.selected] : undefined;
    const selectedX = selectedCell ? ctx.cellToX(ctx.selected) : 0;
    // The selected dot sits ON the primary line → read from lineCells.
    const selectedLineCell = selectedCell ? line[ctx.selected] : undefined;
    const selectedY = selectedLineCell
      ? yToPlot(selectedLineCell.balanceCents)
      : 0;

    // ── Over-top indicator ───────────────────────────────────────────────
    // The y-axis scales to the LINES (consumer passes a line-based `yMax`); the
    // range cone is allowed to overflow the top, clipped to the plot rect. When
    // any series point exceeds the top of the plot (maps ABOVE plotTop in px),
    // mark the GLOBAL peak with an upward chevron + the compact-formatted value
    // at the top edge, so the unshown high point is legible. One marker at the
    // peak suffices. A 0.5px epsilon avoids flagging values pinned exactly at
    // the (nice-rounded) domain top.
    const OVERTOP_EPS_PX = 0.5;
    const overtopPeak = (() => {
      let best: { x: number; value: number } | null = null;
      // Mutable running-best accumulation across two nested loops (per-cell
      // candidates, then per-candidate comparison) — a for-of loop, not
      // forEach (no fn.forEach exists; a functional combinator would only
      // add noise here, same call made for the min/max loop in extentOf).
      for (const [i, cell] of ctx.cells.entries()) {
        const candidates: number[] = line[i] ? [line[i].balanceCents] : [];
        for (const s of props.balanceSeries ?? []) {
          const v = s.balanceCents(cell, i);
          if (v != null) candidates.push(v);
        }
        for (const v of candidates) {
          // Above the plot top in screen space → exceeds the visible domain.
          if (yToPlot(v) < ctx.plotTop - OVERTOP_EPS_PX) {
            if (!best || v > best.value) best = { x: ctx.cellToX(i), value: v };
          }
        }
      }
      return best as { x: number; value: number } | null;
    })();

    // Keep the chevron + label clamped inside the plot's horizontal span so the
    // label never clips off the left/right edges. The marker is drawn OUTSIDE
    // the clip group (after it), at the very top edge of the plot.
    const overtopLabelX =
      overtopPeak == null
        ? 0
        : Math.min(
            Math.max(overtopPeak.x, ctx.plotLeft + 28),
            ctx.plotRight - 28,
          );

    // ── Label placement, AFTER the geometry the reservation bought ──────
    const labelGeometry = {
      cellToX: ctx.cellToX,
      yToPlot,
      primaryCents: (i: number) => line[i]?.balanceCents,
      cellCount: ctx.cells.length,
    };
    const labels = labelCandidates(
      props.balanceSeries ?? [],
      props.markers ?? [],
      ctx.cells,
      labelGeometry,
    );
    const placements = placeLabels(
      labels,
      {
        left: ctx.plotLeft,
        right: ctx.plotRight,
        top: ctx.plotTop,
        bottom: ctx.plotBottom,
      },
      drawnPolylines(ctx.cells, props.balanceSeries ?? [], labelGeometry),
      reservedSpace(),
    );

    return (
      <svg
        class="sui-cashflow-scrub-chart__chart"
        role="img"
        aria-label="Cashflow chart"
        viewBox={`0 0 ${ctx.width} ${ctx.height}`}
        preserveAspectRatio="none"
      >
        {/* Clip the plotted content (cone fills + balance lines) to the plot
            rect so a cone exceeding the line-based domain clips at the plot TOP
            rather than spilling over the axis labels. */}
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <rect
              x={ctx.plotLeft}
              y={ctx.plotTop}
              width={Math.max(0, ctx.plotRight - ctx.plotLeft)}
              height={Math.max(0, ctx.plotBottom - ctx.plotTop)}
            />
          </clipPath>
        </defs>
        <g clip-path={`url(#${clipId})`}>
          <For each={bands}>
            {(band) => (
              <polygon
                class={`sui-cashflow-scrub-chart__band sui-cashflow-scrub-chart__band--${
                  band.sign
                }${band.overrideClass ? ` ${band.overrideClass}` : ""}`}
                points={band.points}
              />
            )}
          </For>
          <line
            class="sui-cashflow-scrub-chart__zero-line"
            x1={ctx.plotLeft}
            x2={ctx.plotRight}
            y1={zeroY}
            y2={zeroY}
          />
          {seriesLines(seriesUnder)}
          <polyline
            class={`sui-cashflow-scrub-chart__line${
              props.lineClass ? ` ${props.lineClass}` : ""
            }`}
            points={points}
          />
          {/* `layer: "over"` series paint last so a dashed line laid exactly
              over the solid primary stays visible instead of being buried. */}
          {seriesLines(seriesOver)}
        </g>
        {/* Line + marker labels. Emitted AFTER the primary line, so document
            order paints them on top and reorders nothing. Outside the clip
            because the right and below zones sit outside the plot rect. */}
        <ChartLabelLayer labels={labels} results={placements} />
        {/* Over-top indicator — drawn OUTSIDE the clip so it sits at the top
            edge and the label stays fully visible. */}
        {overtopPeak && (
          <g class="sui-cashflow-scrub-chart__overtop">
            <path
              class="sui-cashflow-scrub-chart__overtop-chevron"
              d={`M ${overtopPeak.x} ${ctx.plotTop + 1} l 4 5 l -8 0 Z`}
            />
            <text
              class="sui-cashflow-scrub-chart__overtop-label"
              x={overtopLabelX}
              y={ctx.plotTop + 9}
              text-anchor="middle"
            >
              {fmtAxisDollars(overtopPeak.value)}
            </text>
          </g>
        )}
        {/* Per-cell dots are deliberately omitted from the line — the line
            alone reads as a smooth running balance, and the selected dot
            below provides the precise anchor. Tradeoff explained in the
            component header. */}
        {selectedCell && (
          <>
            <line
              class="sui-cashflow-scrub-chart__selected-rule"
              x1={selectedX}
              x2={selectedX}
              y1={ctx.plotTop}
              y2={ctx.plotBottom}
            />
            <circle
              class="sui-cashflow-scrub-chart__selected-dot"
              cx={selectedX}
              cy={selectedY}
              r={4}
            />
          </>
        )}
      </svg>
    );
  };

  // ── Plotline markers overlay ─────────────────────────────────────────
  // Rendered via ScrubChart's renderChartOverlay slot (above the gesture
  // overlay): the svg itself ignores pointer events; each marker group
  // re-enables them so dots/flags are clickable without blocking scrubbing.
  const renderMarkers = (
    ctx: import("../ScrubChart").ScrubChartContext<CashflowCell>,
  ) => {
    const list = props.markers ?? [];
    if (list.length === 0 || ctx.cells.length === 0 || !ctx.yToPlot)
      return null;
    const yToPlot = ctx.yToPlot;
    return (
      <svg
        class="sui-cashflow-scrub-chart__chart sui-cashflow-scrub-chart__markers"
        role="img"
        aria-label="Cashflow chart markers"
        viewBox={`0 0 ${ctx.width} ${ctx.height}`}
        preserveAspectRatio="none"
      >
        <For
          each={filter((m) => m.index >= 0 && m.index < ctx.cells.length, list)}
        >
          {(m) => {
            const x = ctx.cellToX(m.index);
            // Reference rule ("Today" etc.): a full-height dotted rule with an
            // always-visible caption at the top. Non-interactive — no hit
            // area, no flag, no dot. The label is clamped inside the plot's
            // horizontal span (same policy as the over-top label) and the rule
            // starts below it so the two don't overlap.
            if (m.variant === "rule") {
              // The caption keeps its top-of-rule seat unless the caller names
              // an explicit zone, in which case the label layer owns it and
              // the rule takes its full height back.
              const topCaption = Boolean(m.label) && !markerJoinsLadder(m);
              const labelX = Math.min(
                Math.max(x, ctx.plotLeft + 18),
                ctx.plotRight - 18,
              );
              return (
                <g class="sui-cashflow-scrub-chart__marker sui-cashflow-scrub-chart__marker--rule">
                  {topCaption && (
                    <text
                      class="sui-cashflow-scrub-chart__rule-label"
                      x={labelX}
                      y={ctx.plotTop + 8}
                      text-anchor="middle"
                    >
                      {m.label}
                    </text>
                  )}
                  <line
                    class={`sui-cashflow-scrub-chart__rule-line${
                      m.class ? ` ${m.class}` : ""
                    }`}
                    x1={x}
                    x2={x}
                    y1={ctx.plotTop + (topCaption ? 15 : 0)}
                    y2={ctx.plotBottom}
                  />
                </g>
              );
            }
            // Marker dots drop onto the primary line by default. An explicit
            // `valueCents` overrides that and places the dot anywhere else.
            const balanceValue =
              m.valueCents ?? lineCells()[m.index]?.balanceCents;
            if (balanceValue == null) return null;
            const y = yToPlot(balanceValue);
            const activate = () =>
              props.onMarkerClick?.(m.index, ctx.cells[m.index]);
            return (
              // biome-ignore lint/a11y/useSemanticElements: native <button> is not valid inside SVG; role="button" on <g> is the correct affordance
              <g
                class={`sui-cashflow-scrub-chart__marker${
                  m.selected
                    ? " sui-cashflow-scrub-chart__marker--selected"
                    : ""
                }`}
                role="button"
                tabIndex={0}
                onClick={activate}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    activate();
                  }
                }}
              >
                {/* generous invisible hit area so the thin rule is clickable */}
                <rect
                  class="sui-cashflow-scrub-chart__marker-hit"
                  x={x - 6}
                  y={ctx.plotTop}
                  width={12}
                  height={Math.max(0, ctx.plotBottom - ctx.plotTop)}
                />
                <line
                  class={`sui-cashflow-scrub-chart__marker-line${
                    m.class ? ` ${m.class}` : ""
                  }`}
                  x1={x}
                  x2={x}
                  y1={ctx.plotTop}
                  y2={y}
                />
                <path
                  class="sui-cashflow-scrub-chart__marker-flag"
                  d={`M ${x} ${ctx.plotTop} l 8 3.5 l -8 3.5 Z`}
                />
                {m.selected && (
                  <circle
                    class="sui-cashflow-scrub-chart__marker-ring"
                    cx={x}
                    cy={y}
                    r={8}
                  />
                )}
                <circle
                  class={`sui-cashflow-scrub-chart__marker-dot${
                    m.class ? ` ${m.class}` : ""
                  }`}
                  cx={x}
                  cy={y}
                  r={3.5}
                />
              </g>
            );
          }}
        </For>
      </svg>
    );
  };

  // ── Hover readout overlay ────────────────────────────────────────────
  // A transient vertical crosshair + a hollow dot on every line at the
  // hovered day, plus the consumer's tooltip card positioned beside it.
  // Distinct from the persistent selected-rule/dot; coexists with it.
  const renderHover = (
    ctx: import("../ScrubChart").ScrubChartContext<CashflowCell>,
  ) => {
    const idx = ctx.hoverIndex;
    if (idx == null || ctx.cells.length === 0 || !ctx.yToPlot) return null;
    const yToPlot = ctx.yToPlot;
    const cell = ctx.cells[idx];
    const x = ctx.cellToX(idx);
    // A hollow dot for the primary line (from lineCells) + each overlay series
    // with a value.
    const primaryLineCell = lineCells()[idx];
    const dotYs = primaryLineCell
      ? [yToPlot(primaryLineCell.balanceCents)]
      : [];
    for (const s of props.balanceSeries ?? []) {
      const v = s.balanceCents(cell, idx);
      if (v != null) dotYs.push(yToPlot(v));
    }
    // Flip the card to the pointer's left in the right half so it never
    // clips off the right edge; anchor its top at the plot top.
    const flipLeft = x > (ctx.plotLeft + ctx.plotRight) / 2;
    const cardStyle: import("solid-js").JSX.CSSProperties = flipLeft
      ? { right: `${ctx.width - x + 12}px`, top: `${ctx.plotTop}px` }
      : { left: `${x + 12}px`, top: `${ctx.plotTop}px` };
    return (
      <>
        <svg
          class="sui-cashflow-scrub-chart__chart sui-cashflow-scrub-chart__hover"
          role="presentation"
          viewBox={`0 0 ${ctx.width} ${ctx.height}`}
          preserveAspectRatio="none"
        >
          <line
            class="sui-cashflow-scrub-chart__hover-rule"
            x1={x}
            x2={x}
            y1={ctx.plotTop}
            y2={ctx.plotBottom}
          />
          <For each={dotYs}>
            {(y) => (
              <circle
                class="sui-cashflow-scrub-chart__hover-dot"
                cx={x}
                cy={y}
                r={3.5}
              />
            )}
          </For>
        </svg>
        <Show when={props.renderHoverTooltip}>
          <div
            class="sui-cashflow-scrub-chart__hover-tooltip"
            style={cardStyle}
          >
            {props.renderHoverTooltip!(cell, idx)}
          </div>
        </Show>
      </>
    );
  };

  return (
    <ScrubChart<CashflowCell>
      cells={props.cells}
      selected={props.selected}
      onScrub={props.onScrub}
      scrub={props.scrub}
      centerOn={props.centerOn}
      renderChartOverlay={
        (props.markers?.length ?? 0) > 0 ? renderMarkers : undefined
      }
      hover={props.hover}
      renderHoverOverlay={props.hover ? renderHover : undefined}
      ribbonAccent={props.stripAccent}
      ribbonAccentDashed={props.stripAccentDashed}
      today={props.today}
      chartHeight={chartHeight()}
      cellWidth={cellWidth()}
      rightGutter={reservedSpace().rightGutter}
      xAxisExtraHeight={belowExtraHeight(reservedSpace().belowRows)}
      yDomain={yDomain()}
      showGridlines={props.showGridlines}
      formatYLabel={fmtAxisDollars}
      xTickCadence="auto"
      renderCell={renderCashflowCell}
      renderChart={renderBalanceChart}
    />
  );
};
