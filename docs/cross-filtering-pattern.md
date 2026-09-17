# Cross-filtering tiles — the pattern, and why it is not a component

Several breakdown tiles over ONE row-grain fact. Each tile groups the fact by
its own dimension. Clicking a row toggles that member into a shared filter, and
every tile — plus the metric row — re-aggregates against it at once. The same
filter is also editable from a chip row.

This note preserves the rules from the `workshop:cross-filtering` bench
(2026-07-28 → 2026-09-16). The bench was deleted because the pattern is
consumer-side aggregation composed from components SUI already ships —
`SectionTable` for the tiles, `MultiSelectFilter` for the chips, `MetricCard`
for the totals — and SUI keeps domain arithmetic with the consumer (compare
`TreeDiffChart`: the chart owns nothing about how the diff is computed). A
pattern enters the library by **Migration** out of a consumer app that has
proven it, not by being drafted here first (see `CONTEXT.md`).

## Four behaviours — each one is a bug if you drop it

1. **Two-way toggle.** A row click adds the member; clicking the same row again
   removes it. The chip row and the tiles edit ONE filter, so they can never
   disagree.

2. **Own-dimension exclusion.** A tile applies every active filter EXCEPT its
   own. Without it, selecting a member collapses that tile to a single row —
   and since the toggle-off click lives on the rows, the other members you
   would switch to are gone. It is what keeps a row click reversible, not a
   display nicety.

3. **Rank before cap, then pin.** Ranks are assigned over the FULL ranked list
   and the top-N cap is applied after, so a rank means the same thing whether
   or not the tile is capped. A selected member that ranks below the cap is
   then appended, carrying its TRUE rank. Cap-then-rank drops the selection off
   the bottom of a capped tile: the tile keeps showing its unfiltered top N
   while every other tile has narrowed, and — because rule 1 puts toggle-off on
   the row — there is no way to clear the filter you just set. Tiebreak
   equal values alphabetically so members don't shuffle between renders.

4. **Empty means all.** No selection in a dimension is no filter on it, rather
   than a filter matching nothing. This is also `MultiSelectFilter`'s own
   convention, so the chips need no "all" pseudo-member.

Composition is AND across dimensions, OR within one — pick two genres and you
get either genre; add a format and you get (either genre) AND that format.

## The mechanism is two pure functions

```ts
type FilterSet = Partial<Record<Dim, string[]>>;

// OR within a dimension, AND across them; `except` drops one dimension (rule 2).
const matches = (row: FactRow, filters: FilterSet, except?: Dim): boolean => {
  for (const d of DIMENSIONS) {
    if (d === except) continue;
    const sel = filters[d];
    if (!sel?.length) continue; // rule 4
    if (!sel.includes(row.dims[d])) return false;
  }
  return true;
};

// Group by `dimension`, rank the FULL list, cap, then pin any selected member
// the cap excluded — it keeps its true rank (rule 3). Pure: no signals read
// here, so the memo that calls it owns the reactivity.
const tileRowsFrom = (src, dimension, filters, topN?) => { /* see rule 3 */ };
```

## Deliberately not part of the pattern

Persistence (the consuming app encodes the filter in its URL), the data layer,
and grain. The mechanism is a filter over an array of rows; it does not care
where the rows came from or what a row means.

## If a consumer app builds this

Build it there, with the two functions above under test (rule 3 has a
regression case: pick a member ranked below the cap in a capped tile, then
clear it from the row). If a second app needs the same engine, that is the
moment to migrate it into SUI.
