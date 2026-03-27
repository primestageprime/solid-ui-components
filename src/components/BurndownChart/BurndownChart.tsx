// ============================================
// BurndownChart — Atomic (Depth 1)
// Owns CSS (BurndownChart.css), no component imports.
// SVG bar chart: planned vs actual, above/below zero axis,
// with trendline projection and clickable segments.
// ============================================
import { Component, splitProps, For, Show, createMemo } from "solid-js";
import "./BurndownChart.css";

export interface BurndownBar {
  label: string;
  planned_complete: number;
  planned_incomplete: number;
  unplanned_complete: number;
  unplanned_incomplete: number;
}

export type BurndownSegmentKind =
  | "planned_complete"
  | "planned_incomplete"
  | "unplanned_complete"
  | "unplanned_incomplete";

export interface BurndownChartProps {
  bars: BurndownBar[];
  onSegmentClick?: (barIndex: number, segment: BurndownSegmentKind) => void;
  height?: number;
}

const PAD = { top: 28, right: 24, bottom: 32, left: 44 };
const COL_MIN = 64;

export const BurndownChart: Component<BurndownChartProps> = (props) => {
  const [local] = splitProps(props, ["bars", "onSegmentClick", "height"]);

  const h = () => local.height ?? 300;
  const w = () => Math.max(400, local.bars.length * COL_MIN + PAD.left + PAD.right);

  const chartL = PAD.left;
  const chartR = () => w() - PAD.right;
  const chartT = PAD.top;
  const chartB = () => h() - PAD.bottom;
  const chartW = () => chartR() - chartL;
  const chartH = () => chartB() - chartT;

  const maxAbove = createMemo(() =>
    Math.max(1, ...local.bars.map((b) => b.planned_complete + b.planned_incomplete))
  );
  const maxBelow = createMemo(() =>
    Math.max(0, ...local.bars.map((b) => b.unplanned_complete + b.unplanned_incomplete))
  );
  const totalRange = createMemo(() => maxAbove() + Math.max(maxBelow(), maxAbove() * 0.25));
  const unitH = createMemo(() => chartH() / totalRange());
  const zeroY = createMemo(() => chartT + maxAbove() * unitH());

  const colW = createMemo(() => chartW() / Math.max(1, local.bars.length));
  const barW = createMemo(() => colW() * 0.65);
  const barX = (i: number) => chartL + i * colW() + (colW() - barW()) / 2;
  const barCX = (i: number) => chartL + i * colW() + colW() / 2;

  // Y-axis tick marks — show every 5th value (5, 10, 15, ...) to avoid clutter
  const yTicks = createMemo(() => {
    const max = maxAbove();
    const step = max <= 10 ? 1 : 5;
    const ticks: number[] = [];
    for (let v = step; v <= max; v += step) ticks.push(v);
    return ticks;
  });

  // Trendline: tracks planned_incomplete from first to latest bar
  const trend = createMemo(() => {
    const bars = local.bars;
    if (bars.length < 2) return null;
    const first = bars[0].planned_incomplete;
    const last = bars[bars.length - 1].planned_incomplete;
    const n = bars.length;

    const x1 = barCX(0);
    const y1 = zeroY() - first * unitH();
    const x2 = barCX(n - 1);
    const y2 = zeroY() - last * unitH();

    let daysRemaining: number | null = null;
    let xEnd = x2;
    let yEnd = y2;

    if (last > 0 && first > last) {
      const rate = (first - last) / (n - 1);
      const extra = last / rate;
      daysRemaining = Math.ceil(extra);
      xEnd = x2 + extra * colW();
      yEnd = zeroY();
    }

    return { x1, y1, x2, y2, xEnd, yEnd, daysRemaining };
  });

  const click = (i: number, seg: BurndownSegmentKind) => local.onSegmentClick?.(i, seg);

  return (
    <svg class="sui-burndown" viewBox={`0 0 ${w()} ${h()}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", "max-height": "100%" }}>
      {/* Axes */}
      <line x1={chartL} y1={zeroY()} x2={chartR()} y2={zeroY()} class="sui-burndown__axis" />
      <line x1={chartL} y1={chartT} x2={chartL} y2={chartB()} class="sui-burndown__axis" />

      {/* Y-axis ticks */}
      <For each={yTicks()}>
        {(v) => (
          <>
            <line
              x1={chartL - 4} y1={zeroY() - v * unitH()}
              x2={chartL} y2={zeroY() - v * unitH()}
              class="sui-burndown__tick"
            />
            <text
              x={chartL - 8} y={zeroY() - v * unitH()}
              class="sui-burndown__label-y" text-anchor="end" dominant-baseline="middle"
            >{v}</text>
          </>
        )}
      </For>

      {/* Bars */}
      <For each={local.bars}>
        {(bar, i) => {
          const x = () => barX(i());

          // Above axis: grey (incomplete) on bottom, green (complete) on top
          const greyH = () => bar.planned_incomplete * unitH();
          const greenH = () => bar.planned_complete * unitH();
          const greyY = () => zeroY() - greyH();
          const greenY = () => greyY() - greenH();

          // Below axis: orange (unplanned complete) near zero, red (unplanned incomplete) below
          const orangeH = () => bar.unplanned_complete * unitH();
          const redH = () => bar.unplanned_incomplete * unitH();
          const orangeY = () => zeroY();
          const redY = () => zeroY() + orangeH();

          return (
            <>
              <Show when={bar.planned_incomplete > 0}>
                <rect
                  x={x()} y={greyY()} width={barW()} height={greyH()}
                  class="sui-burndown__seg sui-burndown__seg--pi"
                  onClick={() => click(i(), "planned_incomplete")}
                />
              </Show>
              <Show when={bar.planned_complete > 0}>
                <rect
                  x={x()} y={greenY()} width={barW()} height={greenH()}
                  class="sui-burndown__seg sui-burndown__seg--pc"
                  onClick={() => click(i(), "planned_complete")}
                />
              </Show>
              <Show when={bar.unplanned_complete > 0}>
                <rect
                  x={x()} y={orangeY()} width={barW()} height={orangeH()}
                  class="sui-burndown__seg sui-burndown__seg--uc"
                  onClick={() => click(i(), "unplanned_complete")}
                />
              </Show>
              <Show when={bar.unplanned_incomplete > 0}>
                <rect
                  x={x()} y={redY()} width={barW()} height={redH()}
                  class="sui-burndown__seg sui-burndown__seg--ui"
                  onClick={() => click(i(), "unplanned_incomplete")}
                />
              </Show>

              {/* Day label */}
              <text
                x={barCX(i())} y={chartB() + 18}
                class="sui-burndown__label-x" text-anchor="middle"
              >{bar.label}</text>
            </>
          );
        }}
      </For>

      {/* Trendline */}
      <Show when={trend()}>
        {(t) => (
          <>
            <line
              x1={t().x1} y1={t().y1} x2={t().x2} y2={t().y2}
              class="sui-burndown__trend"
            />
            <Show when={t().daysRemaining !== null}>
              <line
                x1={t().x2} y1={t().y2} x2={t().xEnd} y2={t().yEnd}
                class="sui-burndown__trend sui-burndown__trend--proj"
              />
              <text
                x={t().xEnd + 6} y={t().yEnd}
                class="sui-burndown__annotation" dominant-baseline="middle"
              >+{t().daysRemaining}d</text>
            </Show>
          </>
        )}
      </Show>
    </svg>
  );
};
