# Handoff — the Briefing "1 of 3" chart in the Cash Flow style

Status: **SUI side merged 2026-10-28** (PR #303, owner: "ship"). The
merge cuts **0.237.0**. Consumer: `thorcasting-ui`, the
Briefing page, `SectionWhereWeAre.tsx`. Delete this file once the "1 of 3"
chart renders in the Cash Flow style.

Written 2026-10-28. Answers `handoff-sui-balance-review-style.md` from the
thorcasting session. Option **B** was built (owner, 2026-10-28: "ok, B then
for now"): `BalanceReviewChart` keeps its drawing logic and takes the Cash
Flow look. Nothing moves and nothing is removed on the page: the combined
chart at the top, the "1 of 3" hindcast and the "2 of 3" forecast all stay.

## 1. What SUI changed (0.237.0)

- **`size="fill"` on `BalanceReviewChart`.** The chart measures the box it
  sits in and draws at that size, one SVG unit per px, so it fills a
  `ChartFrame` as `ActualForecastChart` does. Omit `size` and it keeps the
  old aspect-ratio behaviour. (`Chart` gained a `fill` prop underneath.)
- **Cash Flow defaults.** With no `colors` prop the balance runs in
  `--sui-cashflow-line-stroke` (the accent, blue), 2px; the frozen forecast
  runs in `--sui-text-muted`, dashed `6 4`; the floor runs in
  `--sui-cashflow-negative`, dashed `4 3`, 1px. These are the tokens
  `CashflowScrubChart.css` reads, so the three charts on the page match on
  every theme. A caller's `colors` still wins, so the chart stays white
  until the consumer drops that prop.
- The forecast line, the band, the variance strip, the marks, the bracket
  and the tooltip callback are unchanged. Every prop the section passes
  today still works.

## 2. What to do in `thorcasting-ui`

1. **Use the local link, not a release** (owner, 2026-10-28: "I don't want
   you to ship yet, this should all be locally linked"). On 2026-10-28 the
   SUI session ran `npm link @primestageprime/solid-ui-components` in
   `thorcasting-ui`, so `node_modules/@primestageprime/solid-ui-components`
   is a symlink to `/Users/aarnold/gits/primestage/solid-ui-components`,
   checked out on `feat/balance-review-cash-flow-style`. `package.json` and
   `package-lock.json` are untouched. `app.config.ts` sees the symlink and
   resolves SUI's `src`, so SUI edits reach the page on refresh with no SUI
   build. **Restart the dev server once** after the link, with the cache
   cleared: `rm -rf node_modules/.vinxi node_modules/.vite`, then the dev
   script. Do not `npm unlink` (it deletes the dependency line). The
   owner said "ship" on 2026-10-28, so 0.237.0 exists once the Publish run
   is green. Keep the link while you work. Move the pin to `^0.237.0` only
   when the owner says so, and only after `npm view
   @primestageprime/solid-ui-components version` prints `0.237.0`.
2. **Frame the chart.** In `SectionWhereWeAre.tsx`, replace the bare
   `<BalanceReviewChart .../>` with the same wrapper `BriefingCashChart.tsx`
   uses:

   ```tsx
   <Box style={{ height: "360px" }}>
     <ChartFrame title="Cash Flow" yTitle="Balance ($)">
       <BalanceReviewChart
         {...the props it has today}
         size="fill"
       />
     </ChartFrame>
   </Box>
   ```

   `ChartFrame` comes from `@primestageprime/solid-ui-components`. Pick the
   title the owner wants; "Cash Flow" matches the other two panels, and the
   section heading already says what the window is.
3. **Drop the `colors` prop** (`{ actual: INK, forecast: INK_2, floor: BAD }`)
   so the new defaults apply. Keep `labels`, `strip`, `tooltip`, `marks`,
   `endLabels`, `valueFormat`, `dateFormat` and `xDomain` as they are.
4. **Move the legend colours** to the same tokens, so the legend matches the
   lines: actual balance `var(--sui-cashflow-line-stroke, var(--sui-accent))`
   with `line: true`; forecast `var(--sui-text-muted)` with
   `line: { dash: "6 4" }`; cash floor `var(--sui-cashflow-negative)` with
   `line: { dash: "4 3" }`. The tooltip rows can take the same colours.
5. **Remove the `ForecastBandProp` shim** at the top of the file. 0.235.0
   and later export `forecastBand` on `BalanceReviewChartProps`.
6. **Look at it next to the other two panels**, then delete this file.

## 3. What stays different, on purpose

- The hindcast window is 90 days, the combined chart's is 90 days back plus
  the horizon. The two charts answer two questions.
- The "1 of 3" chart draws the saved forecast, the variance strip, the marks
  and the bracket when a snapshot exists. The combined chart does not. If
  the owner wants one chart with all of it, that is SUI's
  `docs/adr/0012-one-chart-api-before-one-chart-per-use.md`, not a prop.
- Grid ink, axis ink and the tooltip card still come from the `Chart`
  family's tokens, not `CashflowScrubChart`'s. If they read as different by
  eye, say so; that is a `Chart.css` token change in SUI.

## 4. Rules

- Commit by explicit path, one commit per logical step.
- Never `prettier --write` in thorcasting-ui.
- No push without the owner's go.
