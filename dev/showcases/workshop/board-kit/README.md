# Board Kit

A board is a **config**. A change is a **lens mutation**.

Peter, 2026-09-18, while a third board was being written as a third copy of the
first two: *"These should mostly be lens mutations on existing config types,
right?"* This directory is that sentence, made true.

| file | what it holds |
|---|---|
| `config.ts` | `BoardConfig` — unit, grain, side, axes, `contributionOf`, fixed cost, gauge domain, sentences, fixture. And `rateFromContribution`, the one line every board's money comes out of. |
| `lens.ts` | `view` / `set` / `clear` over a path of `(entity, measure \| "presence")`, plus `add` / `remove` / `applyChanges`. Forty lines of named functions, no lens library. |
| `model.ts` | Every shared derivation once, generic: the slot grid by grain, the mutation ops, the time-weighted average, the projection's integral, the pinned ceiling, variability, the money words. |
| `BoardView.tsx` | One generic view, composing the existing SUI pieces from a config. |

## Defining a new board

Around sixty lines. The License Board — six dials per product in two captioned
groups, revenue side, dollars a month — is the worked example.

```ts
import type { BoardConfig } from "./board-kit/config";

export const CONFIG: BoardConfig<6> = {
  id: "license",
  title: "License Board",
  unit: "mo",            // every money figure is $/mo
  grain: "month",        // a change lands on the first of its month
  side: "revenue",       // up is better; expense boards flip the subtraction
  domain: [new Date("2025-01-01"), new Date("2026-01-01")],

  // Six dials in two CAPTIONED groups. Three or more axes draw as ONE
  // `GroupedMutationSliders` row over every measure; one axis is
  // `MutationSliders` and two is `PairedMutationSliders`. The view picks.
  axes: [
    { label: "#", domain: [0, 500], snap: 1, format: formatCount, group: "mo" },
    { label: "\u0394", domain: [-20, 20], snap: 1, format: formatDelta, group: "mo" },
    { label: "$", domain: [0, 200], snap: 5, format: formatMoney, group: "mo" },
    { label: "#", domain: [0, 500], snap: 1, format: formatCount, group: "yr" },
    { label: "\u0394", domain: [-20, 20], snap: 1, format: formatDelta, group: "yr" },
    { label: "$", domain: [0, 2000], snap: 50, format: formatMoney, group: "yr" },
  ],

  // What ONE product contributes, in unit terms ($/mo), from its measures.
  // A board whose cash has MEMORY uses `contributionAt` instead — see below.
  contributionOf: ([countMo, feeMo]) => countMo * feeMo,

  fixedCost: 12_000,
  comfortable: 4_000,
  rateDomain: [-12_000, 40_000],
  sentences: { against: againstBreakeven, delta: revenueShift },
  mix: "stacked",        // or "levels" for the Scenario Board's rails
  fixture: PRODUCTS,
  seed: SEED_CHANGES,
  measures: 6,
};
```

Then a bench that holds the state and hands `BoardView` its data — see
`../hourly-board.tsx`, which is signals and handlers and one `<BoardView>`.

## The two decisions worth knowing before you add a field

**`side` is the whole of the revenue/expense difference.**

```
rate = side === "revenue" ? Σ contribution − fixedCost
                          : fixedCost − Σ contribution
```

The Scenario Board's rate reads as a baseline less a pay *change*, which looks
like a different model and is not:

```
rate = BASELINE − Σ (pay − committed pay)
     = (BASELINE + Σ committed pay) − Σ pay
```

so its `fixedCost` is `60,000 + 160,000 = 220,000` and one subtraction serves
both boards. `model.test.ts` reproduces that board's own published calibration
table from a config to prove it.

**The unit is what the rate MEANS, not how it is printed.** It decides what the
gauge averages over, what the projection integrates, and what the sentences say.
`unitsPer(rate, sample)` is the only conversion there is — the two boards wrote
that factor by hand in opposite directions (`/12` on a $/yr board, `× 52/12` on
a $/wk one), and only one of them was under test.

## When a board's cash has MEMORY

`contributionOf` reads an entity's measures at a moment, which is enough for
both shipped boards: a service bills `hours x rate` in every week it is sold,
and a person costs their salary in every month they are employed.

Peter redefined the License Board on 2026-09-18 into a board that is not like
that. An annual licence sold in month 0 pays its whole fee in month 0 and
nothing again until it renews at +12; a negative growth delta does not bite
until renewal; a monthly cohort is `max(0, # + delta x m)`. What the business
bills in March is therefore not a function of where March's dials sit — it is a
function of every cohort sold before it.

That board supplies `contributionAt` instead:

```ts
contributionAt: (entity, time, mutations) => cashInMonth(entity, time, mutations),
```

`contributionOf` stays required so a board with no memory does not have to write
a time-dependent function to say so, and `contributionAt` wins when both are
present. **Nothing else in the kit changes**: the gauge's average, the
projection's integral and the calibration table already sample per moment, so a
cohort model reaches all three for free.

## When one entity draws SEVERAL mix bands

The mix chart's series is a **prop on `BoardView`**, not a field on the config,
and that is what makes a per-SOURCE mix a board's own business rather than a kit
feature. Peter's License Board draws one band per product *x* billing variant,
so its bench passes two series per product:

```tsx
mixSeries={flatMap(
  (product) => map(
    (source) => ({ id: `${product.id}-${source}`, label: `${product.label} ${source}`,
                   points: pointsForSource(product, source, mutations()) }),
    ["mo", "yr"],
  ),
  products(),
)}
```

`model.ts`'s `pointsFor` emits one band per (entity, measure); a board wanting a
band per derived source writes its own point walker over `levelsAt`, exactly as
that expression does. The kit deliberately does not own a `sourcesOf` hook: it
would be a second way to say what a bench can already say in four lines, and the
kit has no consumer that needs the indirection.

## What is deliberately NOT here

**No `baseline` schedule.** A committed curve that a change is an *offset*
against was specified and is not implemented, because no board has one: the
Hourly Board's seasonality used to be a formula and Peter removed it
(2026-09-18, *"I'll compose the seasonality from those changes"*). Every change
on every board is an ABSOLUTE level that holds until the next one. If a board
genuinely wants offsets, add the strategy *then* — with that board as the
consumer — rather than pre-stocking the shelf (AGENT_GUIDE, The #2 Rule).

**No roles or bands.** An entity carries its own `ranges`; deriving those from a
role is the consumer's step at fixture-build time, which is what keeps a fixture
from stating a range that disagrees with its own role.

**No lens helper in `src/fn`.** These forty lines are specific to this entity
shape — `"presence"`, the clamp against `ranges`, the carry-forward of untouched
measures — so a generic `set` in `src/fn` would not be these functions; it would
be a different function these would be written on top of. If a second consumer
inside `src/` ever wants a generic optic, that is the moment to promote a
`lensOf` primitive and rewrite these over it. Flagged, not done.

## The dial row is chosen by arity

| axes | component |
|---|---|
| 1 | `MutationSliders` |
| 2 | `PairedMutationSliders` |
| 3+ | `GroupedMutationSliders` (workshop; imported by folder path, not the barrel) |

Before `GroupedMutationSliders` landed (#161) a four-axis board had to be two
paired rows, because `PairedMutationSliders.measures` is a strict 2-tuple and
its `MeasureIndex` is `0 | 1` — so each row reported an index inside its own
pair and the view had to map it back. The grouped component reports a GLOBAL
index, so that mapping is gone rather than merely correct. `groupsOf` survives
to tell the narrow rows a config declares one row, and to read the captions.

## Traps this cost an hour each

**Curry once, at setup.** A curried SUI component is a new component function.
Build one inside a `createMemo` that reads a prop and every change remounts the
subtree; a slider row that measures itself in `onMount` then delivers a
measurement, which re-renders, which re-curries. The page wedges with an empty
console. A board's shape — axes, sentences, formatters, insets — is a module
constant, so read it once.

**`Show`'s `fallback` is eager.** A JSX element in that prop is constructed when
the `Show` is created, whichever branch wins. Use a conditional expression when
the branches build real components.

**A getter prop rebuilds the JSX inside it.** `props.mix` and `props.form` are
getters over the bench's object literals, so every read rebuilds whatever JSX
they hold. `MixOptions.header` and `BoardForm.body` are functions for that
reason — and `BoardForm.body` has to be one anyway, because `Modal` creates its
children lazily and that is what makes the form's `onMount` fire on every open,
which is when the first field wants the caret.

**Verify a board headlessly.** Both boards use `chartHeight="fill"` and
components that measure their own box, and AGENT_GUIDE is explicit that an
unforced measurement reads identically for a healthy build and a broken one. A
structural signature — frame box, per-tag counts, every chart's measured box,
the full `innerText`, the gauge's own sentence — is both cheaper and stricter
than a screenshot, and it is what proved the Hourly bench unchanged across this
refactor.
