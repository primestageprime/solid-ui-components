# SUI false-friends index

**SUI version:** 0.136.0 (published, `npm.pkg.github.com`, verified against the downloaded tarball — NOT the local repo checkout, which was at 0.127.0)
**Built:** 2026-08-04, from `dist/index.js`'s static `export { ... }` block
diffed against `dist/index.d.ts` via `sui-index`'s
`scripts/diff-declared-vs-runtime.sh`. Declared: 588. Runtime: 729. (Initial
pass used the local repo checkout at 0.127.0, declared 584/runtime 726 —
re-verified against the actual published 0.136.0 tarball before any code was
written against this index; phantom-export list unchanged between versions.)

## Type-only (declared in `.d.ts`, absent at runtime)

Importing any of these type-checks (`tsc --noEmit` exits 0) and builds
(`npm run build` exits 0) — the route white-screens at runtime with
`does not provide an export named '<Name>'`. **Never import these.**

| Name | Reads as | Actually is |
|---|---|---|
| `Button`, `Surface`, `StatusLight`, `Box`, `Panel`, `List`, `Row`, `Stack`, `Text`, `Section`, `CellBox` | generic primitives | type-only; no runtime binding |
| `ActionRow`, `AlertBox`, `AssigneeChips`, `CalendarGrid`, `CalendarHeader`, `ColHeading`, `DailyDateAxis`, `DoingCard`, `DoneCard`, `LozengeCell`, `MessageBubble`, `NotificationRow`, `ParticipantAvatar`, `PivotPills`, `PivotTreemap`, `PlaceholderCard`, `PresetButtons`, `ScrubChartAxes`, `StatusBadge`, `StatusFlowChart`, `SummaryCard`, `SwimlaneAnimatedLane`, `SwimlaneBottomBadges`, `SwimlaneBoundaryBadges`, `SwimlaneLeavingNodes`, `SwimlaneNodes`, `ThreadGroup`, `TimeInputs`, `Toast`, `TodoCard`, `CashflowBars`, `CashflowPopover`, `ChartCanvas`, `ChartContext`, `AnimatedSwimlaneChartBase` | domain-specific components | type-only; no runtime binding |
| `ACTION_ICONS`, `ANIMATED_SWIMLANE_DEFAULTS`, `BUCKETS`, `CADENCE_LADDER`, `DAY_MS`, `DEFAULT_BREAKPOINTS`, `DEFAULT_COLUMNS`, `DEFAULT_SIZE`, `DEFAULT_TIMING_PRESET`, `FIVE_IN_A`, `GEO`, `MIXED`, `MONTH_NAMES`, `PAD`, `SELECTABLE`, `STATUS_TO_COL`, `WEEKLY_SEGMENT_LABELS` | constants/config exports | type-only; no runtime binding |

Full list regenerated any time via:
```bash
cd solid-ui-components && bash /Users/peter/.claude/skills/sui-index/scripts/diff-declared-vs-runtime.sh .
```

## Semantic false-friends (exist and work, mean something else)

Populated as the gap analysis for jtf-rth (and future consumers) catches
them — see `state-shape.md`/`aliases.md` for the components actually being
considered. None recorded yet from this pass; add rows here by hand when a
lookup resolves to the wrong domain model, per the sui-index skill's rule
that a gap analysis miss becomes an index entry, not a one-off correction.

| Name | Reads as | Actually is | Cost if used |
|---|---|---|---|
| `SquareCard` | A card/tile with a locked 1:1 aspect ratio | A `Surface` with `minWidth:180px`/`maxWidth:260px` only — no height constraint, no `aspect-ratio` CSS at all. Height is purely content-driven. | Reached for as a square thumbnail tile, discovers at render time it isn't square — height varies with content like any other card. |
