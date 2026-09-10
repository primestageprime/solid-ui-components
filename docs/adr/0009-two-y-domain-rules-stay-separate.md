# Two y-domain rules stay separate — read them side by side

`CashflowScrubChart` and `ScrubChart` each resolve a y-domain, by different
rules. A reader who meets one rule and then the other reads them as a
contradiction, and files a bug. They are not a contradiction. This ADR puts
both orders on one page, so nobody compares two documents again.

Line numbers below were checked on `main` at `223ef9d`.

## The two rules do not both run

`CashflowScrubChart` computes `chartYDomain` and feeds it to `ScrubChart`'s
`yDomain` prop (`CashflowScrubChart.tsx:1011`). `yDomain` is the **fallback**.
When `yFitDomain` returns an extent, `ScrubChart` builds the scale from the
FITTED domain and the prop never reaches the axis
(`yAxis.ts:104` — `buildScale(fitted ?? options.staticDomain(), fitted != null)`).

So on any one render exactly one rule decides the domain:

| Condition | Rule that decides |
|---|---|
| `yFitDomain` absent, or it returns `null` | the Cashflow rule, via the `yDomain` prop |
| `yFitDomain` returns an extent | the ScrubChart fit rule; `yMin` / `yMax` / `yPadFraction` do nothing |

`CashflowScrubChart.test.tsx:2026` holds that precedence: a chart with
`yMin={0} yMax={1_000_000}` and `yFitDomain={() => [0, 100_000]}` draws
`[0, 100_000]`.

## The Cashflow order

`CashflowScrubChart/helpers.ts:124-167`. Three modes, and `yMax` alone picks
the mode (`chartYDomainMode`).

1. **`yMax` set → `"fixed"`.** `yPadFraction` is ignored. The domain is
   `[yMin ?? min(0, ...values), yMax]`.
2. **`yMax` unset, `yPadFraction` set, values present → `"tight"`.** `yMin`
   AND the zero floor are both ignored. `pad = (hi - lo || |hi| || 1) *
   yPadFraction`, applied to each end.
3. **Otherwise → `"auto"`.** `[yMin ?? min(0, ...values), max(0, ...values)]`.

There is no `nice()` snap in this rule. `ScrubChart` snaps the static domain
later, when it builds the scale (`yAxis.ts:99` — `fitted ? built :
built.nice()`).

## The ScrubChart order

`ScrubChart/yScaleMode.ts`, wired at `ScrubChart.tsx:257-279`.

0. No callback, or the callback returns `null` → fall back to the `yDomain`
   prop, which the scale then `nice()`s (`yAxis.ts:99`, `:104`, `:109`).
1. The mode picks the cell range to measure — `fitCellRange`
   (`yScaleMode.ts:66-71`). `"visible"` answers the axis viewport, `"series"`
   answers all cells.
2. Both pins set → return them verbatim (`:138-139`).
3. Order the extent low end first (`:141`).
4. Pad each FREE end by `yFitMargin ?? 0.08`; a flat extent takes an absolute
   `FLAT_EXTENT_SPAN` of 1 instead (`:145-149`).
5. `nice(tickCount)` snap (`:150`).
6. Overwrite each pinned end with its exact value, LAST (`:151-154`).
7. `withHeight` gives a flat or inverted result a height (`:91-101`).
8. `widenToYFitBounds` widens — never narrows — to the mode's bounds
   (`:203`).

## The eight differences

The first four are user-visible on the plot.

### a. Zero floor — USER-VISIBLE

Cashflow forces `0` into the extent in `"fixed"` and `"auto"`, so the
zero-line stays on the plot. ScrubChart never does. Ask for it with
`yFitBounds: { series: { min: 0 } }` or a `yFitPin`.

### b. Flat series — USER-VISIBLE

Cashflow pads PROPORTIONALLY: `[400, 400]` at `yPadFraction: 0.1` gives
`[360, 440]`, and `[0, 0]` gives `[-0.1, 0.1]`. ScrubChart pads by an
ABSOLUTE `FLAT_EXTENT_SPAN` of 1 (`yScaleMode.ts:55`, `:145`), so `[400, 400]`
gives `[399, 401]` whatever the margin.

### c. Explicit bounds — USER-VISIBLE

Cashflow's `yMin` / `yMax` REPLACE an end, and `yMin` is dropped entirely in
`"tight"`. ScrubChart splits the two jobs: a **pin** overrides an end, a
**bound** widens to include one, and it drops neither.

### d. Snap — USER-VISIBLE

ScrubChart `nice()`s the fitted domain inside `fitYDomain`. `chartYDomain`
never snaps.

### e. Padding default

Cashflow adds no padding unless the caller sets `yPadFraction`. ScrubChart
always pads free ends, by `DEFAULT_Y_FIT_MARGIN` = `0.08`.

### f. Inverted input

ScrubChart reorders the extent (`ordered`, `yScaleMode.ts:83`). Cashflow
returns `yMin > yMax` inverted, because the caller stated it.

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

Merging the rules would shift all four user-visible behaviours above on a
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

`extentOf` (`CashflowScrubChart/helpers.ts:136`) has **no unit test**. Its
callers cover it indirectly.
