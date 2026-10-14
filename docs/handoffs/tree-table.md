# Handoff: extract TreeTable from the tree-table bench

Date: 2026-10-14. Branch `workshop/tree-table` (not pushed). The bench is
`dev/showcases/workshop/tree-table.tsx` plus `tree-table-kit/`; nav id
`workshop:tree-table` at `npm run dev` (port 6006).

Adlai approved the bench's look and behaviour on 2026-10-14 ("looks great").
Peter has NOT confirmed any extraction. The AGENT_GUIDE § The #2 Rule gate
applies to every row of the proposal below.

## The gate: Peter's answers first

Put these to Peter (through Adlai). Extract only what he approves.

1. **Consumer.** Which shipping screen renders TreeTable? The candidate is
   thorcasting-ui's Import "Manual" step (config groups over payment rows).
   On 2026-10-14 that screen existed only as the `manual-group` bench; no
   thorcasting-ui table had expandable rows. No consumer means no extraction.
2. **Parent row form.** Aggregate cells (table A) or one spanning summary cell
   (table B)? The bench recommends A: it matches the fields ruling in
   `src/components/Table/fields/combinators.tsx` (`withWhen`), and B puts its
   summary under the Qty header.
3. **Depth.** The bench supports any depth at no extra cost. Confirm.
4. **Surface.** `BaseTable` only, or `FieldTable` too?
5. **Checkbox position.** Inside the indented Item cell (bench) or a separate
   leading column (aligned boxes, no indent)?
6. **The proposal table below**, one approval per row.

| Proposed | Kind | What no existing part does | Why a variant can't |
|---|---|---|---|
| `TreeTable` | Composite, Depth 2 | Flattens a tree into BaseTable rows; draws indent + disclosure chevron in the first column; optional leaf-derived checkboxes; sorts siblings within each parent | BaseTable has no hierarchy, and its sort reorders the flat list (table E) |
| Indent rail Primitive (name open, e.g. `IndentRail`) | Primitive, Depth 1, owns CSS | The NestedList 12px step + 1px guide rail around arbitrary content, outside a `role="list"` | NestedListItem carries `role="listitem"`, wrong inside a `<td>`; its rail CSS is private |
| Compact disclosure Button curry | Curried variant | A 24px square ghost button with no side padding | `GlyphSlotGhostButton` has 12px side padding; the bench overrides it from outside |
| BaseTable controlled sort (`sort` + `onSortChange`) | Prop expansion | Lets a parent own the sort and reorder rows itself while BaseTable draws the headers | Sort state is internal (`createSignal` in `BaseTable.tsx`); no hook exists |

## Settled by the bench

These are the bench's working rules. Carry them into `src/` unchanged.

- **Flatten** (`tree-table-kit/flatten.ts`): depth-first pre-order; a collapsed
  parent hides its whole subtree; inner `expanded` keys survive a collapse;
  `undefined` and `[]` children are both a leaf; `compare` sorts siblings at
  every level. Tested in `flatten.test.ts`.
- **Selection** (`tree-table-kit/selection.ts`): the selected set holds LEAF
  ids only; a parent's state is derived (all → checked, some → indeterminate,
  none → unchecked); toggling a parent adds or removes all its leaves; a
  virtual root gives select-all. Tested in `selection.test.ts`.
- **Controlled only**: `expanded: ReadonlySet<string>` + `onToggle(id)`;
  `getRowId` names the id, as on `SelectableTable`.
- **A11y**: plain table + disclosure button (`aria-expanded`, "Expand X" /
  "Collapse X" label). No `role="treegrid"`: nothing provides the arrow-key
  contract, the same argument as the NestedList entry in `COMPONENTS.md`.
  Leaf rows hold a `ReservedGlyphSlotButton` (hidden, `tabindex=-1`) so labels
  align.
- **Clicks**: a row click on a parent toggles it; the chevron and the checkbox
  stop propagation, so one click is one action.
- **Geometry**: chevron left edge meets the cell content edge (the slot is
  pulled 6px left); 12px per level.
- **Sort cycle**: none → asc → desc → none, as BaseTable. Parents sort by their
  aggregate values. Use the existing `TableColumn.sortValue` as the sibling
  comparator source, so columns need no new field.

## Bench shortcuts that must not reach `src/`

Each one is replaced by a row of the proposal table.

- `tree-cell.tsx` borrows `sui-nested-list__row--indent-N` → the indent rail
  Primitive.
- `tree-cell.css` overrides `.sui-btn` padding and margin → the Button curry
  (geometry from CSS, not a baked inline `style`: `inlineStyleSrc` is
  ratcheted).
- `sort.tsx` / `sort.css` draw their own header buttons and borrow
  `hud-table__sort-indicator` → BaseTable controlled sort.
- `tree-table-kit/data.ts` is fixture data and stays on the bench.

## Known gaps to report, not fix

- The guide rail breaks between rows: cell padding sits outside the rail box.
  The indent Primitive must paint the full cell height.
- Rows with a checkbox are a few pixels taller than rows without.
- BaseTable cannot set `aria-sort` on a `<th>` it does not sort.

## Steps after Peter answers

1. Run `/sui-build tree-table`. Its Step 3 table is the proposal table above;
   start from Peter's answers instead of re-deriving it.
2. Extract the approved rows in this order: indent rail Primitive, Button
   curry, BaseTable controlled sort, then `TreeTable`. Each one lands with its
   folder, depth header, mounting test, showcase, catalog entry, barrel export,
   `COMPONENTS.md` entry and CHANGELOG line before the next starts.
3. Rewire the bench onto the barrel. Tables A–D render as before; table E
   stays as the counter-example until BaseTable's built-in sort is addressed.
4. Done when `npm run typecheck:dev`, `npm test`, `npm run health`,
   `npm run bundle-budget` and `npm run build` pass, `npm run catalog` is
   fresh, and this handoff is deleted (move anything durable to `docs/adr/`).
