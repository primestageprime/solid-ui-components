# CSS-prop usage survey — pre-major-release consumer scan

**Date:** 2026-07-16
**Purpose:** Inventory every consumer call site affected by the planned breaking major release, which will
(a) drop `style` / `class` / `classList` from curried SUI DataProps and throw at runtime if passed, and
(b) replace raw-CSS-string props with semantic typed props:
`TableColumn.width` string → `widthCh` number; table/container `maxHeight` string → `maxRows` number;
`ChartCanvas` height string arm dropped; `SidebarSelector.height` string → number (px).

**Method:** Read-only. Per repo, every file importing from `solid-ui-components` /
`@primestageprime/solid-ui-components` was parsed to map local identifiers → SUI exports, then JSX opening
tags of those SUI components were scanned for `style`/`class`/`classList`; column-def `width:` string literals,
`maxHeight`, and `ChartCanvas`/`SidebarSelector` `height` were collected separately. Generic-typed tags
(`<SidebarSelector<T>`) were swept with a supplementary grep. Scanner + raw JSON:
`scratchpad/survey.py` / `survey.json` (session scratchpad, not committed).

**Scope of consumers.** Config lists 8 trees; only 6 consume SUI. `jtf-rust` (0 SUI uses) and
`wellappoint-ui` (`no-sui-dep`) are excluded. `dside-work` imports SUI but has **zero** affected sites.

---

## Summary matrix (violation kind × repo)

| Repo | `style`/`class`/`classList` on curried SUI (will throw) | Raw `create*` factory imports (rule violation, separate) | Column `width:` strings | `maxHeight` on SUI tables/containers | `ChartCanvas`/`SidebarSelector` string height |
|---|---:|---:|---:|---:|---:|
| dside-ui | 19 | 18 (in 14 files) | 0 | 0 | 0 |
| amygdala-ui | 28 | 3 | 0 | 1 (pass-through only) | 0 |
| jtf-ui | 63 | 58 (in ~40 files) | 42 | 6 literal + 4 pass-through | 1 (`SidebarSelector` `"100%"`) |
| goose-ui | 0 | 40 (incl. `createBaseTable` ×4) | 4 | 0 | 0 |
| thorcasting-ui | 22 | 15 (all in `components/ui.tsx`) | 0 | 0 | 0 |
| dside-work | 0 | 0 | 0 | 0 | 0 |
| **Total** | **132** | **134** | **46** | **6 literal (+5 pass-through)** | **1** |

**Migration-effort estimate (edit sites, style/class + CSS-typed props):**
jtf-ui ≈ 105 · amygdala-ui ≈ 29 · thorcasting-ui ≈ 22 · dside-ui ≈ 19 · goose-ui ≈ 4 · dside-work 0.
jtf-ui carries ~70% of total effort. Factory-import cleanup is additional and largely orthogonal (see note).

---

## `style` / `class` / `classList` on curried SUI components (breaking — will throw)

These are genuine curried SUI components (imported from the package) receiving a raw style/class prop.
Every one throws post-migration.

### dside-ui (19)

| Component.prop | Sites (file:line) |
|---|---|
| CenteredStack.style | app.tsx:47, app.tsx:61, LinkIdentityGate.tsx:258/286/318/328, WorkspaceGate.tsx:139/168 |
| HotkeyButton.style | StatementWorkflowControls.tsx:412/460/508 |
| DagChart.style | TriagePane.tsx:753, WeightingLayout.tsx:370 |
| ThemedTextarea.style | DesignsLibrary.tsx:151 |
| SidebarPanel.style | DesignsLibrary.tsx:334 |
| TextSublabel.style | DesignsLibrary.tsx:359 |
| TextBody.style | DesignsLibrary.tsx:394 |
| FullscreenModal.style | GroomPane.tsx:1103 |
| WeekCalendar.style | PlanPane.tsx:487 |

### amygdala-ui (28)

| Component.prop | Sites (file:line) |
|---|---|
| Tooltip.class | constants.tsx:14/31/51/71/94, OperationalEdgesTable.tsx:158/212, MatchDonut.tsx:19 |
| TextBody.style | ChangeRendererSection.tsx:75/79/83, ToastSection.tsx:108/112/286/303/359 |
| NarrowStack.style | ChangeRendererSection.tsx:95/114, ToastSection.tsx:252/297/302 |
| ResizableContainer.style | ResizablePanel.tsx:35, value-renderers.tsx:111 |
| ResizableContainer.class | ResizablePanel.tsx:35 |
| SecondaryButton.class | EdgeTypeWidget.tsx:312/374 |
| ThreePanelLayout.style | TestCasesPage.tsx:94 |
| ChangeRenderer.style | ChangeRendererSection.tsx:157 |

### jtf-ui (63)

Highest-volume repo. Grouped by component:

| Component.prop | Sites (file:line) |
|---|---|
| ThemedInput.style | FortnightReportBody.tsx:695, CallFilterList.tsx:94, CallList.tsx:112, CannedExplanations.tsx:132, index.tsx:615, durability.tsx:23, nox-report.tsx:52/56/60 |
| TextValue.style | ComplianceThresholdTable.tsx:44, HourLevelDataTable.tsx:52, MinMaxTable.tsx:24, NoxWidgets.tsx:125, index.tsx:104/108/111 |
| NarrowStack.class | metric-explorer.tsx:466/511/563, timesleuth.tsx:421/450 |
| NarrowStack.style | FortnightReportBody.tsx:1285 |
| GrowBox.style | FortnightReportBody.tsx:993/1001/1714 |
| GrowBox.class | FortnightReportBody.tsx:1714 |
| ScrollRegion.style | FortnightReportBody.tsx:979/2142 |
| TightClusterRow.style | FortnightReportBody.tsx:779/802 |
| ClusterRow.style | FocusEditor.tsx:167/199/267 |
| InlineText.style | fortnight/index.tsx:115, ftir-gap-fill.tsx:581/779 |
| MutedBody.style | QaqcAssetTriage.tsx:119/165, thousand-hour/index.tsx:446 |
| MutedBody.class | EnhancedGridCell.tsx:62 |
| SpreadRow.class | Layout.tsx:85, metric-explorer.tsx:564, timesleuth.tsx:501 |
| StackedProgressBar.style | EnhancedGridCell.tsx:95/193 |
| CardSurface.style | timesleuth.tsx:506/519 |
| FillColumn.style | FortnightReportBody.tsx:1666, timesleuth.tsx:500 |
| TextBody.style | QaqcAssetTriage.tsx:174 |
| Tooltip.class | cells.tsx:50 |
| ThemedTextarea.style | ExplanationForm.tsx:121 |
| PrimaryButton.class | Buttons.tsx:45 |
| GhostButton.class | JobQueueIcon.tsx:12 |
| Column.class | NoxWidgets.tsx:336 |
| TextTitle.class | VesselSidebar.tsx:34 |
| PaneRow.class | FortnightReportBody.tsx:2045 |
| TightCenteredColumn.style | FortnightReportBody.tsx:1488 |
| ContentStack.class | detail/[id].tsx:54 |
| CompactSurface.style | flow-diagnosis/index.tsx:161 |
| ProportionalStack.style | ui/layout.tsx:55 |
| ProportionalItem.class | ui/layout.tsx:95 |
| HeatStreamGrid.class | explanations/index.tsx:158 |

### thorcasting-ui (22)

| Component.prop | Sites (file:line) |
|---|---|
| TextSublabel.class | settings.tsx:210/228/255/263/285/292/341/366/374/396 |
| TextLabel.class | settings.tsx:208/226/261/291/339 |
| CodeBlock.style | configureConfigsPane.tsx:1714/1832, config-forms.tsx:127 |
| AppShell.style | config-forms.tsx:570, settings.tsx:200 |
| TextSublabel.style | onboard.tsx:193/210 |

### goose-ui (0) · dside-work (0)
No curried SUI component receives style/class/classList. goose builds its tables through
`createBaseTable` (factory), so its layout styling lives in factory config, not call-site props.

---

## Raw `create*` factory / base imports (separate rule violation)

Flagged per the "clients import only curried components" rule. **Largely orthogonal to the style/class
DataProps change** — these are the client's local design-system wrapper layers calling SUI factories to
mint their own variants, not call-site style props. Effort here is governance cleanup, not required by
this release, *unless* the factory-produced components still surface `style` in a way the migration also
removes (verify against SUI factory internals before counting).

- **Centralized (one wrapper file — low cleanup cost):**
  - thorcasting-ui: all 15 in `src/components/ui.tsx` (createBox/Button/Row/Stack/Surface/Text/Panel/Section/List/Modal/Tabs/Toggle/AppHeader/EmptyState + `queueToolbar.tsx` createButtonGroup).
  - dside-ui: concentrated in `ui-primitives.tsx` (createButton/Row/Section/Stack/Surface) and `sui.tsx` (createButton/StatusBadge/StatusLight); rest are createSection/createAssigneeIcon in feature files.
- **Scattered (higher cost):**
  - jtf-ui: 58 imports across ~40 files — createRow/Stack/Surface/Text/Box dominate; also `createChartCanvas` (metric-explorer.tsx:20), createSegmentedControl, createStatusBadge, createFormulaPanel, createConfirmationModal. Some centralized in `components/ui/layout.tsx`+`text.tsx`, but many inline in routes.
  - goose-ui: 40 imports incl. **`createBaseTable` ×4** (DailySnapshot, GrossMargin, MonthlyPerformance, reports/[code]) and `createExtractionBoard` (transfer.tsx) — these are the notable base-table/base-board factories bypassing curried variants.
  - amygdala-ui: 3 × `createButton` (TimeRangeSelector, EdgeTypeDetailHeader, alarm-panel).

Full file:line list in `survey.json` → `<repo>.factories`.

---

## CSS-typed prop migration — value distributions & unit recommendations

### 1. `TableColumn.width` string → `widthCh` number

**Only true column-def widths** (values inside `{ id, header, accessor, width }` arrays or `*ColWith({width})`
helpers) are counted below. Incidental `style={{ width }}` on layout/text elements and input-style constants
are **excluded** (those are style-prop sites, already covered above).

Observed literal values (46 sites):

| Value | Count | Repo |
|---|---:|---|
| 80px | 9 | jtf |
| 100px | 8 | jtf |
| 90px | 6 | jtf |
| 180px | 6 | jtf |
| 200px | 5 | jtf |
| 70px | 4 | jtf |
| 50px | 4 | jtf |
| 60px | 2 | jtf |
| 170px | 2 | jtf |
| 320px | 1 | jtf |
| 15rem | 1 | jtf (qaqc-checks.tsx:199) |
| **10ch** | **3** | jtf (PowerLogPanel.tsx:459/476/502) |
| 72px | 2 | goose (overview.tsx:63/81) |
| 108px | 1 | goose (overview.tsx:65) |
| 132px | 1 | goose (overview.tsx:69) |

Representative sites: StatisticsSummary.tsx:44-49 (100/80/80/80/80/60px), ftir-gap-fill.tsx:506-510
(50/170/170/100/100px), power-log-ocr.tsx:93-122 (70/80×4/90px), nox-report.tsx:497-579 (50-200px),
durability.tsx:198-240 (100-200px), FortnightReportBody floatColWith 90/100px, goose overview.tsx 72-132px.

**Recommendation — reconsider `widthCh`, or accept lossy conversion.** ~43 of 46 sites are **px**; only
3 are `ch` (one file) and 1 is `rem`. Consumers reason in pixels, not character counts. A `widthCh` (character
count) prop matches almost nothing observed and forces a lossy px→ch conversion (÷ ~8px/ch, with rounding) on
every px site. If a single semantic unit is required, **a numeric px prop (e.g. `widthPx: number`) fits the
data far better**; the px literals map 1:1 (`"80px"` → `80`). If `widthCh` is mandated for content-fit reasons,
plan an explicit conversion pass and expect column widths to shift slightly. The 3 real `ch` sites → `widthCh: 10`.

### 2. table/container `maxHeight` string → `maxRows` number

Literal values on SUI tables/`DataTableContainer` (6 sites):

| Value | Count | Sites |
|---|---:|---|
| 500px | 5 | MetricsStatsTable.tsx:110, VesselCallOverview.tsx:470/500/538, power-log-ocr.tsx:192 |
| 300px | 1 | ftir-gap-fill.tsx:634 |
| (BaseTable) | 1 | FortnightReportBody.tsx:1390 (`compact maxHeight=…` — verify literal) |

Plus **pass-through** wrappers forwarding their own `maxHeight` prop (not a literal to migrate here, but the
wrapper's public prop must migrate too): HourLevelDataTable.tsx:84, HourlyDataTable.tsx:74, MinMaxTable.tsx:49
(all `maxHeight={props.maxHeight}`), and amygdala ResizablePanel.tsx:41 (its own component's prop — confirm it
isn't a SUI container before counting).

**Recommendation — `maxRows` is viable; pick a row-height basis.** Values cluster tightly at **500px** (the de
facto "tall scroll" default) with one **300px**. Converting needs the table's row height: at ~28px/row,
500px ≈ **18 rows** and 300px ≈ **11**; at ~36px/row, ≈ **14** and **8**. Recommend fixing the conversion to the
compact-table row height and mapping 500px → a single canonical `maxRows` (≈15) so the five 500px sites stay
consistent. Confirm the actual rendered row height before locking the number.

### 3. `ChartCanvas` height string arm — safe to drop

**Zero consumer sites pass a string height to ChartCanvas.** jtf uses the fixed-size curried variants
`ChartCanvasLg/Md/Mlg` (no height prop) and one factory `createChartCanvas({ height: 100 })`
(metric-explorer.tsx:48) — already a **number**. Dropping the string arm breaks nothing in the six repos.
(Note: metric-explorer.tsx:618 `height="100%"` is on `ThreePanelLayout`, not ChartCanvas — out of scope.)

### 4. `SidebarSelector.height` string → number (px) — **1 blocker**

Exactly one consumer: **jtf-ui `src/routes/reports/fortnight/[id].tsx:113`**, and its value is **`height="100%"`**
(fill-parent). A px number cannot express `"100%"`. This site was initially missed by the tag scanner because the
generic `<SidebarSelector<FortnightReportResponse>` breaks naive tag matching — caught via supplementary grep.

**Recommendation:** string→px will break this one real usage. Either keep a fill sentinel (e.g. accept `"fill"`
or `number | "fill"`), or default SidebarSelector to fill-parent and drop the prop at this site. A bare
`height: number` (px) leaves the only consumer with no way to say "fill".

---

## Bottom line

- **132 style/class/classList sites** on curried SUI components will throw at runtime — the main workload,
  ~48% in jtf-ui. dside-work and goose-ui are clean here.
- **Column widths are overwhelmingly px (43/46), not ch** — `widthCh` is a poor unit fit; prefer a px number
  or budget a lossy conversion pass.
- **`maxHeight` clusters at 500px** — `maxRows` works; pick and pin a row-height basis (≈15 rows for 500px).
- **ChartCanvas string height: nothing to migrate** (all numeric/fixed-variant).
- **SidebarSelector string height: one site, `"100%"`** — string→px cannot represent it; needs a fill escape hatch.
- **134 raw `create*` factory imports** are a pre-existing curried-only rule violation (goose's 4×`createBaseTable`
  + `createExtractionBoard` most notable) — flagged, but treat as separate governance work unless SUI factory
  internals also surface the removed `style` prop.
