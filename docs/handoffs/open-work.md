# Handoff: open work in solid-ui-components

**State as of 2026-07-30.** Version `0.127.0`, `main` at `6e9a8a9`, all checks green,
every ratchet ceiling tight. This supersedes the six-issue handoff from
2026-07-29 — five of those six are resolved or triaged; #64 continues below.

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
- **Two issues in the prior handoff had premises that didn't survive contact
  with the code**, despite one claiming "Verified still valid." Don't take a
  filed issue's stated cause at face value — check it against current `git log`
  / current CSS / current baked-in defaults before implementing. See #45 and
  #67 below.

---

## Resolved since the last handoff (2026-07-29)

- **#66** — `SurfaceDataProps` documented in `COMPONENTS.md`. Shipped `fcbdcc4`.
- **#68** — `DateCell` gained `timeZone`, matching `DateTimeCell`. Shipped `cdc95cd`.
- **#69** — `ValueMatrix`/`PivotGrid` `colLabel`/`rowLabel` widened to
  `=> string | JSX.Element`. Shipped `25ac69e`.
- All three released in **0.127.0** together with the #64 progress below;
  see `CHANGELOG.md` for the full writeup.

## Triaged, not closed — needs a human decision

- **#45** — `Stack`/`Row` `gap` typed `"xs" | "sm"`; the issue claims the
  runtime supports `md`/`lg`. It doesn't, as of today: that CSS was
  deliberately removed twice (`928651f` 2026-06-26, `9158c75` 2026-07-17)
  after audits found nothing depended on it. Widening the type without
  matching CSS would reintroduce the exact silent-zero-gap bug
  `assertModifierClass` exists to catch. A separate real bug was found while
  investigating: `Surface.gap` publicly accepts `"md"|"lg"` but silently
  collapses them to `"sm"` before forwarding to the inner `Row`/`Stack` (no
  `.surface--gap-md/-lg` CSS exists either) — that's plausibly the actual
  source of the "runtime supports md/lg" impression, but it's a different
  component and a different bug shape (type wider than effect, not
  narrower). Full evidence in the issue comments. **Recommend closing #45 as
  invalid/stale**, and filing the `Surface.gap` collapse as its own issue if
  it's worth fixing.
- **#67** — `SpreadCenterRow` curried variant. `SpreadRow` has baked in both
  `align: "center"` and `justify: "between"` since the repo's **initial
  commit** (`feeb575`) — the issue's premise ("SpreadRow strips align") was
  never true. Checked the cited jtf-ui symptom directly: no matching raw
  `<Row align="center" justify="between">` exists in `durability.tsx`, and
  jtf-ui can't even construct a raw `<Row>` from this library anymore (SUI
  0.59 dropped the bare export). **Recommend closing #67 as invalid** — the
  requested variant would ship as a byte-identical duplicate of `SpreadRow`.

Neither was closed by the agent that triaged them — closing someone else's
issue as invalid is a different kind of call than closing one you fixed.

## #64 — Function-first burn-down — the long grind, continues

| Metric | 2026-07-29 | Now | Target |
|---|---|---|---|
| `collectionMethodCalls` | 209 | **139** | 0 |
| `dotChains` | 54 | **33** | 0 |
| `cssTypedProps` | 14 | **14** (unchanged) | 0 |

Convert `xs.map(f)` → `map(f, xs)` (direct form outside pipes, curried inside)
and chains → `fn.pipe` with named stages. Read `src/fn/README.md` first —
the dual-form convention is precise. `src/fn/` is exempt by construction.
`fn.every` now exists (added this round, mirrors `fn.some`).

**Slices landed 2026-07-29/30** (one component/folder per commit — `git log
--oneline` for the exact diffs): `ParticipantAvatar/initials.ts`,
`_contrastMath.ts`, `CashflowScrubChart/`, `ConversationTree.tsx`,
`AnimatedSwimlaneChart/`, `ThroughputChart.tsx`, `StatusFlowChart/`,
`SwimlaneChart/`. Every folder-level slice (small sibling files, one
component) went as a single PR — see `CashflowScrubChart/` or
`SwimlaneChart/` for the pattern.

**Densest remaining** (dotChains + collectionMethodCalls combined; run
`npm run health -- --verbose` for exact line numbers, since the file/line
counts drift with every slice):

| File / folder | Hits |
|---|---|
| `Combobox/ComboboxMulti.tsx` | 8 |
| `hooks/createDnDReorder.ts` | 6 |
| `AreaFocusGrid/AreaFocusGrid.tsx` | 6 |
| `internal/animation/choreography.ts` | 5 |
| `Table/BaseTable.tsx` | 5 |
| `RecentStarred/store.ts` | 5 |
| `ExtractionBoard/ExtractionBoard.tsx` (+`cards.tsx` 1) | 6 |
| **`DagChart/`** (`DagChart.tsx` 5, `edge-path.ts` 3, `collapse.ts` 2, `layout.ts` 1) | **11, as a folder** |
| `Badge/tagPairs.ts` (+`StatusChip.tsx` 2) | 7 |

`DagChart/` is the next natural folder-level slice — same shape as
`CashflowScrubChart/`/`SwimlaneChart/` (a handful of small sibling files,
one component). Everything past that is 1–4 hits scattered across ~65 more
files: genuinely one-file-at-a-time from here, no more natural clusters.

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
