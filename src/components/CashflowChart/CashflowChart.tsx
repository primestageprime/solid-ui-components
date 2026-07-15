// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// WeeklyCashflowChart — Composite (Depth 2). Composes CashflowBars + CashflowPopover (each Depth 1).
// CashflowChart — weekly revenue/expense bars with a running-balance ("coffers")
// line, ported from the Thorcasting app. Container-driven sizing: the chart FILLS
// the height its layout box allots it (via a ResizeObserver that measures the
// container) rather than growing to a width-locked aspect ratio. The SVG is
// width:100% height:100% and its viewBox height tracks the measured container
// height, so bars/labels scale to the real pixel box with NO horizontal scroll
// and no vertical overflow that would push siblings down. Uses d3-scale for
// band/linear scales; the balance line is built with a tiny inlined path helper
// (no d3-shape dependency).
//
// Trimmed from the original: the monthly `CashflowChart` variant, ghost-line
// snapshots, and goal overlays. The WEEKLY chart — bars, balance line, now
// marker, bankruptcy annotation, and hover popover — is preserved.
import {
  type Component,
  For,
  Show,
  createSignal,
  createMemo,
  onMount,
  onCleanup,
} from "solid-js";
import { scaleBand, scaleLinear } from "d3-scale";
import { insetSpan } from "../../internal/geometry/insetSpan";
import "./CashflowChart.css";
import type {
  BarLineItem,
  WeeklyCashflowChartProps,
  WeeklyChartBar,
  WeeklyHoverState,
  WeeklySegmentKind,
} from "./types";
import {
  MIN_CHART_HEIGHT,
  PAD,
  formatDollars,
  formatWeekRange,
  linePath,
} from "./format";
import { CashflowBars } from "./CashflowBars";
import { CashflowPopover } from "./CashflowPopover";

// Public data shapes live in `./types`; re-exported here so consumers (and the
// folder barrel) keep importing them from CashflowChart unchanged.
export type {
  BarLineItem,
  WeeklyChartBar,
  WeeklyCashflowChartData,
  WeeklyCashflowChartProps,
} from "./types";

export const WeeklyCashflowChart: Component<WeeklyCashflowChartProps> = (
  props,
) => {
  const [hover, setHover] = createSignal<WeeklyHoverState | null>(null);
  const [coffersHover, setCoffersHover] = createSignal<string | null>(null);
  // Measured container box (px). The viewBox is rendered to these exact
  // dimensions, so the chart fills the space its layout box allots it on BOTH
  // axes — no width-locked aspect ratio, no vertical overflow that would push
  // siblings down. Width defaults to a sensible logical width and height to the
  // floor so the first paint (before the observer fires) is already reasonable.
  const [measuredWidth, setMeasuredWidth] = createSignal(1000);
  const [measuredHeight, setMeasuredHeight] = createSignal(MIN_CHART_HEIGHT);
  let containerRef: HTMLDivElement | undefined;

  // viewBox width tracks the measured container width so band/label spacing
  // matches the real pixel box (no horizontal distortion under preserveAspectRatio).
  const VB_W = () => Math.max(320, measuredWidth());
  // viewBox height: an explicit `height` prop pins it; otherwise track the
  // measured container, floored so a tiny share never collapses the chart.
  const h = () => props.height ?? Math.max(MIN_CHART_HEIGHT, measuredHeight());

  // Plot-region spans — every left/right/top/bottom edge coordinate below is
  // derived from these two, so the PAD inset arithmetic lives in one place.
  const plotX = () => insetSpan(VB_W(), PAD.left, PAD.right);
  const plotY = () => insetSpan(h(), PAD.top, PAD.bottom);

  onMount(() => {
    if (!containerRef) return;
    if (typeof ResizeObserver === "undefined") return;
    // The observer callback must be loop-safe: if it synchronously set the size
    // signals, the resulting re-render could change the observed element's box
    // and re-trigger the observer within the same frame, which the browser
    // surfaces as "ResizeObserver loop completed with undelivered
    // notifications." We break that cycle by (a) deferring the signal update to
    // the next animation frame and (b) skipping no-op updates so an unchanged
    // measurement never re-triggers downstream layout.
    let rafId: number | null = null;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      // Prefer the (rounded) border-box size when available; fall back to the
      // rounded contentRect otherwise.
      const box = entry.borderBoxSize?.[0];
      const w = Math.round(box ? box.inlineSize : entry.contentRect.width);
      const ht = Math.round(box ? box.blockSize : entry.contentRect.height);
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (w !== measuredWidth()) setMeasuredWidth(w);
        if (ht !== measuredHeight()) setMeasuredHeight(ht);
      });
    });
    observer.observe(containerRef);
    onCleanup(() => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    });
  });

  const scales = createMemo(() => {
    const bars = props.data.bars;
    const weeks = bars.map((b) => b.week_start);

    const xScale = scaleBand<string>()
      .domain(weeks)
      .range([plotX().start, plotX().end])
      .padding(0.15);

    const maxRevenue = Math.max(0, ...bars.map((b) => b.revenue_cents));
    const maxExpense = Math.max(0, ...bars.map((b) => b.expense_cents));
    const minBalance = bars.length
      ? Math.min(0, ...bars.map((b) => b.balance_cents))
      : 0;
    const maxBalance = bars.length
      ? Math.max(0, ...bars.map((b) => b.balance_cents))
      : 0;
    const FIXED_Y_MIN = -10_000_000; // -$100k in cents (manual/fixed-range floor)
    // Full rendered vertical extent: revenue bars rise from $0, expense bars drop
    // below $0, and the balance line can land on either side. Auto-scaling fits
    // this whole extent so nothing floats in empty space.
    const dataMax = Math.max(0, maxRevenue, maxBalance);
    const dataMin = Math.min(0, -maxExpense, minBalance);
    const isManual = props.yMax != null;

    // Degenerate / empty data: no bars, or every bar's revenue, expense, and
    // balance round to ~$0. In that case auto-scaling would otherwise anchor on
    // the FIXED_Y_MIN floor (-$100k) and draw a flat line in deep negative
    // space. Detect it (threshold = half a cent so genuine zero counts) and pin
    // the domain to [$0, small positive default] so the empty chart rests on
    // the $0 baseline with no negative region. An explicit `yMax` still wins.
    const ZERO_EPS = 0.5; // cents; below this a value is treated as $0
    const DEGENERATE_Y_MAX = 100_000; // $1,000 in cents — a small default top
    const hasMeaningfulData =
      bars.length > 0 &&
      bars.some(
        (b) =>
          Math.abs(b.revenue_cents) >= ZERO_EPS ||
          Math.abs(b.expense_cents) >= ZERO_EPS ||
          Math.abs(b.balance_cents) >= ZERO_EPS,
      );

    // Auto mode fits the data extent with 10% headroom on each edge so the full
    // line + bars are visible without floating in empty space. Manual mode keeps
    // the caller's pinned yMax and the historical fixed floor.
    const PAD_FRAC = 0.1;
    const span = dataMax - dataMin || DEGENERATE_Y_MAX;
    const domainMax = isManual
      ? props.yMax!
      : hasMeaningfulData
        ? dataMax + span * PAD_FRAC
        : DEGENERATE_Y_MAX;
    const domainMin = !hasMeaningfulData
      ? 0 // degenerate/empty data rests on the $0 baseline in either mode
      : isManual
        ? Math.min(FIXED_Y_MIN, minBalance)
        : dataMin - span * PAD_FRAC;

    const yScale = scaleLinear()
      .domain([domainMin, domainMax])
      .range([plotY().end, plotY().start]);
    // No .nice() in auto mode — rounding the domain outward would reintroduce the
    // empty margins the 10% fit is meant to remove.

    const ticks = yScale.ticks(5);
    const bw = xScale.bandwidth();

    const balancePoints = (subset: WeeklyChartBar[]) =>
      subset.map((d) => ({
        x: (xScale(d.week_start) ?? 0) + bw / 2,
        y: yScale(d.balance_cents),
      }));

    const todayWeek = props.data.todayWeek;
    const todayIdx = todayWeek ? weeks.indexOf(todayWeek) : -1;

    const pastBars = todayIdx >= 0 ? bars.slice(0, todayIdx + 1) : bars;
    const futureBars = todayIdx >= 0 ? bars.slice(todayIdx) : [];

    const solidPath =
      pastBars.length >= 2 ? linePath(balancePoints(pastBars)) : "";
    const dashedPath =
      futureBars.length >= 2 ? linePath(balancePoints(futureBars)) : "";
    const fullPath =
      pastBars.length < 2 && futureBars.length < 2
        ? linePath(balancePoints(bars))
        : "";

    const nowX =
      todayIdx >= 0 && todayWeek ? (xScale(todayWeek) ?? 0) + bw : -1;

    return {
      xScale,
      yScale,
      ticks,
      solidPath,
      dashedPath,
      fullPath,
      nowX,
      todayIdx,
    };
  });

  const zeroY = () => scales().yScale(0);

  function clampPopover(
    clientX: number,
    clientY: number,
    rect: DOMRect,
  ): { x: number; y: number } {
    const popoverW = 240;
    const popoverH = 300;
    let x = clientX - rect.left + 12;
    let y = clientY - rect.top - 8;
    if (x + popoverW > rect.width) x = clientX - rect.left - popoverW - 12;
    if (y + popoverH > rect.height) y = rect.height - popoverH;
    if (y < 0) y = 0;
    return { x, y };
  }

  function handleEnter(
    bar: WeeklyChartBar,
    kind: WeeklySegmentKind,
    e: MouseEvent,
  ) {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    let items: BarLineItem[];
    let total: number;
    switch (kind) {
      case "revenue":
        items = bar.revenue_items;
        total = bar.revenue_cents;
        break;
      case "exp-recurring":
        items = bar.recurring_expense_items;
        total = bar.recurring_expense_cents;
        break;
      case "exp-onetime":
        items = bar.onetime_expense_items;
        total = bar.onetime_expense_cents;
        break;
      default:
        items = bar.expense_items;
        total = bar.expense_cents;
        break;
    }
    const pos = clampPopover(e.clientX, e.clientY, rect);
    const { end } = formatWeekRange(bar.week_start);
    setHover({
      kind,
      items,
      total_cents: total,
      week_start: bar.week_start,
      week_end: end,
      ...pos,
    });
  }

  function handleMove(e: MouseEvent) {
    const current = hover();
    if (!current || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const pos = clampPopover(e.clientX, e.clientY, rect);
    setHover({ ...current, ...pos });
  }

  function handleLeave() {
    setHover(null);
  }

  return (
    <div class="rc-cashflow-container" ref={containerRef}>
      <svg
        class="rc-cashflow"
        role="img"
        aria-label="Cashflow chart"
        viewBox={`0 0 ${VB_W()} ${h()}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Zero line */}
        <line
          x1={plotX().start}
          y1={zeroY()}
          x2={plotX().end}
          y2={zeroY()}
          class="rc-cashflow__axis"
        />

        {/* Y-axis line */}
        <line
          x1={plotX().start}
          y1={plotY().start}
          x2={plotX().start}
          y2={plotY().end}
          class="rc-cashflow__axis"
        />

        {/* Y-axis ticks */}
        <For each={scales().ticks}>
          {(tick) => {
            const y = () => scales().yScale(tick);
            return (
              <>
                <line
                  x1={plotX().start - 4}
                  y1={y()}
                  x2={plotX().start}
                  y2={y()}
                  class="rc-cashflow__tick"
                />
                {tick !== 0 && (
                  <line
                    x1={plotX().start}
                    y1={y()}
                    x2={plotX().end}
                    y2={y()}
                    class="rc-cashflow__grid"
                  />
                )}
                <text
                  x={plotX().start - 8}
                  y={y()}
                  text-anchor="end"
                  dominant-baseline="middle"
                  class="rc-cashflow__label-y"
                >
                  {formatDollars(tick)}
                </text>
              </>
            );
          }}
        </For>

        {/* Invisible overlay rects for coffers hover (behind bars so bars take priority) */}
        <For each={props.data.bars}>
          {(bar) => {
            const ox = () => scales().xScale(bar.week_start)!;
            const obw = () => scales().xScale.bandwidth();
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: hover-only tooltip/popover affordance on SVG data-viz; no activating action
              <rect
                x={ox()}
                y={plotY().start}
                width={obw()}
                height={plotY().size}
                fill="transparent"
                onMouseEnter={() => setCoffersHover(bar.week_start)}
                onMouseMove={() => setCoffersHover(bar.week_start)}
                onMouseLeave={() => setCoffersHover(null)}
              />
            );
          }}
        </For>

        {/* Weekly bars */}
        <CashflowBars
          bars={() => props.data.bars}
          xScale={() => scales().xScale}
          yScale={() => scales().yScale}
          h={h}
          onEnter={handleEnter}
          onMove={handleMove}
          onLeave={handleLeave}
        />

        {/* Coffers (balance) line */}
        <Show when={scales().solidPath || scales().fullPath}>
          <path
            class="rc-cashflow__coffers"
            d={scales().solidPath || scales().fullPath}
          />
        </Show>
        <Show when={scales().dashedPath}>
          <path
            class="rc-cashflow__coffers rc-cashflow__coffers--dashed"
            d={scales().dashedPath}
          />
        </Show>

        {/* Now marker */}
        <Show when={scales().nowX > 0}>
          <line
            class="rc-cashflow__now"
            x1={scales().nowX}
            y1={plotY().start}
            x2={scales().nowX}
            y2={plotY().end}
          />
        </Show>

        {/* Bankruptcy annotation */}
        <Show when={props.data.bankruptcyWeek}>
          {(week) => {
            const bx = () => {
              const { xScale } = scales();
              return (xScale(week()) ?? 0) + xScale.bandwidth() / 2;
            };
            const by = () => scales().yScale(0);
            return (
              <>
                <circle
                  cx={bx()}
                  cy={by()}
                  r={4}
                  class="rc-cashflow__bankruptcy-marker"
                />
                <text
                  class="rc-cashflow__bankruptcy"
                  x={bx()}
                  y={by() - 10}
                  text-anchor="middle"
                >
                  Bankruptcy {props.data.bankruptcyDate ?? week()}
                </text>
              </>
            );
          }}
        </Show>

        {/* Coffers indicator on hover (from bar hover or coffers overlay hover) */}
        {(() => {
          const activeWeek = () => hover()?.week_start ?? coffersHover();
          const bar = () =>
            activeWeek()
              ? props.data.bars.find((b) => b.week_start === activeWeek())
              : undefined;
          const cx = () => {
            const w = activeWeek();
            if (!w) return 0;
            const { xScale } = scales();
            return (xScale(w) ?? 0) + xScale.bandwidth() / 2;
          };
          const cy = () => scales().yScale(bar()?.balance_cents ?? 0);
          return (
            <Show when={bar()}>
              <circle
                cx={cx()}
                cy={cy()}
                r={5}
                class="rc-cashflow__coffers-dot"
              />
              <text
                x={cx() + 8}
                y={cy() - 10}
                class="rc-cashflow__coffers-label"
                text-anchor="start"
              >
                {formatDollars(bar()!.balance_cents)}
              </text>
            </Show>
          );
        })()}
      </svg>

      {/* Popover */}
      <CashflowPopover hover={hover} />
    </div>
  );
};
