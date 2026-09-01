# BandRail — Design Spec

**Date:** 2026-08-31
**Status:** Approved (design), pending implementation
**Author:** Adlai Arnold (with Claude)
**Depends on:** `refactor(internal): lift the label anchor and lane helpers out
of ThresholdRail` (06e653c) and its tests (afcd2c9). Those commits move
`fitAnchor`, `anchoredSpan`, `laneOf` and `LabelAnchor` out of the rail into
`src/internal/geometry/labelLayout.ts`. This spec assumes they have landed.
**Ships as:** one release. No intermediary release for the rename or the
affordance work.

## Problem

A `Threshold` is a point with a label. The label describes a **region**, not the
point. Nothing in the type says which region, so the drawing cannot show it.

A user drags a salary rail, reads "insolvent in 6 mo" at a tick, and cannot tell
whether the insolvent side is left of that tick or right of it. The rail states
where the answer changes and never states what the answer becomes.

## Chosen fix

Label the region, not the crossing. The consumer supplies **bands** — spans with
both ends stated — and the rail draws each band as a bar that carries its own
label. A band that holds at the current value is bright; a band that does not is
dimmed.

Two shapes were rejected:

- **A direction stub on the tick** (`applies: "above" | "below"`). It states
  direction and says nothing about extent, and it cannot carry a bounded answer
  such as "safe between $200 and $3.8k" as one datum.
- **A point plus a derived bar.** The rail would have to invent where each bar
  stops. That is arithmetic on the consumer's values, which the component's own
  header forbids, and the rail cannot do it correctly — it does not know whether
  one label supersedes another or holds at the same time. Only the consumer
  knows.

Colouring the rail itself was rejected for three reasons: with four stacked
strips the reader cannot tell which strip belongs to which label; two adjacent
tones carry their boundary in hue alone, which `types.ts` forbids; and a ladder
of coloured rows blurs the drag target.

## Naming

**"Band" is kept, because this repo already uses it for this mark.**
`src/components/Alarm/` carries the vocabulary:

- `Range` = `{ start, end }`, a raw x extent.
- `AlarmBands` = the renderer that draws one rectangle per `Range` along x,
  placed by `xScale` and **stacked into lanes** by `laneIndex` / `laneCount`.
  Its own docstring names the input `s.bands`.
- `HotZone` = `Range & { count }`, a *derived* dense area found by sweep line.

Every alternative is taken by a different meaning, or free and no better:

| Word | Verdict |
|---|---|
| `span` | Taken in `helpers.ts` — `anchoredSpan()` and `Candidate.span` mean a label's horizontal extent. Collides in the file being edited. |
| `range` | Taken twice — `alarm.ts`'s `Range`, and `linearScale(domain, range)`. `DragRangeSelect` also exists. |
| `zone` | Taken, with a different meaning. `HotZone` is derived and carries a count; `FileDropZone` and `deadzone` are pointer targets. |
| `segment` | `SegmentedControl` owns it. |
| `lane` | The stacking mechanism here — `laneOf`, `LANE_PITCH`. |
| `bracket` | A `CornerStyle` value. |
| `bucket` | `BucketQueue` owns it. |
| `region` | Free, correct, and wins nothing over "band". |
| `interval` | Free and exact, but formal, and it also reads as a time period. |

**The ends are `start` and `end`, not `from` and `to`**, so `Band` mirrors
`alarm.ts`'s `Range` and `HotZone`. Two spellings for one concept in one
package is the cost that buys nothing.

### The component becomes `BandRail`

`ThresholdRail` names one of two marks. After this change the bands carry the
answer and the thresholds carry only where it changes, so the old name states
the smaller half. `BandRail` names what the rail draws.

The cost, stated plainly: `BandRail` demotes the crossings the same way
`ThresholdRail` demoted the bands. `OutcomeRail` and `AnswerRail` were the
alternatives that name the *meaning* rather than either mark, and both were
passed over.

`Threshold`, `ThresholdSide` and `PlacedThreshold` **keep their names**.
"Threshold" is still the right word for a crossing; it is now one of two marks
rather than the component's whole subject.

Three surfaces break. Treat all three as public:

1. **The export.** `src/index.ts`, `COMPONENTS.md`, the showcase, the tests,
   and thorcasting's import. `createThresholdRail` becomes `createBandRail`.
2. **The CSS prefix.** Every `sui-threshold-rail__*` class becomes
   `sui-band-rail__*`. #36929 records that a consumer already has reason to
   reach for those class names, so this is a break, not an internal rename.
3. **The prop type.** `ThresholdRailProps`, `ThresholdRailOverrides` and
   `ThresholdRailDataProps` take the `BandRail` prefix.

Ship `ThresholdRail` and `createThresholdRail` as deprecated aliases for one
minor version so thorcasting can move on its own schedule. The CSS prefix gets
no alias — duplicating every rule to keep the old class names costs more than
the one consumer edit.

## API

New type in `types.ts`:

```ts
/**
 * One named span of the domain where a given answer holds.
 *
 * Both ends are optional and default to the ends of `domain`, so a band may be
 * bounded ("safe between $200 and $3.8k") or half-open ("insolvent above
 * $9.3k"). The rail does no arithmetic on the values: it places what it is
 * handed, and an omitted end is a default, not a derivation.
 */
export interface Band {
  /** Left end, in the same units as `domain`. Defaults to `domain[0]`. */
  start?: number;
  /** Right end, in the same units as `domain`. Defaults to `domain[1]`. */
  end?: number;
  /** What holds across this span, in words — e.g. "safe in 12 mo". */
  label: string;
  /** Semantic treatment. The theme owns the colour. Defaults to "default". */
  tone?: Tone;
  /** Which side of the rail the bar takes. Defaults to "below". */
  side?: ThresholdSide;
}

/** A band after the rail has placed it. */
export interface PlacedBand {
  band: Band;
  /** Visible span in viewBox units, clamped to the rail's inset ends. */
  x1: number;
  x2: number;
  /** True when that end is the band's own value, not the domain end. */
  capStart: boolean;
  capEnd: boolean;
  side: ThresholdSide;
  /** 1-based distance from the rail. Lane 1 sits closest. */
  lane: number;
  anchor: LabelAnchor;
}
```

New prop on `BandRailProps`:

```ts
/** Spans of the domain where a given answer holds. Computed by the consumer. */
bands?: readonly Band[];
```

`Threshold` is **unchanged**. It stays the mark for a point that describes no
span — `"today"` at $120 in the showcase is a marker, not a crossing. A band
with `start === end` would draw a zero-width bar, so a degenerate band is a bad
way to say "marker" and the two props stay separate.

`bands` defaults to `[]`, so every existing call site renders exactly as it does
today.

## Rendering

### The bar

Each band draws a horizontal bar in a lane, offset from the rail on its `side`.
The bar carries its `label` as one line of 10px monospace, centred on the
visible span and anchored inward at the box ends by the existing `fitAnchor`
rule.

An end is **capped** when the band's own value falls inside the rail. A capped
end draws a short vertical stroke on the bar and a tick down to the rail, so the
crossing stays visible. An **open** end runs to the rail inset with no cap and
no tick. Capped and open ends must look different: "stops here" and "runs off
past here" are different facts.

### Lanes

Bands and thresholds get **separate lane stacks** on each side.

A threshold label occupies the width of its text, roughly 60 to 130 viewBox
units. A band bar occupies its extent, which is often most of the 656-unit rail.
Bands therefore collide with each other far more than labels do. In one shared
stack, four mostly-overlapping bands would take all four lanes and every
threshold label on that side would pile into lane 4 and be allowed to collide.

Bands take the lanes nearest the rail; thresholds stack outside them.

`laneOf` now lives in `src/internal/geometry/labelLayout.ts`, generic over
`LaneBox` (an `x` and a `span`) with the cap and the gutter arriving as a
`LanePacking` argument. So the two stacks are two calls with different packing,
not a fork of the function:

```ts
laneOf(bandBoxes,      { maxLanes: MAX_BAND_LANES, gutter: LABEL_GUTTER })
laneOf(thresholdBoxes, { maxLanes: MAX_LANES,      gutter: LABEL_GUTTER })
```

The algorithm is unchanged in both — walk left to right, take the nearest lane
whose last occupant clears the gutter, share the outermost lane past the cap.

`bands` default to `side: "below"` and `thresholds` default to `side: "above"`,
so the two stacks separate without the consumer doing anything.

### Active and inactive

A band is **active** when `value` falls inside `[start, end]`. Active bands take
their full tone. Inactive bands drop to a muted fill.

The dimming is the primary channel for the direction answer. The reader drags
and watches which bars light up. Every echo of that state elsewhere is
redundant encoding, which is what makes it legal under the "never meaning in
colour alone" rule.

### The thumb

The nesting ring becomes an **arc ring**: one circle at `r = 12.5`, its stroke
split into arcs, one arc per active band, in that band's tone.

- **One radius for every count.** The ring is 12.5 whether one band is active or
  eight, so no lane moves and the box height never depends on `value`. A
  concentric stack was rejected for exactly this: four rings reach 20 units,
  cross the lane-1 name baseline at `railY - 19`, and would make the rail grow
  and shrink under the user's finger. The radius grows from today's 8.5 for the
  affordance reason below — that is a one-time static change to
  `THUMB_REACH_ABOVE` and `THUMB_REACH_BELOW`, not a value-dependent one, so the
  invariant holds.
- **Order is input order.** No ranking is wanted, but the sequence must be
  stable while dragging. Input order is stable and the consumer controls it.
- **Start at 12 o'clock, run clockwise.** Draw each arc as its own `<circle>`
  with `stroke-dasharray` and `stroke-dashoffset`, inside a group rotated -90deg
  about the thumb.
- **One active band draws a full circle** — identical to today's ring.
- **No active band keeps the arrow.** The arrow now means "no band holds here".

Circumference at `r = 12.5` is 78.5. With a 3-unit gap and a 2.5-unit stroke:

| active bands | arc length |
|---|---|
| 2 | 36.3 |
| 3 | 23.2 |
| 4 | 16.6 |
| 6 | 10.1 |
| 8 | 6.8 |
| 10 | 4.9 |

At ten the arc is twice the stroke width and reads as a dash. **Past eight
active bands the thumb draws one neutral ring** and the dimmed bars carry the
whole message. That degrades without changing any geometry.

### "You are on a crossing" moves off the thumb

Today the ring borrows the nested threshold's colour. Bands take that colour, so
the borrow is no longer available — and it only ever said "you are on one of
them".

The signal moves onto the crossing itself: the nested threshold's tick thickens
and its label brightens. That points at the thing the value is on.
`nestedThreshold` keeps its current job and tolerance. The two states compose —
inside a band and on a crossing gives an arc ring plus a thickened tick.

## Affordance

The rail's drag target is not obvious enough. This is fixed here, not by
composing `Slider`.

### `Slider` cannot host this rail

`Slider` is Kobalte-backed and DOM-based: `KobalteSlider.Track` / `Fill` /
`Thumb` are HTML divs, and Kobalte places the thumb at `left: calc(pct%)` with
`translateX(-50%)`. `BandRail` is one `<svg>` with `viewBox="0 0 700 {height}"`
and `width: 100%; height: auto`. Five things break at that seam:

1. **The coordinate systems do not meet.** Sitting a DOM thumb on an SVG rail
   needs the rendered box measured on every resize and CSS pixels converted to
   viewBox units — a `ResizeObserver` plus a scale conversion, more machinery
   than the 30 lines of pointer handling the rail has now.
2. **The insets disagree.** `Slider.css` insets its track by half a thumb, a
   fixed 8px. The rail insets by `RAIL_INSET = 22` viewBox units, which scales:
   22px at 700px wide, 11px at 350px. One of the two is wrong at every width.
3. **Kobalte snaps to `step`.** The rail's contract forbids it — "a dial that
   quietly edits its own output cannot be trusted to report what the user
   chose". Avoiding the snap means deriving a tiny step from the domain, which
   is arithmetic on the consumer's values.
4. **Two slider roles.** The host already carries `role="slider"` and an
   `aria-valuetext`. Kobalte brings its own of each.
5. **Depth.** `BandRail` is Atomic (Depth 1). Composing `Slider` makes it Depth
   2, and its CSS would reach into `sui-slider__*` — the coupling #36929 says
   this package exists to prevent.

Share `Slider`'s design language, not its implementation.

### The gesture is already right; the signal is not

`onPointerDown` sits on the host div and `track(e.clientX)` jumps the value to
the click, so the whole rail is grabbable and a click anywhere moves the thumb.
That is better than a slider, which responds only on its track.

What is missing is every visual cue that says so:

| | `Slider.css` | `ThresholdRail.css` today |
|---|---|---|
| thumb hover | `:hover:not([data-disabled])` | none |
| thumb active | `:active:not([data-disabled])` | none |
| track fill | `.sui-slider__fill` | none |
| thumb size | fixed 16px token | 10 viewBox units — 5px at a 350px render |
| cursor | default | `pointer` on the host |

### Three changes

**1. A track fill.** One `<line>` from `RAIL_INSET` to `thumbX()`, drawn under
the rail line, in a neutral tone (`--sui-accent` at reduced opacity, or
`--sui-border-strong`). Class `.sui-band-rail__fill`.

This does **not** contradict the rejection of a coloured rail in *Chosen fix*.
That rejection was about colour carrying a *band's* meaning. A fill encodes the
value, which is what every slider does, and it is one neutral tone that cannot
be confused with a band's tone.

**2. Hover and active states.** Borrow Slider's rules for the thumb group, and
put `cursor: grab` on the host with `cursor: grabbing` while dragging.

`dragging` is a plain `let` in `ThresholdRail.tsx` today. It must become a
signal to drive a class. That is the only reactivity this adds.

**3. A bigger thumb, in viewBox units.**

Do **not** size the thumb from a CSS pixel token. `valueFromClientX` depends on
the viewBox keeping its aspect ratio — "The viewBox keeps its aspect ratio, so
the only conversion needed is the CSS-to-viewBox scale factor". A pixel-sized
thumb makes `THUMB_REACH_*` a function of the rendered width, so the box height
would change on resize and that conversion would break.

The thumb shrinks at narrow widths because the whole drawing does — so do the
10px labels. The rail is a fixed-aspect drawing meant to be read near 700px.
Enlarge the thumb at that design width and accept that below about 400px the
whole component is unreadable, thumb included.

Every thumb constant scales by 1.5:

| constant | today | new |
|---|---|---|
| `ARROW_HALF_WIDTH` | 5 | 7.5 |
| `ARROW_TIP_GAP` | 6 | 9 |
| `ARROW_TOP` | 15 | 22 |
| `STEM_HALF_WIDTH` | 1.2 | 1.8 |
| `RING_RADIUS` | 8.5 | 12.5 |
| `DOT_RADIUS` | 3.5 | 5 |
| `THUMB_REACH_ABOVE` | 15 | 22 |
| `THUMB_REACH_BELOW` | 9 | 14 |

`THUMB_REACH_BELOW` is 14 and not 13.5 because the ring's outer edge is
`12.5 + 2.5/2 = 13.75`.

**Height cost.** `labelBase("above")` rises from 15 to 22, pushing every
above-side label out by 7. `labelBase("below")` rises from `max(10, 9) = 10` to
`max(10, 14) = 14`, pushing below-side labels out by 4.

The total is **not** a flat number, because `sideExtent` reads the raw thumb
reach when a side has no lanes and the floored `labelBase` when it has one:

| case | above | below | total |
|---|---|---|---|
| no lanes either side | +7 | +5 | +12 |
| one or more lanes below | +7 | +4 | +11 |

Against a 700-unit width, either way. Cheap, and it applies whether or not any
band is passed.

## Keyboard

`PageUp` and `PageDown` currently jump between threshold values. They gain the
capped band ends as targets, because a band end is also a value where the answer
changes. The jump list is the union of threshold values and capped band ends,
deduplicated.

## Accessibility

`aria-valuetext` today reports the formatted value and the nested threshold's
label. A screen-reader user gets nothing from the dimming, which is the whole
direction answer.

It gains the active band labels:

> `"$6.0k, safe in 12 mo, or hire a bookkeeper"`

Order: formatted value, then active band labels in input order, then the nested
threshold's label if there is one.

## Styling

Additions to `BandRail.css`. Tone drives `color` on the band group, exactly
as it does on `.sui-band-rail__threshold`, so bar, cap, tick and text can
never disagree.

- `.sui-band-rail__band` — the group; carries `color` from tone.
- `.sui-band-rail__bar` — the bar stroke, `stroke: currentColor`.
- `.sui-band-rail__cap` — the end stroke on a capped end.
- `.sui-band-rail__band-label` — one 10px mono line, `fill: currentColor`.
- `.sui-band-rail__band--inactive` — drops opacity; the muted state.
- `.sui-band-rail__arc` — one arc of the thumb ring.
- `.sui-band-rail__fill` — the neutral track fill from the rail's left end to
  the thumb. Drawn under `.sui-band-rail__line`.
- `.sui-band-rail--dragging` — host modifier; carries `cursor: grabbing`. The
  host's resting cursor becomes `grab`.
- `.sui-band-rail__thumb:hover`, `.sui-band-rail__thumb:active` — borrow
  `Slider.css`'s rules, guarded against the disabled state.
- `.sui-band-rail__tick--nested` — the thickened tick of the nested
  threshold.
- Reuse the existing `--success/--warning/--danger/--accent/--muted/--highlight`
  tone modifiers by applying them to the band group as well.

## Geometry constants

New in `helpers.ts`. **Starting values — tune against the showcase.**

```ts
export const BAND_THICKNESS = 3;      // bar stroke width
export const BAND_LANE_PITCH = 15;    // bar + its label line + gap
export const MAX_BAND_LANES = 3;      // cap, per the lane-budget argument
export const ARC_GAP = 3;             // viewBox units between two arcs
export const ARC_STROKE = 2.5;        // arc stroke width at r = 12.5
export const MAX_ARCS = 8;            // past this, one neutral ring
```

Changed in `helpers.ts`, per *Affordance*:

```ts
export const THUMB_REACH_ABOVE = 22;  // was 15
export const THUMB_REACH_BELOW = 14;  // was 9
```

Changed in the component, per *Affordance*: `ARROW_HALF_WIDTH` 5 -> 7.5,
`ARROW_TIP_GAP` 6 -> 9, `ARROW_TOP` 15 -> 22, `STEM_HALF_WIDTH` 1.2 -> 1.8,
`RING_RADIUS` 8.5 -> 12.5, `DOT_RADIUS` 3.5 -> 5.

`labelBase(side)` gains the band stack:

```
labelBase(side, bandLanes) =
  max(TICK_LENGTH, thumbReach(side), bandBase(side) + BAND_LANE_PITCH * bandLanes)
```

`sideExtent` reads the same function, so a pushed-out label and the box sized to
hold it can never disagree — the invariant `labelReach` already documents.

Three band lanes push threshold labels out by 45 units on that side. That cost
is the reason `MAX_BAND_LANES` is 3 and not 4.

## Files

`git mv src/components/ThresholdRail src/components/BandRail`, then rename the
five PascalCase files inside it. Do the move as its own commit so the diff of
the band work stays readable.

`src/components/BandRail/`:

- `types.ts` — add `Band`, `PlacedBand`.
- `helpers.ts` — add `placeBands` and `arcLengths`, the new constants, the
  `labelBase` change, and the jump-target union. `laneOf`, `fitAnchor` and
  `anchoredSpan` are imported from `internal/geometry/labelLayout` and used
  unchanged; this file keeps only the rail's own constants and placement.
- `BandRail.tsx` — new `bands` prop, active-band memo, `aria-valuetext`.
- `bands.tsx` — **lowercase filename.** The band layer and the arc-ring thumb
  render here. `ThresholdRail.tsx` is 360 lines today and would pass the
  500-line limit otherwise.
- `BandRail.css` — the classes above.
- `BandRail.test.tsx` — the tests below.
- `index.ts` — barrel; add the deprecated `ThresholdRail` and
  `createThresholdRail` aliases here.

`dev/showcases/threshold-rail.tsx` → `dev/showcases/band-rail.tsx` — bands added
to the draw dial and the colliding-price dial, plus one example that overlaps
four bands. The filename must be the kebab-case of the component, or
`componentsWithoutShowcase` fails `health` at its ratchet of 0.

`COMPONENTS.md` — rename the ThresholdRail entry to BandRail and mention `bands`.

`docs/handoffs/chart-line-labels.md` — the rename breaks its citations. §5.1
cites `ThresholdRail/helpers.ts` at :68, :81 and :179; §3 quotes
`ThresholdRail/types.ts:8-9,28-29`. Repoint both in the rename commit.

**Do not name the new render module in PascalCase.** `isEntryPath` in
`scripts/render-coverage.mjs` matches any PascalCase `.tsx` under
`src/components/`, and `missingDepthHeaders` uses the same selector. A file
named `Bands.tsx` would register as a new component that owes a depth header and
a showcase. `ExtractionBoard/cards.tsx` is the precedent.

## Testing (TDD)

Behaviour tests, written first, red then green:

1. With no `bands`, the rail renders exactly as it does today.
2. A band with both ends draws a bar spanning both, with a cap at each end.
3. A band with `end` omitted runs to the rail's right inset, with no cap there.
4. A band with `start` omitted runs to the left inset, with no cap there.
5. A capped end draws a tick down to the rail; an open end does not.
6. A band whose span contains `value` gets the active class; one that does not
   gets `--inactive`.
7. Bands and thresholds on the same side occupy separate lane stacks; a band in
   band-lane 1 does not push a threshold into threshold-lane 2.
8. Threshold labels shift outward by `BAND_LANE_PITCH` per band lane, and
   `railExtents` grows to match.
9. Overlapping bands stack outward; past `MAX_BAND_LANES` they share the
   outermost lane.
10. One active band draws a full circle at `r = 8.5`.
11. Three active bands draw three arcs whose lengths and gaps sum to the
    circumference, in input order.
12. Seven active bands draw one neutral ring, not seven arcs.
13. No active band draws the arrow, not a ring.
14. The thumb's radius does not change with the active band count.
15. `aria-valuetext` lists the value, then every active band label in input
    order, then the nested threshold label.
16. `PageUp` and `PageDown` stop at capped band ends as well as thresholds, and
    do not stop twice at a band end that coincides with a threshold.
17. The nested threshold's tick takes `--nested`; the thumb ring does not take
    that threshold's tone.
18. The track fill runs from the rail's left end to the thumb, and moves with
    `value`.
19. The host takes `--dragging` on pointer down and drops it on pointer up and
    on pointer cancel.
20. From the enlarged thumb alone, with no bands passed, `railExtents` grows by
    12 units for a bare rail and by 11 once a side carries a lane.

## Out of scope

- Snapping. The rail still never rounds the value it emits to a band end.
- Any arithmetic on band values. The consumer computes the spans.
- Ranking the arcs by band width. Rejected: concentric rings would rank them and
  cost layout motion; the arcs deliberately say "three facts hold" without
  saying which is most specific.
- Colouring the rail track by band. The neutral value fill in *Affordance* is
  the one mark allowed on the track, and it encodes the value, not an answer.
- Bands that overlap on both sides of the rail at once — a band takes one side.
- Rebuilding the rail on `Slider`. Rejected in *Affordance*, with reasons.
- A `step` prop. The arrow keys move by `(hi - lo) / KEY_STEPS`, so a consumer
  cannot ask for $50 increments. That is worth having and it is separate work,
  not a reason to compose `Slider`. File it on its own.
- A `fillFrom` origin for the track fill. The fill starts at the rail's left
  end, which reads oddly on a domain like `[-100, 100]`. Revisit if such a
  domain appears.

## Open questions

1. **Do the band end values render?** A threshold shows `format(value)` as a
   second text line. A band has two ends. Proposal: render `format(start)` and
   `format(end)` at the caps in the muted `__value` style, always. Check for
   crowding in the showcase and drop them if it is bad.
2. **What does a bar do when its visible span is narrower than its label?**
   The label overflows the bar. Proposal: let it overflow and keep the existing
   box clamp, since the lane already guarantees clearance from its neighbour.
3. **Should `MAX_ARCS` degradation be neutral or the first six tones?** Proposal
   above is neutral. Six-band overlap may never occur in practice.
