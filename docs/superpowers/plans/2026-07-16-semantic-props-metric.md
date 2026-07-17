# Semantic-props health metric — retire raw `inlineStyleSrc`, gate raw-CSS **props**

**Status:** RULED — Peter reviewed 2026-07-16; rulings below override the matching sections.
**Author:** design-system agent, 2026-07-16.

## Peter's rulings (2026-07-16) — these override §1B and §3 below

1. **The health table lists only problems.** Raw-count columns that aren't
   problems get EOL'd outright — no "informational band". `inlineStyleSrc` and
   `inlineStyleShowcases` are removed from the table entirely once their
   replacement gates exist. (Overrides §1B's `inlineStyleSrcTotal` counter and
   §4's grey band.)
2. **No escape hatches, period.** `style`/`class` passthrough is NOT deferred to
   a later phase (overrides §2.3's v1 exclusion). Two enforcement layers:
   - **Type layer:** curried-variant `DataProps` omit `style`/`class` (allowlist
     what data props actually need: id, aria, `data-*`, event handlers).
   - **Runtime layer:** the curry factories detect `style`/`class` in incoming
     props and **throw** with a message naming the semantic alternative, e.g.
     `"AsyncProgress does not accept style=. Pass progress= as a number (0–1);
     fixed looks are curried variants — see COMPONENTS.md."`
3. **Showcases are the teaching surface, not demo scaffolding.** They must be
   best-practice examples agents can copy. NOT demoted to informational
   (overrides §3's recommendation): purify all 295 sites — static styles become
   curried variants (minting missing vocabulary where real demand shows),
   genuinely-dynamic demo geometry gets a showcase rubric manifest — and gate
   `showcaseStyleRubricViolations = 0`.
4. **Curried components' external interface is specific typed properties**,
   never CSS strings — `cssTypedProps` proceeds as proposed in §2.
5. Sequencing: cssTypedProps gate → semantic-prop migrations + style/class
   closure (one major release, after the six-repo usage survey) → showcase
   purification waves → EOL the raw-count columns.

## Step ③ spec (RULED 2026-07-17) — the breaking major release

Supersedes the §"Migration targets" sketch below. Peter's north star: **function
composition, minimal args by default; no override surface until a legit case is
found.** The survey (2026-07-16-css-prop-usage-survey.md) pins the blast radius.

### 3a. Tables — fields-as-functions (the big one)

- New `src/components/Table/fields.tsx`: known-field factories (`nameCol`,
  `textCol`, `intCol`, `floatCol`, `moneyCol`, `dateCol`, `dateTimeCol`,
  `selectionCol(store)`, `actionsFor(handlers)`), the `col(id, header, cellFn,
  fieldType)` tail factory, and `resolveFields(specs, registry)` where
  `FieldSpec<T> = string | string[] | TableColumn<T>`. A registry is a plain
  app-composed object of column references; string ids pull from it, nested
  arrays cluster actions, explicit columns pass through. Prototyped on the
  `table-fields` workshop bench.
- `TableColumn` DROPS `width` and `align`; gains `fieldType?: FieldType`
  (`name | text | int | float | money | date | dateTime | status | chart |
  actions | selection`). `col()` accepts only a fieldType — even the weirdest
  cell cannot reach CSS.
- Field-type CSS classes in Table.css own width (via `--sui-col-*` theme
  tokens), alignment, and drop-priority; responsive via container queries
  (`.sui-table { container-type: inline-size }`, prio classes hide low-priority
  columns as the panel narrows; `name` never drops). BaseTable/GroupedTable/
  SelectableTable/StatsTable render classes — their inline width/text-align
  styles are DELETED (also removes those `columnar` rubric entries from
  style-rubric.json, shrinking inlineStyleSrc).
- `columnHelpers.tsx` factories lose `width` opts and become the field
  factories; `maxHeight: string` → `maxRows?: number` (primitive computes px
  from row height) on BaseTable/GroupedTable/DataTableContainer.
- Consumer migration: the 46 width sites collapse into id-list gestures /
  factory calls with widths deleted (jtf 42, goose 4). Bespoke widths snap to
  the field-type standard — visual change accepted by ruling.

### 3a-geometry. Field-type width contract (RULED 2026-07-17, bench-verified)

All widths are ch/em (scale with theme font-size + browser zoom) — never px.
Behaviors: fixed (min=max) · content-fit ≤ cap (numerics size to widest
realistic value) · expands ≤ cap (name/text absorb slack, then ellipsis).
Table width: `min-width = Σ min`, `max-width = Σ max` — a table caps at Σ max
and becomes a dashboard tile, not wallpaper (ruled: the eye doesn't scan 4K).
Below Σ min, container-query drop-priority hides columns (name never drops).

| fieldType  | unit | min      | max      | behavior      | basis                       |
|------------|------|----------|----------|---------------|-----------------------------|
| selection  | em   | 2.25     | 2.25     | fixed         | checkbox glyph              |
| name       | ch   | 12       | 80       | expands ≤ cap | primary identifier          |
| text       | ch   | 8        | 40       | expands ≤ cap | secondary text              |
| date       | ch   | 12       | 12       | fixed         | "2026-07-15"                |
| dateTime   | ch   | 21       | 21       | fixed         | "2026-07-15 14:10:00"       |
| int        | ch   | 6        | 10       | content-fit   | "9,999,999"                 |
| float      | ch   | 8        | 12       | content-fit   | "1,234,567.89"              |
| money      | ch   | 8        | 18       | content-fit   | "$10,000,000,000.00" ($10B) |
| duration   | ch   | 6        | 10       | content-fit   | "12h 30m 45s"               |
| status     | ch   | 12       | 12       | fixed         | "● 118/140"                 |
| chart      | em   | 10       | 10       | fixed         | sparkline strip (bench: 8em clipped) |
| actions(n) | em   | n×4.5    | n×4.5    | fixed         | standard icon buttons (edit=pencil, delete=trash; bench-measured: 2 buttons need 9em, not 5) |

Bench corrections vs the first paper sketch (each found by rendering, not
reasoning — keep the habit at promotion):
- Widths are TOTAL column widths and must include cell chrome (16px ≈ 2ch
  padding/side): dateTime 23ch, int ≤14ch, money ≤22ch, status 14ch,
  selection 3.25rem (18px checkbox + 32px padding — anything less clips).
- `table-layout: fixed` is REQUIRED — auto layout squeezes hinted widths
  (the checkbox column collapsed to a 1px content box). Pairs with name's
  `ellipsis` flex column.
- actions(n): IconOnlyButton (1.4rem square) per action in an IconClusterRow
  (new Layout variant, md/1rem gap — Row gap scale gained `md` on real
  demand); 2 actions = 6rem.
- chart: 12em (10em tripped the cell's text-overflow ellipsis; chart cells
  should drop text-overflow entirely at promotion).
- Header alignment by field type (ruled): LEFT for flowing text (name/text),
  CENTER for fixed-width text/icons (dateTime/date/int/float/money/duration/
  status/chart/actions); values keep their own alignment. Centering must be
  applied to BaseTable's header-content flex wrapper, not inside it.
Icons `edit` (pencil) and `trash` added to the Icon set per ruling.

### 3b. Other CSS-typed props

- `ChartCanvas.height: number | string` → `number` only (zero consumer impact).
- `SidebarSelector.height: string` → prop DELETED; fill-parent is the behavior
  (sole production use was "100%").
- `Dot.size: number | string` → `number` only.
- `Surface.minWidth/maxWidth`, `ThreePanelLayout.height` → `number` px
  (semantic measurements), unless migration surfaces a fill/percent need —
  then a named literal (`"fill"`), never a raw CSS string.

### 3c. Escape-hatch closure (all curried components)

- Type layer: every `*DataProps` omits `style`/`class`/`classList`; allowlist
  id, aria-*, data-*, event handlers, refs.
- Runtime layer: curry factories strip-and-throw on `style`/`class` with a
  teaching message naming the component's semantic alternative and pointing at
  COMPONENTS.md. The 132 consumer sites (jtf 63, amygdala 28, thorcasting 22,
  dside 19) are migrated to variants/semantic props BEFORE the throw ships.
- `Sidebar`/`StackedProgressBar` `...props.style` merges shrink to their
  dynamic values only.

### 3d. Release mechanics

- One major version. Order: land 3a-3c in SUI behind green gates
  (`cssTypedProps` 13 → 0) → migrate consumers repo-by-repo (jtf-ui ~105
  sites, amygdala ~29, thorcasting ~22, dside-ui ~19, goose ~4) → publish →
  bump consumers. Raw-factory-import cleanup (134 sites) is explicitly OUT of
  scope (separate quest).

## The problem in one paragraph

`inlineStyleSrc` (health.mjs:74-76, baseline 73) is a **raw count of `style={{…}}`
occurrences in `src/components`**. Yesterday's audit proved all 73 sites are
rubric-legal and irreducible — each value is runtime-computed (measurement, data
proportion, caller-owned identity color, virtualizer offset), and
`styleRubricViolations` is already an honest, ratcheted **0**. So the 73 is not
debt; it counts the *internals of sanctioned dynamic primitives* and can never
reach 0 without deleting real behavior. Meanwhile the metric Peter's new
principle actually cares about — **is there raw CSS in a component's PUBLIC
contract?** (`width?: string`, `maxHeight?: string`, `height?: number | string`,
`style`/`class` on a composite) — is **not measured at all**. The fix is to stop
counting primitive internals and start counting the typed public surface.

## Peter's principle (recorded 2026-07-16), restated as a rule

A component that computes style at runtime is fine **iff** it is a low-level
**primitive** whose public interface exposes that style only through a **named,
typed, semantic prop** — `progress: number` (fraction), `size: number` (px),
`pxPerHour: number`, `color` (a series token). The primitive internally maps that
semantic value onto `width`/`height`/`opacity`/etc. **The violation is raw CSS in
the public contract**, not the inline style inside the primitive. So:

- `styleRubricViolations` already guards the *implementation* (inline styles are
  classified, dynamic, non-static). Keep it — it is the honest successor to
  `inlineStyleSrc`.
- We need a NEW metric that guards the *interface*: no public prop may admit a raw
  CSS geometry/paint string.

---

## 1. Redefining `inlineStyleSrc`

Three options; recommendation is **B**.

**Option A — redefine as "unclassified inline styles."**
`inlineStyleSrc = ` count of `style={{…}}` sites in `src/components` whose file is
**absent from the rubric manifest** (`scripts/style-rubric.json`). Today that is
**0** (every one of the 40 manifested files is classified), so it reaches an
honest 0 and ratchets against a *new* unmanifested inline style. Downside: this is
**exactly `styleRubricViolations` kind `(a)`** (style-rubric.mjs:139-141) — a
second metric measuring the same thing.

**Option B (recommended) — retire `inlineStyleSrc` as a ratcheted gate; keep the
raw 73 as an *informational* (non-gating) counter.**
The rubric already fully subsumes it: `styleRubricViolations = 0` *proves* all 73
sites are manifested, categorized, and non-static. A separate ratchet on the raw
count adds no invariant and actively lies (it reads as 73 units of debt). Concretely:
- Remove `inlineStyleSrc` from the ratcheted `metrics` object (health.mjs:121-130)
  and from `health-baseline.json`.
- Emit the raw tally under a descriptive key, e.g. `inlineStyleSrcTotal`, in a new
  non-ratcheted `informational` block that the dashboard renders grey/context (not
  red/debt). The ratchet loop (health.mjs:168-180) skips informational keys.

**Option C — keep the name, swap the meaning to Option A's rule.** Rejected: same
duplication as A, plus it silently changes what a historical `inlineStyleSrc`
number meant, corrupting `health-history.json` continuity.

**Recommendation: B.** One enforcement metric for inline styles
(`styleRubricViolations`), one honest informational counter (`inlineStyleSrcTotal`),
zero double-counting. Do **B only after** the new `cssTypedProps` metric (§2) is in
place — until then `inlineStyleSrc`'s ratchet is the only thing noticing new
`src/components` inline styles arriving with a raw-CSS prop.

---

## 2. New metric: `cssTypedProps` (type-level enforcement)

**What it counts:** public props whose declared **type** admits a raw CSS string
for geometry or paint — i.e. the interface *is* the violation, regardless of
whether any inline style exists yet.

### Detection mechanics (reuse style-rubric.mjs's TS-compiler-API walk)

New `scripts/prop-rubric.mjs`, same shape as `style-rubric.mjs`: `import ts`,
`walk(src/components)` over `*.tsx`/`*.ts` (skip `.test.`/`.d.ts`), build a
`ts.SourceFile`, visit nodes. For every **exported `interface`/`type` whose name
ends in `Props`** (the component public-contract convention), inspect each
`PropertySignature`:

1. **Geometry/paint name set** — flag only props whose name is in a fixed set that
   maps to a rubric CSS property:
   `width, height, minWidth, maxWidth, minHeight, maxHeight, top, left, gap,
   size, background, backgroundColor, color, borderColor, opacity`
   (camelCase kebab-normalized, same helper as style-rubric.mjs:57).
2. **Type admits raw CSS** — flag when the prop's `type` node **contains the
   `string` keyword** (bare `string`, or a union like `number | string`,
   `string | undefined`). A prop typed **pure `number`** (semantic px/fraction) or
   a **named literal union** (`"sm" | "md"`) or a **token alias** (e.g.
   `SeriesToken`) is the *sanctioned* form and is NOT flagged.
   - Rule of thumb the detector encodes: **geometry/paint prop + `string` in its
     type = raw CSS in the contract = violation.** `number`-only = semantic = ok.
3. **`style` / `class` passthrough is NOT counted in v1** (see §2.3) — the rubric
   linter and CONTEXT.md both sanction `style={props.style}` as the primitive
   Data-Prop escape hatch; a blanket count of the 82 `JSX.HTMLAttributes` inheritors
   would be dishonest. v1 measures only *named* geometry/paint props.

A per-file manifest (`scripts/prop-rubric.json`, mirroring `style-rubric.json`) can
whitelist genuinely-semantic exceptions if any surface — but the goal is baseline→0
by migration, not by whitelist.

### Baseline today

Named geometry/paint props typed with raw CSS `string` (from a compiler-API sweep;
grep-confirmed):

| Site | Prop | Type | Note |
|---|---|---|---|
| `Table/types.ts:16` | `TableColumn.width` | `string` | the meatiest — see migration |
| `Table/types.ts:33` | `BaseTableProps.maxHeight` | `string` | |
| `Table/columnHelpers.tsx:14,107,132` | `width` ×3 | `string` | column-def helper re-declarations |
| `Table/GroupedTable.tsx:31` | `width` | `string` | |
| `Table/GroupedTable.tsx:39` | `maxHeight` | `string` | |
| `Table/DataTableContainer.tsx:15` | `maxHeight` | `string` | |
| `DataDisplay/StatsTable/StatsTable.tsx:18` | `width` | `string` | |
| `ChartCanvas/ChartCanvas.tsx:24` | `height` | `number \| string` | already half-semantic (accepts number) |
| `Selector/SidebarSelector.tsx:39` | `height` | `string` | |

**→ baseline `cssTypedProps = 11`** (excluding the layout-family, below).

**Layout-family exemption (flag for Peter).** `Surface.minWidth`/`maxWidth`
(`Surface.tsx:23-24`) and `ThreePanelLayout.height` (`ThreePanelLayout.tsx:28`) are
also `string`. Layout-family primitives *are* the geometry vocabulary (they enjoy
the same exemption the inline-style rubric grants layout components,
STYLE_GUIDE Layout-Purity §Exemptions). **Recommend exempting them** via a
`layout`-role skip list in the detector (analogous to the rubric's exempt set) — a
`SplitRow`/`ThreePanelLayout` whose *job* is to size panes may legitimately take a
CSS length. If Peter wants them semantic too, baseline becomes **14**.
`ThreePanelLayout.tsx:65` (`height: string | undefined` on a helper **function**,
not a prop) is correctly excluded by the "exported `*Props` interface" scoping.

### Migration targets (design calls — flag, don't implement here)

- `TableColumn.width: string` → a **semantic column-width** type, e.g.
  `width?: number` (px) or a proportion union `{ fr: number } | { px: number } | { ch: number }`,
  so callers express intent, not CSS. Ripples through `columnHelpers`, `GroupedTable`,
  `StatsTable`, `SelectableTable` (all share the shape). Biggest single reduction (≈6 of 11).
- `maxHeight: string` (Table/DataTableContainer/GroupedTable) → `maxHeight?: number`
  (px) or a `visibleRows?: number` count that the primitive turns into a height.
  `tableContainerStyle()` (types.ts:153) already isolates the string→style hop.
- `ChartCanvas.height` / `SidebarSelector.height` → drop the `string` arm, keep
  `height?: number` (px); the primitive appends `px`.

---

## 3. Extending the redefinition to `inlineStyleShowcases` (295)

Showcases/benches are **demo scaffolding**; the health.mjs:79-81 comment already
says inline styles there are "only for genuinely dynamic experiment geometry."
A full 295-site rubric manifest is high-cost, low-value.

- **Recommended:** demote `inlineStyleShowcases` to **informational** alongside
  `inlineStyleSrcTotal` (same treatment as §1 Option B). It documents demo surface
  area; it is not a library-quality invariant, so it should not gate CI.
- **If a gate is still wanted:** run the *same* `style-rubric.mjs` engine over
  `dev/showcases` with a `showcases` block in a manifest and surface
  `showcaseStyleRubricViolations` (expected 0 after a one-time classification pass).
  This catches the only thing that matters in a showcase — a **static literal**
  inline style that a curried variant already covers — without ratcheting the raw
  count. Reuse `CATEGORY_PROPS`; add the `dev/showcases` walk root.

Recommendation: **demote to informational.** Don't spend the manifest budget on
demo files.

---

## 4. Dashboard / baseline / CI implications

**`scripts/health-baseline.json`**
- Remove `inlineStyleSrc` and `inlineStyleShowcases`.
- Add `cssTypedProps: 11` (or 14 — Peter's call on layout-family).
- `styleRubricViolations: 0` unchanged (it is now the sole inline-style gate).

**`health.mjs`**
- Split `metrics` into ratcheted vs `informational`. Ratcheted:
  `bareHexCss, bareHexTsx, styleRubricViolations, cssTypedProps,
  foldersWithoutTests, undocumentedComponents, missingDepthHeaders`.
  Informational (reported, never regress-checked): `inlineStyleSrcTotal,
  inlineStyleShowcasesTotal`. The ratchet loop (168-180) and regression exit
  (194-228) iterate ratcheted keys only.
- Import + call a new `prop-rubric.mjs` `run()` next to the existing
  `runStyleRubric()` (health.mjs:20,116).

**`scripts/kpi-table.mjs` / dev `#/health` tiles**
- Add `cssTypedProps` to `ZERO_PRIORITY` (suggest 4-5 — a public-contract
  regression is high-severity) so it sorts among the guarded zeros once migrated.
- Render informational counters in a separate grey band (not the red debt column).

**`scripts/health-history.json`** — key set changes, so the pre/post rows differ.
Note the cutover date in the ADR; `kpi-table --history` already tolerates missing
keys (renders blank).

**ADR** — extend `docs/adr/0003-…` (or a new `0004`) recording: `inlineStyleSrc`
retired → informational; `cssTypedProps` added as the type-level companion; the
semantic-prop rule ("geometry/paint prop must be `number`/token-typed, never a raw
CSS `string`").

## Migration sequencing (order is load-bearing)

1. Land `prop-rubric.mjs` + `cssTypedProps` at baseline **11** (ratcheted). Now the
   real invariant is guarded. *Do this before touching `inlineStyleSrc`.*
2. Migrate raw-CSS props to semantic props (biggest win: the `TableColumn.width`
   family), driving `cssTypedProps` 11 → 0. Each migration is a Peter-signed API
   change (new prop shape), one component-family per commit.
3. Once `cssTypedProps` is stable and small, retire `inlineStyleSrc` /
   `inlineStyleShowcases` to informational (§1B, §3). Safe now because
   `styleRubricViolations` guards implementations and `cssTypedProps` guards
   contracts.

## What "0 across the board" then honestly means

`styleRubricViolations = 0` **and** `cssTypedProps = 0` together assert the exact
invariant Peter's principle wants: **every dynamic style is an internal
implementation detail of a primitive, reached only through a named, typed,
semantic prop — and no public contract anywhere admits raw CSS.** The residual
`inlineStyleSrcTotal: 73` sits in the informational band as *context* ("73 sanctioned
dynamic primitive sites"), not as debt. That is an honest zero.
