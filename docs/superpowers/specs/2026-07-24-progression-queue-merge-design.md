# ProgressionQueue: collapse SplitQueueList into it

**Date:** 2026-07-24
**Status:** Design — approved, not yet implemented
**Repo:** `solid-ui-components`
**Supersedes:** `thorcasting-workspace/docs/superpowers/specs/2026-07-24-sui-progression-queue-grouping-keyboard-design.md`

## Why this supersedes the incoming spec

The incoming spec asked for four additive capabilities on `ProgressionQueue`
(grouping, `scrollToKey`, keyboard nav, a selected-row contrast fix) and ruled
`SplitQueueList` explicitly out of scope: "Do not touch `SplitQueueList` — it
keeps its own consumers."

That premise doesn't survive a consumer audit:

| Component | Shipped consumers |
|---|---|
| `SplitQueueList` (animated path) | `thorcasting-ui/src/components/screens/configure/queuePanel.tsx` — **the one migrating away** |
| `SplitQueueList` (`static` flag) | `dside-ui` `TeamRail` — delegates to `StaticSplitLayout`, a separate component |
| `SplitQueueList` `topOnly` | none |
| `ProgressionQueue` | none |

The animated queue has exactly one consumer, and that consumer is leaving.

"Add four props to the newer component and keep both" therefore leaves two
overlapping queue components in the catalog — `SplitQueueList/` is ~3,700 lines
across 15 files, `ProgressionQueue/` ~500 across 7 — the older of which has zero
consumers the day the migration lands.

This design collapses them instead. It delivers everything the incoming spec
asked for, and additionally retires the duplicate.

## Goal

One queue component: `ProgressionQueue`, with the union of both feature sets and
a smaller public surface than either. `SplitQueueList` becomes a deprecated shim
for one release.

## 1. Data model

One flat list plus a bucketing function. `sections` is ordered top → bottom and
every section is always rendered with its count.

```ts
export interface ProgressionSection {
  key: string;
  label: string;
  /** The ONLY role color — the dot beside the label. Chrome stays neutral. */
  tone: Tone;
  /** Share of the height when populated sections overflow. Default 1. */
  weight?: number;
  /** NEW. Rows in this section are checkable when `checkedKeys` is present. */
  selectable?: boolean;
  /** NEW. Copy for the collapsed strip when the section is empty. */
  emptyLabel?: JSX.Element;
  /** NEW. Soft cap in rows: the section stops growing past this many rows and
   *  its body scrolls. Omit to shrink-wrap to content. Succeeds
   *  SplitQueueList's `topCapRows`. */
  capRows?: number;
}
```

`resolve` and `unresolve` cease to exist as concepts. **An item moved is an item
whose `bucketOf` result changed** — the component diffs a key → section map
against the previous render. Direction falls out of section order, so the
forward and reverse animations stop being two hand-written mirrors and become
one function with a sign.

Two properties follow for free:

- **A move is one atomic mutation.** `SplitQueueList` required the consumer to
  mutate two arrays, which consumers did in two un-batched setter calls,
  producing an intermediate frame where a key was in neither list.
  `flight.ts` carries three separate defenses against this (the "stuck after one
  item" bug, the order-independent diff, the don't-refresh-a-shrinking-snapshot
  rule). With one `items` array the whole failure class stops being
  expressible.
- **Any-to-any moves work.** A three-section queue can move an item from section
  3 to section 1 with no new code path.

Row order inside a section is the consumer's `items` order. An item bucketing to
an unknown section key renders nowhere (existing behavior, now documented).

## 2. Public interface

Fourteen props, down from `SplitQueueList`'s twenty-seven.

```ts
export interface ProgressionQueueProps<T> {
  sections: ProgressionSection[];
  items: T[];
  bucketOf: (item: T) => string;
  keyOf: (item: T) => string;
  renderItem: (item: T) => JSX.Element;

  /** Selected row (controlled) — drives the consumer's detail pane. */
  selectedKey?: string;
  onSelect?: (key: string) => void;

  /** Roving keyboard focus (controlled). */
  focusedKey?: string;
  onFocusChange?: (key: string | null) => void;

  /** PRESENCE turns select mode on. An empty Set means "mode on, nothing
   *  checked" — the state select mode starts in. Scoped to `selectable`
   *  sections. */
  checkedKeys?: ReadonlySet<string>;
  onToggleCheck?: (key: string, modifiers: { shift: boolean; meta: boolean }) => void;

  /** Reacts on CHANGE: set (or bump) to request a scroll, then clear. */
  scrollToKey?: string;

  /** Omit to fill the parent. */
  height?: number;
  class?: string;
}
```

### Prop shape rationale

Flat props, not grouped controller objects. Solid props are a getter proxy, so
each flat prop is its own reactive granule; grouping three into
`checks={{ keys, onToggle }}` makes the group the granule, and any change to
`keys` invalidates readers of `onToggle`. It's also the ecosystem convention
(Kobalte, Ark, corvu, solid-primitives all spell controlled state as sibling
props).

**`selectMode` is deleted.** Select mode is on iff you are managing a checked
set. This removes the only place the interface could represent a contradiction
(a mode flag disagreeing with the set) without resorting to a discriminated
union — which was considered and rejected, because a union arm is hostile to
exactly the pass-through the consumer does today
(`checkedKeys?: ReadonlySet<string>` threaded through `QueuePanel` is
`Set | undefined`, which satisfies neither arm).

Note this reconciles a live drift: `COMPONENTS.md` already documents the
presence-based contract ("pass `checkedKeys?: ReadonlySet<string>` … undefined
leaves the feature off") with no `selectMode` anywhere, while `types.ts` has the
flag. The manifest also describes a checkbox-click / modifier-click interaction
the code does not implement (the row click toggles). Both are fixed here.

### What is dropped and why

| Dropped | Replaced by |
|---|---|
| `resolved`, `unresolved` | `items` + `bucketOf` |
| `resolvedLabel`, `unresolvedLabel` | `section.label` |
| `allClearLabel` | `section.emptyLabel` |
| `topCapRows` | `section.capRows` (per-section, same semantics) |
| `topFloorRows` | auto-collapse of empty sections |
| `rowHeight` | measured (it was only a pre-measure seed) |
| `animationMs` | baked in — motion is curried, per *Ambient Motion* |
| `topOnly` | no shipped consumer |
| `selectMode` | presence of `checkedKeys` |
| `onResolve` | already deprecated and unused |
| `static`, `topItems`, `renderTop`, `bottomContent` | `StaticSplitLayout` (unchanged) |

**Sizing, and why `capRows` ships up front.** The base model is the weighted
water-fill: an empty section collapses to its summary line, a populated section
shrink-wraps to its content, and only when the populated sections *overflow* the
available height do they share it by `weight`. That alone could not reproduce
`topCapRows={3}`, because weight is *proportional* and takes effect only under
overflow — so on a tall screen Categorized would render all its rows instead of
stopping at three, and under heavy content its weighted share could be fewer
than three.

`capRows` restores the absolute rule per section: it caps the section's
**natural** height at `header + capRows × rowHeight`, leaving the water-fill
logic untouched. A capped section holds at that height and its body scrolls
(`.prog-queue__body` already has `overflow-y: auto`).

One deliberate simplification against `SplitQueueList`: the old top pane could
grow *past* its cap when the bottom pane was short and slack flowed up. A capped
section here never exceeds its cap — surplus goes to the other sections, or goes
unused. Predictable beats clever, and no consumer depended on the slack
behavior.

## 3. Behavior

- **Click** → `onSelect(key)`, unless the row's section is `selectable` *and*
  `checkedKeys` is present → `onToggleCheck(key, { shift, meta })`. Never both.
  Rows in non-selectable sections always select, even while select mode is on.
- **Keyboard** — `keyboard.ts` ports from `SplitQueueList` with its behavior
  intact: roving tabindex (exactly one tab stop), Up/Down/Home/End across all
  rows in render order, treating sections as one top→bottom sequence, **no
  wrap** (the current implementation clamps). Two additions: arrow movement
  emits `onFocusChange(key)`, and Enter/Space takes the same select-vs-toggle
  branch as a click.
  Tab-stop precedence is unchanged: last-focused row → `selectedKey` →
  `focusedKey` → first row.
- **`scrollToKey`** — reacts on change, `scrollIntoView({ block: "nearest" })`
  within the section body, deferred one frame so a just-added row has laid out.
  No-op when undefined or unmatched.
- **Arrival reveal replaces the scroll-pin.** `SplitQueueList` pinned the top
  pane to its bottom so the newest row sat flush at the seam. The general form:
  when a transfer settles, scroll the arriving row into view in its destination
  section. Same guarantee, no prop, works in both directions and between any two
  sections.
- **Selected row:** no background fill; `box-shadow: inset 2px 0 0
  var(--sui-accent)` only. Hover owns the fill, like any other row. This is the
  incoming spec's contrast fix.
- **Focused row: a focus ring only** — no fill and no marker glyph. The
  persistent orange focus background is the same readability problem the
  incoming spec raises about selection, one prop over. A `▸` marker was
  considered and dropped: a marker slot that appears only on focus shifts the
  row's content sideways as focus moves, and reserving the slot on every row
  indents read-only queues that will never use it. An outline is standard,
  accessible, and costs no layout.
- **The `✓` on resolved rows is dropped.** In an N-section queue "done" is not a
  row property; the section header and its dot already say which bucket a row is
  in, and a per-section glyph would leak role color out of the dot.
- **Reduced motion** — `prefers-reduced-motion` places rows instantly, no
  transfer animation.

## 4. Module structure

`SplitQueueList/` is ~3,700 lines across 15 files. Target for the merged
component: ~900, no file over 250 (the 500-line limit is a global rule; this
stays well inside it).

```
src/components/ProgressionQueue/
  types.ts               public props + ProgressionSection
  ProgressionQueue.tsx   reactive shell: measure → allocate → render → wire   (~200)
  bucketing.ts           items → Map<sectionKey, T[]> AND Map<key, sectionKey> (~40)
  transfer.ts            PURE diff: (prevMap, nextMap) → Transfer[], no DOM    (~40)
  motion.ts              the choreographer seam + slot implementation          (~120)
  keyboard.ts            roving focus (ported)                                 (~110)
  layout.ts              allocateHeights water-fill (existing, unchanged)
  ProgressionQueue.css
  index.ts
  README.md
```

**`bucketing.ts`** does one pass over `items` and produces both the per-section
arrays for rendering and the key→section map the transfer diff needs — replacing
today's N filter passes (one per section) and giving the diff a single source of
truth.

**`transfer.ts` is pure and DOM-free.** "What moved" becomes a map diff testable
with two `Map`s and no jsdom. Today that question is entangled in `flight.ts`
with rAF scheduling, a scroll-ownership lock, and array-order heuristics.

```ts
export interface Transfer {
  key: string;
  from: string;        // section key
  to: string;          // section key
  direction: 1 | -1;   // sign of (toIndex - fromIndex) in section order
}
```

## 5. The motion seam

The slot animation ships; the flying clone is deferred behind a one-module swap.

```ts
export interface TransferChoreographer {
  /** Snapshot row rects. Called after every paint, so a detected transfer
   *  always has the previous frame's geometry to animate from. */
  capture(root: HTMLElement): void;
  /** Play a COHERENT SET of moves in one pass; resolves when settled.
   *  Takes the whole batch, not one transfer, so a single FLIP pass covers one
   *  consistent before/after pair — a per-transfer signature stacks N competing
   *  animations on every row during a bulk multi-select move. */
  play(transfers: readonly Transfer[], ctx: MotionContext): Promise<void>;
}

export interface MotionContext {
  root: HTMLElement;
  rowEl: (key: string) => HTMLElement | undefined;
  reducedMotion: boolean;
}
```

**Duration belongs to the choreographer, not the component.** It is a property of
the choreography — a clone arcing over the bar wants a different one than a slot
opening — so it lives inside the implementation. Leaving it in `MotionContext`
would mean swapping implementations required editing the component, breaking the
one-file guarantee below.

**Rows and sections must both be resolvable from the DOM.** Every row carries
`data-pq-key`; every section carries `data-pq-section={section.key}`. The
deferred clone implementation cross-fades source treatment into destination
treatment, and by the time it runs the moved row has already left its source
section — without a section marker the source is unreachable and the clone
cannot be built without editing the component.

```ts
```

**`slotMotion` (ships now):** the arriving row expands from zero height while
every row whose position changed FLIP-slides to its new spot, which is what
closes the vacated slot — Solid has already removed the moved row's old element
from the source section, so there is nothing left there to collapse. Section
heights re-lerp through `allocateHeights`.

**One subtlety the first implementation got wrong:** `height` is a layout
property, so animating the arriving row from 0 already carries its following
siblings *within the same section* — they are pushed down as it grows. Applying
a FLIP transform to those rows as well double-counts the same displacement and
makes them overshoot by a full row before sliding back. Rows following an
arriving row inside that row's own section are therefore **excluded** from the
FLIP pass; every other row (the source section, other sections) still needs it,
because nothing else moves them. This is what
auto-animate and most list libraries do — robust, generalizes to any pair of
sections, roughly 120 lines against `play.ts`'s 481.

**`flightMotion` (deferred):** the moving row is cloned into an overlay layer
above the whole bar and FLIP-animated from source rect to destination rect,
cross-fading from the source row's treatment to the destination's during flight.
This is the N-section successor to `SplitQueueList`'s two-clipped-clone seam
repaint — which has no direct analogue here, since sections are separate
bordered boxes separated by an 8px gap rather than a 2px seam.

**Known trade-off, accepted:** with `slotMotion` the eye does not track the card
across the gap; the "it crossed over" story is told by the slots opening and
closing, not by the item itself. This is a real loss of `SplitQueueList`'s
signature feel. It is accepted for the simplicity, on the explicit condition
that trying `flightMotion` stays cheap: adding one file and changing one
identifier, with no change to the component, the props, or any test that isn't
about motion.

The implementation is selected by a module constant, **not a prop** — motion
stays curried per *Ambient Motion* ("the animation is baked into the component,
not passed at the call site"). This decision and the deferred option get an ADR
under `docs/adr/`.

## 6. SUI rules compliance

- **Layout Purity.** The component owns `flex` / `overflow` / `gap` and
  JS-computed section heights. The weighted water-fill cannot be expressed in
  CSS, which places it in the "genuine full-height scroll plumbing" category the
  migration doc grants `EXEMPT-AS-LAYOUT`. `STYLE_GUIDE.md`'s exemption list
  names `SplitQueueList` explicitly; that entry becomes `ProgressionQueue` — a
  succession, not a new exemption. **`StaticSplitLayout` must be added to the
  list by name**: it rides `SplitQueueList`'s entry implicitly today and would
  be orphaned by the rename. That is the only genuinely new name.
- **Classification fix.** The current header comment reads "Composite (Depth 2)"
  while the component owns a CSS file, which `CONTEXT.md` defines as impossible
  ("**Composite**: Owns zero CSS files AND zero inline `style={}`"). It is
  reclassified as a layout-tagged, CSS-owning component — the same status
  `SplitQueueList` actually has. Documentation-only change.
- **Rule #1 (no inline visual props).** Row treatment lives in the component's
  own CSS as BEM classes. The only inline styles are the computed section
  heights — data-driven geometry inside a layout-exempt component, exactly what
  `SplitQueueList` does today.
- **Rule #2 (minimal surface, expansion gated).** The prop count falls from 27
  to 14. Three new `ProgressionSection` fields exist — `selectable`,
  `emptyLabel`, `capRows` — of which only `selectable` is genuinely new surface:
  `emptyLabel` relocates `allClearLabel` from the component to the section, and
  `capRows` succeeds `topCapRows`. All three **approved by Adlai, 2026-07-24**;
  Peter's separate blessing was offered and not taken.
- **List Identity (`<For>` vs `<Index>`).** The derived per-section arrays are
  `filter` results, and `filter` preserves *element* references, so `<For>` does
  not remount rows — the current code is correct and the rule's failure mode
  (`.map()` rebuilding objects) does not apply here. Memoized bucketing keeps it
  that way once rows animate and remounts would be visible.
- **Naming: shapes, not domains.** `ProgressionQueue`, `sections`, `bucketOf`
  are shape-named. `resolved` / `unresolved` were the domain-flavored pair, and
  they are going.

## 7. Testing

| File | Covers |
|---|---|
| `transfer.test.ts` *(new, pure)* | move up, move down, multi-move in one update, add, remove, reorder-in-place, unknown bucket |
| `layout.test.ts` *(kept)* | water-fill allocation |
| `ProgressionQueue.test.tsx` | click → select vs toggle (selectable vs plain section); select mode off when `checkedKeys` undefined; keyboard traversal across section boundaries; Home/End; no wrap; Enter/Space branch; `scrollToKey`; `onFocusChange` emission; reduced-motion instant placement; **selected row carries no background fill** |
| `SplitQueueList.test.tsx` *(reduced)* | the shim maps arrays → sections and still renders |

Behavioral cases port from the existing 1,133-line suite; the two-pane geometry
cases retire with the geometry.

## 8. Deliverables

**Adds**
- `src/components/ProgressionQueue/{bucketing,transfer,motion,keyboard}.ts`
- `src/components/ProgressionQueue/README.md`
- `dev/showcases/progression-queue.tsx` — there is none today; must include a
  visual case proving a selected, unhovered row is readable
- `docs/adr/0004-one-queue-component-and-the-motion-seam.md` — queue components
  collapsed; motion behind a choreographer seam; flying clone deferred

**Rewrites**
- `src/components/ProgressionQueue/{types.ts, ProgressionQueue.tsx, ProgressionQueue.css}`
- `src/components/SplitQueueList/SplitQueueList.tsx` → a deprecated shim: the
  animated path maps `resolved`/`unresolved` onto `sections` + `items` +
  `bucketOf`; the `static` path keeps delegating to `StaticSplitLayout`

**Deletes** (~2,700 lines)
- `SplitQueueList/{animation,arrival,flight,flip,play,layout,keyboard}.ts`
- `SplitQueueList/layout.test.ts`, most of `SplitQueueList.test.tsx`

**Edits**
- `STYLE_GUIDE.md` — exemption list (`SplitQueueList` → `ProgressionQueue`, add
  `StaticSplitLayout`)
- `COMPONENTS.md` — rewrite the `ProgressionQueue` entry; mark `SplitQueueList`
  deprecated with a pointer
- `CHANGELOG.md`, `scripts/style-rubric.json`, `dev/main.tsx`

## 9. Consumer contract

After this lands, `queuePanel.tsx` swaps `SplitQueueList` for
`ProgressionQueue`. This must compile and behave:

```tsx
import { ProgressionQueue, type ProgressionSection } from "@primestageprime/solid-ui-components";
import type { QueueItem } from "~/lib/configureQueue";

const SECTIONS: ProgressionSection[] = [
  { key: "categorized", label: "Categorized", tone: "success" },
  { key: "suggestions",  label: "Suggestions", tone: "accent", selectable: true,
    emptyLabel: "All clear — every item configured" },
  { key: "hold",         label: "In progress", tone: "muted" },
];

<ProgressionQueue<QueueItem>
  sections={SECTIONS}
  items={allItems()}              // one flat list; bucket by status
  bucketOf={(i) => i.section}
  keyOf={(i) => i.key}
  renderItem={(i) => renderRow(i)}
  selectedKey={selectedKey() ?? undefined}
  onSelect={(k) => onSelect(k)}
  focusedKey={focusedKey() ?? undefined}
  onFocusChange={(k) => onFocus(k)}
  checkedKeys={selectMode() ? checkedKeys() : undefined}
  onToggleCheck={onToggleCheck}
  scrollToKey={scrollToKey()}
/>
```

Selection, focus, the checked set, and the scroll request all remain
consumer-owned. The component holds no selection state.

## 10. Rollout

1. **SUI:** build the merged component behind the existing `ProgressionQueue`
   export; land the shim; update docs, showcase, ADR, tests.
2. **Verify:** `npm link` from SUI, `npm link @primestageprime/solid-ui-components`
   in thorcasting-ui (its `app.config.ts` auto-detects the link and serves SUI
   source, so edits apply on refresh with no rebuild). Restart the consumer dev
   server after linking.
3. **Release:** cut a SUI tag; bump the pin in thorcasting-ui (tag SHA must equal
   lock SHA).
4. **Consumer migration** (separate, follow-on, not this work): thorcasting
   swaps `queuePanel.tsx` to three sections, adds hold persistence, adds the
   auto-select effect.
5. **dside-ui:** no action required — its `static` path is untouched. Optional
   cleanup: move the call to `StaticSplitLayout` directly.
6. **Next major:** delete the `SplitQueueList` shim.

## 11. Acceptance criteria

- One queue component. `ProgressionQueue` supports N sections, controlled
  selection, controlled roving-focus keyboard nav, `scrollToKey`, and
  select-mode grouping scoped to `selectable` sections.
- Select mode is on iff `checkedKeys` is present; there is no `selectMode` prop.
  Rows in non-selectable sections select on click even while it is on.
- A bucket change animates as a transfer in either direction, between any two
  sections, driven by one atomic `items` mutation. `prefers-reduced-motion`
  places instantly.
- Keyboard: one tab stop; Up/Down/Home/End traverse every row across section
  boundaries without wrapping, emitting `onFocusChange`; Enter/Space activates
  through the same select-vs-toggle branch as a click; focus is visible and does
  not reduce text contrast.
- A selected, unhovered row has **no background fill** and is fully readable;
  the accent bar remains; hover shows the normal hover fill.
- `SplitQueueList` still compiles and renders for both existing consumers via
  the shim; `StaticSplitLayout` is unchanged.
- Correct in light and dark; no hardcoded colors; role color confined to the
  section dot.
- `npx tsc --noEmit` and `npx vite build` both pass.

## 12. Non-goals

- No SUI-side state — selection, focus, the checked set, and scroll requests are
  all controlled.
- No routing, no domain awareness.
- No slack absorption: a capped section never grows past its `capRows`, unlike
  `SplitQueueList`'s top pane.
- No flying-clone motion in this pass (see §5 — deferred behind the seam, with
  an ADR).
