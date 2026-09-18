# Handoff — the Hourly builder in thorcasting-ui

Status: **ready to build.** Written 2026-09-18.
Source: the SUI **Hourly Board** bench, `dev/showcases/workshop/hourly-board.tsx`
(run `npm run dev` in `solid-ui-components`, open nav id
`workshop:hourly-board`, port 6006).
Target: a new scenario builder in `thorcasting-ui`, `/builder/hourly`.

The three SUI pieces this builder needs that did not exist before —
`MutationToolbar`, `StackedTimelineChart`, `createHighWaterMark` — plus the
`shrink` icon are in `solid-ui-components` **`[Unreleased]`**. They ship in the
next release after 0.173.0; bump `@primestageprime/solid-ui-components` to that
version first. Until then, link SUI in source mode (the port authority's note
on `thorcasting-ui` explains the tag-pinned checkout).

---

## 1. What to build

A builder for a business that **sells hours**. Each service it sells has a
number of hours a week and a rate per hour, and both change over the year:
more hours in summer, a week off for a vacation, a new rate from September.
The builder shows four readings of one scenario on one page:

| Region | Question it answers |
|---|---|
| **Cash Flow** (top) | Where does the balance go if this plan holds? |
| **Work Mix** (second) | How many hours a week is the business committed to, by service, and when is that over full time? |
| **Changes** (bottom left) | What does each service bill in the week being edited, and what changed there? |
| **Rate, right now** (bottom right) | Averaged over the year, is the business above breakeven, and by how much more or less than the committed plan? |

It is the payroll simulator's shape (`payrollSimulatorScreen.tsx`) with a
revenue model instead of a pay model. Copy that screen's structure, stores
and write path; change what a line means.

## 2. The model — a service is a segment or a ray, and its year is change events

Peter's rulings, 2026-09-18, and the whole of the model:

> "Each service is either a segment or a ray. All services have a start date.
> And segments have an end date as well."

> "I'll compose the seasonality from those changes."

1. **A service has a `start`** and, if it is a segment, an **`end`**. Outside
   `[start, end)` it does not exist: it bills nothing and its dials are hidden.
   A ray has no end.
2. **Inside that span, what it bills is a list of change events.** Each event
   is an absolute `{ hours, rate }` that holds **until the next event** — the
   way a pay change holds until the next pay change. There is **no seasonal
   formula** anywhere. A summer is an event in June raising the hours and
   another in September lowering them; a vacation is a week at zero hours
   followed by an event restoring them.
3. **A later event wins.** Editing the January level does not move June's 30
   hours, because June's event says 30.
4. **Every figure is `$/wk`.** ("Hourly people tend to think of it that
   way.") Hours are per week, rates per hour, and a service's weekly amount is
   hours × rate. The projection integrates `$/wk × weeks`; there is no ×52 in
   any sentence the coach reads.
5. **Changes land on ISO weeks.** A click on the Work Mix chart is snapped to
   the Monday of its week (clamped to the span's start), and a second click in
   the same week selects the change already there rather than adding one.
6. **The gauge reads the year, time-weighted in weeks** — not the rate in the
   week being edited. A change in December is worth a month of its rate, not a
   year of it.

The bench's model is `dev/showcases/workshop/hourly-board-model.ts`, pure and
tested (`hourly-board-model.test.ts`, 100+ assertions). The functions worth
porting as-is, renamed into thorcasting's vocabulary:

| Bench function | What it answers |
|---|---|
| `offerAt(service, time, mutations)` | The `{ hours, rate }` in force at a moment, or `null` outside the service's life |
| `offerBefore` / `offerFrom` | The dial's prior and value across one change |
| `isLiveAt(service, time)` | Is the moment inside `[start, end)`? |
| `revenueAt` / `rateAt` | What the business bills in a week, and that less fixed costs |
| `averageRate` + `averageRateOver` | The gauge's year average, weighted in weeks |
| `workMixSeries` + `byVariability` | The Work Mix bands, steadiest service at the bottom |
| `weekOfPick` / `weekRangeOf` | The pick's ISO week, and the hover's "2025-08-04 to 2025-08-10" |
| `projectedBalances` / `accruedOver` | The balance line integrated week by week from the pivot |

In thorcasting, most of the money half of that is **the engine's job, not the
screen's**: fold the planned lines in the browser (`boardPreviewStore`) and
read the balance and the monthly net from the fold, exactly as the payroll
simulator does since 2026-09-17. Port the bench's arithmetic only where the
fold does not answer the question — the Work Mix bands, the dials, the week
snapping.

## 3. Mapping onto thorcasting's data

**Copy the payroll precedent** (`src/lib/scenarioBoard/segments.ts`,
`edits.ts`, `overlay.ts`; README in `src/components/builder/`). A pay change is
two `fixed_txn` segments on one line; an hourly change is the same:

| Model concept | thorcasting record |
|---|---|
| A service | The set of `fixed_txn` revenue lines tagged `service:<slug>` (new tag prefix beside `employee:`, `contract:`, `offering:` in `~/lib/tagHelpers.ts`) |
| One level of a service (`{ hours, rate }` from one event to the next) | One `fixed_txn` segment: `start` = the event's Monday, `until` = the day before the next event, **`schedule: { shape: "day_of_week", weekday: 1 }`**, `amount_cents = hours × rate × 100` |
| A ray | The last segment has no `until` |
| A segment's end | The last segment's `until` |
| A change event | A segment boundary where hours or rate differ (the payroll rule: equal amounts across a boundary are a SEAM, not an event) |
| The events the chips show | `scenarioBoardEventsStore`'s rule: days this session put down ∪ days the lines already change on |
| Fixed weekly cost (breakeven) | Read from the fold, as the payroll gauge reads its rate — not a constant |

**Hours and rate must both survive the round trip**, and `amount_cents` alone
cannot carry them: 30 h × $18 and 18 h × $30 are the same cents. *Assumed
here:* store `{ hours, ratePerHourCents }` in the config's **`meta`** slot
(the engine hashes `meta` but never reads it; thorcasting already writes
`builderSource` there) and derive `amount_cents` from them on write. Confirm
with Peter before building on it; the alternative is a name convention, which
is worse.

**No new engine effect.** Everything above is `fixed_txn` with an existing
schedule shape (`DayOfWeek`, in `thorcasting-engine/model/src/config/schedule.rs`),
so it is porcelain under ADR 0024 — no Adlai + Peter sign-off needed.

## 4. The SUI components, region by region

Everything is imported from `@primestageprime/solid-ui-components`. **No
custom CSS, no new components** — the payroll simulator's rule holds here.

### Frame

`ChartScreen` (thorcasting's own chrome, as the payroll simulator uses it) →
`ViewportColumn` → two `HalfFillColumn`s. Top half: two stacked
`HalfFillColumn`s, one card each. Bottom half: `FillWrapRow` holding a
`MajorPaneBox` (Changes) and a `GrowFillBox` (the gauge). Every card is a
`FillCardSurface` with a `TextTitle` header.

### Cash Flow

| Piece | SUI | Notes |
|---|---|---|
| Header | `SpreadRow` + `TextTitle` + `IconOnlyButton` wrapping `Icon name="shrink"` | The button resets the y-axis; `aria-label="Fit y-axis to current values"` |
| Chart | Thorcasting's `AppChart`, or `CashflowScrubChart` in a `GrowFillBox` with `chartHeight="fill"`, `scrub={false}`, `showGridlines` | The bench uses `CashflowScrubChart`; the payroll simulator uses `AppChart`. Keep the app's own chart if it takes a y-max |
| **Y ceiling** | **`createHighWaterMark(() => peakOf(cells))`** → pass `ceiling()` as the chart's y-max, wire `reset` to the shrink button | NEW. Rises with the data, holds when it falls, eases down on reset. Peter, 2026-09-18: an axis that re-fits on every drag jitters |

The peak the mark watches is the **top of everything drawn** — the balance and
the upper edge of any uncertainty fan — or the fan clips at the ceiling.

### Work Mix

| Piece | SUI | Notes |
|---|---|---|
| Header | `SpreadRow` + `TextTitle` + `ClusterRow`(`NoteText` "Cap" + `ThemedNumberInput`) | The y-axis cap, default 80, minimum 40 (the full-time rule must stay on the plot) |
| Chart | **`createStackedTimelineChart({ margin, xTickFormat, yTickFormat })`**, curried once in the app | NEW. Fills its box; you pass no pixels |
| Props | `series` (one band per service, steadiest at the bottom), `xDomain`, `yDomain={[0, cap]}`, `xTickValues` (quarter starts), `rule={{ value: 40, label: "full-time" }}`, `events` (the change dates, numbered), `hoverLabel` (the ISO week as a day range), `onPick` (snap to the week, then add or select the change there) | `onPick` is UNSNAPPED on purpose — the snapping is the app's |

A band is **step-valued**: emit a point only where a service's hours change,
opening every band at the left edge (including at zero), so the bands above
have a floor.

### Changes

| Piece | SUI | Notes |
|---|---|---|
| Header | **`createMutationToolbar({ labels? })`** | NEW. Title, the chips (`{ id, label }` per change, labelled `W23 · Jun 2`), and Add / Reset / Save / Delete. Pass only the callbacks the screen supports; Delete shows only while a change is selected |
| Dials | `createPairedMutationSliders({ axes: [Hrs/wk 0–80 snap 1, $/hr 0–300 snap 5], labels: { remove: "Drop", restore: "Reinstate", new: "new service" } })` | One pair per service live at the selected change; `summary` prints that week's `$/wk`. `onChange(id, measureIndex, value)` — the index says which of hours or rate moved |
| Add a service | `Modal` holding a `NarrowStack` of `ThemedInput` (name) + two `ThemedNumberInput`s (hrs/wk, $/hr); footer `EndWrapRow` of `GhostButton` Cancel + `PrimaryButton` Add | A new service is a RAY starting at the selected change, with the whole track as its allowance |

**`MutationToolbar` also replaces the hand-built row in
`payrollSimulatorScreen.tsx`** (the TODO at its as-of row). Curry
`createMutationToolbar({})` and pass `onDelete` + `onReset` + `onSave` — the
payroll screen has no Add in that row.

### Rate, right now

`createRateGauge({ baselineLabel: "Baseline", formatAgainst, formatDelta })`
inside a `GrowCenterColumn`. Revenue-side words — up is over breakeven and up
is more revenue, **no sign flip** (the payroll gauge flips, because a rate that
falls is payroll that rises). `domain` from the fold's reachable range,
`baseline` = the committed plan's year average, `caution` = the comfortable
margin, `value` = the scenario's year average.

## 5. What stays in thorcasting

- **Formatters**: `$/wk` amounts, `Hrs/wk` and `$/hr` dial text, the gauge's
  two sentences (the bench's `hourly-board-money.ts` is the reference).
- **The curries**: the sliders' axes, the gauge's words, the timeline's tick
  text, the toolbar's labels. One module-level curry each.
- **The adapters**: lines ↔ segments ↔ model, model → each component's props.
  Put them in `src/lib/hourlyBoard/` beside `src/lib/scenarioBoard/`, pure,
  with an `observe.ts` that prints every panel as a table.
- **The stores**: an events store and an overlay store, copied from the
  payroll simulator's. Nothing reaches the server until Save (ADR 0015); Reset
  drops the overlay, which makes it safe on the baseline.
- **The builder registry entry** in `src/components/builder/scenarioBuilders.ts`.

## 6. Assumptions

| # | Assumption | Status |
|---|---|---|
| 1 | Services are segments or rays with change events; no seasonal formula | *Ruled by Peter, 2026-09-18* |
| 2 | Every money figure is `$/wk` | *Ruled by Peter, 2026-09-18* |
| 3 | Changes land on ISO weeks, clicked on the Work Mix chart | *Ruled by Peter, 2026-09-17* ("clicks on the chart at a weekly granularity") |
| 4 | Work Mix stacks by variability, most variable on top | *Ruled by Peter, 2026-09-18* ("the one with the biggest bumps is on top") |
| 5 | The Cash Flow y-axis is a high-water mark with a shrink button that eases down | *Ruled by Peter, 2026-09-18* |
| 6 | Hover on Work Mix shows the week as a day range | *Ruled by Peter, 2026-09-18* |
| 7 | One service level = one weekly `fixed_txn` segment, tag `service:<slug>` | *Assumed here* — follows the payroll precedent; confirm the tag prefix |
| 8 | Hours and rate ride in `meta`; `amount_cents` is derived | *Assumed here* — confirm with Peter |
| 9 | Revenue lines go in a `rev-*` bucket (the bench has no opinion; thorcasting has `rev-contract`, `rev-support`, …) | *Assumed here* — pick the bucket with Peter |
| 10 | Breakeven and the committed baseline come from the fold, not constants | *Assumed here* — the bench's `FIXED_WEEKLY_COST` ($1,700) and `COMFORTABLE` ($400) are fixture calibration, not product numbers |
| 11 | The per-service allowance (the shaded box on each dial) is the whole track for a new service | *Assumed here* — the bench's fixture ranges were hand-picked; thorcasting has no service taxonomy to supply one |

## 7. Known gaps — leave the TODO, do not hand-roll

- **No as-of date control.** The chips (`MutationToolbar` over
  `SegmentedControl`) are the stand-in, as on the payroll simulator. A real
  date control is a SUI gap.
- **The balance line before the selected change is the committed history.**
  In the bench, the line up to the change being edited comes from fixed
  monthly figures and ignores the services, so only the projection after the
  pivot shows the plan's slopes. In thorcasting the fold draws the whole line,
  so this gap should not carry over — check that it does not.
- **`CashflowScrubChart` and `AppChart` do not share a y-ceiling API.**
  `createHighWaterMark` is unit-free and works with either, but the prop you
  hand it to is chart-specific.
