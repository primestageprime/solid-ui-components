# Test-suite prune — 2026-10-16

Branch `chore/test-prune`. Raw captures: `before/` and `after/` (`per-file.csv` derived from the vitest
JSON reporter, whose 8.6 MB raw file is not committed; `vitest-stdout.txt`,
`vitest-time.txt` from `/usr/bin/time`, `coverage-summary.json`,
`execution-coverage.txt`, `after/gate.txt`). Per-file classification: `classification.csv`.

## What the suite is

SUI has one runner, vitest (jsdom + Solid testing-mode JSX). There is no
Playwright, no screenshot or visual test, and no `__snapshots__` directory
(the 13 `toMatchInlineSnapshot` calls pin geometry objects inline, which is
behaviour). CI runs `npm run test:coverage && npm run execution-coverage`.

## Before / after

Measured on the same machine (8 cores), same command (`vitest run --coverage`),
back to back.

| | before | after | change |
|---|---|---|---|
| wall-clock | 103.4 s | 74.5 s | -28% |
| CPU (user+sys) | 593 s | 448 s | -25% |
| test files | 474 | 464 | -10 |
| tests | 5880 | 5811 | -69 |
| jsdom environment construction (worker time) | 325 s | 192 s | -41% |
| module import (worker time) | 146 s | 128 s | |
| test bodies (worker time) | 85 s | 56 s | |
| health | at baseline, every ceiling tight | same | |
| componentsNeverExecuted | 3 (at baseline) | 3 (at baseline) | |

### Where the time went

The suite was not slow because of too many assertions. Vitest's own
breakdown for the baseline run: environment 325 s, import 146 s, tests 85 s.
Building a jsdom window for every one of 474 files cost almost four times as
much worker time as running the tests. 161 of those files were pure-function
suites (`*.test.ts` with no DOM) that paid for a jsdom they never used. That
is why the biggest lever is "headless", as the brief asked, not deletion.

### 25 slowest files, before vs after

Per-file ms as vitest reports them (excludes environment construction, which
is per-file overhead of roughly 0.7 s on jsdom and ~0 on node).

| before ms | after ms | file |
|---|---|---|
| 12082 | 6860 | scripts/health-ratchet.test.ts |
| 10031 | 9 | scripts/doc-coverage.test.ts |
| 4790 | 3113 | src/components/MutationSliders/MutationSliders.test.tsx |
| 2380 | 2084 | src/components/GroupedMutationSliders/GroupedMutationSliders.test.tsx |
| 2203 | 882 | src/components/Tooltip/PopoverTooltip.test.tsx |
| 1757 | 1151 | src/components/PairedMutationSliders/PairedMutationSliders.test.tsx |
| 1655 | 1593 | src/components/ScrubChart/ScrubChart.test.tsx |
| 1444 | 1230 | src/components/CashflowScrubChart/CashflowScrubChart.test.tsx |
| 911 | 890 | src/components/SwimlaneChart/SwimlaneChart.test.tsx |
| 901 | 1262 | src/components/LevelsTimeline/LevelsTimeline.test.tsx |
| 822 | 807 | src/components/SwimlaneChart/SwimlaneChart.responsive.test.tsx |
| 586 | 368 | src/components/CashflowScrubChart/liveToggle.test.tsx |
| 559 | 547 | src/components/Combobox/Combobox.render.test.tsx |
| 528 | 164 | src/components/Select/Select.test.tsx |
| 507 | 653 | src/components/RateGauge/geometry.test.ts (now node) |
| 504 | 508 | src/components/ChartFrame/YAxisLockDialog.test.tsx |
| 482 | 304 | src/components/DateRangePicker/DateRangePicker.test.tsx |
| 440 | 360 | src/components/BuilderBoard/BuilderBoard.test.tsx |
| 427 | 413 | src/components/StackedTimelineChart/StackedTimelineChart.test.tsx |
| 419 | 343 | src/components/DirtyComboBox/DirtyComboBox.test.tsx |
| 406 | 389 | src/components/DataDisplay/EllipsisText.test.tsx |
| 387 | 158 | src/components/Strips/GrowthStrip.test.tsx |
| 380 | 375 | src/components/ActionList/ActionList.test.tsx |
| 368 | 3 | src/themes/__tests__/loader.test.ts (now node) |
| 358 | 301 | src/components/MutationToolbar/MutationToolbar.test.tsx |

Unchanged render files vary run to run by scheduling noise (LevelsTimeline
went up, Select went down); only the first two rows and the node-pinned rows
are real changes.

## Classification (474 files)

| class | files | meaning | action |
|---|---|---|---|
| a — duplicate | 1 | doc-coverage's live-repo block re-ran what the `health` CI job runs on every PR | block deleted, fixture tests kept |
| b — type-guaranteed | 11 | 9 barrel/export suites + unstable.test.ts asserted root-export existence/absence; StatusFlowChart.export's export block | deleted; replaced by `src/root-exports.contract.ts` |
| b+c — partly type-guaranteed, pure | 16 | `src/fn/*` suites: one `it()` each wrapped a `@ts-expect-error` with no runtime assertion | type check moved to module level; file pinned to node |
| c — headless convertible | 118 | pure-function suites that paid for jsdom | `// @vitest-environment node` |
| d — visual/screenshot | 0 | none exist | |
| e — keep | 328 | render behaviour, DOM contracts, layout math, hotkeys, reducers, stylesheet contracts; or needs DOM / imports the root barrel | kept |

Removed per class: a = 5 tests, b = 48 tests (10 files), b+c = 16 tests
(0 files), c = 0 tests. Total 69 tests, 10 files.

## Behaviours now covered by static analysis

| behaviour | was | now |
|---|---|---|
| every public name resolves from the package root (ambiguous `export *` silently drops a name; DateAxis's explicit list once stranded DailyDateAxis) | 9 vitest files importing the whole root at runtime | `src/root-exports.contract.ts`: `[sui.X, …] satisfies Fn[]`, compiled by `tsc --noEmit` under tsconfig's `src/**` (the `typecheck` CI job). Verified: a bogus name fails TS2339. |
| private names stay off the root (StatusFlowChart base, channelModel/formatChannelTable, GroupedMutationSliders and PairedMutationSliders internals) | `expect("X" in sui).toBe(false)` | `// @ts-expect-error` + `type _ = Root["X"]`. Verified: removing the directive fails tsc. |
| `/unstable` entry exports channelModel and formatChannelTable | unstable.test.ts | same contract file |
| contract TYPES resolve from the root (TreeDiff*, Grouped*, Paired*, MarkedSlider*, RateGauge*) | `type Contract = […]` inside test files | same contract file |
| constants keep their shape (SAME_ID `"__same"`, ROOT_BASELINE_ID, KINDS is `TreeDiffKind[]`, fallback sizes and default labels are objects) | `expect(sui.SAME_ID).toBe("__same")` | `satisfies` on the literal / shape |
| curried fn argument order (`map(fn)(xs)`, not `map(xs, fn)`) | `it("… at compile time")` wrappers | module-level `@ts-expect-error` closures, same files |

Nothing in component source changed.

## Kept on judgement (listed rather than deleted)

- `scripts/health-ratchet.test.ts` — the one subprocess smoke test (spawns
  `node scripts/health.mjs`, 7–12 s, now the slowest file). Its header says
  it is deliberately the single remaining spawn, to prove the CLI is wired to
  the pure ratchet rules. AGENT_GUIDE also says not to spawn subprocesses in
  the suite. Both are documented decisions; I left it and recommend Peter
  rule. Cheapest alternative: move it behind `npm run gate` as its own step.
- `Icon.test.tsx` "is registered in ICON_PATHS" (3 tests): `ICON_PATHS` is
  `Record<IconName, …>`, so existence is type-guaranteed, but each test also
  asserts the glyph contains `<path`. Kept.
- `src/themes/__tests__/manifest.test.ts` `THEMES.default` toBeDefined: two
  assertions, trivial cost. Kept.
- Unit vs integration pairs that looked like duplicates on the file list
  (`BucketQueue/selection.test.ts` vs `BucketQueue.selection.test.tsx`,
  `Chart/referenceLine.test.ts` vs `ReferenceLine.test.tsx`,
  `Strips/payroll.test.ts` vs `PayrollStrips.test.tsx`,
  `Table/EllipsisText` vs `DataDisplay/EllipsisText`) are not duplicates:
  each pair tests a pure core and a mounted component, or two different
  components. Repeated `it` titles across files (14x "direct ===
  curried-then-applied", 4x "renders its children") are the same contract
  applied to different subjects.

## What limited the prune

Two ratchets fail on an unrecorded change in either direction:
`componentsNeverRendered` (health, 17) counts components with no test that
mounts them, and `componentsNeverExecuted` (test job, 3) counts modules with
zero executed functions. Every component module therefore keeps at least one
mounting test, and the pruning stayed inside files. Both read at baseline
after the change.

The remaining suite is overwhelmingly behavioural (the MutationSliders,
ScrubChart and CashflowScrubChart files each hold 90–140 tests of clamping,
paging, keyboard step, pointer drag, stacking contexts and stylesheet
contracts). Deleting there would be removing coverage, not duplication.

## Gates after

From `after/gate.txt` (`npm run gate`, which derives its steps from
`.github/workflows/ci.yml`):

Verbatim step lines (`after/gate.txt` for test/lint/typecheck/health; the
first full run died in gate's own worktree plumbing on an 8.6 MB untracked
capture file, so build and bundle-budget were re-run with
`npm run gate -- --only build,bundle-budget` into `after/gate-build.txt`):

```
✓ test — passed          (464 files, 5811 tests; execution-coverage: ✓ At baseline.)
✓ lint — passed
✓ typecheck — passed     (tsc --noEmit, incl. src/root-exports.contract.ts; typecheck:dev)
✓ health — passed        (✓ No regressions, and every ceiling is tight.)
✓ build — passed
✓ bundle-budget — passed (✓ No leaks, every bundle renders, and every ceiling is tight.)
✓ gate passed
```

## Further headroom (not done, for Peter to decide)

- 26 `.test.ts` files still run under jsdom because they import the root
  barrel (`src/index.ts` touches `window` at module init) or genuinely need
  the DOM. Narrowing their imports would let most go headless.
- Remaining environment cost is ~192 s across ~330 jsdom files. Vitest
  `test.projects` (one node project for `*.test.ts`, one jsdom project for
  `*.test.tsx`) would make headless the default for new files; `isolate:
  false` would share one jsdom per worker but changes isolation semantics,
  so it was not attempted.
- CI runs on 2 cores; the wall-clock gain there should be at least the CPU
  gain (-25%), roughly 2.5 min off a 10 min `test` job.

## Rabbit holes and misjudgements

- Quoted globs passed to `vitest run 'src/**/*.test.ts'` match nothing
  (vitest filters are substring matches on paths); the first node-env probe
  produced an empty JSON report. Fix: pass the file list.
- `printf '%s' "$(cat f)"` strips the trailing newline, so the first
  node-pragma pass showed every file as a two-line diff. Fixed with a
  newline-at-EOF pass before committing.
- `type X = […] satisfies T` is invalid; `satisfies` needs an expression.
  The contract file uses `const _x = […] satisfies T` with a value import of
  the barrel, which is never executed because nothing imports the file.
- Estimate 165 min; actual about 110 min to the PR.
