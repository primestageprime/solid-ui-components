# BucketQueue — the collapsible bucket

**Status:** approved 2026-07-31. Supersedes the scoping handoff
`docs/superpowers/handoffs/2026-07-31-bucketqueue-collapsed-bucket-handoff.md`,
which raised the problem but predates the code reading below.

## The problem

`BucketQueue` collapses a bucket to its summary line only when the bucket is
**empty**. There is no way to render a **populated** bucket as a summary line
the user can click open.

`thorcasting-ui`'s /import queue needs one. Discarding a suggestion will stage
it in a "Discard" bucket instead of skipping it permanently, and a single
"Empty N discards" button commits the pile. That pile must not visually
dominate the queue, but the user has to be able to peek at it and pull rows
back out before committing. See the consumer-side design at
`thorcasting-workspace/docs/superpowers/specs/2026-07-31-discard-staging-design.md`.

## What the code already gives us

Three findings from reading the component, established before any design
choice and load-bearing for several of them.

**Collapse is already the sizing model's central concept — it is just spelled
`count === 0`.** `naturalHeights` (`layout.ts:57`) and `allocateHeights`
(`layout.ts:121`, `:156`) both branch on an empty count to mean "pin to the
summary line, keep out of the water-fill, never `fill`". A manually collapsed
bucket wants exactly that treatment, so this is not a new layout mode — it is
one predicate gaining a second disjunct. `capRows`, `fill` and `weight` then
compose with no special-casing anywhere, which answers the handoff's open
question about them.

**A move into a collapsed bucket would currently animate nothing at all.**
`motion.ts:119-124` narrows a batch of transfers to those with a live row
element and then bails on the whole batch if none survive. A row discarded
into a collapsed bucket has no destination element, so the source bucket's
gap-closing FLIP is suppressed along with the (impossible) arrival animation,
and the rows below the departed one jump. No existing case reaches this: an
item moving into an *empty* bucket makes it populated, so it renders. The
handoff's suggestion to check the existing behaviour has no precedent to check.

**There is no settled disclosure pattern to copy.** `Section` is the only
in-catalogue section-header disclosure — hybrid controlled/uncontrolled, a
`<button>` carrying bare `+`/`−` text, an inert header, and no
`aria-expanded`. `CollapsiblePanel` is uncontrolled with a chevron and also no
`aria-expanded`. Accessibility here is greenfield.

## Decisions

### Two fields, not one

```ts
/** Let the user collapse this bucket to its summary line and expand it again.
 *  Its header takes a disclosure chevron IN PLACE OF the tone dot and becomes
 *  the toggle. Only meaningful while the bucket is POPULATED: an empty bucket
 *  already collapses to its summary line and has nothing to expand into, so it
 *  renders exactly as it does today — no chevron, header inert. Default false. */
collapsible?: boolean;
/** Start collapsed rather than open. IGNORED without `collapsible` — on its own
 *  it would strand the bucket's items behind no affordance. This is only the
 *  state BEFORE the user touches the bucket; the first toggle pins their choice
 *  for the life of the component, including across the bucket draining to empty
 *  and refilling. Default false. */
collapsedByDefault?: boolean;
```

`collapsible` is the opt-in; `collapsedByDefault` is the starting state. The
alternative of folding them into one field (declaring `collapsedByDefault`
*is* the opt-in) is smaller but cannot express "user-collapsible, starts open".
The alternative of making every bucket collapsible unconditionally was rejected
because it changes the rendering of every existing consumer and lets the user
collapse the bucket they are meant to be triaging.

`collapsedByDefault: true` without `collapsible: true` is **inert**, not an
implicit opt-in. Honouring it alone would start the bucket collapsed with no
way to open it; treating it as implying `collapsible` would make the two-field
split pointless.

### Uncontrolled, and sticky

Expand/collapse is component-owned state — a `createSignal<ReadonlyMap<string,
boolean>>` keyed by bucket key — not a controlled `expandedKeys`/`onToggleExpand`
pair. It never needs to survive outside the component or round-trip to a server,
and `BucketQueue`'s controlled surface stays reserved for state that genuinely
needs external ownership (`selectedKey`, `checkedKeys`).

The map holds only buckets the user has **touched**. An absent entry falls back
to `collapsedByDefault`. This is deliberately not "the value at mount": a bucket
that is empty at mount and receives its first item later has still never been
touched, and must start collapsed — which a mount-time read would get wrong.

Once touched, the choice **sticks**, including across the bucket draining to
zero and refilling. Resetting to collapsed on drain was considered and rejected:
if the user expanded the pile, they wanted it expanded, and the component does
not undo user intent. The accepted cost is that after "Empty N discards" the
pile refills in the open state and grows until the user re-collapses it.

### The affordance: a tone-coloured chevron in the dot's slot

The chevron **replaces** the tone dot, occupying its exact 8×8 slot, and
rotates on expand. The whole header row is the click target.

This costs no horizontal chrome and keeps every bucket's label on the same left
edge whether or not it is collapsible. It also preserves the invariant the code
states explicitly (`types.ts:15`, "the ONLY role color — chrome stays neutral"):
there is still exactly one coloured mark per bucket, in the same place.

The chevron carries the bucket's `tone` rather than a neutral chrome colour.
Mocked against a `danger`-toned bucket — the worst case for a coloured chevron
reading as a status arrow rather than a control — the shape carries "control"
more strongly than the colour carries "status". `Tone`'s `muted` and `default`
both resolve to `--sui-text-muted`, so for the actual consumer's muted discard
pile a tone-coloured and a neutral chevron are identical pixels; tone-colouring
is a strict superset that additionally lets a `success`-toned "Archived" pile
keep its colour.

Rejected alternatives: a chevron *beside* the dot (extra chrome, no gain); a
`Section`-style `+`/`−` button beside the count (an ~18px target for the primary
"peek at what I discarded" gesture, in a header otherwise inert); a muted "3
staged — click to review" strip in the `emptyLabel` slot (clearest, but spends a
line of height permanently and makes a collapsed pile taller than an empty
bucket, contradicting the sizing model's premise that a collapsed bucket is one
header tall); and showing the chevron only while collapsed (the affordance
vanishes at the moment you would reach for it to close, and the expanded bucket
becomes indistinguishable from a non-collapsible one).

### A collapsed bucket keeps `selectedKey`

Collapsing a bucket that holds the selected row hides the rows and moves
nothing. Firing `onSelect(null)` would break a contract the README states twice
(`README.md:138`, "`null` only ever comes from the advance"), and whether a
hidden selection still merits a detail panel is the consumer's call. This
matches the component's existing tolerance for a selected item that renders
nowhere.

### A move into a collapsed bucket keeps its source FLIP, and the destination acknowledges it

The vacated slot still closes and the rows below it still slide up; the
collapsed destination's count briefly pulses so the row is visibly received
rather than merely vanishing.

Auto-expanding the destination on arrival was rejected — it defeats the point,
re-opening the pile on every discard.

## Implementation

### `./collapse.ts` — new, pure

```ts
export const collapsedFlags = ({ buckets, counts, overrides }): boolean[]
// bucket.collapsible !== true → false
// counts[i] === 0             → false   (the EMPTY path owns that render)
// overrides.get(key) ?? (bucket.collapsedByDefault === true)
```

`collapsed` and `empty` stay separate flags. They mean the same thing to the
**sizing** (pin to the summary line) and different things to the **render**:
an empty bucket shows `emptyLabel` and has no chevron; a collapsed one shows
nothing and carries the toggle.

### `./layout.ts` — one additive param

Both `naturalHeights` and `allocateHeights` gain `collapsed?: boolean[]`,
defaulting to all-false so existing behaviour is byte-identical. Both are
exported public API (`README.md:387`), so the change has to be additive.

- `naturalHeights`: `collapsed[i]` → `headH + BORDERS`. No empty strip; the
  bucket is populated.
- `allocateHeights`: the two `counts[i] === 0` tests become
  `counts[i] === 0 || collapsed[i]` — excluded from `active`, subtracted from
  the pool, never `filling`.

### Rendering and accessibility

A collapsible **and populated** bucket renders its header as
`<button type="button" aria-expanded aria-controls={bodyId}>`. Every other
bucket keeps today's `<div>` untouched, so no existing test or consumer shifts.

`aria-controls` deliberately references an element that does not exist while
the bucket is collapsed — the body is unmounted, not hidden, because the sizing
model measures live elements and a `display:none` body would still be queried by
`revealRow` and the FLIP sweep. A dangling `aria-controls` is well-tolerated by
screen readers; keeping the rows in the DOM is not tolerable for the layout.

**The button needs a full UA reset** — `appearance`, `background`, `border`,
`font`, `color`, `text-align`, `width`. `headH` is measured from bucket 0's
header alone (`BucketQueue.tsx:407`) and applied to every bucket, so a button's
default metrics leaking in would mis-size the entire bar.

`BucketQueue.tsx` sits at 501 lines against the workspace's 500-line rule, so
the header is extracted to `BucketHeader.tsx` as part of this work rather than
growing the file further.

### Keyboard

`allKeys` (`BucketQueue.tsx:274-279`) must skip collapsed buckets. It is built
from `itemsIn(bucket.key)` — the data, not the DOM — so without this a collapsed
bucket's rows stay in the roving sequence while absent from the DOM, the single
tab stop lands on a row that renders nowhere, **no** row receives
`tabindex="0"`, and the whole queue drops out of the tab order. `moveFocus`
needs no change; it already queries `[data-bq-interactive]` from the DOM.

The header button is its own native tab stop with native Enter/Space. Arrow keys
stay row-only, preserving today's single top→bottom row sequence.

### Motion

`MotionContext` gains `bucketEl(key) => HTMLElement | undefined`; the
`[data-bq-bucket]` marker already exists and `Transfer.to` already carries the
destination. Extending the choreographer interface is anticipated by ADR 0004,
which documents it as the swappable seam.

- `motion.ts:124`'s blanket `if (arrivals.length === 0) return;` is removed. A
  transfer with no destination row still has a source bucket whose gap must
  close. Return early only when arrivals, cues **and** FLIP plans are all empty.
- The cue: the destination header's count scales `1 → 1.15 → 1` over the
  existing `DURATION_MS` and `EASING`. Same `canAnimate` feature-detect and
  `reducedMotion` bail as every other path, so jsdom and reduced-motion place
  instantly.
- `revealRow` against a collapsed destination is already a harmless no-op.

## Testing

| File | Covers |
|---|---|
| `collapse.test.ts` (new) | the flag rules, incl. `collapsedByDefault` inert without `collapsible`, and empty-wins |
| `layout.test.ts` | the new param; an all-false `collapsed` staying identical to omitting it |
| `motion.test.ts` | an arrivals-empty batch no longer suppressing the source FLIP |
| `BucketQueue.rendering.test.tsx` | chevron replaces the dot; rows hidden while collapsed; an empty **and** collapsible bucket rendering exactly as today |
| `BucketQueue.keyboard.test.tsx` | the tab stop surviving a collapse; the header toggling on Enter/Space |
| `BucketQueue.selection.test.tsx` | collapsing a bucket holding `selectedKey` firing nothing |
| `BucketQueue.advance.test.tsx` | stickiness across drain → refill |

## Shipping

- README section; `COMPONENTS.md` entry (`undocumentedComponents` is ratcheted
  at 0).
- `dev/showcases/bucket-queue/discard.tsx`.
- New code uses `fn` combinators. `dotChains` and `collectionMethodCalls` sit at
  7 and 31 and the ratchet **fails you for improving a metric** without
  committing `npm run health -- --update-baseline` alongside.
- Version bump, tag, then the `thorcasting-ui` pin bump — the consumer cannot
  pick this up from a `main` merge alone.
