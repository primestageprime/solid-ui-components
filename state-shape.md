# SUI state-shape index

**SUI version:** 0.136.0 (published). Scope: components used by `goose-ui`'s `/reports`
slice (`goose/goose-ui/src/routes/reports.tsx`, `routes/reports/[code].tsx`,
`components/ReportCharts.tsx`, `components/ReportHeader.tsx`) — a
production, zero-custom-styling reports UI (need `#4097`, "Goose UI on
SUI"). Shapes below are usage-derived (read from goose-ui's actual prop
usage, cross-checked against `sui-runtime-exports.txt` for existence) rather
than `.d.ts`-derived, since `.d.ts` is per-component-file and this pass
prioritized breadth over exhaustively tracing each file. All 20 entries below
are confirmed present in `sui-runtime-exports.txt` (not phantom).

| Component | State it owns | Renders | Serves |
|---|---|---|---|
| `createSection` | factory `{compact?, fill?}` → `Section({title, children})` | page-section wrapper, bounded flex column | route/page section, full-height panel host |
| `SidebarPanel` | `{width, children}` | fixed-width side panel | master list pane, filter rail |
| `PaneRow` | `{children}` (sidebar + fill pair) | flex row: fixed sidebar + growing column | master-detail split, split pane |
| `FillColumn` | `{children}` | growing flex column, fills remaining width/height | detail pane, main content column |
| `TightSpreadRow` | `{children}` (2 children spread apart) | flex row, space-between, tight gap | header row, label+badge row |
| `NavLink` | `{href, active, onClick, children}` | styled nav anchor | sidebar list item, nav link |
| `Tooltip` | `{content, children}` | hover tooltip wrapper | tooltip, hint text |
| `createStatusBadge` | factory `{size}` → `Badge({variant, label})` | colored status pill | status indicator, readiness badge — **`StatusBadge` itself is phantom, see false-friends.md** |
| `createPanel` | factory `{size, fill?}` → `Panel({title?, children})` | bordered content panel, scrolls internally when `fill` | detail card, content panel |
| `NarrowStack` | `{children}` | vertical stack, narrow max-width | form layout, report body stack |
| `createBaseTable` | factory `{fit?, compact?, stickyHeader?, hoverable?}` → `Table({columns, data, onRowHover?})` | data grid | **BI table, data table, report grid** |
| `ScrollFillBox` | `{children}` | fills remaining space, scrolls internally | chart/content scroll container |
| `Chart` | `{viewBox, margin, responsive, children}` | SVG chart container | chart canvas, chart root |
| `Grid` (chart) | — | chart background gridlines | chart grid |
| `XAxis` / `YAxis` | `{scale, ...}` | chart axis | chart axis |
| `BarSeries` | `{data, ...}` | bar chart series | bar chart, **BI drill-down click target** |
| `LineSeries` | `{data, ...}` | line chart series | line chart, moving-average overlay |
| `ReferenceLine` | `{value, ...}` | horizontal/vertical reference line | pace line, target line |
| `ChartTooltip` | — | chart hover tooltip | chart tooltip |

## Note on `TableColumn<T>` (type import, not a component)

`createBaseTable`'s `columns` prop is typed `TableColumn<T>[]` — imported as
`import type { TableColumn } from "solid-ui-components"`. Each column is
`{id, header, align?, accessor: (row: T) => value}`. This is the shape that
drives `jtf-rth`'s BI table (columns come from the dataset schema, `accessor`
reads the JSON cell).
