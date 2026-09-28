# PivotGrid family — consolidation queued (2026-09-28)

**What:** `HeatPivotGrid` and `LinkPivotGrid` (`src/components/PivotGrid/`) are
both zero-logic curried variants of `PivotGrid` — each is a same-signature
wrapper function that just narrows one optional prop to required (`getCellHeat`
for `HeatPivotGrid`, `cellHref` for `LinkPivotGrid`) and forwards everything
else straight to `<PivotGrid {...props} />`. They differ from each other only
by which single cell-treatment hook they force.

**Why:** two near-identical wrapper components for a distinction that is a
single required prop is the same shape `createButton`/`createPanel` factories
solve everywhere else in SUI (Overrides/DataProps split baked at the curry
site). Peter ruled (2026-09-27/28) that these should fold into one factory
with two curried variants later, rather than staying as two hand-written
function components. This is documented now, not fixed now — no source
changes in this pass, consistent with the ruling's own "consolidation
queued" framing.

**API to preserve:** the fold must keep, unchanged at the call site:
- `HeatPivotGrid<RowKey, ColKey, Cell>` — same generic signature, `getCellHeat`
  still required, everything else identical to `PivotGridProps`.
- `LinkPivotGrid<RowKey, ColKey, Cell>` — same generic signature, `cellHref`
  still required, everything else identical to `PivotGridProps`.
- Both remain distinct named exports from `src/components/PivotGrid/` and the
  root barrel — this is an internal implementation fold (two functions →
  `createPivotGrid` + two curried call sites), not a public rename or merge.
