# DistributionSparkline — promoting the goose bench prototype to pure SUI

**Status:** proposed, 2026-07-27 (rev 2 — the axis is a call-site prop, not an
enforced set; supersedes design #8195)
**Bench:** `workshop:goose-sparkline-summaries`
**Prototype:** `dev/showcases/workshop/goose-sparkline-summaries.tsx` (local, ~90 lines of hand-written SVG + a bench-local CSS file)

## The problem

The distribution sparkline we settled on over five rounds of iteration is not
SUI. It is raw `<rect>` / `<line>` / `<polyline>` / `<linearGradient>` inside a
showcase file, styled by a bench-local stylesheet. That means:

- **goose cannot use it.** There is nothing importable.
- It is the exact shape the doctrine forbids at a call site — geometry and paint
  hand-rolled where the component should have been.
- Its one hard rule (fixed plot height and y-axis) is enforced only by the fact
  that a single file happens to hold the constants.

## What is *not* changing

`Sparkline`, `TrendSparkline` and `HeartbeatSparkline` stay exactly as they are.
They remain the right answer when a number needs a trend line beside it and
nothing more. The new component is **additive**, for the case where the UX has
to say more about what it is presenting — how wide the range is, where the
typical band sits, how far the outliers reach.

The family header comment on each will name the choice, so the decision is made
at read time rather than by guessing:

> A tiny VALUE sparkline (data + trend colour, no axes). For a series that also
> needs its RANGE, typical band and mean, see DistributionSparkline.

## Where the axis comes from — the client's problem, not the component's

**The plot area is the same height and the same y-axis in every sparkline of a
set.** The moment one cell rescales itself, no two cells in a row can be
compared by eye and every mark in them is decoration.

**The component does not enforce that.** It takes a `yDomain` and draws to it.
Deciding what the set is, and therefore what the domain should be, is a
modelling exercise for the client — goose knows whether a summary row is "all
sources", "the sources matching the filter", or "one source over time"; SUI
cannot and should not guess.

There is precedent, and it is the same prop: `TrendSparkline` already takes
`yDomain`, documented as *"When provided, OVERRIDES the per-series auto-scale so
a group of sparklines drawn together can share ONE scale (apples-to-apples
heights)."* The new component follows that contract exactly, except that a
domain is required rather than optional — the encoding is meaningless without
one, since a per-series auto-scale makes every range box fill its rect.

The bench keeps its pooled-p95 derivation as *one worked example* of that
modelling, in the showcase where it belongs, not in `src/`.

## Proposed shape

### 1. `src/components/DistributionSparkline/`

Atomic, **Depth 1**. Owns `DistributionSparkline.css`, imports no sibling
components (same constraints as `Sparkline` and `TrendSparkline`).

```
DistributionSparkline/
  DistributionSparkline.tsx     base + createDistributionSparkline
  DistributionSparkline.css     all paint and stroke
  domain.ts                     optional derivation helpers (see below)
  variants.ts                   the curried variants
  index.ts                      barrel
  DistributionSparkline.test.tsx
  domain.test.ts
```

### 2. Call-site shape

```tsx
// The client decides what the set is and derives its axis — once, here.
const axis = p95DomainOf(map(prop("series"), sources));

<CardGrid>
  <For each={sources}>
    {(s) => (
      <CompactSurface>
        <TextLabel>{s.label}</TextLabel>
        <P95Sparkline values={s.series} yDomain={axis} />
      </CompactSurface>
    )}
  </For>
</CardGrid>
```

### 3. `domain.ts` — offered, never imposed

Two pure functions, exported alongside the component the way `trendOf` ships
with `TrendSparkline` and `domainOf` ships with `Chart`:

```ts
/** Pooled percentile band across a set of series, plus breathing room. */
export const p95DomainOf = (
  series: readonly number[][],
  band?: [number, number],   // default [0.05, 0.95]
  pad?: number,              // default 0.18
): [number, number];

/** True extremes across a set — when outliers matter more than legibility. */
export const extentDomainOf = (series: readonly number[][]): [number, number];
```

A client that wants a different rule — a fixed 0..100, a domain pinned to
yesterday's set, a per-terminal axis — writes its own and passes it. These
helpers exist so the common case is one call, not so it is the only case.

### 4. Prop split — Overrides vs Data

| Category | Props | Who sets |
|---|---|---|
| **Overrides** (baked into a variant) | `band`, `marks`, `width`, `height` | the variant, once |
| **Data** | `values`, `yDomain` | the call site, every time |

`yDomain` is **data**, not visual config: it is derived from the client's data
and carries meaning about which set this series belongs to. That is the same
judgement `TrendSparkline` already makes.

```ts
export type DistributionSparklineDataProps = Pick<
  DistributionSparklineProps,
  "values" | "yDomain"
>;

export function createDistributionSparkline(
  defaults: Omit<DistributionSparklineProps, "values" | "yDomain">,
): Component<DistributionSparklineDataProps>;
```

A call site passes values and a domain — no percentile pairs, no pixel
dimensions, no mark toggles.

Direction stays **derived**, never passed: `trendOf(first, last)`, reusing
`TrendSparkline`'s exported rule so the two components can never disagree about
what "up" means.

### 4. Curried variants — exactly one to start

Per the standing rule (start with one variant, expand only when a real caller
demands it):

```ts
/** Full encoding: min..max box, p5–p95 rules, mean hairline, trend shading. */
export const P95Sparkline = createDistributionSparkline({
  band: [0.05, 0.95],
  marks: { range: true, typical: true, mean: true },
});
```

Deliberately **not** shipping yet, each pending a real caller:

- `IQRSparkline` (p25–p75) — the bench's Region 2 comparison, not yet chosen
- `RangeSparkline` (box only, no rules) — if the p95 rules prove redundant
- a compact size — if a goose row needs one shorter than 100px

## Migration

1. **Promote.** New module, CSS moved out of the bench stylesheet, depth header,
   tests, `usage-manifest`, CHANGELOG entry.
2. **Helpers.** `domain.ts` + tests. Pure, no component dependency.
3. **Curry.** `variants.ts` with `P95Sparkline`; barrel exports the variant, the
   factory and the helpers.
4. **Rewrite the bench** to import from `src/` — that is the proof it is pure
   SUI, since the bench keeps zero SVG and zero local CSS for the sparkline.
5. **Fix the legend div.** `<div class="gs-legend-swatch">` is a hand-rolled
   `flex: 0 0 auto; width: 200px` — a layout-purity violation with no prototype
   excuse. Replace with a SUI Layout variant, width as demo geometry in CSS.
6. **Gallery showcase.** `showcase-coverage` counts any reference in `dev/`, so
   the workshop bench alone would satisfy the metric — but a workshop bench is a
   scratch space that gets cleared. The component needs a real gallery page.
7. **Gate.** `typecheck`, `vitest`, `health` (no regressions), rebuild `dist` for
   linked consumers.

## Decisions needed

1. **Naming.** `P95Sparkline` is precise and matches the language we have been
   using, but it is jargon at a call site. Alternatives: `SpreadSparkline`,
   `DistributionSparkline` as the variant with the base renamed. *Recommend
   `P95Sparkline`* — the percentile is the thing a reader needs to know.
2. **Is `yDomain` required, or optional with an auto-scale fallback?**
   `TrendSparkline` makes it optional because a lone trend line is still
   meaningful auto-scaled. Here it is not: auto-scaled, every range box fills
   its rect and the encoding says nothing. *Recommend required* — a missing
   domain is a modelling omission, and silently drawing something plausible but
   meaningless is the worst outcome.
3. **Ship the `domain.ts` helpers at all?** They are a convenience the client
   could write in five lines, and shipping them risks them being read as the
   sanctioned answer to a question that is genuinely the client's.
   *Recommend shipping them*, precedent being `trendOf` and `domainOf`, with
   the doc comment stating plainly that they are one rule among many.
4. **Do the p95 rules earn their ink?** On smooth series they sit within a pixel
   or two of the solid edges — the gap only opens where there are real tails.
   Arguably correct ("this one has no tails"), but it means four lines doing the
   work of two on most cells.
5. **Clipping feedback.** Currently silent apart from a caller-rendered count.
   Should a clipped series get a visible mark at the edge it exits through?

## Out of scope

- Building it from `Chart` slots. `Chart` owns margins, axes, responsive sizing
  and a drag subsystem; a 200×100 sparkline needs none of it. The standalone
  route matches how the three existing sparklines are built.
- Anything about the goose filter bar (`workshop:goose-filter-bar`), which is
  still a bare skeleton awaiting its own discussion.
