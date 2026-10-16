# Pure units, one integration test per API — 2026-10-16

Branch `chore/test-pure`, stacked on `chore/test-prune` (PR #288). Raw
captures: `before/` and `after/` (`per-file.csv` and `per-test.csv` derived
from the vitest JSON reporter, whose raw file is not committed;
`vitest-time.txt` from `/usr/bin/time`; `after/gate.txt`). The 50 slowest
tests and what was done with each: `classification.csv`. Fair per-file
comparison of every touched file: `touched-files.csv`.

## Headline

The per-test tail was already flat after the prune: one subprocess test at
12.8 s, two 600 ms tween waits, and then nothing above 500 ms. Of the 5811
tests, body time summed to 56 s across 8 workers; jsdom construction, not
test bodies, still dominates (see test-prune/REPORT.md). So the brief's
"expedite the most expensive tests" was mostly about waits, and "pure units
instead of integration" was about the slider and Slider families, where
render tests re-proved rules that were (or could be) tables.

| | before | after |
|---|---|---|
| test files | 464 | 466 (+ moves.test.ts, logic.test.ts) |
| tests | 5811 | 5825 (+45 node-environment table cases, −31 render tests) |
| wall-clock, quiet machine | 67.1 s (load ≈ 10) | not measurable — see below |
| touched files, back-to-back under equal load (load 65–130) | 455 tests / 18.69 s body time | 469 tests / 14.92 s (−20%) |
| health ratchets, execution coverage | at baseline | at baseline |

The full after-run (`after/vitest-time.txt`: 158.8 s wall, 480 s user) ran
while four other agents were running gates on this machine (load average 65
to 132), and every untouched file in it reads two to three times slower than
the baseline; it is kept as a capture but is not a comparison. The touched
files were then run back to back in both worktrees under the same load, and
that is the −20% above. Re-run `before`/`after` on a quiet machine before
quoting a wall-clock figure.

## The 25 slowest tests, before vs after

After-column values come from the loaded run, so untouched rows read high;
the touched rows (ScrubChart tween, Swimlane, EllipsisText) fell despite the
load.

| before ms | after ms (loaded run) | test |
|---|---|---|
| 12803 | 22487 | scripts/health-ratchet.test.ts › health ratchet: the CLI is wired to these rules refuses a bare raise a |
| 625 | 84 | ScrubChart/ScrubChart.test.tsx › ScrubChart y-domain tween settles the screen domain on the axis's targ |
| 604 | 81 | ScrubChart/ScrubChart.test.tsx › ScrubChart y-domain tween renders the max tick's label once the tween  |
| 500 | 18 | SwimlaneChart/SwimlaneChart.responsive.test.tsx › SwimlaneChart — responsive collapse renders a re-entering node twice u |
| 407 | 637 | Tooltip/PopoverTooltip.test.tsx › PopoverTooltip hover still works opens on pointerenter and closes on p |
| 395 | 115 | DataDisplay/EllipsisText.test.tsx › EllipsisText — one stable host (G23) settles as a squeezed flex item:  |
| 374 | 621 | Tooltip/PopoverTooltip.test.tsx › PopoverTooltip hover still works stays open while the pointer moves fr |
| 303 | removed/renamed | PairedMutationSliders/PairedMutationSliders.test.tsx › PairedMutationSliders paging moves by whole PAIRS shows ONE whole pair |
| 255 | 654 | RateGauge/geometry.test.ts › leader routing — no crossings, no lines on top of each other never cro |
| 235 | 585 | CashflowScrubChart/liveToggle.test.tsx › CashflowScrubChart — props toggled on a live instance redraws the cons |
| 214 | 302 | DateRangePicker/DateRangePicker.test.tsx › DateRangePicker opens the calendar grid when the trigger is clicked |
| 203 | 628 | CashflowScrubChart/gutterCap.test.tsx › CashflowScrubChart — the capped gutter drops a long right label below  |
| 199 | 195 | OverflowNav/OverflowNav.test.tsx › OverflowNav re-folds on resize (G16) re-measures on resize: widths tha |
| 185 | 252 | CashflowScrubChart/outOfRange.test.tsx › CashflowScrubChart out-of-range markers (fixed range) marks a balance  |
| 184 | 201 | StackedTimelineChart/StackedTimelineChart.test.tsx › StackedTimelineChart never grows its own box (G20) a run of resize obs |
| 179 | 254 | Chart/lineStroke.test.tsx › LineSeries stroke no stylesheet rule overrides a caller's stroke |
| 173 | 310 | Select/Select.test.tsx › Select inside a Modal renders its options when it is opened from insid |
| 167 | removed/renamed | PairedMutationSliders/PairedMutationSliders.test.tsx › PairedMutationSliders paging moves by whole PAIRS pages by ONE entity, |
| 156 | 273 | ChannelChart/ChannelChart.test.tsx › ChannelDivergenceChart renders as one img with both plots on one perio |
| 152 | 233 | Table/fields/actions.test.tsx › actions field module actionCol renders an accessible icon button that  |
| 152 | 196 | ConversationTree/ConversationTree.test.tsx › ConversationTree renders a bubble per message with its text |
| 151 | 195 | BuilderBoard/BuilderBoard.test.tsx › BuilderBoard — panel D's box hands a render function the rail width, t |
| 149 | 196 | Tooltip/PopoverTooltip.test.tsx › PopoverTooltip tap/click to open opens on trigger click |
| 139 | 139 | SwimlaneChart/SwimlaneChart.test.tsx › SwimlaneChart — geometry renders one node per input node and one path  |
| 138 | 539 | GroupedMutationSliders/GroupedMutationSliders.test.tsx › GroupedMutationSliders entityFrame pages identically with and without  |

## Per module

| module | pure functions extracted | tests removed | integration test kept, and the API it proves |
|---|---|---|---|
| test-utils | `installFastFrames()` (rAF → setTimeout(0) shim, opt-in), `installFramePump()` (manual rAF + performance.now, `frame()`/`frames(n)`/`pending()`) | 0 | n/a (fixtures) |
| SwimlaneChart.responsive | none (fixture) | 0 | every test mounts; the 450 ms sleep is `vi.useFakeTimers({toFake:["setTimeout","clearTimeout"]})` + `advanceTimersByTime(450)` |
| EllipsisText | none (fixture) | 0 | every test mounts; 20 awaited resizes on fast frames (403 → 71 ms quiet, 428 → 115 ms loaded) |
| ScrubChart y-domain tween | none new (yDomainTween.ts already pure, clock-injected) | 0 | "renders the max tick's label once the tween settles" and "settles the screen domain" now pump 60 frames (600 ms → 49 / 27 ms) and one also asserts mid-flight |
| MutationSliders | `moves.ts`: `isPinned`, `resolveMove` (unpinned / pinned-by-delta / linked fan-out, change vs commit, zero-delta rules), `resolveReset` (consumer / linked / clamped move); 22 node cases | 14 (pinning 7 → 2, paging 12 → 2); file 139 → 125 | `integration: pinning holds together` (name buttons → pinTo snap, key → resolveMove fan-out, onChange/onChangeEnd, unpin); `integration: paging holds together` (measured width → rowLayout, chevrons, windowLabel, +, dial id, end stop, re-settle, re-fit, one-dial minimum); kept on judgement: "commits each pinned peer exactly ONCE on a pointer release" (kobalte pointer seam) |
| PairedMutationSliders | none new (pairs.ts, rows.ts) | 4 (paging 6 → 2) | `integration: paging by whole pairs holds together` (PAIR_SLOT, "pairs" noun, page by one, +, one-pair minimum, no chevrons when all fit) |
| GroupedMutationSliders | none new (groups.ts, rows.ts) | 1 (paging 4 → 3) | `integration: paging by whole entities holds together` (multiple-of-N dials, "columns" noun, page by one) |
| Slider | `logic.ts`: `DEFAULT_STEP`, `ticksFromStep`, `resolveTicks`, `snapToDomain` (moved out unchanged), `commitTyped` (new: parse / clamp / snap / same-value-says-nothing); 23 node cases | 12 (ticks 8 → 1, typed 6 → 1); file 35 → 23 | `integration: ticks hold together` (none by default, one per step short of max, passed, aria-hidden, explicit list drops off-domain); `integration: the editable field holds together` (Enter and blur commit through clamp and snap, Escape and non-numbers revert, held value emits nothing) |

Every component module keeps at least one mounting test;
`componentsNeverRendered` and `componentsNeverExecuted` read at baseline
(`after/gate.txt`).

## Looked at and left alone (judgement calls, listed rather than deleted)

- `scripts/health-ratchet.test.ts` (12.8 s, the single subprocess smoke
  test). The prune agent already listed it for Peter to rule. `health.mjs`
  has no `--root` and reads COMPONENTS.md, CHANGELOG.md and dev/main.tsx, so a
  small fixture tree is not a ten-minute change. Cheapest cut: move the one
  spawn behind `npm run gate` as its own step.
- `PopoverTooltip` hover tests (400 ms each). Already on fake timers;
  `toFake: ["setTimeout","clearTimeout"]` was tried and changed nothing. The
  cost is kobalte's first popover mount (the plain "opens on trigger click"
  test is 183 ms too), not a wait. Genuine integration.
- `CashflowScrubChart` (93 tests), `LevelsTimeline` (67), `Combobox.render`
  (34), `BuilderBoard`, `DirtyComboBox`, `TreeTable`: each test is a DOM or
  stylesheet contract at 10–30 ms; the pure layers (labelCandidates.ts,
  geometry.ts, yDomain.test.ts) already exist and are table-tested. Nothing
  there re-proves a rule through a render.
- `RateGauge/geometry.test.ts` leader-routing cases (255 ms, 112 ms): pure
  and already on node; slow because they sweep every box pairing. Content,
  not harness.
- `GroupedMutationSliders` "costs one dial slot per measure" is a pure
  assertion sitting in a render file; left where it is (trivial cost).

## Gates

`npm run gate -- --fast` in the worktree (`after/gate.txt`), verbatim step
lines:

```
✓ At baseline.
✓ test — passed
✗ lint — FAILED (exit 1)
✗ gate FAILED
```

`lint` fails on `src/root-exports.contract.ts:221` (`noUselessEmptyExport`,
FIXABLE), a file that belongs to the `chore/test-prune` base and is unchanged
here; the base's own gate record predates that warning. One lint warning in
this branch (an `isPinned` closure made unused by `resolveMove`) was fixed in
`fix(MutationSliders)`. `tsc --noEmit` passes; `test` passes 466 files /
5825 tests with execution coverage at baseline.

## Judgement calls

- One integration test per API means one MOUNT per API, not one assertion:
  each kept test walks the whole gesture (measure → page → settle → re-fit)
  so a wiring break anywhere in the chain still fails it.
- A render test whose only claim is a number the pure layer already produces
  is a duplicate; a render test whose claim is a DOM state (unmeasured row
  shows everything; aria-pressed; a disabled button) is not, and stayed.
- `moveTogether` applies the delta to each entity's RAW value and clamps,
  so an over-band dial holds its ceiling under a small cut. The pure tests
  document that existing rule rather than changing it.
- Fixtures that change timing were made opt-in rather than default (below).

## Rabbit holes and misjudgements

- **Global fast frames made the suite slower.** Swapping jsdom's 16 ms
  `requestAnimationFrame` for `setTimeout(0)` inside `installFakeSizer`
  cut EllipsisText and Swimlane as expected but made MutationSliders 3.6 s →
  10.8 s, Grouped 1.7 → 6.3 s, Paired 1.5 → 4.6 s: their height tweens
  measure elapsed time, so 1 ms frames meant ~15× the frames and renders to
  cross 240 ms. Reverted to an opt-in `installFastFrames()`; the header
  says why.
- **The after-measurement ran under load 65–132** (other agents' gates) and
  came out slower across the board. Only the back-to-back touched-file
  comparison is quotable.
- **zsh does not word-split `$FILES`.** The first back-to-back run passed
  seven paths as one argument and vitest matched nothing (1.3 s, 483-byte
  JSON). Spelled the paths out.
- **diddit:** the dispatcher auto-spawned its own engineer on topic #83 at
  11:17, which held the claim (and rewrote the step list) until it was
  killed (exit 143) around 11:40; step bookkeeping before that was refused.
- Estimate 150 min; actual about 140 min to the PR.
