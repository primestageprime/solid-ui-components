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
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
} from "solid-js";
import { ScrubChart } from "../ScrubChart";
import { buildDeviationBand } from "./deviationBand";
import {
  ChartLabelLayer,
  PRIMARY_LABEL_ID,
  type PrimaryLineLabel,
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
  chartYDomain,
  extentOf,
  fmtAxisDollars,
  fmtDollars,
  formatCornerLabel,
} from "./helpers";
import type {
  CashflowBalanceSeries,
  CashflowCell,
  CashflowChartMarker,
  CashflowHorizontalMarker,
  CashflowLabelZone,
  CashflowScrubChartProps,
  CashflowSeriesFill,
} from "./types";
import "./CashflowScrubChart.css";
import { every, filter, flatMap, join, map, pipe, some } from "../../fn";

// Re-export the public type surface so the folder barrel (and existing
// consumers importing from this module) keep resolving the same names.
export type {
  CashflowBalanceSeries,
  CashflowCell,
  CashflowChartMarker,
  CashflowHorizontalMarker,
  CashflowLabelZone,
  CashflowScrubChartProps,
  CashflowSeriesFill,
};

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

  // The primary line's own label, which the ladder places first. `undefined`
  // says the caller named none, and the primary line then joins no label list.
  const primaryLabel = (): PrimaryLineLabel | undefined =>
    props.lineLabel
      ? {
          text: props.lineLabel,
          placement: props.lineLabelPlacement ?? "auto",
        }
      : undefined;

  // ── Label hover → line emphasis ──────────────────────────────────────
  // A drawn label NAMES one line, and the chart ships no legend, so the only
  // way to read the pairing is to point at the label. While the pointer rests
  // on one, that line keeps full strength and every other drawn line steps
  // back. The id vocabulary is the label ladder's own — `primary` for the
  // running-balance line, `series:<id>` for a balance series, `marker:<index>`
  // for a marker — so the label layer reports the same string the candidate
  // builders minted.
  const [hoveredLabel, setHoveredLabel] = createSignal<string | null>(null);

  /**
   * The label id the chart emphasises, or `null` while it emphasises none.
   *
   * A caller may hang a label on a line that paints NOTHING — a carrier series
   * the consumer's CSS draws with `stroke: none`. The colour map holds one
   * entry per line that paints a stroke, so a missing key says this line is
   * invisible. The chart then emphasises nothing: it would otherwise mute
   * every visible line to point at a line the reader cannot see, which tells
   * the reader the opposite of the truth.
   */
  const emphasisId = (): string | null => {
    const active = hoveredLabel();
    if (active === null) return null;
    return labelColors()[active] === undefined ? null : active;
  };

  /**
   * The emphasis modifier an element takes while a label is hovered.
   *
   * @param block CSS block the modifier hangs off, e.g. `"…__line"`.
   * @param id    Label id this element answers to, or `null` for an element no
   *              label names — an unlabelled marker, which can only ever step
   *              back.
   * @returns A leading-space class string, or `""` when no label is hovered.
   */
  const emphasisClass = (block: string, id: string | null): string => {
    const active = emphasisId();
    if (active === null) return "";
    return active === id ? ` ${block}--highlighted` : ` ${block}--muted`;
  };

  // ── Label colour, read back from the drawn line ──────────────────────
  // A label names one line, so it reads best in that line's own colour. The
  // colour comes from the consumer's own CSS class, and every consumer states
  // it as a `stroke`. An SVG `<text>` takes its colour from `fill`, so no CSS
  // rule and no new prop can carry the stroke across. The chart therefore
  // reads the RESOLVED stroke back from the DOM after each render, and hands
  // it to the label layer as a `fill`.
  //
  // ONE known limit: a theme swap alone does not recolour a label. The map is
  // read again when the chart re-renders for another reason.
  let chartSvgEl: SVGSVGElement | undefined;
  let markersSvgEl: SVGSVGElement | undefined;
  const [labelColors, setLabelColors] = createSignal<Record<string, string>>(
    {},
  );

  /** Whether a resolved stroke names a colour a label can take. */
  const isPaintedStroke = (stroke: string): boolean =>
    stroke !== "" && stroke !== "none" && stroke !== "rgba(0, 0, 0, 0)";

  /** Read one root's tagged elements into the map, keyed by the label id. */
  const collectStrokes = (
    root: SVGSVGElement | undefined,
    attribute: string,
    idOf: (value: string) => string,
    into: Record<string, string>,
  ): void => {
    if (!root) return;
    for (const el of Array.from(root.querySelectorAll(`[${attribute}]`))) {
      const value = el.getAttribute(attribute);
      if (value === null) continue;
      const id = idOf(value);
      if (into[id] !== undefined) continue;
      const stroke = window.getComputedStyle(el).stroke;
      if (isPaintedStroke(stroke)) into[id] = stroke;
    }
  };

  /** Whether two colour maps hold the same keys and the same colours. */
  const sameColors = (
    a: Record<string, string>,
    b: Record<string, string>,
  ): boolean => {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      every((k: string) => a[k] === b[k], keys)
    );
  };

  createEffect(() => {
    // Track every prop that changes which lines the chart draws, so the
    // colours are read again after the new lines land.
    void props.balanceSeries;
    void props.markers;
    void props.cells;
    // The server renders no DOM, so there is no computed style to read.
    if (typeof window === "undefined") return;
    if (!chartSvgEl && !markersSvgEl) return;
    const next: Record<string, string> = {};
    // The primary line carries its own attribute, not a `data-series-id`: it
    // is not a series, and its label id takes no `series:` prefix.
    collectStrokes(
      chartSvgEl,
      "data-primary-line",
      () => PRIMARY_LABEL_ID,
      next,
    );
    collectStrokes(
      chartSvgEl,
      "data-series-id",
      (value) => `series:${value}`,
      next,
    );
    collectStrokes(
      markersSvgEl,
      "data-marker-index",
      (value) => `marker:${value}`,
      next,
    );
    // Keep the previous map when nothing changed. Solid compares by identity,
    // so returning it notifies no reader and the effect never churns.
    setLabelColors((prev) => (sameColors(next, prev) ? prev : next));
  });

  /** Whether any label reaches the ladder, and so whether the layer draws. */
  const hasChartLabels = createMemo(
    () =>
      Boolean(props.lineLabel) ||
      some(
        (s: CashflowBalanceSeries) => Boolean(s.label),
        props.balanceSeries ?? [],
      ) ||
      some(markerJoinsLadder, props.markers ?? []),
  );

  // Y-domain. The three-prop precedence lives in `chartYDomain` (helpers.ts),
  // which is where the prop docs point and where the per-row tests are — it
  // drifted from those docs while it was a branch inside this memo.
  //
  // This memo owns the two things that resolver cannot see: WHICH values feed
  // it, and the no-cells case. The domain keys off the LINE (balanceLineCells
  // when decoupled) plus every overlay series — NOT the ribbon `cells` — so
  // the y-scale fits the drawn lines even when the ribbon shows a different
  // scenario and no overlaid line clips.
  const yDomain = createMemo<[number, number]>(() => {
    // Empty chart: a [0, 0] domain has no height, so the auto row's floor and
    // one unit above it stand in until data arrives.
    if (props.cells.length === 0) return [props.yMin ?? 0, props.yMax ?? 1];
    const series = props.balanceSeries ?? [];
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
    return chartYDomain(values, {
      yMax: props.yMax,
      yMin: props.yMin,
      yPadFraction: props.yPadFraction,
    });
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
      labelReservations(
        primaryLabel(),
        props.balanceSeries ?? [],
        props.markers ?? [],
      ),
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
                }${emphasisClass(
                  "sui-cashflow-scrub-chart__line",
                  `series:${series.id}`,
                )}`}
                // The colour effect reads this line's stroke back through
                // this attribute, and gives it to the series label. It reads
                // `getComputedStyle(el).stroke`, which a presentation
                // attribute feeds like any rule, so the defaults below stay
                // visible to it.
                data-series-id={series.id}
                points={seg}
                // Defaults as PRESENTATION ATTRIBUTES rather than a rule in
                // CashflowScrubChart.css — the same move already made for the
                // hover dot and the highlight band, for the same reason: a
                // base rule and a consumer's series class are both
                // single-class selectors, so the winner was decided by which
                // stylesheet loaded last. Consumers were writing
                // `.sui-cashflow-scrub-chart__line.their-class` purely to
                // break that tie. A presentation attribute loses to any author
                // rule, so a plain single class is enough now. The emphasis
                // rules keep their double-class selectors and still win, which
                // is what keeps a highlighted line at full strength.
                fill="none"
                stroke="var(--sui-cashflow-series-stroke, var(--sui-text-muted, rgba(255, 255, 255, 0.45)))"
                stroke-width="1.4"
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
            seriesId: s.id,
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

    return (
      <svg
        // The colour effect queries the drawn series lines from this root.
        ref={(el) => {
          chartSvgEl = el;
        }}
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
                }${
                  band.overrideClass ? ` ${band.overrideClass}` : ""
                }${emphasisClass(
                  "sui-cashflow-scrub-chart__band",
                  `series:${band.seriesId}`,
                )}`}
                points={band.points}
                // Defaults as presentation attributes so `fill.positiveClass` /
                // `fill.negativeClass` win on a plain single class — see the
                // balance lines above. The sign picks the value here because
                // the class that used to carry it is now only a hook.
                stroke="none"
                fill={
                  band.sign === "positive"
                    ? "var(--sui-cashflow-band-positive, rgba(0, 200, 120, 0.18))"
                    : "var(--sui-cashflow-band-negative, rgba(230, 70, 70, 0.18))"
                }
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
            }${emphasisClass(
              "sui-cashflow-scrub-chart__line",
              PRIMARY_LABEL_ID,
            )}`}
            // The colour effect reads this line's stroke back through this
            // attribute, and gives it to the `lineLabel` caption.
            data-primary-line={PRIMARY_LABEL_ID}
            points={points}
            // Presentation attributes, so `lineClass` wins on a plain single
            // class whatever the stylesheet order — see the series line above.
            fill="none"
            stroke="var(--sui-cashflow-line-stroke, var(--sui-accent, rgba(0, 168, 204, 1)))"
            stroke-width="1.6"
          />
          {/* `layer: "over"` series paint last so a dashed line laid exactly
              over the solid primary stays visible instead of being buried. */}
          {seriesLines(seriesOver)}
        </g>
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
    const hLines = props.horizontalMarkers ?? [];
    if (
      (list.length === 0 && hLines.length === 0) ||
      ctx.cells.length === 0 ||
      !ctx.yToPlot
    )
      return null;
    const yToPlot = ctx.yToPlot;
    return (
      <svg
        // The colour effect queries the drawn marker lines from this root.
        ref={(el) => {
          markersSvgEl = el;
        }}
        class="sui-cashflow-scrub-chart__chart sui-cashflow-scrub-chart__markers"
        role="img"
        aria-label="Cashflow chart markers"
        viewBox={`0 0 ${ctx.width} ${ctx.height}`}
        preserveAspectRatio="none"
      >
        {/* Horizontal reference lines (threshold AMOUNTS) — drawn first,
            underneath the vertical/date markers, same "reference chrome
            paints first" ordering the gridlines use. Non-interactive: no
            hit area, no click. */}
        <For each={hLines}>
          {(m) => {
            const y = yToPlot(m.valueCents);
            return (
              <g class="sui-cashflow-scrub-chart__marker sui-cashflow-scrub-chart__marker--hrule">
                <line
                  class={`sui-cashflow-scrub-chart__hrule-line${
                    m.class ? ` ${m.class}` : ""
                  }`}
                  x1={ctx.plotLeft}
                  x2={ctx.plotRight}
                  y1={y}
                  y2={y}
                  // Presentation attributes so `CashflowHorizontalMarker.class`
                  // wins on a plain single class.
                  stroke="var(--sui-cashflow-marker, rgba(224, 178, 77, 1))"
                  stroke-width="1"
                  stroke-dasharray="5 4"
                  opacity="0.7"
                />
                {m.label && (
                  <text
                    class="sui-cashflow-scrub-chart__hrule-label"
                    x={ctx.plotRight - 4}
                    y={y - 4}
                    text-anchor="end"
                  >
                    {m.label}
                  </text>
                )}
              </g>
            );
          }}
        </For>
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
                <g
                  class={`sui-cashflow-scrub-chart__marker sui-cashflow-scrub-chart__marker--rule${emphasisClass(
                    "sui-cashflow-scrub-chart__marker",
                    markerJoinsLadder(m) ? `marker:${m.index}` : null,
                  )}`}
                >
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
                    // The colour effect reads this rule's stroke back through
                    // this attribute, and gives it to the marker label.
                    data-marker-index={m.index}
                    x1={x}
                    x2={x}
                    y1={ctx.plotTop + (topCaption ? 15 : 0)}
                    y2={ctx.plotBottom}
                    // Presentation attributes so `CashflowChartMarker.class`
                    // wins on a plain single class. The stroke was
                    // `var(--sui-text, …)` and `--sui-text` is not a token in
                    // any theme, so it only ever rendered through its literal.
                    stroke="var(--sui-cashflow-rule-stroke, var(--sui-text-primary, rgba(255, 255, 255, 1)))"
                    stroke-width="1"
                    stroke-linecap="round"
                    stroke-dasharray="1 4"
                    opacity="0.5"
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
                }${emphasisClass(
                  "sui-cashflow-scrub-chart__marker",
                  markerJoinsLadder(m) ? `marker:${m.index}` : null,
                )}`}
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
                  // The colour effect reads this line's stroke back through
                  // this attribute, and gives it to the marker label.
                  data-marker-index={m.index}
                  x1={x}
                  x2={x}
                  y1={ctx.plotTop}
                  y2={y}
                  // Presentation attributes so `CashflowChartMarker.class` wins
                  // on a plain single class.
                  stroke="var(--sui-cashflow-marker, rgba(224, 178, 77, 1))"
                  stroke-width="1"
                  stroke-dasharray="4 3"
                  opacity="0.6"
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
                  // Presentation attribute so one `CashflowChartMarker.class`
                  // reaches BOTH the marker's line and its dot, the way a
                  // series class reaches its line and its hover dot.
                  fill="var(--sui-cashflow-marker, rgba(224, 178, 77, 1))"
                />
              </g>
            );
          }}
        </For>
      </svg>
    );
  };

  // ── Label overlay ────────────────────────────────────────────────────
  // The labels used to live in the chart svg, beneath the gesture overlay,
  // where nothing could point at them. They moved to the overlay slot so a
  // label can be HOVERED — that is the whole feature. Two consequences the
  // reader should not have to rediscover:
  //
  //   • The layer now paints above the markers svg, not below it. A marker's
  //     hit rect spans the full plot height, so a label under it would be
  //     unreachable near every marker.
  //   • The layer no longer sits under the window band, so a label in the
  //     scrub window is no longer tinted by it.
  //
  // The placement pass runs here, in the same frame the reservation bought —
  // `ctx` carries the identical geometry the chart svg reads.
  const renderLabels = (
    ctx: import("../ScrubChart").ScrubChartContext<CashflowCell>,
  ) => {
    if (ctx.cells.length === 0 || !ctx.yToPlot) return null;
    const yToPlot = ctx.yToPlot;
    const line = lineCells();
    const labelGeometry = {
      cellToX: ctx.cellToX,
      yToPlot,
      primaryCents: (i: number) => line[i]?.balanceCents,
      cellCount: ctx.cells.length,
    };
    const labels = labelCandidates(
      primaryLabel(),
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
        class="sui-cashflow-scrub-chart__chart sui-cashflow-scrub-chart__label-overlay"
        role="img"
        aria-label="Cashflow chart labels"
        viewBox={`0 0 ${ctx.width} ${ctx.height}`}
        preserveAspectRatio="none"
      >
        <ChartLabelLayer
          labels={labels}
          results={placements}
          highlightedId={emphasisId()}
          onHoverLabel={setHoveredLabel}
          colorOf={(id) => labelColors()[id]}
        />
      </svg>
    );
  };

  /** Markers first, then labels — see renderLabels for why that order. */
  const renderOverlay = (
    ctx: import("../ScrubChart").ScrubChartContext<CashflowCell>,
  ) => (
    <>
      {renderMarkers(ctx)}
      <Show when={hasChartLabels()}>{renderLabels(ctx)}</Show>
    </>
  );

  // ── Hover readout overlay ────────────────────────────────────────────
  // A transient vertical crosshair + a hollow dot on every line at the
  // hovered day, plus the consumer's tooltip card positioned beside it.
  // Distinct from the persistent selected-rule/dot; coexists with it.
  const renderHover = (
    ctx: import("../ScrubChart").ScrubChartContext<CashflowCell>,
  ) => {
    // A pointer resting on a label reads the LABEL, not a day, so the readout
    // stays away. This check and ScrubChart's plot-span check cover different
    // zones. ScrubChart drops the hover index for a pointer past `plotRight`,
    // which covers a "right" zone label in the gutter. A "below" zone label
    // sits under the x-axis and INSIDE the plot's horizontal span, so only
    // this check covers it.
    if (hoveredLabel() !== null) return null;
    const idx = ctx.hoverIndex;
    if (idx == null || ctx.cells.length === 0 || !ctx.yToPlot) return null;
    const yToPlot = ctx.yToPlot;
    const cell = ctx.cells[idx];
    const x = ctx.cellToX(idx);
    // A hollow dot for the primary line (from lineCells) + each overlay series
    // with a value.
    //
    // Each dot carries the class of the LINE it sits on — `lineClass` for the
    // primary, the series' own `class` for an overlay — alongside the shared
    // hover-dot class. A class on a series must reach EVERY mark that series
    // draws: with a single fixed class here, a consumer could style its line
    // and could not touch its dot, so a series hidden through its own class
    // (stroke: none, fill: none) kept an unexplained circle on the crosshair
    // that matched nothing in the tooltip.
    const primaryLineCell = lineCells()[idx];
    const dots: { y: number; class?: string }[] = primaryLineCell
      ? [{ y: yToPlot(primaryLineCell.balanceCents), class: props.lineClass }]
      : [];
    for (const s of props.balanceSeries ?? []) {
      const v = s.balanceCents(cell, idx);
      if (v != null) dots.push({ y: yToPlot(v), class: s.class });
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
          <For each={dots}>
            {(dot) => (
              <circle
                class={`sui-cashflow-scrub-chart__hover-dot${
                  dot.class ? ` ${dot.class}` : ""
                }`}
                cx={x}
                cy={dot.y}
                r={3.5}
                // Defaults as PRESENTATION ATTRIBUTES, not as a rule in the
                // stylesheet. The line's class and a base rule are both single
                // -class selectors, so a rule here would tie with the caller's
                // class and let stylesheet ORDER decide — and a consumer whose
                // CSS loads before SUI's would find the dot unreachable again,
                // which is the whole defect this class was added to fix. A
                // presentation attribute loses to any author rule, so the
                // caller's class always wins. Themes move these two variables.
                fill="var(--sui-cashflow-hover-dot-fill, var(--sui-bg-elevated))"
                stroke="var(--sui-cashflow-hover-dot-stroke, var(--sui-text-primary))"
                stroke-width="1.5"
                opacity="0.9"
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
      highlights={props.highlights}
      centerOn={props.centerOn}
      renderChartOverlay={
        (props.markers?.length ?? 0) > 0 ||
        (props.horizontalMarkers?.length ?? 0) > 0 ||
        hasChartLabels()
          ? renderOverlay
          : undefined
      }
      hover={props.hover}
      renderHoverOverlay={props.hover ? renderHover : undefined}
      ribbonAccent={props.stripAccent}
      ribbonAccentDashed={props.stripAccentDashed}
      today={props.today}
      chartHeight={chartHeight()}
      chartHeightExpanded={props.chartHeightExpanded}
      expanded={props.expanded}
      onExpandedChange={props.onExpandedChange}
      expandTransition={props.expandTransition}
      cellWidth={cellWidth()}
      rightGutter={reservedSpace().rightGutter}
      xAxisExtraHeight={belowExtraHeight(reservedSpace().belowRows)}
      // `yDomain` stays the FALLBACK. ScrubChart takes the fitted domain
      // whenever `yFitDomain` returns one, and this computed domain whenever
      // the callback is absent or returns null — see the prop docs.
      yDomain={yDomain()}
      yFitDomain={props.yFitDomain}
      yFitMargin={props.yFitMargin}
      yFitBounds={props.yFitBounds}
      yFitTransition={props.yFitTransition}
      yScaleMode={props.yScaleMode}
      onYScaleModeChange={props.onYScaleModeChange}
      yAxisWidth={props.yAxisWidth}
      showGridlines={props.showGridlines}
      formatYLabel={fmtAxisDollars}
      xTickCadence="auto"
      renderCell={renderCashflowCell}
      renderChart={renderBalanceChart}
    />
  );
};
