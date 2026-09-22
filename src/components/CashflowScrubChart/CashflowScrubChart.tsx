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

import { type Component, For, Show, createEffect, createMemo } from "solid-js";
import {
  ScrubChart,
  ScrubChartBand,
  ScrubChartCrosshair,
  type ScrubChartCrosshairSeries,
  ScrubChartLabels,
  ScrubChartReferenceLine,
  ScrubChartTooltip,
  createScrubChartEmphasis,
  emphasisClassName,
} from "../ScrubChart";
import { belowExtraHeight, reserveLabelSpace } from "../Chart/labelPlacement";
import {
  PRIMARY_LABEL_ID,
  type PrimaryLineLabel,
  drawnPolylines,
  labelCandidates,
  labelReservations,
  markerJoinsLadder,
} from "./labelCandidates";
import { RuleMarker } from "./ruleMarker";
import {
  barFraction,
  buildLineSegments,
  chartYDomain,
  extentOf,
  fmtAxisDollars,
  fmtDollars,
  formatCornerLabel,
  markerValueCents,
  minimizedCashflowLine,
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
import { filter, flatMap, join, map, pipe, some } from "../../fn";

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
  // `"fill"` passes straight through to ScrubChart, which owns the measuring;
  // only the numeric path needs the local default.
  const chartHeight = () => props.chartHeight ?? 200;
  const cellWidth = () => props.cellWidth ?? 60;
  // Source for the PRIMARY balance line + its dots/markers. Defaults to the
  // ribbon `cells`; when `balanceLineCells` is supplied the line is DECOUPLED
  // from the ribbon (same geometry, different balances). Indexed positionally.
  const lineCells = (): CashflowCell[] => props.balanceLineCells ?? props.cells;
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
  //
  // The hover signal, the highlighted/muted classification, and the DOM
  // colour read-back are all generic across any `ScrubChart`-hosted chart —
  // per docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md — so
  // they live in the `ScrubChart` adapter `createScrubChartEmphasis`
  // (`../ScrubChart/createScrubChartEmphasis.ts`). That module's header also
  // carries the design decision behind keeping the DOM read-back at all —
  // see it before touching this feature. Only the id vocabulary above, and
  // the "hide the emphasis when the named line paints nothing" guard below,
  // are cashflow's own.
  const emphasis = createScrubChartEmphasis();

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
    const active = emphasis.hoveredId();
    if (active === null) return null;
    return emphasis.colorFor(active) === undefined ? null : active;
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
  const emphasisClass = (block: string, id: string | null): string =>
    emphasisClassName(block, emphasisId(), id);

  // ── Label colour, read back from the drawn line ──────────────────────
  // A label names one line, so it reads best in that line's own colour. The
  // colour comes from the consumer's own CSS class, and every consumer states
  // it as a `stroke`. An SVG `<text>` takes its colour from `fill`, so no CSS
  // rule and no new prop can carry the stroke across. The chart therefore
  // reads the RESOLVED stroke back from the DOM after each render, and hands
  // it to the label layer as a `fill`. `emphasis.refreshColors` does the
  // reading; this effect owns only WHEN to re-read, because only this
  // component knows which props change which lines are drawn.
  //
  // ONE known limit: a theme swap alone does not recolour a label. The map is
  // read again when the chart re-renders for another reason.
  let chartSvgEl: SVGSVGElement | undefined;
  let markersSvgEl: SVGSVGElement | undefined;

  createEffect(() => {
    // Track every prop that changes which lines the chart draws, so the
    // colours are read again after the new lines land.
    void props.balanceSeries;
    void props.markers;
    void props.cells;
    emphasis.refreshColors([
      // The primary line carries its own attribute, not a `data-series-id`:
      // it is not a series, and its label id takes no `series:` prefix.
      {
        root: chartSvgEl,
        attribute: "data-primary-line",
        idOf: () => PRIMARY_LABEL_ID,
      },
      {
        root: chartSvgEl,
        attribute: "data-series-id",
        idOf: (value) => `series:${value}`,
      },
      {
        root: markersSvgEl,
        attribute: "data-marker-index",
        idOf: (value) => `marker:${value}`,
      },
    ]);
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
    // the lines and decorations sit on top. Rendered by `ScrubChartBand`, the
    // `ScrubChart` adapter for the shared `buildDeviationBand` core (ADR
    // 0010, dside task 45165). The green-above / red-below reading is THIS
    // component's own default — the adapter carries no polarity of its own —
    // applied below as the per-sign class and fill passed at the call site.
    const fillSeries = filter(
      (s) => Boolean(s.fill),
      props.balanceSeries ?? [],
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
            rather than spilling over the axis labels. ScrubChart owns the rect
            and the id now — see `ScrubChartClip`. */}
        <g clip-path={ctx.clip.plotPathUrl}>
          <For each={fillSeries}>
            {(s) => {
              const fill = s.fill!;
              const reference =
                fill.baseline ?? ((c: CashflowCell) => c.balanceCents);
              // Defaults as presentation attributes (positiveFill/negativeFill)
              // so `fill.positiveClass` / `fill.negativeClass` win on a plain
              // single class — see the balance lines above.
              return (
                <ScrubChartBand
                  ctx={ctx}
                  items={ctx.cells}
                  series={s.balanceCents}
                  reference={reference}
                  positiveClass={`sui-cashflow-scrub-chart__band sui-cashflow-scrub-chart__band--positive${
                    fill.positiveClass ? ` ${fill.positiveClass}` : ""
                  }${emphasisClass(
                    "sui-cashflow-scrub-chart__band",
                    `series:${s.id}`,
                  )}`}
                  negativeClass={`sui-cashflow-scrub-chart__band sui-cashflow-scrub-chart__band--negative${
                    fill.negativeClass ? ` ${fill.negativeClass}` : ""
                  }${emphasisClass(
                    "sui-cashflow-scrub-chart__band",
                    `series:${s.id}`,
                  )}`}
                  positiveFill="var(--sui-cashflow-band-positive, rgba(0, 200, 120, 0.18))"
                  negativeFill="var(--sui-cashflow-band-negative, rgba(230, 70, 70, 0.18))"
                />
              );
            }}
          </For>
          <ScrubChartReferenceLine
            ctx={ctx}
            value={0}
            class="sui-cashflow-scrub-chart__zero-line"
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
          {(m) => (
            <g class="sui-cashflow-scrub-chart__marker sui-cashflow-scrub-chart__marker--hrule">
              <ScrubChartReferenceLine
                ctx={ctx}
                value={m.valueCents}
                label={m.label}
                class={`sui-cashflow-scrub-chart__hrule-line${
                  m.class ? ` ${m.class}` : ""
                }`}
                labelClass="sui-cashflow-scrub-chart__hrule-label"
                // Presentation attributes so `CashflowHorizontalMarker.class`
                // wins on a plain single class.
                stroke="var(--sui-cashflow-marker, rgba(224, 178, 77, 1))"
                strokeWidth={1}
                strokeDasharray="5 4"
                opacity={0.7}
              />
            </g>
          )}
        </For>
        <For
          each={filter((m) => m.index >= 0 && m.index < ctx.cells.length, list)}
        >
          {(m) => {
            const x = ctx.cellToX(m.index);
            // Reference rule ("Today" etc.), drawn by `ruleMarker.tsx`. It is
            // non-interactive — no hit area, no flag, no click — and it draws
            // a crossing dot only when the caller sets `valueCents`.
            if (m.variant === "rule") {
              return (
                <RuleMarker
                  marker={m}
                  ctx={ctx}
                  yToPlot={yToPlot}
                  emphasisClass={emphasisClass}
                />
              );
            }
            // Marker dots drop onto the primary line by default. An explicit
            // marker value overrides that and places the dot anywhere else.
            const balanceValue =
              markerValueCents(m) ?? lineCells()[m.index]?.balanceCents;
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
  // Building the CANDIDATES (which labels exist, at what point) is this
  // component's own job — cashflow-bound, per `labelCandidates.ts`. WHERE
  // each one lands is the ladder CORE's job, called inside `ScrubChartLabels`
  // — the `ScrubChart` adapter per
  // docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md. `ctx`
  // carries the identical geometry the chart svg reads.
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
    return (
      <svg
        class="sui-cashflow-scrub-chart__chart sui-cashflow-scrub-chart__label-overlay"
        role="img"
        aria-label="Cashflow chart labels"
        viewBox={`0 0 ${ctx.width} ${ctx.height}`}
        preserveAspectRatio="none"
      >
        <ScrubChartLabels
          ctx={ctx}
          labels={labels}
          polylines={drawnPolylines(
            ctx.cells,
            props.balanceSeries ?? [],
            labelGeometry,
          )}
          reservedSpace={reservedSpace()}
          classPrefix="sui-cashflow-scrub-chart"
          highlightedId={emphasisId()}
          onHoverLabel={emphasis.setHoveredId}
          colorOf={emphasis.colorFor}
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
    if (emphasis.hoveredId() !== null) return null;
    const idx = ctx.hoverIndex;
    if (idx == null || ctx.cells.length === 0 || !ctx.yToPlot) return null;
    const x = ctx.cellToX(idx);
    // One crosshair line per drawn line: the primary (read from `lineCells`,
    // decoupled from `ctx.cells` — see the `lineCells` doc comment) plus
    // each overlay series with a value at this cell. Each carries the class
    // of the LINE it sits on — `lineClass` for the primary, the series' own
    // `class` for an overlay — alongside the shared hover-dot class, so a
    // series hidden through its own class does not leave an unexplained
    // circle on the crosshair.
    const series: ScrubChartCrosshairSeries<CashflowCell>[] = [
      {
        id: "primary",
        value: (_cell, i) => lineCells()[i]?.balanceCents ?? null,
        class: props.lineClass,
      },
    ];
    for (const s of props.balanceSeries ?? []) {
      series.push({
        id: s.id,
        value: (cell: CashflowCell, i: number) => s.balanceCents(cell, i),
        class: s.class,
      });
    }
    return (
      <>
        <svg
          class="sui-cashflow-scrub-chart__chart sui-cashflow-scrub-chart__hover"
          role="presentation"
          viewBox={`0 0 ${ctx.width} ${ctx.height}`}
          preserveAspectRatio="none"
        >
          <ScrubChartCrosshair
            ctx={ctx}
            series={series}
            class="sui-cashflow-scrub-chart__hover-rule"
            dotClass="sui-cashflow-scrub-chart__hover-dot"
            // Defaults as PRESENTATION ATTRIBUTES, not as a rule in the
            // stylesheet. The line's class and a base rule are both single
            // -class selectors, so a rule here would tie with the caller's
            // class and let stylesheet ORDER decide — and a consumer whose
            // CSS loads before SUI's would find the dot unreachable again,
            // which is the whole defect this class was added to fix. A
            // presentation attribute loses to any author rule, so the
            // caller's class always wins. Themes move these two variables.
            dotFill="var(--sui-cashflow-hover-dot-fill, var(--sui-bg-elevated))"
            dotStroke="var(--sui-cashflow-hover-dot-stroke, var(--sui-text-primary))"
            dotStrokeWidth={1.5}
            dotOpacity={0.9}
          />
        </svg>
        <Show when={props.renderHoverTooltip}>
          <ScrubChartTooltip
            ctx={ctx}
            anchorX={x}
            anchorY={ctx.plotTop}
            class="sui-cashflow-scrub-chart__hover-tooltip"
          >
            {props.renderHoverTooltip!(ctx.cells[idx], idx)}
          </ScrubChartTooltip>
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
      topAction={props.topAction}
      minimized={props.minimized}
      onMinimizedChange={props.onMinimizedChange}
      // The caller's slot wins. With none, this chart states the line
      // ScrubChart cannot — it reads the balances, and ScrubChart does not.
      renderMinimized={
        props.renderMinimized ??
        ((ctx) => minimizedCashflowLine(ctx.cells, ctx.summary))
      }
      cellWidth={cellWidth()}
      rightGutter={reservedSpace().rightGutter}
      xAxisExtraHeight={belowExtraHeight(reservedSpace().belowRows)}
      // `yDomain` stays the FALLBACK. ScrubChart takes the fitted domain
      // whenever `yFitDomain` returns one, and this computed domain whenever
      // the callback is absent or returns null — see the prop docs.
      yDomain={yDomain()}
      yFitDomain={props.yFitDomain}
      yFitMargin={props.yFitMargin}
      yTickCount={props.yTickCount}
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
