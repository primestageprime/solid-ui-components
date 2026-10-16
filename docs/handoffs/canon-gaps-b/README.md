# Canon gaps, group B — handoff (2026-10-15)

Source: the Taskmaster canon (`singularity/docs/design/taskmaster-canon.html`) and its cut list
(`singularity/docs/design/sui-cutlist-2026-10-15.md`). Branch `feat/canon-gaps-b`. Delete this
folder once the touchstone has adopted the exports and Peter has approved the screenshots.

## What shipped

| Item | Export | Showcase | Screenshots (HUD theme, 1280 and 390) |
|---|---|---|---|
| A3 | `ThreeSlotRow`, `createThreeSlotRow`, `threeSlotColumns` | `#/three-slot-row` | `three-slot-row-*.png` |
| A4 | `EndClusterRow` | `#/three-slot-row` (and generated variants) | `three-slot-row-*.png` |
| B1 | `UserMenu`, `userInitials`, `userMenuItems` | `#/user-menu` | `user-menu-*.png`, `user-menu-open-*.png` |
| B2 | `AppBar`, `appBarNavItems`, `CenteredOverflowNav` (+ `OverflowNav` `justify`) | `#/app-bar` | `app-bar-*.png`, `app-bar-kebab-open-*.png`, `app-bar-user-menu-open-*.png` |
| B4 | `StepTimeline`, `createStepTimeline`, `hourTicks`, `stepYDomain` | `#/step-timeline` | `step-timeline-*.png` |

The 390 shots hide the gallery's sidebar, so the showcase gets the whole viewport, as a phone app would.

## B3 GroupedCardList was not built

`SectionedList`, its named cousin, was removed in 0.221.0, and the owner chose `BucketQueue` for the
side pane. In 0.222.0 `BucketQueue` gained a compact density for exactly that pane. A new grouped list
would be a second way to draw it. The touchstone can use `BucketQueue` today:

- each canon group is a `Bucket` (`key`, `label`, `tone`, `collapsible: true`);
- History and Recent start shut with `collapsedByDefault: true`;
- `bucketOf(task) = task.group`, `keyOf(task) = task.id`, `selectedKey` + `onSelect` for selection;
- `renderItem` draws the canon's task card body (`EllipsizedTitle` + `SlotFillBar`).

What it does not match, all visual and all `BucketQueue`'s owner's call:

- buckets are bordered with a gap, where the canon wants them flush with a 1px divider;
- the header count is a plain number, not a `CountChip`;
- the selected row's bar is 2px, not 4px;
- the header is not the canon's 28px;
- collapse is component-owned by design (`collapsedByDefault` sets only the start state).

**The one gap that is not visual: a count with no items loaded.** The canon shows History at 2,594
while collapsed. `BucketQueue` derives each bucket's count from the items it is handed, and an empty
bucket shows 0. So the touchstone must either load all 2,594 History tasks into `items`, or
`BucketQueue` needs a new per-bucket `count` override. That override is a prop on a Primitive, so it
is gated and belongs to the owner. Option (a), the new GroupedCardList, would carry a `count` of its
own.

## Deviations from the canon, left for Peter

- **AppBar is 60px tall, not 56.** `AppHeader`'s md padding is 12px around a 34px avatar trigger; sm
  gives 52. An exact 56 needs a new `AppHeader` size, which is a gated scale change.
- **The avatar trigger has no accessible name.** The initials are `aria-hidden` and `PopoverMenu` takes
  no trigger label. The touchstone's own `UserMenu` has the same gap.
- **StepTimeline's hours are UTC**, like every date `LevelsTimeline` draws. The canon's seed is in UTC,
  so it matches the canon; a viewer in another zone sees UTC hours.
- **StepTimeline draws a filled step band, not a bare line.** It is `StackedAreaSeries` with a linear
  crossing, so the step has a translucent fill under its top edge.
- **A Peter-authored workshop bench, `progress-flags`, overlaps StepTimeline.** It draws a diddit
  topic's progress as stepped estimate and actual lines with milestone flags. The two should converge
  before the bench is promoted.
