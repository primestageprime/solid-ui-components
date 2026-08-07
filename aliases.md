# SUI aliases index

**SUI version:** 0.136.0 (published). Built alongside `state-shape.md` from the
`goose-ui` `/reports` slice, during the jtf-rth reports-section gap analysis
(2026-08-04).

| Designer says | Component | Note |
|---|---|---|
| master-detail | `PaneRow` + `SidebarPanel` + `FillColumn` | sidebar list, growing detail column |
| split pane | `PaneRow` | same primitive as master-detail |
| report picker / nav sidebar | `SidebarPanel` + `NavLink` (`For`-looped) | list of `NavLink`s inside a `SidebarPanel` |
| data table / BI grid | `createBaseTable` | curry once with `{fit, compact, stickyHeader, hoverable}`, not `Table` (not exported) |
| status pill / readiness badge | `createStatusBadge` | curry a sized variant (`{size}`); base `StatusBadge` is phantom |
| detail card / content panel | `createPanel` | curry `{size, fill}`; base `Panel` is phantom |
| bar + line combo chart | `Chart` + `BarSeries` + `LineSeries` | composable primitives, not one chart-type component |
| chart hover tooltip | `ChartTooltip` | distinct from the generic `Tooltip` used on non-chart elements |
| pace / target line on a chart | `ReferenceLine` | |
| candlestick / OHLC chart, "spread or volatility per period" | `CandlestickScrubChart` | Pass RAW `samples: {at, value}[]` at your finest grain + `granularity` (`"day"｜"month"`); it buckets and reduces the OHLC itself — do NOT pre-aggregate. **False friend: `CandlestickRenderer` is NOT this.** That one is an atomic single-candle TEXT/box readout for one OHLC value, not a glyph plotted on a time axis; a name search lands on it first and it will not plot a series. Also note this is a DISPERSION chart (each candle = the distribution of that period's finer-grained values), so consecutive candles don't connect — a candle over a CUMULATIVE line is degenerate (2 sample points ⇒ zero wicks ⇒ a waterfall bar), which is why "candlestick instead of the cumulative nav line" is never a like-for-like swap. |
| scrolling content area | `ScrollFillBox` | fills remaining space and scrolls internally |
| vertical form/report stack | `NarrowStack` | narrow max-width; use `Stack` only if a wide variant is ever needed — check it's not phantom first |
| header row with trailing badge | `TightSpreadRow` | space-between, tight gap |
| app/page header, name left + toggle/action right | `FillBaselineSpreadRow` | space-between, fills container width (plain `BaselineSpreadRow` doesn't span its parent — `fill` is a locked override, only baked variants get it) |
| processing queue / triage queue / work-through-one-at-a-time list | `BucketQueue` | 2+ named buckets (e.g. Unprocessed/Processed), flat `items` + `bucketOf`; `onSelect` auto-advances to the next item when the selected one's bucket changes ("TRIAGE ADVANCE") — matches "hit Next, move to the next unprocessed item" without hand-rolling selection. Initially missed searching only "list"/"selector"; found searching the interaction-model words ("queue", "triage") instead of the section noun. |
| two fields "fight for space" at a ratio, rest fixed/justify-end | `ProportionalStack direction="row"` + `ProportionalItem weight={1\|2\|...}` (`weight={0}` for the fixed ones) | `flex: <weight> 1 0px` is a genuine proportional GROW, not just shrink-on-overflow despite the module comment's framing — verified against the CSS (`flex-basis:0`) before using. Add `maxWidthCh` to cap a growing item's width in `ch` units (e.g. a name field that stops competing for space past 40 characters, handing the rest to a sibling). |
| text input that submits on Enter (e.g. a "new tag" / quick-add form) | `ThemedInput` with `onSubmit` | Fires `(value: string) => void` on Enter, composed with any caller `onKeyDown` (function or Solid's `[handler,data]` tuple form) rather than replacing it — same idiom `EditableTitle` already bakes in internally for its own commit-on-Enter. Don't hand-wire a call-site `onKeyDown` for this; it existed as a gap once, now doesn't. |
| image / photo / thumbnail display | `FramedImage` (curried: `SmallSquareThumbnail`/`MediumSquareThumbnail` for a cropped square, `ContainedPhoto` for a full letterboxed detail view) | There is no "image component" and there was never meant to be one — a plain `<img>` IS the correct content, framed by component-owned CSS (`overflow:hidden` + `object-fit`), same pattern `MediaCard` already used internally for its own thumbnail slot before this extracted it into a standalone primitive. Don't conclude "SUI needs an image component" from a name search turning up nothing; check whether an existing composite (here, `MediaCard`) already solved the FRAMING problem internally first. |
| icon-only button that ALSO needs a hotkey (no room for a visible text label) | `HotkeyButton` with `iconOnly` | `variant="icon-only"` sizing, `children` becomes the accessible name AND the auto-built Tooltip content ("{children} ({HOTKEY})") instead of an inline label — so it always tells you both what it does and how to trigger it. Don't reach for a bare `IconOnlyButton` + hand-wired keydown listener for this; that duplicates HotkeyButton's own guard logic (isEditableTarget, modifier check, armed) badly. |
