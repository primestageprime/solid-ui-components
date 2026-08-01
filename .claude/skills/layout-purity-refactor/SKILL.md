---
name: layout-purity-refactor
description: Migrate one SUI component to layout purity — replace its hand-rolled flex/grid/gap/overflow CSS with compositions of Layout variants, preserving byte-identical public props and visually-identical render. Use when refactoring a component to comply with the Layout Purity commandment (STYLE_GUIDE.md), or working the migration plan at docs/superpowers/plans/2026-07-14-layout-purity-migration.md.
---

# Layout-purity refactor

Migrate **one** component so it owns no box-model geometry: rows/columns/gaps/
alignment/spreads/fills/scrolls/pinned-edges come from composing Layout
variants, not from `display:flex|grid`, `gap`, `justify-content`, `align-items`,
`align-self`, `flex-*`, `place-*`, `row-gap`/`column-gap`, or `overflow` in the
component's own CSS or inline `style`. The rule and its exemptions live in
`STYLE_GUIDE.md` › *Layout Purity*.

## Hard constraints (do not violate)

- **Zero call-signature changes.** Public props stay byte-identical. Backwards
  compatible, always.
- **One component per commit.** Verify before moving on. Commit only the exact
  files you touched — **never `git add -A`** (shared checkout).
- **No version bumps / tags / publish.** Do not touch `package.json` version.
- **Gates are `npx tsc --noEmit` + `npm test` (vitest)** — NOT `npm run build`,
  which can wedge the dev server on port 6006. Do not touch that dev server.
- **Adding a *composed* Layout variant over the existing scale is fine.**
  Expanding the underlying `Stack`/`Row` *scale* (new `gap` token, new `align`
  value) needs Peter's sign-off (The #2 Rule) — if a migration truly needs an
  off-scale gap, that's a BLOCK + report, not a scale expansion.

## Procedure (per component)

### 1. Classify

Find the component in the plan doc inventory and confirm its bucket:

- **exempt-layout** — a `layout`-tagged component (Layout family, plus
  `ThreePanelLayout`, `Page`, `ScrollRegion`, `SplitQueueList`, `Section`,
  `CollapsiblePanel`, `Modal`, `BottomSheet`). It IS the vocabulary → skip,
  tick as N/A.
- **exempt-chart** — SVG/canvas rendering (chart family). SVG positioning is
  fine → skip, tick as N/A. (An HTML support panel *beside* a chart still
  migrates — judge the actual DOM.)
- **overlay-partial** — an overlay control. Keep ONLY its
  `position:absolute|fixed` anchoring; migrate every internal row/column.
- **migrate** — everything else. Full migration.

### 2. Baseline (visual truth)

Screenshot the component's showcase before touching it:

1. Find its nav id in `dev/main.tsx` (the `id:` beside its `label:`).
2. Load the Chrome MCP tools with ONE ToolSearch call, e.g.
   `select:mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__tabs_create_mcp`.
3. Navigate to `http://localhost:6006/#<id>` and screenshot to the scratchpad
   (`<scratchpad>/layout-purity/<Component>-before.png`).

If browser tools are unavailable, fall back to the **DOM-structure regression
test** (`src/test-utils/domStructure.ts`): render the component with fixed props
and capture `domStructure(container)` as a baseline string BEFORE refactoring.
Assert the AFTER structure is unchanged (class churn on the wrappers is
expected — the tree shape, text, and semantic attrs must not regress). For a
migrate-heavy component write this test in `src/components/<Dir>/<Name>.layout.test.tsx`.

### 3. Refactor

- Replace each hand-rolled geometry wrapper with a Layout composition:
  - vertical stack of children → `Stack`/`TightStack`/`NarrowStack`/`FillColumn`/
    `ScrollColumn` variant;
  - horizontal row → `Row`/`ClusterRow`/`SpreadRow`/`TagRow`/`WrapRow` variant;
  - grow/shrink child → `GrowBox`/`ActionSlot`;
  - scroll region → `ScrollPanel`/`ScrollColumn`.
- Move any still-needed **non-geometry** styling (color, border, radius,
  padding-as-inset, background, font) into the remaining CSS or an Atomic
  variant. Delete the now-dead geometry rules.
- If a geometry has no Layout home, **add a role-named variant to
  `Layout/variants.ts`** (export + when-to-use comment), then compose it. The
  missing variant is the finding.
- Composites own zero CSS. If the migration would leave a component composing
  Layout AND owning a CSS file of intrinsic styling, that intrinsic styling
  belongs in an Atomic (extract or reuse one) — but don't over-engineer a pilot;
  if extraction is large, note it and prefer the smallest change that removes
  the geometry.

### 3b. Adjudicated hard cases (Peter, 2026-07-14)

- **Pseudo-element layout chrome** (`::before`/`::after` with `flex`/`gap`):
  replace with **real elements** (e.g. `GrowBox` rule lines), one at a time,
  verify visually identical, keep only if it holds; else BLOCKED-with-reason.
- **Off-scale gaps: snap EVERYTHING.** The Stack/Row scale is `xs(4)`/`sm(8)`
  ONLY (Peter, superseding the earlier ±2–4px tolerance): `6px`→sm, `12px`→sm,
  `16px`→sm — even where visible. Note each snap in the commit message so
  visual diffs are attributable. Never expand the scale.
  - EXCEPTION (Peter-precedent 75a5d33): a **data-derived calendar/heatmap
    grid whose off-scale gap is load-bearing** (e.g. a 1px cell seam that xs=4
    would visibly widen) stays INTRINSIC rather than forcing the scale.
- **Missing 2-D / responsive layout: compose the primitive.** `AutoStackRow` +
  `AutoStackItem` (responsive side-by-side→stacked, `breakWidth` prop) and
  `Grid` / `LabelValueGrid` (`minmax(label,max-content) 1fr`) now exist in
  Layout — compose them, don't hand-roll `flex-basis` calcs or `display:grid`.
- **Clip/mask `overflow:hidden` is NOT exempt** — compose the `ClipBox` Box
  variant wherever a component clips for a collapse animation or bar mask.

### 4. Child arrangement vs intrinsic element styling

- **Child arrangement** (a wrapper laying out multiple children) → MUST migrate.
- **Intrinsic element styling** (a self-contained pill/icon-button centering its
  OWN single label with `display:inline-flex; align-items:center`) → MAY STAY.
  Note it in the commit/plan; don't force an absurd one-child `<Row>` wrapper.

Accumulated classification discriminators (from the 2026-07-14 migration —
apply before asking):

- **Inline-level control widget** (`inline-flex; width:fit-content` — the
  control must shrink-wrap; SegmentedControl, SegmentedInput, DatePicker
  trigger) → INTRINSIC almost by construction: composing a block-level Row
  would make it full-width.
- **Data-derived cells/options/segments** (`<For each={data}>` rendering the
  control's own option rows, chips, bar segments, menu items) → INTRINSIC
  (ruling 4). Consumer-CHILD arrangement migrates; data-content doesn't.
- **Leaf control vs field composition**: a leaf control (Checkbox, Toggle)
  is intrinsic; a FIELD laying out [label | control | hint] regions
  (CheckboxField, ThemedInput group) MIGRATES.
- **Third-party-driven parts (Kobalte etc.)** → CARVE-OUT: framework parts
  you can only pass `class` to (Combobox Control/Listbox/Content, popover
  anchoring) keep their geometry; compose ONLY the plain-div regions the
  component itself owns.

### 5. Gates

- `npx tsc --noEmit` → zero errors.
- `npm test` (or a scoped `npx vitest run src/components/<Dir>`) → green.
- Re-screenshot (or re-run the DOM-structure test) and compare to baseline:
  visually identical or better.

### 6. Commit

Stage only the files you touched (component TSX/CSS, any `Layout/variants.ts`
addition, the plan-doc checkbox update, any new `.layout.test.tsx`). Message:

```
refactor(<Name>): compose layout from Layout variants (layout-purity)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0114zmxNPiJDfLYCov7eh4Nr
```

Tick the component's checkbox in the plan doc IN THE SAME COMMIT.

### 7. If visual identity can't be achieved

`git checkout -- <files>` to revert. Mark the component **BLOCKED** in the plan
doc with the reason (e.g. off-scale gap the Layout scale can't express without a
Peter-gated expansion; grid geometry with no Layout analogue). Move on. If >3
components block consecutively, stop and report.

## Stop conditions

(a) all done; (b) ~25 components migrated — checkpoint and report; (c) repeated
unresolvable gate failures — mark BLOCKED and continue; >3 consecutive blocks →
stop and report.
