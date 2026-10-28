# Handoff — the briefing's combined cash chart (`ActualForecastChart`)

Status: **SUI side done on 2026-10-27**, on `feat/actual-forecast-chart`.
Consumer: `thorcasting-ui`, the Briefing page. Delete this file once the
briefing renders the combined chart.

Written 2026-10-27 from the `workshop:cash-hindcast-chart` bench.

---

## 1. What to build

The Briefing page today shows two charts: step 1 "Where are we, and how did we
get here?" draws the last 90 days as a white line (`BalanceReviewChart`), and
step 2 "Where are we headed?" draws the 12-month forecast in the Cash Flow
panel (`AppChart`). Replace the pair with ONE Cash Flow panel that holds both:
"now" in the middle as a labelled Today rule, the actual balance solid to its
left, the forecast baseline DASHED to its right with its range cone. Steps 1
and 2 merge into one section; the step count drops from 3 to 2.

Peter approved treatment C on 2026-10-27: dashed forecast, cone only after
today. Look at the bench first: `npm run dev` in SUI, then
`workshop:cash-hindcast-chart` (port 6006). The showcase
`actual-forecast-chart` shows the same chart curried with thorcasting's words.

## 2. The SUI components per region

| Region | Component | Props it needs | First in |
|---|---|---|---|
| The panel | `ChartFrame` (or `FillChartFrame`, as `AppChart` picks today) | `title="Cash Flow"`, `yTitle="Balance ($)"`, the axis props from `frameAxisProps(ax)` | existing |
| The chart | `ActualForecastChart`, curried once | `cells`, `anchorIndex`, `range`, `openingBalanceCents`, `floorCents`, `today`, `renderHoverTooltip`, `yMin` / `yMax` / `yAxisMode` / `onYAxisModeChange` / `onYRangeChange` | the release after 0.234.0 |

Curry once, in the chart module, not at the call site:

```ts
import { createActualForecastChart } from "@primestageprime/solid-ui-components";

export const BriefingCashChart = createActualForecastChart({
  labels: {
    forecast: REFERENCE_LABEL,            // "Baseline"
    openingBalance: CURRENT_BALANCE_LABEL, // "Starting balance"
    floor: CASH_FLOOR_LABEL,              // "Cash floor"
    actual: ACTUAL_LABEL,
  },
});
```

The chart hides `CashflowScrubChart`'s own primary line and draws two overlay
series for the halves, so the hover crosshair, the gutter label ladder, the
gridlines and the y-axis modes are the chart's own. `chartHeight` defaults to
`"fill"` for a frame.

## 3. The model

Pure and package-internal, in SUI: `actualForecastSeries` and `anchorMarker`
(`src/components/ActualForecastChart/series.ts`, tests beside it). The rules:

- `cells` is ONE run of days. Cells `0..anchorIndex` are actuals. Cells after
  `anchorIndex` are the forecast.
- The actual half returns `null` after the anchor; the forecast half returns
  `null` before it. Both include the anchor cell, so the lines meet at the dot.
- `range` is read from the anchor on. `null` at the anchor is the balance
  itself, so the cone narrows to the dot. `null` after it breaks the cone
  there.
- `today` defaults to the anchor cell's start. Pass it only when the axis
  must mark another day.
- The flat rules exist only when their cents are stated.
- Paint order: rules, cone, then the two halves on top (`layer: "over"`).

Nothing of this needs porting. The consumer builds `cells` and `range`.

## 4. The mapping onto thorcasting's data

Read `~/components/AppChart.tsx` and `~/stores/importHindcastStore.ts` first.
Both halves already exist as separate windows; the work is to join them.

| Chart concept | Thorcasting record | Where it is today |
|---|---|---|
| Actual cells (`0..anchorIndex`) | `ImportHindcast.points`, one `ProjectionPoint` per day of the look-back window, through `pointsToDailyCells` | `importHindcastStore` (`actualPoints`, `hindcastWindowOf`); today only `/import` reads it |
| Anchor | today, the day the briefing's `figures as of today` names; the Import hindcast's `window.anchor` is the same fact | `~/lib/today` (`todayUtcIso`) |
| Forecast cells (after the anchor) | `visibleWindow(parsePoints(resultByScenario()[baselineScenarioId()]), windowStart(), horizonDays())` | `~/components/appChart/window.ts` |
| `range` | the baseline's range lo / hi, as `balanceSeries.ts` builds `range-lo` / `range-hi` today | `~/lib/appChartModel/balanceSeries.ts` |
| `openingBalanceCents` | the starting position's cash balance (`CURRENT_BALANCE` rule) | `~/lib/currentBalanceRule.ts` |
| `floorCents` | the company's cash floor | `~/lib/cashFloorZone.ts`, `useCashFloor()` |
| The y domain | `useYFit` / `framedAxis`, as today | `~/components/appChart/yFit.ts` |

Precedent to copy: `AppChart` with `baselineOnly` and `hindcast` set, as
`/import` mounts it. The combined chart is **baseline only**: it draws no
scenario comparison line, so the dash keeps one meaning on every chart that
shows actuals (see §5). The simplest shape is a new `AppChart` mode, or a
sibling component beside it, that concatenates the hindcast cells and the
forward cells into one run and passes `anchorIndex = hindcastCells.length - 1`.

## 5. Assumptions

- *Ruled by Peter, 2026-10-27*: treatment C. "Dashed means forecast." The
  cone exists only after today.
- *Ruled by Adlai, 2026-10-27*: no conflict with the scenario dash today,
  because "scenarios don't show anywhere where we do hindcast atm". The
  briefing's combined chart is therefore `baselineOnly`. If a scenario
  overlay ever lands on it, re-settle the dash first (SUI's `BalanceReviewChart`
  also draws its forecast dashed).
- *Assumed here*: a 90-day look-back, the same as the current step 1, and the
  briefing's 12-month horizon ahead. The bench's toggle shows both 90 and 365
  days forward. With 365 days, today sits a fifth of the way across and the
  past flattens along the floor on the linear axis; Peter has seen this on
  the mockup and did not object.
- *Assumed here*: one linear y-axis. The past ($5k–$10k) is a flat line under
  a $700k forecast. A log axis was offered on the mockup and not chosen.
- *Assumed here*: the hindcast store's lazy memo (it reads the import dataset
  and the cash balance) is safe to read from the briefing page. Check the
  note at the top of `importHindcastStore.ts` before you mount it there.

## 6. What stays in the consumer

- The words: `REFERENCE_LABEL`, `ACTUAL_LABEL`, `CURRENT_BALANCE_LABEL`,
  `CASH_FLOOR_LABEL`, and the curry above.
- The frame choice (`ChartFrame` vs `FillChartFrame`), the axis strategy
  (`frameAxisProps`, `AxisLockDialog`) and the y-fit, as in `AppChart`.
- The hover tooltip body (`renderHoverTooltip`), which says "Actual" at and
  before the anchor and "Baseline" after it.
- The stores that build the two halves and the range.
- The briefing copy: one sentence that joins today's step 1 and step 2
  sentences.

## 7. Known gaps

- The "Actual" caption asks for the plot body, but the label ladder has no
  LEFT gutter zone, so it lands in the right gutter at the actual line's
  height, beside the floor caption. It reads, but it is far from its line.
  Leave it; a left zone is a change to `Chart/labelPlacement`, not to the
  consumer.
- `ActualForecastChart` forwards `yMin`, `yMax`, `yAxisMode`,
  `onYAxisModeChange`, `onYRangeChange` and `yAxisWidth` only. If the
  briefing needs `yFitDomain` or the expand chrome, ask SUI to forward them;
  do not wrap `CashflowScrubChart` yourself.
