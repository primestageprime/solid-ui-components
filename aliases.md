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
| scrolling content area | `ScrollFillBox` | fills remaining space and scrolls internally |
| vertical form/report stack | `NarrowStack` | narrow max-width; use `Stack` only if a wide variant is ever needed — check it's not phantom first |
| header row with trailing badge | `TightSpreadRow` | space-between, tight gap |
| app/page header, name left + toggle/action right | `FillBaselineSpreadRow` | space-between, fills container width (plain `BaselineSpreadRow` doesn't span its parent — `fill` is a locked override, only baked variants get it) |
| processing queue / triage queue / work-through-one-at-a-time list | `BucketQueue` | 2+ named buckets (e.g. Unprocessed/Processed), flat `items` + `bucketOf`; `onSelect` auto-advances to the next item when the selected one's bucket changes ("TRIAGE ADVANCE") — matches "hit Next, move to the next unprocessed item" without hand-rolling selection. Initially missed searching only "list"/"selector"; found searching the interaction-model words ("queue", "triage") instead of the section noun. |
| two fields "fight for space" at a ratio, rest fixed/justify-end | `ProportionalStack direction="row"` + `ProportionalItem weight={1\|2\|...}` (`weight={0}` for the fixed ones) | `flex: <weight> 1 0px` is a genuine proportional GROW, not just shrink-on-overflow despite the module comment's framing — verified against the CSS (`flex-basis:0`) before using. Add `maxWidthCh` to cap a growing item's width in `ch` units (e.g. a name field that stops competing for space past 40 characters, handing the rest to a sibling). |
