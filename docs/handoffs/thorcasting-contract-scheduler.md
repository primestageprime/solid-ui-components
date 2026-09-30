# Handoff — the Contract Scheduler screen, for `thorcasting-ui`

Status: **READY TO BUILD in the consumer.** Written 2026-09-29 at the end of the
`/sui-build` of the `workshop:contract-scheduler` bench. Every SUI component
below is on `main`'s `## Unreleased` and ships in the next release after
**0.203.0**; `thorcasting-ui` is on `^0.201.0` today, so bump it first.

Supersedes `docs/handoffs/contract-scheduler-sui-gaps.md` (the gap analysis of
the same date, now deleted). Gaps 1–10 landed as the components in §2: the
timeline as `SpanLanes` + `SvgMarks` on a time-domain `Chart` (the
x-scale path; the calendar-percent draft is gone), the dial caption, `ModeSplitButton`,
`createRangeDialog`, `BaseTable.highlighted`, `LeftTruthToggle`, `lock-open`,
`showNames`, the workflow badges and `ContentChartFrame`. Gap 11 (a holiday
list editor) is still open, in §7.

---

## 1. What to build

A contract firm's season on one screen: a **job list** that opens into one
job's **dials** (hours per phase, materials), and a **timeline** of phased bars
(solid = a phase worked, hatched = waiting for a crew) that reflows in **Full
auto** or holds still in **Manual**, around **locked** jobs. Dragging a bar
suggests a start: in Full auto it snaps left to the nearest job's slot and the queue reflows, in Manual it lands on the exact working day; a job
over its crew's capacity is outlined red with a `!`. It is the UI half of
thorcasting-qbo ADR 0028 and its 2026-09-29 addendum.

Look at it first: `npm run dev` in SUI (port 6006) → nav id
**`workshop:contract-scheduler`**. The bench is the reference composition:
`dev/showcases/workshop/contract-scheduler.tsx` (the screen),
`contract-scheduler-kit/timeline.tsx` (the timeline), and
`contract-scheduler-model.ts` + `.test.ts` (the model, 44 tests). It imports
every component through the package barrel, exactly as the consumer will.

---

## 2. SUI components per region

All from `@primestageprime/solid-ui-components`. "New" means first exported in
the release after 0.203.0.

| Region | Component | Props it needs |
|---|---|---|
| Work calendar | `LeftTruthToggle` (new) × weekends + each holiday | `label`, `checked`, `onCheckedChange` |
| Timeline frame | `ContentChartFrame` (new; `ChartFrame` `height: "content"`) | `title`, `actions` — the frame is as tall as the packed rows |
| Mode control | `ButtonGroup` > `ModeSplitButton<Mode>` (new) | `modes: ModeInfo<Mode>[]` (auto: `disabled: true`, action "Unlocked jobs flow automatically"; manual: action "Flow once: …"), `mode`, `onModeChange`, `onPress` (= Flow once), `menuLabel="Schedule mode"` |
| Timeline plot | `Chart` with a **Date** `xDomain` (window start → day after its end), `XAxis` (`tickValues` in epoch ms, `tickFormat`) | `width` (measure the container), `height = rows × 34 + margins`, `margin` |
| Wait fill | `HatchPattern` (new) × status tone, inside `<defs>` | `id`, `color` |
| Bars | `SpanLanes<JobSpan>` (new) | `data` (a job = `{ id, segments: { start, end, kind }[] }` in epoch ms), `paint(segment, job)` → token or `url(#hatch)`, `adornments`, `hoveredId`, `rowHeight`, `describe`, `onSpanHover`, `onSpanClick`, `onSpanPointerDown` |
| Bar labels | `createSpanEndLabels` (new) | `lead: j => "#" + id`, `trail: j => k(total)`, `color` per status |
| Over flag | `createSpanRing` + `createSpanBadge` (new) | `when: j => j.over !== null`, `color: var(--sui-danger)`, badge `glyph: { text: "!" }`, `corner: "top-right"` |
| Lock pin | `createSpanBadge` (new) | `when: j => j.locked`, `glyph: { path }` (a padlock in a 16-unit box), `corner: "top-left"`, `ringColor` |
| Row count | `spanRowCount(spans)` (new) | the chart's height |
| Drag guides | `ReferenceLine` × 2 | `orientation="vertical"`, `value` = dragged start / end ms, `label` = the date |
| TBD band (manual) | a second `SpanLanes` under a horizontal `ReferenceLine label="TBD"` | the unplaced jobs |
| Hover card | `ChartTooltip` | `data={hovered ? [hovered] : []}`, `x = start`; phases and "waiting for Roofers · busy on #1, #2" as `TextSublabel`s, the warning as `DangerBody` |
| Job list | `CompactTable` | `onRowHover` (row → timeline) + **`highlighted`** (new; timeline → row) on one hover signal |
| Lock | `IconOnlyButton` + `Icon` `lock-open` (new) / solid `lock` | `aria-label` "Lock …" / "Unlock …" |
| Include | `TruthToggle` | `checked`, `onCheckedChange` |
| Status | `DoingBadge` / `TodoBadge` (new) / `PendingBadge` | `label` = the status word |
| Job detail | `GroupedMutationSliders` | one entity, **`showNames={false}`** (new), axes with **`caption`** (new) = a curried `createFormulaCaption` (new) on each hours line: `× $125 = $1,000` |
| Range editor | `createRangeDialog` (new alias of `createYAxisLockDialog`) × hours / money | `field`, `labels`; `open`, `lock`, `onLock`, `onClose` |
| Layout and text | `ContentStack`, `TightStack`, `SpreadRow`, `ClusterRow`, `WrapRow`, `CardSurface`, `TextTitle`, `TextSublabel`, `SteadyMonoValue`, `NoteText`, `SmallGhostButton`, `TextButton` | — |

`SvgMarks` (`SegmentBar`, `BoxRing`, `GlyphBadge`, `EndLabels`, `HatchPattern`)
are the Depth-1 marks `SpanLanes` and its adornments draw with. The consumer
only touches `HatchPattern` directly. Showcases: `svg-marks`, `span-lanes`,
`formula-caption`, `mode-split-button`, plus new examples in `chart-frame`,
`base-table`, `hud-toggle` and `status-badge`.

---

## 3. The model

Port `dev/showcases/workshop/contract-scheduler-model.ts`; its tests
(`contract-scheduler-model.test.ts`, 44) are the executable spec. Per ADR 0028
it is destined for the **Rust fold** (`thorcasting-engine`, the `phase`
effect), not for TypeScript in the UI — until then it is the UI's stand-in and
the fold's reference.

The rules, as rules:

1. **Time is working-day indices.** `workdays(from, to, { weekends, holidays })`
   lists the working days as UTC midnights; day 0 is the first. A weekend or a
   holiday is simply not an index. A run ending on day `w` stops at the next
   working day's midnight, so a Friday finish covers the weekend on the chart.
2. **A job's hour lines are phases, run in order,** each on one role's crew.
   `phasesOf(job)` turns hours into **whole crew-days**: a crew works whole
   days (`ceil(hours / perDay)`).
3. **A phase in progress keeps its crew** until it finishes: each day,
   in-progress phases are served before any phase waiting to start. Waits
   therefore fall between phases.
4. **A locked job is always granted,** before anything else, even when that
   overbooks a role. A locked job arriving can pause an unlocked phase midway.
5. **A placement stores each phase's working days,** not only a start, so a
   pause survives a mode switch.
6. **Full auto:** unlocked jobs flow in queue order into free crew time;
   dragging an unlocked bar changes its **order**, never a date: it **snaps
   left**, taking the queue slot of the latest start at or before the drop
   (Peter, 2026-09-30: jobs on June 1 and Aug 1, a drop on June 5 takes June
   1's slot and both shift right behind it). A drop inside its own slot
   changes nothing, one left of every start goes to the front, and a locked
   job's start is never a slot. The slot's start also becomes the job's
   **`notBefore` floor** (the ADR's `phase.not_before`), so the suggestion
   shows even when the job's crews are free sooner; a front drop clears it.
   Capacity is respected, so the displaced job shifts right only when it
   shares a crew with the dragged one.
7. **Manual:** every placed job sits on its stored days; dragging moves the
   **whole job** so its first day is the drop day, keeping its shape. No other
   job's days change; the rows only repack. A manual drag clears the floor.
   Overbooking is allowed. Unplaced jobs sit in a TBD band.
8. **Flow once** (manual only): pack the unlocked jobs once, keeping their
   left-to-right order, and stay manual. Idempotent.
9. **Mode switches carry the arrangement:** auto → manual freezes each unlocked
   job's computed days as its placement; manual → auto derives the queue order
   from current starts. Auto → manual → auto with no edits changes nothing.
10. **`overFlags(schedule, roles)`**: on every day a role is over its hours, the
    job holding it that **starts latest** carries the flag (job → role → days).
    That job gets the red ring and `!`; its tooltip says which role, which days.
11. **Dial range** for an hour line defaults to `[0, max(3 × hours, 8)]`
    (`hourBand`); the range dialog edits it.
12. **Money:** `estimate(job, roles)` = Σ hours × role rate + materials, with a
    min and max from the lines' ranges.

Pure functions worth porting as they are: `workdays`, `phasesOf`, `schedule`,
`startOf`/`endOf`, `overFlags`, `setMode`, `flowOnce`, `dragTo`, `toggleLock`,
`toggleOn`, `setValue`, `setBound`, `estimate`, `hourBand`. The bench no longer
uses `pack`, `makeAxis` or `barOf` (SpanLanes packs and lays out); they remain
in the model with their tests, and the consumer need not port them.

---

## 4. Mapping onto Thorcasting

From thorcasting-qbo ADR 0028 (`docs/adr/0028-work-is-scheduled-in-the-fold-capacity-and-roles-are-built-before-it.md`)
and its addendum:

| Bench concept | Thorcasting |
|---|---|
| `Role` (`hoursPerDay`, `rate`) | the new `role` table (`name`, `hotkey`, `hours_per_week` default **40**); per-day capacity is a **context builder** literal: Σ active salary configs of that role × `hours_per_week / 5` |
| a crew member | a `person` row referencing its `config_account` (`category = "employee"`), **one role per person**, undated; roles assigned by hotkey triage like import groups; people found by the import |
| `Job` | a contract (today's `contract:` tag) |
| a job's hour line / phase | a **`phase`** config effect: `after`, `blocks: [{ role, hours, max_per_week }]`, `legs`, `shift_days`, `not_before`, priority |
| the schedule, waits, over-capacity | the fold's `Want` / `Grant` / `Work` / `Short` / `Idle` day facts; the UI **reads** them and computes none |
| `placement` / `locked` / `mode` / queue `order` | config-builder inputs (the addendum's `Locked(days) \| Placed(days) \| Unplaced`); the tier gate (Full auto, Flow once) lives in the config builders, never the fold |
| `status` DOING / TODO / PENDING | the contract's won / unapproved state (the contracts builder's `contractState`) |

The nearest existing screen is `/builder/contracts`
(`src/components/screens/contractsBuilderScreen.tsx`): copy its rule that every
figure comes from the server and the page computes no projection, and its
`<Index>`-not-`<For>` note for lists rebuilt on every edit.

**Vocabulary clash to settle before naming anything:** `thorcasting-ui/CONTEXT.md`
already defines **Role** as "what a picked option actually does once resolved"
(stop / change / add / malformed). ADR 0028's role is a crew kind. The ADR's
Consequences already say the glossaries need updating; do that first.

---

## 5. Assumptions

All **ruled by Peter, 2026-09-29**, working through the contract-job sketches:

- Manual placement is the product; automation (Full auto, Flow once) is paid.
- **Lock is an explicit button** (list row and detail header); editing a job
  does not lock it; a locked job never moves.
- Full auto: dragging reorders (snap left to the nearest start, 2026-09-30); locked jobs stay put.
- Manual allows overbooking, flagged on the latest-starting job.
- The list is **sorted by start date**; unplaced jobs last.
- Bars pack into the **fewest rows**.
- **Job number left, abbreviated sum right** on each bar; the sum drops when
  the bar is too short.
- **Colour by status alone**; waits are **hatched** in the same colour.
- **Red outline + `!`** on the latest-starting job when a role is over capacity.
- **Drag guides show the start and end dates.**
- Dial default range is **3 × the hours, at least 8** (`[0, max(3h, 8)]`).
- The **timeline is live while dialling** (the dials' `onChange`, not
  `onChangeEnd`).
- **Bars animate** (glide) to a new place.
- Dial min/max are edited from a range button, not by clicking the dial's ends
  ("on-dial resizing is too complex").

*Assumed here* (confirm): holidays are a fixed list of four toggles; the
consumer needs a real list (§7).

---

## 6. What stays in the consumer

- **The model** (§3) until the fold serves it, then an adapter from day facts
  to `JobSpan` (segments in epoch ms, `over` text, `locked`).
- **Formatters**: `k` (`$33.8k`), `money`, `short` dates, role labels, the
  tooltip sentences ("waiting for Roofers · busy on #1, #2").
- **Curries**: the `createFormulaCaption` money caption, the two
  `createRangeDialog` label sets, the `ModeInfo` list, the status → badge map,
  the adornment factories' accessors.
- **Drag** (not extracted; Peter did not approve it): `onSpanPointerDown` →
  capture the pointer, draw the dragged job from **shifted data** (its segments
  moved by the drag's ms), `ReferenceLine`s at its ends, and on release call
  the model's `dragTo` with the first working day at or after the drop. Swallow
  the click that ends a drag. See `timeline.tsx`.
  Two traps (2026-09-30, why the bench drag was dead): pass SpanLanes its data
  through an ACCESSOR (`data={data()}` inside the helper, not
  `{lanes(shown())}`), or every drag frame re-mounts SpanLanes and tears
  down the element holding the capture; and use a SUI with the `SpanLanes`
  fix that stops the span's pointerdown reaching the Chart's svg (which
  otherwise captures the pointer itself).
- **Glide** (not extracted): a FLIP over `[data-span-id]` groups — lay the
  spans with the exported `layoutSpans(packSpans(data), x, geo)`, remember each
  box, and `el.animate` the translate from the old box when a render moves it.
  Skip it mid-drag and under `prefers-reduced-motion`.
- **Width**: measure the container (a `ResizeObserver`) and give `Chart` a
  pixel `width`, so a drag's pixels convert to ms 1:1.

---

## 7. Known gaps

- **A holiday list editor** (`DateListInput`: a `DatePicker` to add, a
  removable `TagPill` per date). Not built — low priority until the consumer
  needs custom holidays. Leave the fixed toggles with a TODO rather than
  hand-rolling one.
- **Grab cursor on a draggable bar.** SpanLanes sets none, and styling
  `.sui-chart__span` from the consumer reaches into SUI's classes. Live without
  it, or ask for a `draggable` flag on SpanLanes.
- **Rows repack during a drag.** Because the drag is shifted data, the dragged
  bar can change row mid-drag when it crosses another. Acceptable per the
  bench; a drag that pins its row needs the drag extracted.
- **Per-segment hover.** The old bench tooltip named the hovered segment; the
  `ChartTooltip` names the job and lists every phase and wait. SpanLanes
  reports hover per span, not per segment.
- **`PendingBadge` is neutral grey**, where the bench's timeline paints PENDING
  amber (`--sui-warning`). Pick one before shipping.
