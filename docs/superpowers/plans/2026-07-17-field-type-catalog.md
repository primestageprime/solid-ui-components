# Field-type catalog — closing the consumer gap (2026-07-17)

Companion to `2026-07-16-semantic-props-metric.md` §3a. Input: the 2026-07-17
consumer survey — real SUI table call sites are jtf-ui (~30 tables), thorcasting
(2), lapsedog (1); amygdala is TanStack, rhinotools is raw HTML, dside/pmail
have no tables. This catalog names the field types / factory options that close
the moderate tier, and draws the line where the fields model deliberately stops.

## Ruling (Peter, 2026-07-17)

Columns may be configured with a **function `(value, row) → treatment`** at
registry/configure time — never CSS at the call site. If the pattern is generic,
it becomes a curried column type in SUI; if it is custom, the *function* is
passed into the factory at configure time. The client names meanings; the theme
owns colors.

## Shipped today

| Mechanism | Covers (survey evidence) |
|---|---|
| `tone?: (value, row) => Tone` on `intCol`/`floatCol`/`textCol`; `Tone = default·success·warning·danger·accent·muted` | MIN/MAX type coloring (MinMaxTable), aux-kW value coloring (PowerLogCacheView, PowerLogPanel), threshold/compliance coloring (VesselCall detail ppm cells), completeness traffic light (thousand-hour), count emphasis when non-zero (fortnight index), conditional data-status text (durability) |
| `FieldTable` (`data` + `fields` gesture + `registry`, `emptyMessage`, semantic `maxRows` scroll cap) | Removes the hand-assembled `sui-field-frame` + CSS vars; replaces `maxHeight="300px"`-style caps with a row count |

Note: a dedicated "compliance/metric col" and "count col" are NOT needed —
`floatCol`/`intCol` + a tone function already express them. Do not mint types
whose only delta is a baked-in tone function.

## Proposed next (demand-ordered; each needs a real caller at migration time)

1. **`href` on `nameCol`/`textCol`** — `href?: (row) => string` (or an
   `onNavigate` callback), rendering the cell as a route link. Demand:
   `VesselName` first columns (5+ files), `AccentRouteLink` period/week cells
   (fortnight index, qaqc-checks), linked StatusCell. This is the single most
   recurring custom cell.
2. **`statusCol(key, { tone, label? })`** — the status badge as a known field:
   value → label map + tone fn, rendered as the standard badge at status
   geometry. Demand: StatusBadge in ViolationsPreview, MissingInfoPreview,
   fortnight index, NoxWidgets CE projection.
3. **Derived values: accept `(row) => value` alongside `keyof T`** in the
   scalar factories (with explicit `id`/header when derived). Demand: Pacific
   timezone strings (PowerLogPanel, thousand-hour), durations derived from two
   timestamps (durability, index.tsx — feed `durationCol` a derived seconds
   value instead of a pre-formatted string), computed row averages
   (power-log-ocr, PowerLogCacheView).
4. **Table-level sorting on `FieldTable`** — surface BaseTable's `sortable`
   through the resolved columns and kill hand-rolled JSX sort headers.
   Demand: QaqcAssetTriage (11 cols), nox-report preview. Unblocks two of the
   HARD sites.
5. ~~**`selectionCol` select-all header**~~ — SHIPPED 2026-07-17 (ruled):
   `createFieldSelection({rows, key})` + `selectionCol(selection)` gives the
   select-all/none header (indeterminate over partial) AND shift-click range
   selection over the current sort order.
6. **Confirmable `actionCol`** — two-click delete→confirm/cancel cluster with
   internal state. Demand: thorcasting ForecastSnapshotsPanel.
7. **`onRowClick` on `FieldTable`** — semantic row navigation. Demand:
   dashboard index.tsx (navigate to detail).

## Workable, with care

- **Runtime-built specs** (pivots with a metric column per data key —
  HourlyDataTable, OCR aux columns): the fields gesture is plain data, so a
  memo can build `[...keys.map(k => fields.floatCol(...))]`. Legal today; the
  registry-of-known-ids ergonomics degrade to "specs built in code," which is
  acceptable for genuinely dynamic shapes.

## Where fields deliberately stops (stay on BaseTable raw, or a dedicated component)

- **Value matrices** — SHIPPED as `ValueMatrix` 2026-07-17 (ruled): a
  dedicated axis × axis component (rows, cols, value(row,col), tone fn,
  selected fn). jtf's ComplianceThresholdTable is now a thin wrapper over it;
  fits thorcasting viable-price × salaries next.
- **Per-row colspan** — qaqc-checks `spanRow` (partial weeks collapse into one
  spanning action cell).
- **Grouped/spanned column headers** — HourLevelDataTable `group`.
- **Conditional row styling** — NoxWidgets `getRowClass` highlight row;
  colorblind-toggle-reactive column recoloring.
- **JSX tooltip headers** (`headerHint` in qaqc-checks) — would need a
  semantic `headerHint?: string` before it fits; not modeled yet.
- **Runtime-computed header text** (OCR "kW/train" vs "Total kW") — workable
  via runtime-built specs, but flagged: headers that change with data are a
  smell.

## Migration state (this pass)

Easy tier migrated to `FieldTable` + fields: jtf StatisticsSummary,
MinMaxTable, ftir-gap-fill gaps table, power-log-ocr table, FortnightReportBody
×7 metric tables. Remaining moderate tier waits on catalog items 1–3;
hard tier on 4–5 or stays raw.
