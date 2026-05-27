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
import { Component, For, Show, createSignal, createMemo, onMount, onCleanup } from "solid-js";
import { scaleBand, scaleLinear } from "d3-scale";
import "./CashflowChart.css";

// ── Data shapes (self-contained; no external chartData module) ──

export interface BarLineItem {
  name: string;
  amount_cents: number;
}

export interface WeeklyChartBar {
  week_start: string; // YYYY-MM-DD (Monday)
  month_label: string; // e.g. "Mar '26" on first week of month, "" otherwise
  revenue_cents: number;
  recurring_revenue_cents: number;
  project_revenue_cents: number;
  product_revenue_cents: number;
  expense_cents: number;
  recurring_expense_cents: number;
  onetime_expense_cents: number;
  balance_cents: number;
  revenue_items: BarLineItem[];
  expense_items: BarLineItem[];
  recurring_expense_items: BarLineItem[];
  onetime_expense_items: BarLineItem[];
  isProjected: boolean;
}

export interface WeeklyCashflowChartData {
  bars: WeeklyChartBar[];
  todayWeek?: string | null;
  bankruptcyWeek?: string | null;
  bankruptcyDate?: string | null;
}

export interface WeeklyCashflowChartProps {
  data: WeeklyCashflowChartData;
  /**
   * Explicit viewBox height in px. When omitted (the common case), the chart
   * measures its container via a ResizeObserver and renders to that height, so
   * it fills the vertical space its layout box allots it. Pass a number only to
   * pin a fixed height regardless of the container.
   */
  height?: number;
  yMax?: number | null;
}

/** Floor for the measured container height so the chart never collapses to nothing. */
const MIN_CHART_HEIGHT = 160;

// ── Formatting helpers ──

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Compact cents → dollar label: 165799 → "$2k", -40000 → "-$400", 0 → "$0". */
function formatDollars(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const dollars = Math.abs(cents) / 100;
  if (dollars >= 1000) return `${sign}$${(dollars / 1000).toFixed(0)}k`;
  return `${sign}$${Math.round(dollars)}`;
}

/** Full cents → dollar label with cents: 165799 → "$1,657.99". */
function formatDollarsLong(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const dollars = Math.abs(cents) / 100;
  return `${sign}$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format "Mar 3 – Mar 9, 2026" from a week_start YYYY-MM-DD; also returns week end. */
function formatWeekRange(weekStart: string): { label: string; end: string } {
  const s = new Date(weekStart + "T00:00:00");
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const sMonth = MONTH_NAMES[s.getMonth()];
  const eMonth = MONTH_NAMES[e.getMonth()];
  const end = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
  if (sMonth === eMonth) {
    return { label: `${sMonth} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`, end };
  }
  return { label: `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}, ${e.getFullYear()}`, end };
}

/** Build an SVG polyline path "M x y L x y …" from a list of points. */
function linePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

// ── Layout constants ──

const PAD = { top: 20, right: 20, bottom: 48, left: 64 };

type WeeklySegmentKind = "revenue" | "expense" | "exp-recurring" | "exp-onetime";

const WEEKLY_SEGMENT_LABELS: Record<WeeklySegmentKind, string> = {
  revenue: "Revenue",
  expense: "Expenses",
  "exp-recurring": "Recurring Expenses",
  "exp-onetime": "One-Time Expenses",
};

interface WeeklyHoverState {
  kind: WeeklySegmentKind;
  items: BarLineItem[];
  total_cents: number;
  week_start: string;
  week_end: string;
  x: number;
  y: number;
}

export const WeeklyCashflowChart: Component<WeeklyCashflowChartProps> = (props) => {
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

  onMount(() => {
    if (!containerRef) return;
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setMeasuredWidth(entry.contentRect.width);
      setMeasuredHeight(entry.contentRect.height);
    });
    observer.observe(containerRef);
    onCleanup(() => observer.disconnect());
  });

  const scales = createMemo(() => {
    const bars = props.data.bars;
    const weeks = bars.map((b) => b.week_start);

    const xScale = scaleBand<string>()
      .domain(weeks)
      .range([PAD.left, VB_W() - PAD.right])
      .padding(0.15);

    const maxRevenue = Math.max(1, ...bars.map((b) => b.revenue_cents));
    const minBalance = bars.length ? Math.min(0, ...bars.map((b) => b.balance_cents)) : 0;
    const maxBalance = bars.length ? Math.max(0, ...bars.map((b) => b.balance_cents)) : 0;
    const FIXED_Y_MIN = -10_000_000; // -$100k in cents
    const autoMax = Math.max(maxRevenue, maxBalance);
    const isManual = props.yMax != null;
    const domainMax = isManual ? props.yMax! : autoMax;
    const domainMin = Math.min(FIXED_Y_MIN, minBalance);

    const yScale = scaleLinear()
      .domain([domainMin, domainMax])
      .range([h() - PAD.bottom, PAD.top]);
    if (!isManual) yScale.nice();

    const ticks = yScale.ticks(5);
    const bw = xScale.bandwidth();

    const balancePoints = (subset: WeeklyChartBar[]) =>
      subset.map((d) => ({ x: (xScale(d.week_start) ?? 0) + bw / 2, y: yScale(d.balance_cents) }));

    const todayWeek = props.data.todayWeek;
    const todayIdx = todayWeek ? weeks.indexOf(todayWeek) : -1;

    const pastBars = todayIdx >= 0 ? bars.slice(0, todayIdx + 1) : bars;
    const futureBars = todayIdx >= 0 ? bars.slice(todayIdx) : [];

    const solidPath = pastBars.length >= 2 ? linePath(balancePoints(pastBars)) : "";
    const dashedPath = futureBars.length >= 2 ? linePath(balancePoints(futureBars)) : "";
    const fullPath = pastBars.length < 2 && futureBars.length < 2 ? linePath(balancePoints(bars)) : "";

    const nowX = todayIdx >= 0 && todayWeek ? (xScale(todayWeek) ?? 0) + bw : -1;

    return { xScale, yScale, ticks, solidPath, dashedPath, fullPath, nowX, todayIdx };
  });

  const zeroY = () => scales().yScale(0);

  function clampPopover(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
    const popoverW = 240;
    const popoverH = 300;
    let x = clientX - rect.left + 12;
    let y = clientY - rect.top - 8;
    if (x + popoverW > rect.width) x = clientX - rect.left - popoverW - 12;
    if (y + popoverH > rect.height) y = rect.height - popoverH;
    if (y < 0) y = 0;
    return { x, y };
  }

  function handleEnter(bar: WeeklyChartBar, kind: WeeklySegmentKind, e: MouseEvent) {
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
    setHover({ kind, items, total_cents: total, week_start: bar.week_start, week_end: end, ...pos });
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
      <svg class="rc-cashflow" viewBox={`0 0 ${VB_W()} ${h()}`} preserveAspectRatio="xMidYMid meet">
        {/* Zero line */}
        <line x1={PAD.left} y1={zeroY()} x2={VB_W() - PAD.right} y2={zeroY()} class="rc-cashflow__axis" />

        {/* Y-axis line */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={h() - PAD.bottom} class="rc-cashflow__axis" />

        {/* Y-axis ticks */}
        <For each={scales().ticks}>
          {(tick) => {
            const y = () => scales().yScale(tick);
            return (
              <>
                <line x1={PAD.left - 4} y1={y()} x2={PAD.left} y2={y()} class="rc-cashflow__tick" />
                {tick !== 0 && (
                  <line x1={PAD.left} y1={y()} x2={VB_W() - PAD.right} y2={y()} class="rc-cashflow__grid" />
                )}
                <text x={PAD.left - 8} y={y()} text-anchor="end" dominant-baseline="middle" class="rc-cashflow__label-y">
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
              <rect
                x={ox()}
                y={PAD.top}
                width={obw()}
                height={h() - PAD.top - PAD.bottom}
                fill="transparent"
                onMouseEnter={() => setCoffersHover(bar.week_start)}
                onMouseMove={() => setCoffersHover(bar.week_start)}
                onMouseLeave={() => setCoffersHover(null)}
              />
            );
          }}
        </For>

        {/* Weekly bars */}
        <For each={props.data.bars}>
          {(bar) => {
            const x = () => scales().xScale(bar.week_start)!;
            const bw = () => scales().xScale.bandwidth();
            const zero = () => scales().yScale(0);

            const recurRevTop = () => scales().yScale(bar.recurring_revenue_cents);
            const recurRevH = () => zero() - recurRevTop();
            const projRevTop = () => scales().yScale(bar.revenue_cents);
            const projRevH = () => recurRevTop() - projRevTop();
            const recurExpBot = () => scales().yScale(-bar.recurring_expense_cents);
            const recurExpH = () => recurExpBot() - zero();
            const totalExpBot = () => scales().yScale(-(bar.recurring_expense_cents + bar.onetime_expense_cents));
            const onetimeExpH = () => totalExpBot() - recurExpBot();

            return (
              <>
                {bar.recurring_revenue_cents > 0 && (
                  <rect
                    x={x()}
                    y={recurRevTop()}
                    width={bw()}
                    height={recurRevH()}
                    class="rc-cashflow__bar rc-cashflow__bar--rev-recurring"
                    classList={{ "rc-cashflow__bar--projected": bar.isProjected }}
                    onMouseEnter={(e) => handleEnter(bar, "revenue", e)}
                    onMouseMove={handleMove}
                    onMouseLeave={handleLeave}
                  />
                )}
                {bar.project_revenue_cents > 0 && (
                  <rect
                    x={x()}
                    y={projRevTop()}
                    width={bw()}
                    height={projRevH()}
                    class="rc-cashflow__bar rc-cashflow__bar--rev-project"
                    classList={{ "rc-cashflow__bar--projected": bar.isProjected }}
                    onMouseEnter={(e) => handleEnter(bar, "revenue", e)}
                    onMouseMove={handleMove}
                    onMouseLeave={handleLeave}
                  />
                )}
                {bar.recurring_expense_cents > 0 && (
                  <rect
                    x={x()}
                    y={zero()}
                    width={bw()}
                    height={recurExpH()}
                    class="rc-cashflow__bar rc-cashflow__bar--exp-recurring"
                    classList={{ "rc-cashflow__bar--projected": bar.isProjected }}
                    onMouseEnter={(e) => handleEnter(bar, "exp-recurring", e)}
                    onMouseMove={handleMove}
                    onMouseLeave={handleLeave}
                  />
                )}
                {bar.onetime_expense_cents > 0 && (
                  <rect
                    x={x()}
                    y={recurExpBot()}
                    width={bw()}
                    height={onetimeExpH()}
                    class="rc-cashflow__bar rc-cashflow__bar--exp-onetime"
                    classList={{ "rc-cashflow__bar--projected": bar.isProjected }}
                    onMouseEnter={(e) => handleEnter(bar, "exp-onetime", e)}
                    onMouseMove={handleMove}
                    onMouseLeave={handleLeave}
                  />
                )}

                {/* X-axis label — only on month boundaries */}
                <Show when={bar.month_label}>
                  <text
                    x={x() + bw() / 2}
                    y={h() - PAD.bottom + 10}
                    text-anchor="end"
                    transform={`rotate(-45, ${x() + bw() / 2}, ${h() - PAD.bottom + 10})`}
                    class="rc-cashflow__label-x"
                  >
                    {bar.month_label}
                  </text>
                </Show>
              </>
            );
          }}
        </For>

        {/* Coffers (balance) line */}
        <Show when={scales().solidPath || scales().fullPath}>
          <path class="rc-cashflow__coffers" d={scales().solidPath || scales().fullPath} />
        </Show>
        <Show when={scales().dashedPath}>
          <path class="rc-cashflow__coffers rc-cashflow__coffers--dashed" d={scales().dashedPath} />
        </Show>

        {/* Now marker */}
        <Show when={scales().nowX > 0}>
          <line class="rc-cashflow__now" x1={scales().nowX} y1={PAD.top} x2={scales().nowX} y2={h() - PAD.bottom} />
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
                <circle cx={bx()} cy={by()} r={4} class="rc-cashflow__bankruptcy-marker" />
                <text class="rc-cashflow__bankruptcy" x={bx()} y={by() - 10} text-anchor="middle">
                  Bankruptcy {props.data.bankruptcyDate ?? week()}
                </text>
              </>
            );
          }}
        </Show>

        {/* Coffers indicator on hover (from bar hover or coffers overlay hover) */}
        {(() => {
          const activeWeek = () => hover()?.week_start ?? coffersHover();
          const bar = () => (activeWeek() ? props.data.bars.find((b) => b.week_start === activeWeek()) : undefined);
          const cx = () => {
            const w = activeWeek();
            if (!w) return 0;
            const { xScale } = scales();
            return (xScale(w) ?? 0) + xScale.bandwidth() / 2;
          };
          const cy = () => scales().yScale(bar()?.balance_cents ?? 0);
          return (
            <Show when={bar()}>
              <circle cx={cx()} cy={cy()} r={5} class="rc-cashflow__coffers-dot" />
              <text x={cx() + 8} y={cy() - 10} class="rc-cashflow__coffers-label" text-anchor="start">
                {formatDollars(bar()!.balance_cents)}
              </text>
            </Show>
          );
        })()}
      </svg>

      {/* Popover */}
      <Show when={hover()}>
        {(current) => (
          <div class="rc-cashflow__popover" style={{ left: `${current().x}px`, top: `${current().y}px` }}>
            <div class="rc-cashflow__popover-header">
              {formatWeekRange(current().week_start).label} — {WEEKLY_SEGMENT_LABELS[current().kind]}
            </div>
            <div class="rc-cashflow__popover-total">{formatDollarsLong(current().total_cents)}</div>
            <Show when={current().items.length > 0}>
              <ul class="rc-cashflow__popover-items">
                <For each={current().items}>
                  {(item) => (
                    <li class="rc-cashflow__popover-item">
                      <span class="rc-cashflow__popover-name">{item.name}</span>
                      <span class="rc-cashflow__popover-amount">{formatDollarsLong(item.amount_cents)}</span>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
};
