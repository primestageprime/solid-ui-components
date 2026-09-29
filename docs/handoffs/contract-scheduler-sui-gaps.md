# Gap analysis — the Contract Scheduler bench against SUI

Status: **OPEN**, written 2026-09-29. Nothing below is built. Every item that adds or
widens a component is behind the push-back gate (`.claude/skills/sui-agent-brief`
§1), so **each one needs Peter's confirmation before it is written.**

Source: the `workshop:contract-scheduler` bench (`dev/showcases/workshop/contract-scheduler.tsx`,
its model, and `contract-scheduler-kit/timeline.tsx`), built from Peter's contract-job sketches of
2026-09-29 and thorcasting ADR 0028 + addendum (`thorcasting-qbo/docs/adr/0028-…`). The
published sketch it was drawn from: <https://claude.ai/artifact/MjiWKyfXfSD9Bymf6fHWfU>.

Method: every region of the bench was built from SUI first. Where SUI could not express
something, the bench either **drafted** it locally or **worked around** it. This file lists both,
with the evidence in the bench, and says what SUI would need so a consumer screen could be
pure SUI. The legend follows `thorcasting-ui/docs/sui-gap-backlog.md`: **NEW BASE**,
**NEW CURRIED**, **NEW COMPOSITION**, plus **EXTEND** for a change to an existing component.

---

## What SUI already covered

These went in as-is and behaved. No action needed.

| Need | SUI | Note |
|---|---|---|
| Timeline panel with title and actions | `ChartFrame` (`actions` slot) | |
| Mode menu | `IconOnlyButton` + `RightPopoverMenu` | copied from ChartFrame's private composition; see gap 3 |
| Job list | `CompactTable`, `onRowHover` | cross-highlight with the timeline worked first time |
| Include switch | `TruthToggle` | see gap 6 for the label side |
| Lock | `IconOnlyButton` + `Icon lock` (outline/solid) | see gap 7 |
| Job dials | `GroupedMutationSliders` | per-measure scales, captioned groups, prior/value arrows and the signed delta all work; see gaps 2 and 8 |
| Range editor | `createYAxisLockDialog` (`number` and `currency` fields) | validation included; see gap 4 |
| Status | `SmStatusBadge` | see gap 9 |
| Back, range buttons, job names | `SmallGhostButton`, `TextButton` | |
| Labels and figures | `TextSublabel`, `SteadyMonoValue`, `TextTitle`, `NoteText`, `MutedBody` | |
| Layout | `ContentStack`, `TightStack`, `ClusterRow`, `SpreadRow`, `WrapRow`, `CardSurface` | no layout gap |

---

## Gaps, largest first

### 1. A phased, draggable job timeline — **EXTEND `Chart/TimelineBar`** (preferred) or NEW BASE

**The one mark SUI does not draw.** The bench drafts it as `JobTimeline`
(`contract-scheduler-kit/timeline.tsx`, Depth-1 SVG + `timeline.css`, zero inline styles).
`TimelineBar` already lays coloured segments in lanes. What it lacks, each with the bench's
answer:

| # | Capability | Bench draft |
|---|---|---|
| a | **Lead and trail labels** per bar (`#3` … `$33.8k`), trail dropped when it doesn't fit | text-width estimate against the bar width |
| b | **Hatched fill** for a segment (a wait), in the bar's own tone | one SVG `<pattern>` per tone; fill chosen by segment kind |
| c | **Pack into the fewest rows** instead of named lanes | pure `pack()` in the model, tested |
| d | **Horizontal drag** with start/end guide lines and their dates; report the drop position | pointer capture; `onDrop(id, leftPct)`; caller decides what a drop means |
| e | **Over flag**: red outline + `!` badge | `over: string \| null` per bar |
| f | **Per-segment tooltip** | SVG tooltip naming the phase, role, days, or who a wait is blocked by |
| g | **Glide** to a new position | Web Animations FLIP on the SVG group; skipped under reduced motion |
| h | A **parked band** (TBD) below the calendar | second band, same bars |

**Recommendation.** Extend `TimelineBar` rather than add a second timeline mark. ADR 0010
("a mark is a pure core with one thin adapter per chart context") is the pattern: the
packing, fit and hatch decisions are a pure core, and the Chart slot is the adapter. (c)
and (g) may belong in shared helpers (`pack` beside the chart's layout utilities; FLIP
beside ADR 0004's motion seam, which today is queue-specific).

**Open question for Peter.** The bench positions bars on a CALENDAR (percent of a date
window, weekends and holidays skipped by working-day index). `TimelineBar` positions on a
Chart x-scale. Taking a `Chart` with a time scale is the extend path. Keeping calendar
positioning points to a NEW BASE. **Size: L.**

### 2. A per-dial caption line — **EXTEND `GroupedMutationSliders`**

The sketch shows the calc under each dial (`× $125 = $1,000`). `GroupedMutationSliders` has
one `summary` per ENTITY, rendered as `SteadyMonoValue` (a headline figure, by design), and
nothing per measure. The bench dropped the calc, and shows crew-days in a `NoteText` below
the row instead.

**Proposal:** an optional axis-level `caption?: (value: number, entity) => string`, rendered
muted under the measure's readout, reserved at the same height in every column. **Size: S.**

### 3. The mode split button is private — **NEW COMPOSITION** (extract from `ChartFrame`)

`ChartFrame` composes `IconOnlyButton` (the face acts in the current mode, disabled with a
reason) + `RightPopoverMenu` (▾ picks the mode) for the y-axis. The schedule needs the same
control with different modes (Full auto / Manual → "Flow once"), so the bench re-composed
it by hand, including the `sui-sr-only` trigger label.

**Proposal:** a public `ModeSplitButton<M>` taking `modes: { id, label, icon, action,
disabled }[]`, `mode`, `onModeChange` and `onPress`. `ChartFrame` then uses it, with its
y-axis vocabulary unchanged. Pure extraction. **Size: S.**

### 4. The range dialog is named for the y-axis — **NEW CURRIED** (alias)

`createYAxisLockDialog` is a good general min/max editor: two fields, "max must exceed min"
validation, errors only after Confirm. The bench uses it for dial ranges with its own labels.
The name and its `YAxisDomain` type say "y-axis" to anyone searching for a range editor
(`npm run find -- "edit min and max"` would not surface it).

**Proposal:** export it as `createRangeDialog` / `RangeDialog`, keeping the old names as
aliases. **Size: XS.**

### 5. Table row highlight from outside — **EXTEND `BaseTable`**

The bench's hover-linked highlight returns the internal class string
`hud-table__row--selected` from `getRowClass`, which ties the bench to Table's CSS.

**Proposal:** `highlighted?: (row) => boolean`, styled like hover, beside the existing
`onRowHover`. **Size: XS.**

### 6. A toggle with its label on the left — **NEW CURRIED** over `Toggle`

`TruthToggle` locks `labelPosition`, and a row of labelled switches reads ambiguously with
labels on the right: each label sits closer to the next switch than to its own. The bench
composes `TextSublabel` + an unlabelled `TruthToggle` in a `ClusterRow`.

**Proposal:** `LeftTruthToggle` (`size: "sm"`, `labelPosition: "left"`). **Size: XS.**

### 7. No unlocked-lock icon — **EXTEND `Icon`**

Locked and unlocked are shown as solid vs outline `lock`, a fill-only difference that is easy
to miss at `sm` size.

**Proposal:** add `lock-open` to `IconName`. **Size: XS.**

### 8. A single-entity dial row still draws the entity name — **EXTEND `GroupedMutationSliders`**

In the job detail the row holds one entity, whose name is already the panel title. The
component always renders the name button above the dials, so the bench labels it "Hours &
materials".

**Proposal:** `showName?: boolean` (default `true`), or omit the name when `label` is `""`,
keeping the dials' vertical alignment. **Size: XS.**

### 9. No workflow status badge — **NEW CURRIED** over `StatusBadge`

`StatusBadge`'s variants are compliance words (`compliant`, `violation`, `warning`, `pending`,
`info`). The bench maps DOING → `info`, TODO → `compliant` and PENDING → `warning` to get
blue, green and amber. The colours are right and the meanings are borrowed.

**Proposal:** workflow-named curried variants (`DoingBadge`, `TodoBadge`, `PendingBadge`)
over the same tones, or a `tone`-keyed variant that says what it means. **Size: XS.**

### 10. `ChartFrame` cannot size to its content — **EXTEND `ChartFrame`**

`height` is px or `"fill"`. The timeline's height depends on how many rows the packing
needs (2 to 5 in the sample), so a fixed 320 px frame leaves an empty band below short
schedules.

**Proposal:** `height: "content"`: the body takes its child's height. Fullscreen is
unchanged. **Size: S.**

### 11. A holiday list editor — **NEW COMPOSITION**

The work calendar needs "these dates are off". The bench hard-codes four holidays as
toggles. SUI has a single `DatePicker` and `TagPill`, but no editable date list.

**Proposal:** a `DateListInput` (DatePicker to add, a removable `TagPill` per date).
**Size: S.** Low priority until a consumer screen needs custom holidays.

---

## Not SUI gaps (they belong elsewhere)

- **The scheduler** (`contract-scheduler-model.ts`: whole crew-days, keep-your-crew,
  locked-always-granted, placements as working days, Flow once) is domain logic. Per ADR
  0028 it belongs in the thorcasting fold (Rust, `thorcasting-engine`) behind the `phase`
  effect, and in thorcasting's config builders. The bench's TypeScript and its 44 tests are
  the executable spec for that port, not SUI code.
- **Roles, people and the capacity builder**: thorcasting-server tables and a
  thorcasting-model context builder (ADR 0028 §3–5).
- **Clickable dial ends** for editing a range: dropped. Peter, 2026-09-29, agreed on-dial
  resizing is too complex; gap 4's dialog is the answer.

---

## Suggested order

1. **XS items as one small PR**, pending Peter's yes on each: 4 (range dialog alias),
   5 (row highlight), 6 (left-label toggle), 7 (`lock-open`), 8 (hide entity name),
   9 (workflow badges). Each is additive and none changes a published behaviour.
2. **3 (`ModeSplitButton`)**: pure extraction, with ChartFrame as its first consumer.
3. **2 (dial caption)** and **10 (content-height frame)**.
4. **1 (timeline)**: needs the calendar-vs-x-scale decision first. Then `/sui-build` the bench's
   draft into `TimelineBar` (or a new base), with a showcase, tests and a COMPONENTS.md entry,
   and rewire the bench onto it.
5. **11** when a consumer needs it.

When an item lands, rewire the bench onto it and delete the workaround named above. Delete
this file when the list is empty, moving anything worth keeping into `docs/adr/`.
