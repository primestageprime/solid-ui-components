# One queue component, and the motion seam behind it

## Context

SUI carried two overlapping queue components. `SplitQueueList/` (~3,700 lines
across 15 files) was a two-list processing queue — top pane resolved, bottom
pane unresolved — with its own animated card-crossing-the-seam motion engine
(`flight.ts`, `play.ts`, `flip.ts`, `arrival.ts`, `animation.ts`). `ProgressionQueue/`
(~500 lines across 7 files) was an N-section progression bar with no motion at
all. A separate incoming spec asked for four additive capabilities on
`ProgressionQueue` — grouping/select mode, `scrollToKey`, keyboard navigation,
a selected-row contrast fix — and explicitly ruled `SplitQueueList` out of
scope ("do not touch it — it keeps its own consumers").

That premise didn't survive a consumer audit. `SplitQueueList`'s animated path
had exactly one shipped consumer, `thorcasting-ui`'s `queuePanel.tsx`, and that
consumer was migrating away from it. Its `static` flag had one consumer
(`dside-ui`'s `TeamRail`) that delegates straight through to a separate
component, `StaticSplitLayout`. `ProgressionQueue` had zero consumers. Adding
four props to the newer component while leaving the older one in place would
have shipped two overlapping queue components, one of them dead the day the
migration landed.

## Decision

Collapse the two into one: `ProgressionQueue` gains the union of both feature
sets — N sections (already had), plus select-mode grouping (`checkedKeys` /
`onToggleCheck`, scoped to sections marked `selectable`), roving-focus keyboard
navigation, `scrollToKey`, per-section `emptyLabel` and `capRows`, and the
selected-row contrast fix (accent bar only, no background fill). `SplitQueueList`
becomes a **deprecated compile shim**: its animated path maps `resolved` /
`unresolved` onto `sections` + `items` + `bucketOf`, and its `static` path keeps
delegating to `StaticSplitLayout` unchanged. It is retained for one release and
removed in the next major.

The data model collapses `resolved` / `unresolved` into one flat `items` array
plus `bucketOf(item) => sectionKey`. **A move is redefined as an item whose
`bucketOf` result changed** between renders, detected by diffing a key→section
map — not a consumer array mutation the component has to infer. This is what
makes any-to-any moves (section 3 → section 1) work with no new code path, and
it eliminates the two-array intermediate-frame bug class that `flight.ts`
carried three separate defenses against (an item briefly belonging to neither
array because the consumer's two setter calls weren't batched).

Motion lives behind a swappable seam, `TransferChoreographer`
(`capture(root)` / `play(transfers, ctx)`), selected by a module-level constant
in `ProgressionQueue.tsx` — **never a prop**, per STYLE_GUIDE's Ambient Motion
rule. The shipped implementation, `slotMotion`, expands the arriving row from
zero height while FLIP-sliding every other displaced row to its new position in
one batched pass per coherent set of transfers.

## Considered and deferred: `flightMotion`

A second choreography was designed and explicitly **not** built: the moving row
cloned into an overlay layer above the whole bar, FLIP-animated from its source
rect to its destination rect, cross-fading from the source row's treatment to
the destination's while it flies. This is the N-section successor to
`SplitQueueList`'s two-clipped-clone seam repaint, which has no direct analogue
here — `ProgressionQueue`'s sections are separate bordered boxes with an 8px
gap between them, not a single 2px seam a card can visibly cross.

It was deferred for simplicity, on one explicit condition, checked before this
release: **adopting it stays a one-file, one-identifier change** — a new
`motion.ts`-sibling implementing `TransferChoreographer`, and swapping the
`const motion = createSlotMotion()` line in `ProgressionQueue.tsx` for it. Two
things that would have broken that guarantee were closed before ship: duration
was moved out of `MotionContext` and into the choreographer itself (a clone
arcing over the bar wants a different duration than a slot opening, so leaving
it component-side would force an edit on swap), and every row's section is now
resolvable from the DOM (`data-pq-section={section.key}`), because the flying
clone needs to read the *source* section's treatment after the moved row has
already left it, and nothing else in the rendered tree carries that key.

**This is the note to act on if the slot animation disappoints in use.** The
seam was verified swappable end-to-end (source rect, destination rect, both
sections' elements and their tone, duration/easing, direction, and reduced
motion are all reachable through the existing contract with no component edit)
— building `flightMotion` is exactly as cheap as advertised, not aspirationally
so.

### Carried limitations of the shipped `slotMotion`

Recorded honestly rather than presenting the animation as finished, per the
task-7 motion review:

- **The FLIP exclusion rule is sound but conditional.** Rows following an
  arriving row within its own section are excluded from the FLIP pass (their
  displacement is already carried by the height animation reflowing them) —
  correct when a row's total displacement equals exactly the arriving heights
  above it. It under-corrects on two narrower cases: a move into a section
  whose own box is reallocated by the water-fill (section boxes are never
  themselves animated — they snap via inline style), and a same-section
  departure-plus-arrival in one batch. Both show a bounded residual
  displacement, not a regression against the pre-fix behavior.
- **A row opening from `height: 0` can spill its content during the open**,
  because `overflow` is not an animatable CSS property — the arrival keyframes'
  `overflow: hidden` is inert. `.prog-queue__row` now sets a static
  `overflow: hidden` to close this (verified against the resting state: no
  clipping of row content, the focus ring, or the selected accent bar).
- **An overlapping second transfer inside the first's ~260ms window FLIPs from
  a stale-but-never-polluted baseline** — the last settled geometry the eye
  actually saw, not the mid-flight position at the moment of interruption. This
  self-heals within one frame once transfers stop overlapping.
- **An interrupted transfer still fires its own arrival-reveal scroll**, a
  moment before the interrupting transfer's own reveal — the final scroll
  position is correct, but there is a spurious intermediate one.

None of these are visible in this repo's test suite: `Element.prototype.animate`
is undefined in jsdom, so the choreographer's `canAnimate` check is always
false and no animation code path runs under test. The showcase
(`dev/showcases/progression-queue.tsx`) is the only place they can be observed.

## Also rejected: adjacent-sections-only cloning

Restricting the flying-clone treatment to moves between adjacent sections (the
common case) and falling back to the slot animation for non-adjacent moves was
considered and rejected. It produces inconsistent behavior between an adjacent
move and a non-adjacent one for reasons invisible to the consumer — the same
`onSelect` → "move to any section" interaction would look and feel different
depending on section order, which is exactly the kind of behavior an N-section
generalization is supposed to remove.

## Consequences

The eye no longer tracks a card crossing the gap — `slotMotion` tells the "it
moved" story through the slots opening and closing, not through the item
itself. This is a real loss of `SplitQueueList`'s signature feel, accepted for
the simplicity, on the condition (verified above) that recovering it later
costs one file and one identifier.

A capped section (`capRows`) no longer absorbs slack from a short neighbour the
way `SplitQueueList`'s top pane could grow past `topCapRows` when the bottom
pane was short. A capped section here holds at its cap unconditionally;
surplus height goes to the other sections or goes unused. No shipped consumer
depended on the slack behavior.

The two-array diff bug class is gone: with one `items` array and `bucketOf`,
there is no representable intermediate state where an item belongs to neither
list or to both, and `flight.ts`'s three defenses against that state have no
successor because the state they guarded against no longer exists.

`ProgressionSection` gains three new fields — `selectable`, `emptyLabel`,
`capRows` — approved by Adlai, 2026-07-24, under Rule #2 (minimal-surface
expansion is gated, not free). `emptyLabel` relocates `SplitQueueList`'s
`allClearLabel` from the component to the section; `capRows` succeeds
`topCapRows`; `selectable` is the one genuinely new field. Peter's separate
blessing was offered and not taken.
