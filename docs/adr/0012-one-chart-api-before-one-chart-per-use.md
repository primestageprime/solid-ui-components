# One chart API before one chart per use

Status: **Proposed.** Recorded 2026-10-28 on the owner's word. No decision yet.

## The concern

The owner, 2026-10-28, after the sizing of the Briefing "1 of 3" chart:

> we might just need to come up with a better abstraction for charts
> eventually; right now it feels like we're just proliferating variants for
> every use instead of giving users a good API to build their own charts

## The evidence

SUI holds two chart contexts, and every mark needs one adapter per context
([ADR 0010](0010-a-mark-is-a-core-plus-one-adapter-per-context.md)):

- `Chart` (Depth 1): value-addressed, a `Date` or number x domain, a Solid
  context that slots read. `BalanceReviewChart`, `VarianceStrip` and
  `VarianceStripChart` sit on it.
- `ScrubChart` (Depth 2): index-addressed cells, a measured fill, no Solid
  context, three render slots. `CashflowScrubChart` and `ActualForecastChart`
  sit on it.

The two families draw the same things with separate code: grid, axes,
reference lines, series lines, the size model and the hover state. The cores
they share are the label ladder, the crosshair, the tooltip placement and the
deviation band.

The cost showed on 2026-10-28. To give the Cash Flow family the four review
abilities of `BalanceReviewChart` (an older forecast with its made-on rule, a
variance strip that shares the crosshair, captioned dot marks, a gap
bracket), three of the four need a new `ScrubChart` adapter, because the
strip and the bracket read the `Chart` context and `ScrubChart` has no slot
below the plot and no outside reader of its hover. The option taken instead
was a restyle of `BalanceReviewChart` to the Cash Flow look, which adds one
more variant to keep in step by hand.

The Depth 2 to 4 chart list at that date: `BalanceReviewChart`,
`ActualForecastChart`, `CashflowScrubChart`, `CashflowChart`,
`VarianceStripChart`, `SignedAreaChart`, `LevelsTimeline`, `TreeDiffChart`
(bench). Each one is a composition a consumer could not write from the
primitives, because the primitives do not meet: a `Chart` slot cannot sit in
a `ScrubChart`, and a `ScrubChart` mark cannot sit in a `Chart`.

## What a decision needs

- **One context.** Either `ScrubChart` grows a Solid context that `Chart`
  slots can read (ADR 0010 rejected a stub-filled one, not a real one), or
  `Chart` gains cells, a measured fill and the scrub gestures, and
  `ScrubChart` becomes a composition on it.
- **One size model.** `Chart` now has three: fixed, aspect-ratio responsive,
  and measured fill (added 2026-10-28). `ScrubChart` has measured fill.
- **A consumer-facing recipe.** The goal is that thorcasting composes its
  own Briefing chart from slots and data, and SUI ships cores, slots and a
  few curried compositions, not one Composite per screen.
- **A migration order.** `BalanceReviewChart` is the smallest full
  composition and the natural first port.

## What this does not decide

Nothing. It records the direction so the next chart request is weighed
against it before another variant lands.
