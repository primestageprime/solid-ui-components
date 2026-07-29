# Handoff: open work in solid-ui-components

**State as of 2026-07-29.** Version `0.126.0`, `main` at `867d4be`, all checks green,
every ratchet ceiling tight. Six open issues, summarised below with enough
context to start on any one of them without re-deriving anything.

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

This is deliberate. `collectionMethodCalls` was burned 362 → 225 by real work and
then drifted back to 230 as a side effect of commits about other things, because
the old blanket `--update-baseline` blessed every metric at once. See
`scripts/health-ratchet.test.ts` and the #62 / #70 history.

### Other things that will bite

- **A new component needs a showcase.** `componentsWithoutShowcase` is ratcheted
  at **0**, so shipping one without `dev/showcases/<name>.tsx` fails `health`.
  Same for `foldersWithoutTests`, `undocumentedComponents` (COMPONENTS.md),
  `missingDepthHeaders` — all at 0.
- **Shared checkout.** Stage only files you touched; never `git add -A`.
- **CI installs with `--ignore-scripts`, so there is no `dist/`.** Everything in
  the test/lint/typecheck/health jobs must work from source. Don't add a test
  that reads `dist/`.
- **Don't spawn subprocesses in the vitest suite.** A subprocess that walks
  `src/` or runs the TS compiler API costs ~5s on a 2-core runner and contends
  with 273 parallel test files. Nine of them hung the `test` job until CI
  cancelled it at 15 minutes. Test pure logic directly; if you truly need an
  end-to-end spawn, one is the budget, with an explicit generous timeout.
- **CI is ~3× slower than local.** vitest's default 5s timeout is not enough for
  anything doing real work. Set a per-test timeout, not a global one.
- **`grep` is unreliable for the metric regexes.** It gave wrong answers twice
  this session on `\.map\(`-style patterns. Use `node` with the same regex as
  `health.mjs`, and cross-check totals against `npm run health -- --verbose`.
- **Biome's a11y rules only see intrinsic (lowercase) JSX elements.** SUI composes
  most markup from `<Grid>`, `<ClusterRow>`, `<NarrowStack>` — invisible to those
  rules. A green `lint` is **not** a11y coverage.

---

## The six issues

### #66 — Document that `SurfaceDataProps` strips layout overrides · *smallest*

Passing `padding` / `radius` / `bg` / `borderColor` to a curried `WarningSurface`
fails with **TS2322**, by design (ADR 0001 — visual config is locked at curry
time). Nothing tells a caller that; `COMPONENTS.md` mentions `SurfaceDataProps`
**zero times**, and the original note records that this is what made an agent
reach for an inline override.

**Do:** add a line to the `Surface` entry in `COMPONENTS.md`.
**Don't:** widen the data-prop type — that undoes the contract ADR 0001 exists to hold.
**Size:** ~15 minutes, docs only.

### #67 — `SpreadCenterRow` curried variant

`SpreadRow` bakes in `justify: "between"` but `align` is in `RowOverrides`
(`src/components/Layout/Row.tsx:64`), so it's stripped from `RowDataProps`. A
header row needing both `align="center"` and `justify="between"` can't use the
curried variant and falls back to raw `<Row>` — the exact escape the curried
vocabulary exists to prevent.

**Do:** add `SpreadCenterRow` to `src/components/Layout/variants.ts` with both
baked in. Ships with a showcase, a `COMPONENTS.md` line, and a test.
**Don't:** relax `RowDataProps` to allow `align` — that weakens every Row variant
to serve one call shape.
**See also #45** — both are Row/Stack contract holes and may want doing together.
**Size:** small.

### #68 — `DateCell` has no `timeZone` prop, unlike `DateTimeCell`

| Component | `timeZone`? |
|---|---|
| `DateTimeCell` | **yes**, documented |
| `DateCell` | **no** — only `format` and `locale` |

`DateCell`'s `format="iso"` calls `formatDatePattern(date, "YYYY-MM-DD")` with no
zone, falling through to `localDateParts()` — the *viewer's* zone. For a UTC
instant near midnight the rendered date is a day off west of UTC. A consumer can
ask for a UTC datetime but not a UTC date.

**Do:** add `timeZone?: string` to `DateCellProps` and thread it into
`formatDatePattern` (which already accepts one), matching `DateTimeCell`'s
semantics exactly — unset = host local zone, so existing behaviour is unchanged.
**Not urgent:** no consumer is exposed; jtf-ui uses `DateTimeCell` everywhere.
**Size:** one-line change plus a test.

### #69 — `ValueMatrix` `colLabel`/`rowLabel` typed `string`

`src/components/ValueMatrix/ValueMatrix.tsx:25,27` type both as `=> string`, but
`colLabel`'s result goes into `TableColumn.header`, which **already accepts
`string | JSX.Element`** (`Table/types.ts:14`), and `rowLabel` renders into a
`<span>`. Both are narrower than what they feed.

Live consequence: jtf-ui's `ComplianceThresholdTable` can't put JSX in a column
header, so vessel-detail Nox/Rog kW labels still use `.toFixed(0)` instead of
adopting `NumberWithUnits`.

**Do:** widen both to `=> string | JSX.Element`. Purely additive. `PivotGrid.tsx:19`
has the identical narrowing — same pass, or leave it with a note. Add a test
passing an element, to prove the header renders it rather than stringifying it.
**Then:** jtf-ui widens its own `PowerSource.label` — a follow-up in that repo.
**Size:** small; unblocks a consumer.

### #45 — `StackProps`/`RowProps` `gap` type too narrow · *untriaged*

`gap` is typed `"xs" | "sm"` but the runtime supports `md`/`lg`. This is the
layout gap that the retired #48's Phase 3 blamed for showcases passing raw
overrides. **The only open issue with no triage label**, so it's invisible to
`ready-for-agent` sweeps — triage it before or alongside #67.

### #64 — Function-first burn-down · *the long grind*

| Metric | Now | Target |
|---|---|---|
| `collectionMethodCalls` | **209** | 0 |
| `dotChains` | **54** | 0 |
| `cssTypedProps` | **14** | 0 |

Convert `xs.map(f)` → `map(f, xs)` (direct form outside pipes, curried inside)
and chains → `fn.pipe` with named stages. Read `src/fn/README.md` first —
the dual-form convention is precise. `src/fn/` is exempt by construction.

Densest remaining: `CashflowScrubChart.tsx` (13), `ConversationTree.tsx` (9),
`_contrastMath.ts` (7), `AnimatedSwimlaneChart.tsx` (7), `ThroughputChart.tsx` (6),
`StatusFlowChart/columns.ts` (6). Full list: `npm run health -- --verbose`.

**Method — `src/components/ParticipantAvatar/initials.ts` is the worked example**
(17 sites → 1, commit `dfd3e06`):

- **One file per PR.** 209 sites is not one change.
- **Prefer pure `.ts` files with existing tests.**
- **Verify differentially.** For non-obvious semantics, compare against the
  pre-refactor implementation from `git HEAD` over randomised inputs, then delete
  the harness. Slice 1 used 3000 rosters + 300 shuffles; the 15 existing tests
  would not have caught an ordering change.
- **Watch for mutation.** Slice 1 found two in-place `.sort()` calls on derived
  arrays — latent bugs, not style. `sortBy` copies; native `sort` doesn't.
- **A two-key comparator becomes two stable `sortBy` passes** (secondary key
  first, then primary). Equivalent, and it drops any defensive `.slice()`.
- **Separate measurement fixes from real progress.** Slice 1 shipped two commits
  for exactly this: 11 sites were real work, 10 were a regex false positive.

**`cssTypedProps` specifics.** Pure `number` will not work — callers pass
`"100%"`, `"400px"`, `"8rem"`, `` `${widthCh()}ch` ``. A **template-literal
union** keeps all of it and satisfies the rubric, which flags the `string`
*keyword*: `` `${number}px` | `${number}%` | `${number}rem` | "auto" ``. Verified
— typing `Surface.minWidth` that way drops the count. Define one shared
`CssLength`; **8 of the 14 are the Table family** and fall in a single PR.

---

## Explicitly out of scope — do not "fix" these

- **`inlineStyleSrc` (71) and `inlineStyleShowcases` (20).** Dominated by
  sanctioned dynamic geometry. `AreaFocusGrid` alone is 8 computed `grid-column`
  values. Driving these to zero means custom-property plumbing for computed
  integers, which makes the code worse. Retired issue #48 established this; its
  title said "to zero" and its own body disowned that. **Leave them.**
- **Moving `prepare` to `prepack`.** Evaluated and rejected — see ADR 0007.
  `prepack` does not fire for `npm link` or git-dependency installs, so the
  change silently ships an empty package. Guarded by
  `scripts/build-config.test.ts`.
- **The `--ignore-scripts` flags in the workflows.** They look like a workaround
  for `prepare`; they are load-bearing. ADR 0007, same guard test.
- **`sideEffects` in package.json / `preserveModules` in vite.config.ts.** A pair;
  each is inert alone, so each looks like dead config. Removing either re-adds
  ~318 KB to every consumer bundle with no local symptom. ADR 0005.
- **The KaTeX stub/copy/prepend trio in vite.config.ts.** Removing any one
  silently restores ~1.4 MB to `dist/index.css`. ADR 0006.

## Suggested order

**#66 → #68 → #69** are each an hour or less, independent, and each closes a real
gap. Triage **#45** and consider it with **#67**. Then chip at **#64** one file per
PR — safe to do incrementally now that the ratchet holds and gates.

## Orientation

`CONTEXT.md` (domain + glossary), `STYLE_GUIDE.md` (depth levels, curried-variant
pattern), `AGENT_GUIDE.md` (conventions), `COMPONENTS.md` (catalogue),
`docs/adr/0001`–`0007`, `src/fn/README.md`. Issues live in GitHub Issues via `gh`
(`docs/agents/issue-tracker.md`); labels in `docs/agents/triage-labels.md`.
