# Two y-domain rules stay separate — read them side by side

`CashflowScrubChart` and `ScrubChart` each resolve a y-domain, by different
rules. A reader who meets one rule and then the other reads them as a
contradiction, and files a bug. They are not a contradiction. This ADR puts
both orders on one page, so nobody compares two documents again.

Line numbers below were checked at this ADR's own commit, NOT at `223ef9d`.
The pointers this ADR added to the code shifted several of them.

## The two rules do not both run

`CashflowScrubChart` computes `chartYDomain` and feeds it to `ScrubChart`'s
`yDomain` prop (`CashflowScrubChart.tsx:1011`). `yDomain` is the **fallback**.
When `yFitDomain` returns an extent, `ScrubChart` builds the scale from the
FITTED domain and the prop never reaches the axis
(`yAxis.ts:108` — `buildScale(fitted ?? options.staticDomain(), fitted != null)`).

So on any one render exactly one rule decides the domain:

| Condition | Rule that decides |
|---|---|
| `yFitDomain` absent, or it returns `null` | the Cashflow rule, via the `yDomain` prop |
| `yFitDomain` returns an extent | the ScrubChart fit rule; `yMin` / `yMax` / `yPadFraction` do nothing |

`CashflowScrubChart.test.tsx:2026` holds that precedence: a chart with
`yMin={0} yMax={1_000_000}` and `yFitDomain={() => [0, 100_000]}` draws
`[0, 100_000]`.

## The Cashflow order

`CashflowScrubChart/helpers.ts:182-224` (`chartYDomain`). Three modes, and
`yMax` alone picks the mode (`chartYDomainMode`, `:146`).

1. **`yMax` set → `"fixed"`.** `yPadFraction` is ignored. The domain is
   `[yMin ?? min(0, ...values), yMax]`.
2. **`yMax` unset, `yPadFraction` set, values present → `"tight"`.** `yMin`
   AND the zero floor are both ignored. `pad = (hi - lo || |hi| || 1) *
   yPadFraction`, applied to each end.
3. **Otherwise → `"auto"`.** `[yMin ?? min(0, ...values), max(0, ...values)]`.

There is no `nice()` snap in this rule. `ScrubChart` snaps the static domain
later, when it builds the scale (`yAxis.ts:103` — `fitted ? built :
built.nice()`).

## The ScrubChart order

`ScrubChart/yScaleMode.ts`, wired at `ScrubChart.tsx:257-279`.

0. No callback, or the callback returns `null` → fall back to the `yDomain`
   prop, which the scale then `nice()`s (`yAxis.ts:103`, `:108`).
1. The mode picks the cell range to measure — `fitCellRange`
   (`yScaleMode.ts:66`). `"visible"` answers the axis viewport, `"series"`
   answers all cells.
2. Both pins set → return them verbatim (`fitYDomain` at `:136`).
3. Order the extent low end first (`ordered`, `:83`).
4. Pad each FREE end by `yFitMargin ?? 0.08`; a flat extent takes an absolute
   `FLAT_EXTENT_SPAN` of 1 per end instead (`:55`).
5. `nice(tickCount)` snap (`:156`).
6. Overwrite each pinned end with its exact value, LAST.
7. `withHeight` gives a flat or inverted result a height (`:91`).
8. `widenToYFitBounds` widens — never narrows — to the mode's bounds
   (`:199`).

## The eight differences

Six of the eight are user-visible on the plot: a, b, c, d, e and f. Only g
(empty data) and h (mode-awareness) are invisible to a reader of the rendered
chart.

### a. Zero floor — USER-VISIBLE

Cashflow forces `0` into the extent in `"fixed"` and `"auto"`, so the
zero-line stays on the plot. ScrubChart never does. Ask for it with
`yFitBounds: { series: { min: 0 } }` or a `yFitPin`.

### b. Flat series — USER-VISIBLE

Cashflow pads PROPORTIONALLY: `[400, 400]` at `yPadFraction: 0.1` gives
`[360, 440]`, and `[0, 0]` gives `[-0.1, 0.1]`. ScrubChart pads by an
ABSOLUTE `FLAT_EXTENT_SPAN` of 1 PER FREE END (`yScaleMode.ts:55`), so
`[400, 400]` gives `[399, 401]` — a span of 2 — whatever the margin.

### c. Explicit bounds — USER-VISIBLE

Cashflow's `yMin` / `yMax` REPLACE an end, and `yMin` is dropped entirely in
`"tight"`. ScrubChart splits the two jobs: a **pin** overrides an end, a
**bound** widens to include one, and it drops neither.

### d. Snap TICK COUNT — USER-VISIBLE

Both domains end up snapped, so this is not "snap versus no snap". Read
`buildScale` in `yAxis.ts`: `return fitted ? built : built.nice()`. The fitted
domain arrives pre-snapped from `fitYDomain`, which calls
`.nice(tickCount)` with `tickCount` = `DEFAULT_Y_TICK_COUNT` = `5`
(`ScrubChart/helpers.ts:42`). The static Cashflow domain is snapped HERE
instead, by a bare `.nice()`, which uses d3's own default of about 10.

So the same data can land on different bounds through the two paths, because
the two `nice()` calls are asked for different tick counts — not because one
path skips the snap. `chartYDomain` itself never snaps; the snap happens to
its output downstream.

### e. Padding default — USER-VISIBLE

Cashflow adds no padding unless the caller sets `yPadFraction`. ScrubChart
always pads free ends, by `DEFAULT_Y_FIT_MARGIN` = `0.08`. The drawn extent
therefore differs on identical data, which a reader sees as headroom above the
series.

### f. Inverted input — USER-VISIBLE

ScrubChart reorders the extent (`ordered`, `yScaleMode.ts:83`). Cashflow
returns `yMin > yMax` inverted, because the caller stated it — and an inverted
domain flips the axis.

### g. Empty data

Cashflow returns `[yMin ?? 0, yMax ?? 1]` (`CashflowScrubChart.tsx:262`).
ScrubChart's callback returns `null` and the fallback runs.

### h. Mode-awareness

ScrubChart has `"visible"` / `"series"` modes, with a pin and a bound per
mode. Cashflow has no mode concept of this kind — its three `YDomainMode`
values name which row of the table ran, not which cells it measured.

## What the two genuinely share

Both take a data extent, pad the free ends by a fraction, apply
"explicit ?? derived" as the last step, and guarantee a flat series some
height. The shapes rhyme; the numbers do not.

## Why they are not merged

Merging the rules would shift all six user-visible behaviours above on a
chart that already ships. The complaint the merge answers is that a reader has
to compare two documents. This document is the answer, at no behavioural risk.

Revisit the merge only if a caller needs one component to draw exactly what
the other draws.

## Existing coverage

| File | Covers |
|---|---|
| `src/components/CashflowScrubChart/yDomain.test.ts:12-73` | 9 cases over `chartYDomain` and `chartYDomainMode` |
| `src/components/ScrubChart/yScaleMode.test.ts:10-239` | 25 cases over `fitCellRange`, `fitYDomain`, `widenToYFitBounds` |
| `src/components/CashflowScrubChart/CashflowScrubChart.test.tsx:2026` | the fit-over-`yMin`/`yMax` precedence |

`extentOf` (`CashflowScrubChart/helpers.ts:158`) has **no unit test**. Its
callers cover it indirectly.
