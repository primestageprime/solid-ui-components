# Handoff: tables always use value renderers; dates never wrap; widths scale to the data

Date: 2026-10-16. Branch `feat/table-renderers`, diddit #85. Peter, on the
FTIR/SCR grouped-header demo whose Hour column wrapped `2026-01-15 08:00` onto
two lines: "Ensure that you're always always using value renderers in tables.
Dates (for example) should never wrap to 2 lines because they should have a
fixed width scaled to the size of the data."

## What changed

- **Column helpers size to the data** (`src/components/Table/columnHelpers.tsx`).
  `dateTimeCol`, `dateCol`, `intCol`, `floatCol`, `textCol` and the new
  `statusCol` take `data` (rows) or `values`; width = longest *rendered* value
  in `ch`, floored at the header, plus 32px cell padding. Dates size from their
  pattern with no sample; `precision: "minute"` paints `YYYY-MM-DD HH:mm`.
  Every helper carries `sortValue` and passes `group`/`ellipsis`/`contained`/`align`.
- **Int and float cells are `white-space: nowrap`**, like the date cells.
- **Every gallery table** (10 showcases, 57 columns, plus the workshop
  tree-table bench and CensusView's schema sub-table) renders through a helper
  or an explicit cell renderer.
- **Enforcement.** Health metric `bareAccessorColumns` (ceiling 0,
  `scripts/bare-accessor.mjs`) fails on `accessor: "key"` under `src/`, `dev/`
  or in `catalog.json`. `BaseTable` warns once per column in dev mode when a
  bare keyed accessor paints an ISO date/time (`bareAccessorWarning.ts`).

## Proof

`hour-column-observation.json` is the headless observation behind the shots:
each Hour cell of the FTIR/SCR demo, its painted width and line count, before
and after, per theme and viewport. Reproduced here:

| State  | Theme   | Viewport | Hour cell width | Lines per Hour cell |
|--------|---------|----------|-----------------|---------------------|
| before | hud     | 1280     | 90px            | 2                   |
| before | hud     | 390      | 90px            | 2                   |
| before | default | 1280     | 90px            | 2                   |
| before | default | 390      | 90px            | 2                   |
| after  | hud     | 1280     | 138px           | 1                   |
| after  | hud     | 390      | 138px           | 1                   |
| after  | default | 1280     | 138px           | 1                   |
| after  | default | 390      | 138px           | 1                   |

138px is `calc(16ch + 32px)` at the table's 13px font: the width follows the
data (`2026-01-15 08:00` is 16 characters), not a hard-coded 160px.

## Shots

Named `<showcase>-<theme>-<viewport>-<before|after>.png`. Full-page gallery
captures of three tables in `hud` and `default` at 1280 and 390 wide, plus
`ftir-scr-*` crops of the grouped-header table alone.

- `ftir-scr-*` — the demo Peter flagged. Before: Hour wraps to two lines, raw
  text status. After: one line, data-sized column, `StatusCell` badges, `IntCell`
  samples.
- `base-table-*` — the whole BaseTable showcase (vessel table, fit demo, curried
  variants, grouped header).
- `section-table-*` — SectionTable's bound unit: `MoneyCell` revenue, `dateCol`
  since, `intCol` orders.
- `table-grids-*` — the 400-booking TableQuickFilter table: text columns sized
  to the data, `intCol` berth hours and TEU.

At 390 the gallery shell keeps its 260px sidebar, so the content column is
clipped by the viewport; the capture still shows the date column intact on one
line, which is the claim under test. Making the gallery shell responsive is a
separate piece of work.

## Reproduce

Two dev servers (before = `origin/main`, after = this branch), then the script
`table-renderers-shots.cjs` kept in the session scratchpad: Playwright 1.60
(`dside-ui`'s install, `NODE_PATH`), sets `localStorage.sui-theme`, visits
`#/base-table`, `#/section-table`, `#/table-grids`, screenshots, and reads the
Hour cells' geometry. The observation is printed as a text table and written as
JSON before any picture is looked at.
