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

## Raw-table analysis (2026-07-17, from the JTF Table Catalog bench)

The 20 raw replicas decompose into exactly these needs. Coverage: shipping
items 1–6 migrates 15 of 20; the runtime-specs pattern covers 2 more (OCR,
HourlyDataTable pivot); 2 stay raw by design (grouped headers, spanRow);
PowerLogPanel ×3 is retired at jtf HEAD (dead debt).

### New curried column types / factory options (demand-ranked)

1. ~~**`statusCol`**~~ — SHIPPED 2026-07-18 (ruled):
   `statusCol(key, map, { header? })` — a mapping of valid values →
   `{ label, tone }`; tone resolves to the theme badge variant; null renders
   blank; unmapped values render as quiet muted text. First consumer:
   MissingInfoPreview. Remaining demand (ViolationsPreview, NoxWidgets CE
   projection, fortnight list, durability) migrates on the same type; the
   `href` option is still pending (item 2).
   Sibling SHIPPED 2026-07-18: **`listCol(key, { max?, header?, item? })`** —
   comma list with +N-more overflow and full-list tooltip (MissingInfoPreview
   vessels; item formatter for object lists).
2. ~~**`href` link cell**~~ — SHIPPED 2026-07-18 as
   **`identityLinkCol(key, { href, glyph?, header? })`** (ruled: an entity
   with a detail page displays its name AS the link by default — the
   IdentityLink cell; configure-time `href(row)`, optional `glyph(row)`, name
   geometry, blank empty). First consumer: ViolationsPreview vessel column
   (which also RETIRED its linked DateTimeCell — the identity link owns
   navigation, connected_at went back to a plain dateTimeCol). Remaining
   href demand (fortnight list period cells, qaqc-checks week cells,
   index/nox-report VesselName columns) migrates on this type; an `href`
   option on non-identity cols (textCol/dateTimeCol/statusCol) is now
   demand-unproven — re-rank if a caller shows up that isn't an identity.
3. ~~**Derived accessors**~~ — SHIPPED 2026-07-18 (ruled): every scalar
   factory (`intCol`/`floatCol`/`durationCol`) accepts `(row) => value`
   alongside `keyof T`, with an explicit `{ id, header }` when derived; the
   accessor and sortValue share the one reader. First consumers (jtf):
   MetricsStatsTable (union-guarded int/float derived sources — the
   `MetricStats` arm reads null → blank), Durability + 1000-Hour manifest
   (durationCol fed minutes derived from the two instants — in-progress →
   blank), HourlyDataTable (runtime-built floatCol per metric reading the
   row's Map). `dateTimeCol` gained a sibling `timeZone`
   ("America/Los_Angeles") that renders a raw instant zoned, retiring the
   pre-formatted Pacific-time string columns (1000-Hour manifest). (Computed
   row AVERAGES are covered by avgCol — SHIPPED 2026-07-18:
   `avgCol(keys, { header, precision, tone })`, mean of the configured fields,
   null-skipping, BLANK when empty, accent tone by default. Consumed by jtf
   power-log-ocr.) Feeding durationCol minutes via a derived accessor retires
   every pre-formatted duration string.
4. ~~**`placeholder?: string`**~~ — REJECTED 2026-07-18 (ruled): "Empty
   placeholder shouldn't be a thing. If the value is empty, just show an
   empty cell." No opt-in, no exceptions — null renders BLANK, full stop.
   Migrations drop existing placeholder strings (durability's nullable
   disconnected_at → blank; PowerLogCacheView's '—' literals → blank).
5. ~~**name recede knob**~~ — SHIPPED 2026-07-18 (ruled): the "name tone"
   demand resolved to a single `muted?: (row) => boolean` recede knob on
   `nameCol`/`identityLinkCol` (a boolean, NOT the Tone vocabulary — int/
   float/text keep their `tone` fn). `identityLinkCol` landed as the
   vessel-name column in Durability + 1000-Hour manifest (name IS the link to
   `/detail/:id`, type glyph); the `muted` knob itself still awaits a recede
   consumer (bag-state names in nox-report preview, coverage cells in index).
6. ~~**`suffix?: string` on floatCol/intCol**~~ — SHIPPED 2026-07-18 (ruled):
   "%", "ppm", "kW" rendered in muted ink inside the cell; the geometry
   auto-widens by the suffix glyphs. First consumers (jtf): VesselCallNoxDetail
   + VesselCallRogDetail pct columns ("%") and the 1000-Hour manifest
   completeness ("%"). Remaining ppm demand (NoxWidgets) rides the same option.

### Table-level FieldTable features

7. ~~**`sortable`**~~ — SHIPPED 2026-07-18 (ruled): table-level mode —
   **`SortableFieldTable`** (curried; or `sortable` on FieldTable). A
   sortable table makes EVERY column sortable except types with no valid
   sort (selection/actions/list/chart); no per-column opt-out. Mechanics:
   `sortValue?: (row) => raw` on TableColumn — field accessors return JSX,
   so BaseTable's comparator now prefers the raw channel (this also fixes
   the latent broken sort on all pre-existing field columns). col() takes
   sortValue as its 5th arg. First consumer: ViolationsPreview (12 cols).
   Remaining demand (QaqcAssetTriage, nox-report preview, MetricsStatsTable)
   rides free on migration.
8. **`onRowClick`** — row navigation (index dashboard).
9. **`rowTone?: (row) => Tone | "highlight"`** — the semantic replacement
   for getRowClass (NoxWidgets baseline-row highlight). Note: tones being
   theme-var-driven also retires NoxWidgets' hand-rolled colorblind remap.
10. ~~**`filter?`**~~ — SHIPPED 2026-07-18 (ruled): NOT a FieldTable prop —
    **`TableQuickFilter`**, the composable client-side filter module
    (toolbar: input + shown-of-total count; children get the filtered-rows
    accessor and render ANY table). FilterableTable is now BaseTable
    composed with it. First consumer: ViolationsPreview
    (TableQuickFilter + SortableFieldTable). Sibling note: the generic
    `components/QuickFilter` (ThemedInput collection filter) predates it;
    table chrome + table matching semantics live in TableQuickFilter.
11. **`headerHint?: string`** — tooltip on a column header (qaqc-checks) —
    weakest demand, candidate only.

### Stays raw / out of model

- HourLevelDataTable — grouped/spanned headers.
- qaqc-checks — per-row `spanRow` colspan (its cells could still take
  items 2/6/7).
- PowerLogPanel ×3 — component retired at jtf HEAD 2026-07-17; drop from
  the worklist.
