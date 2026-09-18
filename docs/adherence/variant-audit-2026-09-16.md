# Variant audit — the 2026-09-16 expansion (0.171.0)

Audited 2026-09-17. Scope: every curried variant, factory, component and helper
export that ENTERED the published surface on 2026-09-16 — the day
`RateGauge`, `LevelsTimeline`, `MutationSliders` and `TreeDiffChart` were
promoted and the Scenario Board bench was built. Gate:
`docs/BEST_PRACTICES.md` §4 and `AGENT_GUIDE.md` › The #2 Rule — **showcase-
and test-only usage is not demand.**

## How the Added set was established

Not by reading the CHANGELOG, and not by grepping `+export const` out of the
diff: neither sees `export { x } from`, `export type`, or a re-export that
only reaches the root barrel. The authoritative set is the **symmetric
difference of `scripts/export-usage-report.mjs` run at `1cb276f` (the
0.170.0 release commit, the last commit before the window) and at HEAD**:

```
node scripts/export-usage-report.mjs   # at 1cb276f → 990 names
node scripts/export-usage-report.mjs   # at HEAD    → 1070 names
```

**79 names entered the public surface; none left.** (That "none left" is
itself a finding — see *Never published* below.)

Consumers were discovered with the usage manifest over the whole workspace:

```
SUI_WORKSPACE_ROOT=/Users/peter/Documents/clients/PrimeStage \
  node scripts/usage-manifest.mjs --stats
```

18 consumer repos on this machine (3746 files), 4 carried forward. Plus a
direct read-only grep of `/Users/peter/Documents/clients/PrimeStage/thorcasting/thorcasting-ui`
and its last 15 commits.

**Headline: every one of the 79 names has zero consumer call sites.** The
audit therefore turns entirely on *expected* demand, and on one piece of hard
evidence about it:

> `thorcasting-ui/package.json` pins
> `"@primestageprime/solid-ui-components": "^0.170.0"`.
> It **cannot** import a 0.171.0 export yet, whatever its adapters say.

That is why nothing here is DEPRECATE for want of a consumer — for the
promoted components there is an identified consumer that is physically one
version bump away. The DEPRECATE rows below are a different failure: exports
that no consumer could plausibly want, published against this repo's own
stated policy.

## The Scenario Board bench, and what it does NOT justify

`dev/showcases/workshop/scenario-board.tsx` is the reference consumer whose
structure thorcasting-ui is mirroring, so its usage is read here as **pending
real demand**, flagged per row. But read precisely:

- The board uses the **Layout/Surface variants** directly
  (`ViewportColumn`, `HalfFillColumn`, `MajorPaneBox`, `GrowFillBox`,
  `GrowCenterColumn`, `FillWrapRow`, `FillCardSurface`) and `timeOf`.
- The board uses the **factories** — `createRateGauge`,
  `createLevelsTimeline`, `createMutationSliders`, `createTreeDiffChart` —
  currying its own dollar wording (`PayMutationSliders` and siblings at
  `scenario-board.tsx:683`).
- The board does **not** use a single one of the four curried variants
  (`RateDial`, `LevelsRailChart`, `NumberMutationSliders`,
  `ScenarioTreeDiff`). Their only callers anywhere are their own showcases.

So the curried variants' own demand is genuinely unproven, and the audit says
so — but that is not a verdict against them. Peter ruled (2026-09-17) that
`/promote` keeps requiring a curried variant, which settles the question the
rows below used to defer: the four are KEEP on the policy's own demand, and an
absent caller is no longer an open flag.

## Verdicts

| Name | Kind | Consumers found | Verdict | Justification (§4's three lines) |
| --- | --- | --- | --- | --- |
| `ViewportColumn` | Layout variant (Stack) | none in product; `scenario-board.tsx:1137`, `layout-variants` showcase | KEEP-PENDING | Expresses "fill a parent of DEFINITE height" (`height:100%;min-height:0`) — the bridge from a `calc(100vh - N)` block frame into the Layout vocabulary. `FillColumn` bakes `flex:1`, which is inert inside a block parent, so the column silently grows to content. Consumer: the board's viewport root; thorcasting's scenario page is the expected one. A prop would not do — `fill` is a Stack OVERRIDE, locked at variant-definition time. |
| `HalfFillColumn` | Layout variant (Stack) | none in product; `scenario-board.tsx:1150` (nested) | KEEP-PENDING | Expresses an EQUAL share of a proportional split (`flex:1 1 0`); the zero basis divides space before content is consulted, which `ClipFillColumn`'s `auto` basis cannot. Consumer: the board's two stacked charts, which must halve whatever they contain. A prop would not do — it is the same Overrides/DataProps split: call sites must not choose flex bases. |
| `MajorPaneBox` | Layout variant (Box) | none in product; `scenario-board.tsx` | KEEP-PENDING | Expresses a DEFINITE 60% share beside a 40% companion. `max-content` + `max-width` — the obvious spelling — feeds back into any child that measures itself to decide what to render, oscillating between two widths. No existing variant states a definite share. Consumer: the board's chart/instrument row. A prop would not do: a percentage at the call site is exactly the visual config §4 keeps out of call sites. |
| `GrowFillBox` | Layout variant (Box) | none in product; `scenario-board.tsx` | KEEP-PENDING (see MERGE #1) | Expresses `GrowBox` **in a column**: `min-height:0` is what lets a 150px cell win against a chart reporting an 800px intrinsic height. `GrowBox` carries only `min-width:0`. Consumer: the growing region of each board card. A prop would not do — but the honest answer may be that `GrowBox` should carry `min-height:0` itself; proposed, not done. |
| `GrowCenterColumn` | Layout variant (Stack) | none in product; `scenario-board.tsx`, `layout-variants:249` | KEEP-PENDING | Expresses "fill the height left AND centre the child" — the sibling of `GrowFillBox` for an instrument that keeps its own aspect ratio and would otherwise pin to the top. Nothing else combines grow-fill with cross-axis centring. Consumer: the board's gauge cell. A prop would not do (alignment is an Overrides-level decision). |
| `FillWrapRow` | Layout variant (Row) | none in product; `scenario-board.tsx`, `layout-variants:256` | KEEP-PENDING | Expresses a wrapping row that also FILLS its parent's leftover height, which `GrowWrapRow`/`WrapRow` do not. Consumer: the board's dial row, which must wrap and absorb the card. A prop would not do — same Overrides lock. |
| `FillCardSurface` | Surface variant | none in product; `scenario-board.tsx:1144`, `mutation-sliders:193` | KEEP-PENDING | Expresses a card that takes the whole cell it is given rather than sizing to content — the precondition for any instrument that measures its container. `CardSurface` sizes to content. Consumer: every board card. A prop would not do (padding/radius/fill are the curried visual config). **Also: it is the one audited name absent from `COMPONENTS.md`** — see *Follow-ups*. |
| `EllipsizedHudCaption` | Text variant | `src/components/RateGauge/RateGauge.tsx:449` | **KEEP** | Uppercase, 0.5px-tracked 11px `<span>` taking `color: inherit`, so it wears the tone of the callout it hangs off. Consumer: a SHIPPED SUI component — in-library consumption inside `RateGauge`, not showcase usage. A prop would not do: the tone inheritance and the tracking are the variant. **No MERGE** with `EllipsizedNodeLabel`: adjudicated in 0.171.0 › Changed — uppercase + tracking is a visible typographic role and the `color: inherit` is load-bearing, so unifying them would change `RateGauge`'s render. Do not re-derive. |
| `EllipsizedNodeLabel` | Text variant | `src/components/TreeDiffChart/TreeDiffChart.tsx:151` | **KEEP** | Plain-case 12px block `<div>` at `width:100%`, so `text-overflow` actually applies inside a fixed-width `foreignObject`; `EllipsizedTitle` needs a flex parent and `EllipsizedChipLabel` is inline. Consumer: a SHIPPED SUI component (`TreeDiffChart` node boxes). A prop would not do — the display mode IS the role. |
| `RateGauge`, `createRateGauge` | component + factory | none | KEEP-PENDING | The right-facing half-ring dial: zoned ring, reference needle, delta brace, elbow-leader HUD callouts. Nothing in the catalog draws a bounded rate against a reference. Consumer: thorcasting-ui (pinned `^0.170.0`, so it literally cannot import it yet) via the board's `MonthlyRateDial` shape. A prop would not do — the whole component is the unit. |
| `LevelsTimeline`, `createLevelsTimeline` | component + factory | none | KEEP-PENDING | A time chart of numeric LEVELS — a rail per value, thickness = count, Sankey ribbons where counts move, one-ended flows. No existing chart expresses movement between values over time. Consumer: thorcasting-ui headcount/pay rails; board bench today. A prop would not do. |
| `MutationSliders`, `createMutationSliders` | component + factory | none | KEEP-PENDING | A row of vertical prior-vs-future dials with the allowed range as the clamp and three presences (present / removed / new) as three shapes. No existing control states a before-and-after pair on one track. Consumer: thorcasting-ui pay editor; board bench today. A prop would not do. |
| `TreeDiffChart`, `createTreeDiffChart` | component + factory | none | KEEP-PENDING | Two-sided diff of content-addressed trees with a band per root entry and pruned `[SAME]` nodes. Nothing else in SUI is a structural diff. Consumer: thorcasting-ui adapters — the prop signature was deliberately frozen for them and is pinned by `barrel.test.ts`. A prop would not do. |
| `RateDial` | curried variant | **none — not even the board bench** | **KEEP** | Peter ruled (2026-09-17) that `/promote` KEEPS requiring a curried variant: the curried drop-in is the client-legal entry point whether or not a client has reached for it yet, so its demand is the policy's, not a caller's. Plain numbers against zero: the dial with no units and no domain nouns. It is the **sanctioned entry point** — "clients import only curried components; never factories/bases" — and deprecating it would leave a component promoted one day earlier with no legal import for a client, a slow delete with nothing to migrate to rather than phase 2 of add/deprecate/delete. That the board curries `createRateGauge` with dollar wording instead (as `variants.ts`'s header says the second form should) is the expected division of labour, not a verdict. A prop would not do — the baked wording IS the variant. |
| `LevelsRailChart` | curried variant | **none — not even the board bench** | **KEEP** | As `RateDial`, on the same 2026-09-17 ruling: the zero-config drop-in (plain numbers, no format baked) and the only client-legal import for `LevelsTimeline`. |
| `NumberMutationSliders` | curried variant | **none — not even the board bench** | **KEEP** | As `RateDial`, on the same 2026-09-17 ruling: locale-grouped numbers, neutral verbs, no grid — the client-legal import for `MutationSliders`. |
| `ScenarioTreeDiff` | curried variant | **none — not even the board bench** | **KEEP** | As `RateDial`, on the same 2026-09-17 ruling, and additionally pinned by `TreeDiffChart/barrel.test.ts` as part of the thorcasting contract. Leaves `legend` at the chart's data-derived default on purpose. |
| `timeOf` | helper (LevelsTimeline) | none in product; 12 call sites across `scenario-board.tsx`, `-people.ts`, `-rate.ts`, `levels-timeline` showcase | KEEP-PENDING | Normalises a `TimeValue` (`Date \| number`) to a number. `.getTime()` does not typecheck on the union, so every consumer that hand-rolled it would be a second definition of one number. Consumer: the board's three modules today, thorcasting's adapters next. A prop would not do — it is a function, and the alternative is duplication, which is what §4 is trying to prevent. |
| `KINDS`, `kindColor`, `kindLabel`, `kindLegendItems`, `presentKinds`, `TreeDiffKind` | change-kind vocabulary (TreeDiffChart) | none in product; `TreeDiffChart.tsx` internally, `tree-diff-chart` showcase; `KINDS`/`kindColor`/`kindLabel` pinned by `barrel.test.ts` | KEEP-PENDING | The four-value change vocabulary a consumer must speak to supply `kind`, plus the token mapping so a consumer keying the colours in its OWN chrome reads the same tokens the chart paints from. Consumer: thorcasting-ui (it supplies `kind`; the chart never infers it). A prop would not do — a consumer-side legend cannot be a prop of the chart. |
| `ROOT_BASELINE_ID`, `ROOT_COMPARE_ID`, `COMMIT_BASELINE_ID`, `COMMIT_COMPARE_ID`, `HEAD_BASELINE_ID`, `HEAD_COMPARE_ID`, `SAME_ID` | synthetic node ids (TreeDiffChart) | none in product; `SAME_ID`/`ROOT_BASELINE_ID` in the showcase | KEEP-PENDING | The ids the chart MINTS for its spine, which a consumer needs to recognise in `onNodeClick` and to drive `selectedId` — the only way to tell a spine click from an entry click without string-matching a private literal. Consumer: thorcasting-ui's selection wiring. A prop would not do: these are the chart's own values, not the consumer's. |
| `LevelsTimelineProps`/`Overrides`/`DataProps`, `Level`, `CountPoint`, `Transfer`, `Mutation`, `TimeDomain`, `TimeValue` | types (LevelsTimeline) | none in product; board bench | KEEP-PENDING | The data types a consumer must construct to call the chart at all. A prop cannot replace a type. |
| `MutationSlidersProps`/`Overrides`/`DataProps`, `MutationSliderLabels`, `Entity`, `Domain`, `ChangeTone`, `MutationEntity`, `MutationSlidersDomain` | types (MutationSliders) | none in product; board bench | KEEP-PENDING | Same. Note `MutationEntity`/`MutationSlidersDomain` are deliberate qualified ALIASES of `Entity`/`Domain` for consumers whose own `Entity` collides — two spellings of one type, kept knowingly, verified non-ambiguous at the root. |
| `RateGaugeProps`/`Overrides`/`DataProps`, `RateGaugeDomain` | types (RateGauge) | none in product; board bench | KEEP-PENDING | Same. |
| `TreeDiffChartProps`/`Overrides`/`DataProps`, `TreeDiffRoot`, `TreeDiffBand`, `TreeDiffChild`, `TreeDiffEntry`, `TreeDiffMode`, `TreeDiffSide` | types (TreeDiffChart) | none in product; showcase; **pinned by `barrel.test.ts`** | KEEP-PENDING | Same, and explicitly frozen as the thorcasting-ui adapter contract. |
| `computeTreeDiffLayout`, `TreeDiffLayoutInput`, `TreeDiffLayout`, `LayoutNode`, `LayoutEdge`, `LayoutBand`, `LayoutGuide`, `LayoutCaption` | layout geometry (TreeDiffChart) | **none anywhere** — not the showcase, not the bench, not `barrel.test.ts` | **DEPRECATE** | No consumer and no expected one: a consumer supplies a tree and reads `onNodeClick`; it never asks the chart where a node landed. This repo adjudicated the identical question twice in the same release the other way — RateGauge's "~20 `geometry.ts` exports stay private", MutationSliders' "~30 `geometry.ts` FUNCTIONS are now private" — and `LevelsTimeline/index.ts` documents the policy at length ("a dev surface that wants it reaches `./geometry` directly"). `TreeDiffChart` never got that scrub. Marked deprecated; NOT deleted (published in 0.171.0). **No public successor, and none is needed**: `package.json` `exports` publishes the root, the themes and the CSS only, so no package consumer ever had a route to these modules — this is an over-publication being withdrawn, not a migration. |
| `computeFrame`, `Frame`, `TreeDiffLayoutMode`, `NARROW_AT`, `SPINE_AT`, `WIDE_AT` | frame geometry (TreeDiffChart) | **none anywhere** | **DEPRECATE** | As above — the three width thresholds and the frame box are how the chart chooses its own layout, a decision the chart owns. `Frame` additionally publishes a name that `LevelsTimeline/geometry.ts` and `ScrubChart` also define internally: if either is ever `export *`'d from the root, an ambiguous re-export resolves to NOTHING, silently — the exact hazard `barrel.test.ts` was written for. Marked deprecated; NOT deleted, same no-successor note as the row above. |

Counts: **KEEP 6, KEEP-PENDING 59, DEPRECATE 14, MERGE proposed 1** (of 79)
(re-tallied 2026-09-17: the four curried variants moved KEEP-PENDING → KEEP on
Peter's ruling; no name changed verdict class otherwise).

## MERGE proposals — proposed, not done

1. **`GrowFillBox` → fold `min-height:0` into `GrowBox` and retire the
   variant.** They are one role ("a flex child that fills the leftover space
   and may shrink past its content"), split only by which axis got the
   `min-*:0`. `GrowBox` already bakes `flex-basis:0%` + `min-width:0`; adding
   `min-height:0` would make it correct in a column too, and the doc comment
   on `GrowFillBox` is itself an argument that `GrowBox`'s omission is a bug
   rather than a distinction. **Not done, and not safe to do blind:** 9
   `GrowBox` call sites exist across consumer repos, and `min-height:0`
   changes the automatic minimum size of every one of them in a column
   context. Needs Peter, and a render check on those 9.

No other merge is proposed. Specifically **not** `EllipsizedHudCaption` /
`EllipsizedNodeLabel` (adjudicated in 0.171.0 › Changed), **not**
`ViewportColumn` / `FillColumn` and **not** `HalfFillColumn` /
`ClipFillColumn` — in each case the variant's own doc comment states the
mechanical reason they are not interchangeable, and the reason survives
review.

## Never published — the three same-day renames

`MinorFillColumn`, `MajorFillColumn` and `WidePaneBox` were added on
2026-09-16 (`8b80b73`) and renamed away (`b8f069d`, `23c6060`, `e80e3b5`)
before the release commit. Checked, because a published export deleted in one
step would be an add/deprecate/delete violation and the most serious finding
available here:

```
git show 84c2661:src/components/Layout/variants.ts | grep -E 'MinorFillColumn|MajorFillColumn|WidePaneBox'
→ no match
```

They are absent from the 0.171.0 release commit and absent from the
base↔HEAD export diff. **Never on the published surface, so no violation** —
an intra-day rename on an unreleased branch, which is exactly where renames
belong.

## Out of scope, noted

`NarrowStack` appears in the brief's expected list but entered the surface on
**2026-09-01** (`3b9c3e0`), not in this window. It is also the best-used name
in the whole neighbourhood — 57 call sites across 10 consumer repos
(`jtf-ui` 28, `thorcasting-ui` 12, `goose-ui` 7, …). KEEP, trivially, and no
justification is owed for a variant this far past proving itself.

## Follow-ups (separate PRs — each one moves a health metric)

1. **`FillCardSurface` has no `COMPONENTS.md` mention.** It is one of the 155
   `undocumentedExports`. Documenting it would DROP that metric, and this PR
   is gated on the metric not moving, so the entry is deliberately not added
   here.
2. **Retire the deprecated TreeDiffChart geometry exports** once nothing reads
   them — phase 3, after a minor version has passed. Cheap to do, because
   there is nothing to migrate: `package.json` `exports` has no component
   subpath, so the only importer these modules could ever have is an in-repo
   dev surface reaching them relatively (as the scenario board reaches
   `LevelsTimeline/geometry`), and none does.
3. ~~**Ask Peter about the four curried variants.**~~ **Answered
   2026-09-17 — `/promote` KEEPS requiring a curried variant.** The question
   was whether the checklist should still demand one when every real caller so
   far has curried the factory instead; the ruling is that it should, because
   the curried drop-in is the client-legal entry point and a component
   published without one has no legal import for a client. `RateDial`,
   `LevelsRailChart`, `NumberMutationSliders` and `ScenarioTreeDiff` are
   therefore KEEP in the table above, and no future audit owes a
   caller-count justification for a curried variant. Nothing to do.
