# Handoff: TreeTable for thorcasting-ui's Import "Manual" payments table

Date: 2026-10-14. SUI adds `TreeTable`, `IndentRail`, `DisclosureButton` /
`ReservedDisclosureButton` and BaseTable's controlled sort in the release after
0.218.0 (the `## Unreleased` section of `CHANGELOG.md` names them). Peter
confirmed all four on 2026-10-14.

## What to build

The payments table on the right of the Import "Manual" step: one expandable
row per config, its payment rows under it. Today the only build of it is the
SUI bench `workshop:manual-group` (`npm run dev`, port 6006), file
`dev/showcases/workshop/manual-group-kit/payments-table.tsx`. That bench
flattens the rows by hand and toggles them through `BaseTable.spanRow`. Build
the thorcasting-ui screen on `TreeTable` instead. The reference composition of
TreeTable itself is the bench `workshop:tree-table` and the gallery entry
`tree-table`.

## SUI parts

| Region | Component | Props it needs |
|---|---|---|
| Payments table | `TreeTable` | `data`, `columns`, `childrenOf`, `getRowId`, `getRowLabel`, `expanded` + `onToggle`, `compact`, `hoverable` |
| "Not covered" rows | `TableSectionHeader` above a plain `BaseTable`, or the uncovered payments as root leaves | see *Known gaps* |
| Amount cells | `MoneyCell` or the bench's text variants | per column |

## The model

- **One row type.** TreeTable is generic over ONE `T`. Wrap both kinds in a
  union: `{ kind: "config"; id; config }` and `{ kind: "payment"; id; config;
  payment }`. `childrenOf` returns a config's payments and `undefined` for a
  payment.
- **Ids.** Unique across the whole tree. Use `${payee.key}${config.id}` for a
  config (the bench's expand key) and `rowKey(payment)` scoped by config for a
  payment, because one payment can sit under two configs.
- **Parent cells.** A config row shows its own aggregates in every column, for
  example the summed amount and the count (ruled by Peter 2026-10-14: aggregate
  cells, not a spanning summary).
- **Expanded.** Controlled: a `ReadonlySet<string>` of config ids in the screen's
  store, toggled by `onToggle`.
- **Sort.** Give columns `sortable` + `sortValue`. TreeTable sorts configs
  among themselves and payments inside each config.
- **Checkboxes.** Only if the screen needs them: `selection={{ selected,
  onChange }}` holds payment ids (the leaves).

## Assumptions

- The consumer is this screen — *ruled by Peter* (2026-10-14, relayed by Adlai).
- One level of nesting is enough here; TreeTable supports any depth — *assumed here*.
- No checkboxes on this table — *assumed here*. The bench has none.

## What stays in thorcasting-ui

The row union and its builder, the money formatters, the deviation text and
the early/late tags (bench `model.ts`: `dev`, `inBand`, `inWindow`), and the
expanded-set store.

## Known gaps

- **No spanning rows.** TreeTable does not take `spanRow`, so the bench's
  "NOT COVERED BY ANY CONFIG · N" section row has no direct equivalent. Leave a
  TODO and use a `TableSectionHeader` with its own table, or render the
  uncovered payments as root leaves. Do not hand-roll a spanning row.
- **The guide rail breaks between rows**, because cell padding sits outside the
  rail box. It is a known SUI gap, not a consumer bug.
- **Row click.** A click on a config row toggles it; TreeTable takes no other
  row-click handler yet.

## Done when

The thorcasting-ui Import "Manual" payments table renders through `TreeTable`
with the bench's columns, config rows expand and collapse, and this file is
deleted.
