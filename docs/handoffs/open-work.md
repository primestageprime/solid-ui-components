# Handoff: open work in solid-ui-components

**State as of 2026-07-31.** Version `0.128.0`, `main` at `038a394`, all checks
green, every ratchet ceiling tight, `v0.128.0` tagged and published to GitHub
Packages. This supersedes the six-issue handoff from 2026-07-29 — all six are
now resolved, triaged-and-closed, or (for #64) in-progress below.

Read **Ground rules** first — several of them will fail your PR if you don't.

---

## Ground rules

### `health` is a required status check now

`test`, `typecheck`, `build` and **`health`** all gate merges. `lint` runs but
does not gate. `enforce_admins` is `false`, so a direct admin push to `main`
bypasses everything — the gate binds PR merges.

### The ratchet will fail you for *improving* a metric

`scripts/health.mjs` enforces four rules. Read
`docs/adr/0007-prepare-keeps-the-build-ci-ignores-scripts.md` for the neighbouring
`prepare`/`--ignore-scripts` rules, and `scripts/health-ratchet.mjs` for these:

| Situation | Result |
|---|---|
| A metric rose | Fails. |
| A metric improved and the ceiling wasn't tightened | **Also fails.** Run `npm run health -- --update-baseline` and commit the baseline **with** your change. |
| `--update-baseline` (bare) | Only *lowers*. It cannot raise any ceiling. |
| Raising a ceiling | Requires naming it **and** a reason: `--update-baseline=dotChains --reason="…"`. Recorded in the baseline under `_raises`. |

### Other things that will bite

- **A new component needs a showcase.** `componentsWithoutShowcase` is ratcheted
  at **0**, so shipping one without `dev/showcases/<name>.tsx` fails `health`.
  Same for `foldersWithoutTests`, `undocumentedComponents` (COMPONENTS.md),
  `missingDepthHeaders` — all at 0.
- **Shared checkout.** Stage only files you touched; never `git add -A`.
- **CI installs with `--ignore-scripts`, so there is no `dist/`.** Everything in
  the test/lint/typecheck/health jobs must work from source.
- **Don't spawn subprocesses in the vitest suite.** Nine of them hung the `test`
  job until CI cancelled it at 15 minutes. Test pure logic directly.
- **CI is ~3× slower than local.** Set a per-test timeout, not a global one.
- **`grep` is unreliable for the metric regexes.** Use `node` with the same
  regex as `health.mjs`, and cross-check totals against `npm run health -- --verbose`.
- **Biome's a11y rules only see intrinsic (lowercase) JSX elements.** A green
  `lint` is **not** a11y coverage.
- **`missingDepthHeaders` matches the literal regex `/Depth [0-9]/`** anywhere
  in the file, and it applies to **internal** component files too, not just
  exported ones. A new `.tsx` under `src/components/` without a depth line in
  its header comment fails `health` even when it is never exported from
  `index.ts`. Caught `BucketHeader.tsx` on 2026-07-31.
- **A showcase's geometry belongs in `dev/main.css`, not an inline `style={{}}`.**
  `showcaseStyleRubricViolations` is ratcheted at **0** and flags any
  un-manifested `style={{` in `dev/showcases/`, so a demo that sizes its own
  container inline fails `health`. Add a `.<component>-demo` class to
  `dev/main.css` and use that — see `.bucket-queue-fill-demo` /
  `.bucket-queue-discard-demo` for the fixed-column-with-pinned-control shape.
- **`scripts/health-history.json` is tracked and changes on every `npm run
  health` run.** Commit it alongside health-affecting work rather than leaving
  it dirty in a shared checkout.
- **Two issues in the prior handoff had premises that didn't survive contact
  with the code**, despite one claiming "Verified still valid." Don't take a
  filed issue's stated cause at face value — check it against current `git log`
  / current CSS / current baked-in defaults before implementing. See #45 and
  #67 below.

---

## Shipped 2026-07-31 — BucketQueue collapsible buckets (0.128.0)

A **populated** bucket can now render as a click-to-expand summary line, which
the component previously only ever did for an **empty** one. `Bucket.collapsible`
opts in; `Bucket.collapsedByDefault` picks the start state and is inert without
it. Design: `docs/superpowers/specs/2026-07-31-bucketqueue-collapsible-bucket-design.md`.
Plan: `docs/superpowers/plans/2026-07-31-bucketqueue-collapsible-bucket.md`.

**Three things a future BucketQueue change should know**, all found by reading
the code rather than the issue text:

- **Collapse was already the sizing model's central concept, spelled
  `counts[i] === 0`.** `layout.ts` now takes an optional `collapsed?: boolean[]`
  and both call sites test `counts[i] === 0 || collapsed?.[i]`. There is no
  separate "collapsed mode" — `capRows`/`fill`/`weight` compose because a
  collapsed bucket simply leaves `active`.
- **`motion.ts` used to bail on the whole batch** when no transfer had a live
  destination row, which dropped the *source* bucket's gap-closing FLIP too.
  Fixed; the FLIP pass is independent of arrivals. If you add another case
  where a destination cannot render its arriving row, the cue path
  (`MotionContext.bucketEl` → the header count) is where it belongs.
- **`keyboard.ts`'s `allKeys()` is built from the ITEMS, not the DOM.** Anything
  that hides rows without removing them from `allKeys` puts the single tab stop
  on a row that renders nowhere, leaving **no** row with `tabindex="0"` and
  dropping the whole queue out of the tab order. Pinned by a test in
  `BucketQueue.keyboard.test.tsx`.

`BucketQueue.tsx` was split to stay under the 500-line rule: the header is now
`BucketHeader.tsx` and the live-measurement/ResizeObserver concern is
`measurement.ts`. No public API changed.

**`thorcasting-ui` has not picked this up.** It pins SUI by GitHub tag, so it
needs its `package.json` pin bumped to `v0.128.0`. Deliberately left to the
thorcasting-side agent (ruled 2026-07-31); the consumer-side design it unblocks
is `thorcasting-workspace/docs/superpowers/specs/2026-07-31-discard-staging-design.md`.

## Resolved since the last handoff (2026-07-29)

- **#66** — `SurfaceDataProps` documented in `COMPONENTS.md`. Shipped `fcbdcc4`.
- **#68** — `DateCell` gained `timeZone`, matching `DateTimeCell`. Shipped `cdc95cd`.
- **#69** — `ValueMatrix`/`PivotGrid` `colLabel`/`rowLabel` widened to
  `=> string | JSX.Element`. Shipped `25ac69e`.
- All three released in **0.127.0** together with the #64 progress below;
  see `CHANGELOG.md` for the full writeup. **0.128.0** followed on 2026-07-31
  with the BucketQueue work above.

## Closed as invalid (2026-07-30)

- **#45** — `Stack`/`Row` `gap` typed `"xs" | "sm"`; the issue claimed the
  runtime supports `md`/`lg`. It doesn't: that CSS was deliberately removed
  twice (`928651f` 2026-06-26, `9158c75` 2026-07-17) after audits found
  nothing depended on it. Widening the type without matching CSS would have
  reintroduced the exact silent-zero-gap bug `assertModifierClass` exists to
  catch. A separate real bug was found while investigating and is still
  open: `Surface.gap` publicly accepts `"md"|"lg"` but silently collapses
  them to `"sm"` before forwarding to the inner `Row`/`Stack` (no
  `.surface--gap-md/-lg` CSS exists either) — that's plausibly the actual
  source of the "runtime supports md/lg" impression, but it's a different
  component and a different bug shape (type wider than effect, not
  narrower). Not yet filed as its own issue — worth doing if picked up.
- **#67** — `SpreadCenterRow` curried variant. `SpreadRow` has baked in both
  `align: "center"` and `justify: "between"` since the repo's **initial
  commit** (`feeb575`) — the issue's premise ("SpreadRow strips align") was
  never true. The cited jtf-ui symptom doesn't reproduce: no matching raw
  `<Row align="center" justify="between">` exists in `durability.tsx`, and
  jtf-ui can't even construct a raw `<Row>` from this library anymore (SUI
  0.59 dropped the bare export). The requested variant would have shipped as
  a byte-identical duplicate of `SpreadRow`.

## #64 — Function-first burn-down — down to the long tail

| Metric | 2026-07-29 | 2026-07-30 morning | 2026-07-30 now | Target |
|---|---|---|---|---|
| `collectionMethodCalls` | 209 | 139 | **31** | 0 |
| `dotChains` | 54 | 33 | **7** | 0 |
| `cssTypedProps` | 14 | 14 | **14** (unchanged) | 0 |

Convert `xs.map(f)` → `map(f, xs)` (direct form outside pipes, curried inside)
and chains → `fn.pipe` with named stages. Read `src/fn/README.md` first —
the dual-form convention is precise. `src/fn/` is exempt by construction.
`fn.every` now exists (mirrors `fn.some`).

**~24 slices landed 2026-07-29/30** — `git log --oneline` for the exact
diffs, from `dfd3e06` (`ParticipantAvatar/initials.ts`, the worked example)
through `d94ae65`. Folder-level slices (small sibling files, one component)
went as a single commit — see `CashflowScrubChart/`, `SwimlaneChart/`,
`DagChart/`, or `ExtractionBoard/` for the pattern. Later slices bundled
several unrelated single-file fixes into one commit once the natural
clusters ran out — each such commit's message still breaks down every site
individually.

**Two things that changed how the later slices ran, worth reading before
picking this back up:**

- **`flatMap` has no `fn` equivalent**, and it splits into two different
  fixes depending on shape:
  - **0-or-1-per-input** (an early `return []` guard inside the callback):
    `pipe(items, map(toXOrNull), filter((x): x is X => x !== null))` — map to
    a nullable result, then filter the misses. Used in `DagChart.tsx`'s
    `positionedNodes`/`edgePaths` and `collapse.ts`'s `primaryNodes`.
  - **genuine one-to-many expansion**
    (`area.flatMap(a => a.children.map(...))`): a nested `for...of` push
    loop, same rationale as the no-`forEach` convention — `AreaFocusGrid`'s
    `subCols`, `HeatStreamGrid`'s `allNonEmptyKeys`.
- **TS can't contextually type an `fn` call's unannotated callback param
  when the array argument is a nested call expression** rather than a plain
  identifier — e.g. `filter(({idx}) => ..., map(...))` fails to infer, but
  `const indexed = map(...); filter(({idx}) => ..., indexed)` works. Hit
  repeatedly (`Badge/tagPairs.ts`, `Alarm/alarm.ts`). Always name the
  intermediate as its own statement when chaining two `fn` calls outside a
  `pipe`.
- **`fn.filter`'s predicate must return exactly `boolean`**, unlike native
  `.filter()` which accepts any truthy/falsy return — a `boolean | undefined`
  field read directly in the predicate (`i => i.transient`) needs an
  explicit `!!` coercion (`NotificationCenter.tsx`).

**0-seeded `Math.max`/`Math.min` reduces are a real, recurring, justified
exception** — not a one-off. Confirmed sites, all left native: `Chart/Axes.tsx`
(`estimateMaxLabelWidth`, `measureMaxLabelWidth`), `ScrubChart.tsx`
(`yAxisWidth`'s `ticks.reduce`), `internal/animation/choreography.ts`
(`totalWeight`'s `steps.reduce`). A 3-field object-accumulator reduce is
**not** automatically in this category, though — `PivotTreemap.tsx`'s
`outerSlots` and `ProductGrid.tsx`'s `aboveTotals` both summed 0-seeded
fields and converted cleanly to `sum(pluck(...))` / `sum(map(...))`, because
`sum([]) === 0` matches a 0 seed exactly (no seedless-max behavior-change
risk). Check what's actually being reduced, not just whether it's 0-seeded.

**Remaining** (dotChains + collectionMethodCalls combined; run
`npm run health -- --verbose` for exact line numbers):

| File | Hits | Note |
|---|---|---|
| `Table/BaseTable.tsx` | 5 | |
| `test-utils/domStructure.ts` | 4 | test infra, not a component — check its own norms before converting |
| `Chart/Axes.tsx` | 3 | **both sites are the justified 0-seeded-reduce exception above — leave native** |
| `Table/TableQuickFilter.tsx` | 3 | |
| `Sparkline/Sparkline.tsx`, `TrendSparkline/TrendSparkline.tsx`, `WeekCalendar/WeekCalendar.tsx`, `Table/dateCells.tsx`, `ValueMatrix/ValueMatrix.tsx` | 2 each | |
| `ScrubChart/ScrubChart.tsx` | 1 | **the justified 0-seeded-reduce exception above — leave native** |
| `SprintSelector/`, `TabbedSidePanel/`, `Table/SelectableTable.tsx`, `Table/fields/{FieldTable,actions,resolve}.tsx`, `WorkProgressCard/cardProgress.ts`, `internal/animation/choreography.ts`, `internal/animation/trajectories/{builders,layout}.ts`, `internal/dag-svg/orthogonal-routing.ts`, `themes/__tests__/_cssRules.ts` | 1 each | `choreography.ts`'s is **also the justified reduce exception** — already handled, don't re-touch |

22 files, 38 hits total, but 4 of those hits (2 in `Chart/Axes.tsx`, 1 in
`ScrubChart.tsx`, 1 in `choreography.ts`) are the confirmed 0-seeded-reduce
exception and will never go to 0 without changing behavior. Realistic floor
for `dotChains`+`collectionMethodCalls` combined is **4**, not 0 — update
`open-work.md`'s "explicitly out of scope" section with these four sites
once the remaining ~34 hits are cleared, rather than continuing to chase 0.

**Method — `src/components/ParticipantAvatar/initials.ts` is the worked
example** (17 sites → 1, commit `dfd3e06`), plus `AnimatedSwimlaneChart/`
and `StatusFlowChart/`+`SwimlaneChart/` for the multi-key-sort case:

- **One file (or small sibling-file folder) per PR.**
- **Prefer pure `.ts` files with existing tests.**
- **Verify differentially when there's no existing test coverage for the
  exact logic touched.** For a 3-key lane reorder and a topological-rank
  sort, both untested directly, thousands of randomized trials against the
  pre-refactor comparator (0 mismatches) stood in for real test coverage —
  write the throwaway harness in `/tmp`, run it, delete it. Don't skip this
  just because `tsc`/the broader suite pass; neither exercises the exact
  ordering edge cases a comparator rewrite can get subtly wrong.
- **A two-key comparator becomes two stable `sortBy` passes** (secondary key
  first, then primary); a three-key comparator extends the same technique
  with a third pass. Equivalent, and it drops any defensive `.slice()`/spread
  the native `.sort()` needed to avoid mutating a shared array.
- **`fn` has no `forEach`.** A `.forEach()` that only mutates an outer
  accumulator (a running Map, a running "best so far") becomes a `for...of`
  loop, not a functional combinator — forcing `map`/`filter` onto pure
  side-effecting iteration adds noise, not clarity. This came up repeatedly
  (`CashflowScrubChart`, `AnimatedSwimlaneChart`, `SwimlaneChart`,
  `StatusFlowChart`).
- **Watch for in-place `.sort()`/`.reduce()` that a later step depends on
  reading back.** `SwimlaneChart/layout.ts`'s `sortCol` mutated a `Map`'s
  array value in place via `ids.sort(...)`, and later code re-read that same
  array from the map — replacing it with `sortBy` (which copies) required an
  explicit `visibleCols.set(col, sorted)` to keep the observable behavior
  identical. Grep for every later read of the variable before assuming a
  copy-based replacement is a no-op.

## `cssTypedProps` — blocked on a cross-repo type, not abandoned

Still 14, unchanged this round. `DataTableContainer.maxHeight` and its
`Table/`-family siblings are the natural next slice (8 of 14, per the prior
handoff's own note on the `CssLength` template-literal union), **but**:
jtf-ui's `HourLevelDataTable`/`HourlyDataTable`/`MinMaxTable` locally type
`maxHeight?: string` (wider than any `CssLength` union) and forward it
straight through to `DataTableContainer` — narrowing SUI's prop type would
break jtf-ui's typecheck even though every actual call site passes a
literal like `"500px"`. This needs a coordinated bump (widen jtf-ui's local
prop type first, or accept the cross-repo PR pair), not a solo SUI PR.
`Surface.minWidth`/`maxWidth`, `Dot.size`, `ChartCanvas.height` are a
different, simpler fix (`number | string` → `CssLength`) with no such
cross-repo entanglement — worth doing first if picking this back up.

---

## Explicitly out of scope — do not "fix" these

- **`inlineStyleSrc` (71) and `inlineStyleShowcases` (20).** Dominated by
  sanctioned dynamic geometry. Retired issue #48 established this; its
  title said "to zero" and its own body disowned that. **Leave them.**
- **Moving `prepare` to `prepack`.** Evaluated and rejected — see ADR 0007.
  Guarded by `scripts/build-config.test.ts`.
- **The `--ignore-scripts` flags in the workflows.** Load-bearing, not a
  leftover. ADR 0007, same guard test.
- **`sideEffects` in package.json / `preserveModules` in vite.config.ts.**
  Removing either re-adds ~318 KB to every consumer bundle. ADR 0005.
- **The KaTeX stub/copy/prepend trio in vite.config.ts.** Removing any one
  silently restores ~1.4 MB to `dist/index.css`. ADR 0006.

## Orientation

`CONTEXT.md` (domain + glossary), `STYLE_GUIDE.md` (depth levels, curried-variant
pattern), `AGENT_GUIDE.md` (conventions), `COMPONENTS.md` (catalogue),
`docs/adr/0001`–`0007`, `src/fn/README.md`. Issues live in GitHub Issues via `gh`
(`docs/agents/issue-tracker.md`); labels in `docs/agents/triage-labels.md` — note
that repo only actually has `wontfix` and `ready-for-agent` as custom labels
today; the doc's other three (`needs-triage`, `needs-info`, `ready-for-human`)
don't exist yet.
