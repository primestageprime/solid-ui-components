# Progressive-disclosure filter bar

A filter bar that starts as one line and stays one line. Prototyped on a
workshop bench against twelve facet tables over a synthetic matchmaking
dataset, so the bar is exercised at every cardinality from 2 members to 500
before any of it is promoted into the catalog.

## The problem

Filter UIs habitually show every dimension a dataset has. A dozen pickers
occupy a block of vertical space, push the content down, and present the user
with eleven controls reading "all" so that they can change the one they care
about. In practice people filter on one or two dimensions; the rest stay at
"all" for the entire session.

**Requirement: in the 95% case the bar occupies exactly one line and the
content below it never moves.** Every expansion is an overlay, never a reflow.

## Shape of the bar

A single row, height-locked in CSS (`overflow: hidden`, popovers
`position: absolute`). It cannot grow, so it cannot push content down.

```
empty state:
┌──────────────────────────────────────────────────────────┐
│  1,204 of 4,000 dates                            (+)     │
└──────────────────────────────────────────────────────────┘

typical state:
┌──────────────────────────────────────────────────────────┐
│  Region: (Midwest ✕)(PNW ✕)   Intimacy: 4 ▾      (+)     │
└──────────────────────────────────────────────────────────┘
```

Interaction:

- **`(+)`** opens a menu of dimensions not yet filtered. Choosing one adds an
  empty filter group and focuses its combobox.
- **Combobox** within a group types ahead over that dimension's members. This
  is the only picker; there is no "show all 140 members" list anywhere.
- **Each selected term is a lozenge with an `✕`.** Removing the last term in a
  group removes the group.
- **Clicking a facet table's header** adds that dimension as an empty filter —
  a shortcut for `(+)` → pick.
- **Clicking a cell** toggles that member into its dimension's filter,
  creating the group if absent. This is the primary path; the bar is mostly
  something you *read*, not something you drive.

### Overflow

Per-group, degrading term by term rather than group by group:

- ≤2 terms → lozenges render inline.
- \>2 terms → the group collapses to `Region: 7 ▾`, whose popover holds the
  lozenges and the combobox.
- If collapsed groups still exceed the line, trailing groups collapse into a
  single `+2 ▾`.

The common one-or-two-filter case stays fully legible; the pathological case
degrades without ever changing the bar's height.

### Semantics

**OR within a filter, AND across filters.**

```
(region=Midwest OR region=PNW)
  AND (intimacy=4)
  AND (activity=climbing OR activity=trivia)
```

Uniform across every dimension, including ordinal ones — see *Non-goals*.

## Data model

The fact is **one date** — an outing that happened. "Number of dates" is
therefore a row count, not a derived attribute. The type is named `Outing` in
code because `Date` is taken by the language; the UI labels it "dates"
throughout.

```ts
type Outing = {
  id: string;
  occurredOn: string;          // ISO calendar date — the other sense of "date"
  participants: PersonId[];    // 2–6, long-tailed hard toward 2
  intimacy: 1|2|3|4|5|6|7;     // 1 stranger · 2 known · 3 familiar · 4 regular
                               // 5 friend · 6 inner circle · 7 intimate
  activity: string;
  region: string;
  outcome: "second-date" | "friends" | "no-follow-up" | "ghosted";
  durationMin: number;
  rating: number;              // 1–5
};

type Person = {
  id: string; name: string;
  gender: string;              // f, m, nb, agender, genderfluid
  orientation: string;         // 7 members
  ageBand: string;             // 8 bands
  tier: string;                // free, plus, concierge
  language: string;            // 28 members
  homeRegion: string;
};
```

People are a dimension joined through `participants`, not a second fact table.

### Derived fields

Computed once at generation time and stored on the outing, so the engine stays
a pure filter over flat rows:

- **`firstMeeting`** — whether any participant pair in this outing has an
  earlier outing together. Yes / no.
- **`partySize`** — `participants.length`, bucketed `2, 3, 4, 5, 6+`.
- **`genderComposition`** — the canonical sorted multiset of participant
  genders (`f+f`, `f+m`, `f+f+m`, …). Long-tailed; ~70 observed members.
- **`durationBand`** — `<45m, 45–90m, 90m–2h, 2–4h, 4–8h, 8h+`.
- **`month`** — `YYYY-MM` of `occurredOn`, 24 months.

**Matches** are pairs, derived by expanding each outing into its `C(n,2)`
participant pairs. A 4-person outing yields six matches. Match count and date
count diverge sharply, which is the point of allowing N-way outings.

### The twelve facet tables

| Facet | Rows | Kind |
|---|---:|---|
| firstMeeting | 2 | direct |
| outcome | 4 | direct |
| partySize | 5 | direct |
| gender | 5 | joined, set-valued |
| durationBand | 6 | direct |
| intimacy | 7 | direct, ordinal |
| orientation | 7 | joined, set-valued |
| region | 12 | direct |
| month | 24 | direct |
| genderComposition | ~70 | direct, long tail |
| activity | 140 | direct |
| people | ~500 | joined |

Each table carries 4–7 columns. Region, for example:
`Region | Dates | People | Avg intimacy | 2nd-date % | Median duration`.

Tables tile with flex via existing Layout variants (`WrappedClusterRow` and
friends) — no hand-rolled flex CSS, per the layout-purity commandment.

## Planted signals

Randomly generated demo data is flat: every facet stays proportional under
every filter, so filtering demonstrates nothing. The generator therefore plants
specific structure that is **only discoverable by combining filters**. These
are the acceptance criteria for the data, not decoration.

1. **Intimacy tracks prior outings.** Strangers cluster at first meetings;
   inner-circle at pairs with a dozen outings behind them. Filtering
   `Intimacy: 1` vs `Intimacy: 6` yields visibly different populations in every
   other table.
2. **Regions have activity signatures.** PNW over-indexes on hiking and
   climbing; Midwest on trivia and bowling; Southwest on hot-weather activities
   that vanish in winter months. Filter a region → the Activity table reorders
   dramatically.
3. **A region-locked activity.** "Midnight bowling" occurs only in the Midwest.
   Filtering that one activity collapses the Region table to a single row — the
   clearest possible demonstration of cross-filtering.
4. **The third-wheel effect.** `partySize: 3` has a markedly worse
   `second-date` rate than `partySize: 2`, but only among high-intimacy-intent
   outings. Requires two filters to see.
5. **Ghosting is an interaction, not a main effect.** Overall ghosting rate is
   unremarkable. `firstMeeting: yes` + `intimacy: 1` + `activity: drinks`
   concentrates it hard. Three filters deep; invisible at one or two.
6. **A supernode.** Two people have an outsized outing count and dominate the
   People table. Filtering to one reveals a distinctive activity and region
   profile unlike the population.
7. **Seasonality.** Group outings (`partySize ≥ 4`) spike in summer months;
   high-intimacy outings spike in February. Visible only once Month is crossed
   with partySize or intimacy.
8. **Composition skew.** Larger parties skew mixed; `f+f` pairs over-index on
   `outcome: friends` relative to their share of dates.
9. **Duration cuts both ways.** Outings under 45 minutes almost never produce a
   second date. Outings over four hours *at intimacy 1* are the strongest
   second-date signal in the data — a genuine reversal that only appears when
   duration and intimacy are filtered together.
10. **Deliberately flat facets.** Language, orientation, and age band are close
    to proportional under most filters. Not every dimension rewards
    investigation, and the bar should feel honest about that — this is the
    premise that most filters stay at "all".

Generation uses a seeded PRNG (mulberry32) so counts are stable across
reloads and assertable in tests.

## Architecture

Three units, each independently testable.

### 1. Engine — `matchmaking/engine.ts`

Pure functions over flat rows. No Solid, no components, no DOM.

```ts
type FilterState = Record<DimensionId, string[]>;   // absent or [] = no filter

applyFilters(outings: Outing[], state: FilterState): Outing[]
facetRows(outings: Outing[], state: FilterState, dim: Dimension): FacetRow[]
```

The load-bearing detail: **`facetRows` for dimension *D* applies every filter
except *D*'s own.** With `Region: Midwest` active, the Region table still shows
PNW and its count — otherwise selecting a second region would be impossible,
because the table would have already zeroed every alternative. Filters from
*other* dimensions do narrow the counts normally. This is standard faceted-
search behavior and it is the single easiest thing to get wrong.

Written in the functional idiom the repo ratchets on: `fn.pipe`, `fn.filter`,
`fn.map(f, xs)`, named steps, no dot-chains.

### 2. `FilterBar` — presentational

Knows nothing about the engine. Data in, callbacks out.

```ts
type FilterBarProps = {
  filters: {
    id: DimensionId; label: string;
    terms: { value: string; label: string }[];
    members: { value: string; label: string; count: number }[];  // combobox source
  }[];
  availableDimensions: { id: DimensionId; label: string }[];
  scopeLabel: string;                       // "1,204 of 4,000 dates"
  onAddFilter: (id: DimensionId) => void;
  onRemoveFilter: (id: DimensionId) => void;
  onAddTerm: (id: DimensionId, value: string) => void;
  onRemoveTerm: (id: DimensionId, value: string) => void;
  onClearAll: () => void;
};
```

Collapse decisions (inline lozenges vs `▾ 7`) are the bar's own presentational
concern, computed from term counts and measured width — not something the
caller configures.

### 3. `FacetTable` — presentational

```ts
type FacetTableProps = {
  title: string;
  columns: { id: string; header: string; align?: "start" | "end" }[];
  rows: { value: string; cells: (string | number)[] }[];
  activeValues: string[];
  onHeaderClick: () => void;
  onCellClick: (value: string) => void;
};
```

Active rows carry a selected treatment. The table does not know what filtering
is; it knows which of its rows are marked and who to call when one is clicked.

### Wiring — the bench

The bench owns `FilterState` as a signal, calls the engine, and passes results
down. It is the only place the three units meet.

## File layout

```
dev/showcases/workshop/matchmaking-filter-bar.tsx   ← the bench (auto-discovered)
dev/showcases/workshop/matchmaking/
    generate.ts          seeded generator + planted signals
    generate.test.ts     asserts each planted signal is present
    dimensions.ts        the twelve dimension definitions + column specs
    engine.ts            applyFilters, facetRows
    engine.test.ts       incl. the exclude-own-dimension rule
    FilterBar.tsx / .css
    FacetTable.tsx / .css
```

The bench glob in `dev/main.tsx` is `./showcases/workshop/*.tsx` — depth 1
only — so the `matchmaking/` subdirectory holds helper modules without
registering spurious benches. The bench itself is created with
`node scripts/workshop-new.mjs matchmaking-filter-bar`.

Components live on the bench until the API settles, then go through
`/promote`. Nothing is added to the catalog, the barrel, or `COMPONENTS.md` as
part of this work.

## Testing

- **`engine.test.ts`** — OR-within/AND-across; empty state is identity; the
  exclude-own-dimension rule for `facetRows`; set-valued joined dimensions
  (gender across N participants); `C(n,2)` match derivation for N-way outings.
- **`generate.test.ts`** — every planted signal from the list above is
  assertable and present at the fixed seed. This is what stops the data from
  silently regressing to noise.
- **Component tests** — deferred to promotion. Benches are prototypes.

## Non-goals

- **Range selection on ordinal dimensions.** Intimacy is 1–7 and users will
  often mean "4 and up", but it is treated as seven ordinary members like every
  other dimension: uniform engine, no special case. Adding a range picker later
  is additive to one dimension, not a rework. Per the start-minimal rule, it
  waits for a real caller.
- **Saved views / presets.**
- **URL persistence of filter state.**
- **Promotion into the catalog.** Explicitly the next phase.
- **Sorting, pagination, or virtualization** of the facet tables. The 500-row
  People table gets a max-height and scrolls.
