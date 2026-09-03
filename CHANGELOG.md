# Changelog

## [Unreleased]

## 0.162.0

### Added
- **`Slider` takes an `editable` prop and turns the value readout into a text
  field.** Off by default, so an existing slider renders exactly the markup it
  rendered before.

  ```tsx
  <Slider label="Months to sample" value={months()} onChange={setMonths}
          min={3} max={24} step={1} editable />
  ```

  The field shows `format(value)` at rest and the RAW number while focused, so
  a reader sees the unit and a typist sees only what they must retype. Enter or
  blur commits: the text is clamped to `[min, max]` and snapped to the nearest
  `step` counted from `min`, so a typed value lands on the same grid the drag
  handle lands on. Text that is not a number is dropped and the field returns
  to the current value. The input is `type="text"`, not `type="number"`, so the
  browser draws no spinner arrows beside a control that already has a track.

- **`ScrubChart` takes a y-axis scale control.** `yFitDomain(from, to)` states
  the extent for a cell range — both ends INCLUSIVE cell indices — and setting
  it renders a small icon button in the chart's origin corner that switches
  between fitting the visible window and fitting the whole series.

  ```tsx
  <ScrubChart cells={cells} renderChart={draw}
              yFitDomain={(from, to) => extentOf(cells.slice(from, to + 1))}
              yFitPin={{ min: 0 }} />
  ```

  The callback exists because `renderChart` is a slot: the chart never sees the
  values, so the caller states the extent and ScrubChart pads it, snaps it and
  pins it. `yFitPin` holds one or both ends at a fixed value — a pinned end
  takes NO margin and NO `nice()` snap and renders exactly as given, because a
  caller who returns 0 as the min would otherwise watch the margin push that 0
  below zero. `yFitMargin` sets the fraction added above and below a FREE end,
  default `0.08`. `yScaleMode` and `onYScaleModeChange` make the toggle
  controlled; omit both and ScrubChart owns the signal, starting at `"visible"`.

  `yFitTransition` sets the milliseconds the fitted domain takes to reach a new
  target, default 240, `false` to snap. The tween RETARGETS rather than
  restarts: a domain arriving mid-flight is followed from wherever the axis has
  reached, which is what a pan needs, because the domain changes on every
  frame. Tick VALUES come from the target domain, not the tweened one, so the
  labels hold still and only their positions move. A reader who sets
  `prefers-reduced-motion: reduce` gets the target at once. Only the fitted
  domain animates — a static `yDomain` never gains motion it did not ask for.

- **`Icon` draws `zoom-in` and `zoom-out`**, both in the `actions` group.

### Changed
- **`SegmentedControl` rounds its selected highlight to match the container.**
  The highlight took one radius on all four corners, so it did not sit inside
  the container's own rounding at either end. It now takes the container's
  radius on the outer corners of an end segment and a smaller radius on the
  inner corners, both derived from `--sui-radius-md`.

### Fixed
- **`ScrubChart` y tick labels no longer clip at the frame edge.** A label
  centred on its tick lost its outer half when the tick sat on `plotTop` or
  `plotBottom` — the ends of a fitted domain. Each label's BASELINE now clamps
  inside the frame; the tick mark and the gridline keep their exact `y`, so
  only the text moves and nothing lies about where the tick is.

## 0.161.0

### Added
- **`Slider` takes a `ticks` prop and draws notches on the track.** `true`
  marks every `step` from `min` to `max` inclusive; an array marks exactly
  those values and ignores `step`; omitted or `false` renders exactly the
  markup the component rendered before.

  ```tsx
  <Slider label="Months to sample" value={months()} onChange={setMonths}
          min={3} max={24} ticks={[3, 6, 12, 18, 24]} />
  ```

  A notch the fill has passed flips to the page colour, so it reads as a cut
  in the fill rather than a mark beside it. A value outside `[min, max]` is
  dropped rather than pulled to the edge, because a notch at an unreachable
  value lies about the domain. A notch at either end sits half its own width
  inside the track, so the rounded cap does not clip it. Every notch is
  `aria-hidden` and takes no pointer events — a notch is decoration, and the
  track under it stays the drag surface.

  `ticks` joins `format` in `SliderOverrides`, so `createSlider({ format,
  ticks })` curries a scale as well as a unit. Kobalte has no tick primitive:
  each notch is an absolutely positioned span inside `KobalteSlider.Track`,
  sized by the new `--sui-slider-tick-width` and `--sui-slider-tick-height`
  variables.

## 0.160.0

### Fixed
- **Every per-mark `class` prop now wins on a plain single class.** 0.159.0
  fixed the balance lines and 0.158.0 the hover dot; this finishes the family.
  `CashflowChartMarker.class`, `CashflowHorizontalMarker.class` and
  `CashflowSeriesFill.positiveClass` / `negativeClass` all landed BESIDE SUI's
  own class at equal specificity, so the prop did not guarantee a win — the
  stylesheet that loaded last did. A prop that exists reads as a prop that
  wins, and this one did not. The defaults for `__band--positive`,
  `__band--negative`, `__marker-line`, `__marker-dot`, `__rule-line` and
  `__hrule-line` now ride on each element as presentation attributes:

  ```css
  /* was: .sui-cashflow-scrub-chart__marker-line.my-marker { … } */
  .my-marker { stroke: rebeccapurple; }
  ```

  One `CashflowChartMarker.class` also now reaches BOTH the marker's line and
  its dot, the way a series class reaches its line and its hover dot.

  Marks with no consumer class prop keep their rules — `__marker-flag`,
  `__marker-ring`, `__zero-line`, the selected rule and dot. So do the emphasis
  rules, whose double-class and descendant selectors exist precisely to BEAT a
  consumer's class: a highlighted marker still takes its 2px weight. A test
  now asserts no consumer-targetable mark ships a lone paint rule, and it was
  verified by planting one and watching it fail.

- **The `"rule"` marker variant reads a colour token that exists.** Its stroke
  was `var(--sui-text, #fff)`, and `--sui-text` is defined by no theme, so it
  had only ever rendered through the literal. It now reads `--sui-text-primary`
  with the literal kept underneath. The same dead token made the hover dot
  invisible mid-development in 0.158.0.

  `--sui-cashflow-marker` and the two band colours are likewise defined by no
  theme — they are consumer override hooks whose literal fallbacks are what
  actually paints. They are kept verbatim rather than "tidied" to bare tokens.

## 0.159.0

### Fixed
- **A consumer's class on a balance line wins on a plain single class.**
  `.sui-cashflow-scrub-chart__line` and `__line--series` set stroke, fill and
  stroke-width as RULES. A rule and a consumer's own class on the same line are
  both single-class selectors, so the winner was decided by which stylesheet
  loaded last — and SUI's can load last, which this repo had already measured
  once (`CashflowScrubChart.css:186` records six chart labels drawn in the
  default grey for exactly that reason). Consumers were compounding
  `.sui-cashflow-scrub-chart__line.their-class` for no reason but to break the
  tie. Both defaults now ride on the polyline as PRESENTATION ATTRIBUTES, which
  lose to any author rule, so a plain single class is enough:

  ```css
  /* was: .sui-cashflow-scrub-chart__line.my-forecast { … } */
  .my-forecast { stroke: rebeccapurple; }
  ```

  Measured in a browser on a clean element with the consumer sheet inserted
  FIRST — the order that used to lose. The emphasis rules keep their rules AND
  their double-class selectors on purpose: those must BEAT a consumer's class,
  which is the opposite requirement, so a highlighted line still takes its
  3px weight while keeping the consumer's colour. Themes move the defaults
  through `--sui-cashflow-line-stroke` and `--sui-cashflow-series-stroke`.
  Third instance of one defect, after the hover dot and the highlight band in
  0.158.0; a class SUI hands a consumer is now a class they can actually use.

- **The y-domain props state one precedence, and it is the one the code
  follows.** `yMin`'s doc said tight-domain mode beat `yMax`; `yPadFraction`'s
  said the reverse, and the code agrees with the second — the padded branch is
  gated on `!hasManualMax`. A consumer read the wrong one and blocked real work
  on a constraint that does not exist. The rule, now stated once on `yMax`:

  | Set | Mode | `yMin` |
  |---|---|---|
  | `yMax` | fixed-range, `yPadFraction` ignored | applies |
  | `yPadFraction`, no `yMax` | tight-domain | **ignored** |
  | neither | auto, floored at 0 | applies |

  Only `yMax` escapes tight-domain mode, so a caller who wants BOTH bounds
  pinned must set both — a `yMax` alone leaves the floor at 0, which is the
  framing tight mode exists to escape. That was true before and no doc said it.
  The rule moved out of a `createMemo` branch into `chartYDomain` /
  `chartYDomainMode` in `helpers.ts`, with one test per row: it drifted from
  its docs precisely because no test could reach it without rendering a chart.
  Behaviour is unchanged — this half of the release is docs and structure only.

## 0.158.0

### Added
- **`ScrubChart.highlights`** — shaded bands over a range of cells, for
  "this stretch of the x-axis means something": a funding gap, a forecast
  horizon, a quarter. Each band is a `ScrubChartHighlight`,
  `{ from, to, class? }`, stated in CELL INDICES with both ends inclusive and
  covering the whole cell, so a one-cell band is `{ from: i, to: i }`.
  ScrubChart clamps both ends to the cell range and swaps them when
  `from > to`, so a band computed from live data cannot draw outside the plot.
  Bands paint in the BOTTOM layer of the frame — beneath the gridlines and
  beneath the `renderChart` series — because a band BACKS the data. The
  window band is the opposite case and still paints above the series, since it
  dims the slice it covers. `CashflowScrubChart` forwards the prop and the
  same type unchanged: a band carries no cashflow vocabulary, so a caller
  writes one object for either chart. OPT-IN; no chart draws a band until a
  caller asks. `ScrubChartHighlight` is exported from the barrel.

  ```tsx
  <ScrubChart
    cells={cells}
    highlights={[{ from: 20, to: 34, class: "funding-gap" }]}
    ...
  />
  ```

### Fixed
- **A series class now reaches every mark that series draws.** The hover
  crosshair drew one circle per line and gave every circle a single fixed
  class, so a consumer could style a line and could not touch its dot. A
  series hidden through its own class (`stroke: none; fill: none`) kept an
  unexplained circle on the crosshair that matched nothing in the tooltip. Each
  dot now carries the class of the line it sits on —
  `CashflowBalanceSeries.class` for an overlay series, `lineClass` for the
  primary line, which reaches the same set of marks its doc already claimed.
  A deviation band is the deliberate exception: it keeps the polarity classes
  of `fill`, because its two halves mean different things.

- **A consumer class can no longer lose to SUI's own stylesheet on the hover
  dot or a highlight band.** A base rule and a caller's class are both
  single-class selectors, so the winner was decided by stylesheet ORDER — and
  this repo has already measured that order going the wrong way, when a
  consumer loaded a second copy of SUI's CSS after its own and six chart
  labels drew in the default grey. The default fill, stroke and opacity of
  both marks now ride on the element as PRESENTATION ATTRIBUTES, which lose to
  any author rule, so the caller's class always wins. Themes move the defaults
  through `--sui-cashflow-hover-dot-fill`,
  `--sui-cashflow-hover-dot-stroke`, `--sui-scrub-chart-highlight-fill` and
  `--sui-scrub-chart-highlight-opacity`.

## 0.157.0

### Added
- **`CashflowScrubChart` names the line it draws itself** — new `lineLabel`
  and `lineLabelPlacement` props. `CashflowBalanceSeries.label` named every
  overlay line, but the primary running-balance line answered to no label id,
  so it muted on every hover and never highlighted. A caller bought the label
  by adding an invisible `balanceSeries` entry that traced the same values — a
  carrier line drawn only to hang a caption on. `lineLabel` replaces that
  workaround. The same placement ladder places it, so the caption sits beside
  the line's last point and walks body → right → below.

- **Each chart label now takes the colour of the line it names.** A series
  takes its colour from the consumer's own CSS class, and every consumer
  states that colour as a `stroke`. An SVG `<text>` reads `fill`, not
  `stroke`, so no CSS rule and no new prop could carry the colour across. The
  chart tags each drawn line with its label id, reads the resolved stroke back
  after each render, and writes the answer as an inline `fill` style.

- **A pointer on a label emphasises the line that label names.** The named
  line comes forward and every other line and label mutes, so a reader learns
  which caption belongs to which line.

- **`CashflowScrubChart.horizontalMarkers`** — fixed-value reference lines
  that span the full plot width, e.g. "you need $X in the bank". The existing
  `markers` pin to a cell index and mark a threshold DATE; a
  `CashflowHorizontalMarker` marks a threshold AMOUNT. Each line takes a
  `valueCents`, an optional `label` drawn at its right end, and an optional
  `class`. The lines are never interactive and never move with the data. They
  draw beneath the vertical markers in the same overlay `<svg>`.
  `CashflowHorizontalMarker` is exported from the barrel.

- **`CashflowScrubChart.yMin`** — an optional fixed lower y-bound in cents,
  mirroring `yMax`. The lower bound was always derived from the data
  (`min(0, …balance values)`), so the zero-line stayed visible but its PIXEL
  position drifted between renders: two scenarios with different depths of
  "how bankrupt" drew the zero-line at different heights, which makes them
  uncomparable at a glance. Set `yMin` to pin it. `yPadFraction` still wins,
  the same as it does over `yMax`.

- **A `gear` glyph in the `Icon` set.** `settings` draws eight rays from a
  hub, which reads as a sun. A reader finds a gear by the teeth, so the new
  glyph puts six teeth on the rim. `settings` is unchanged and its drawing is
  now locked by a test, so existing call sites do not move.

- **`SpacedStack`** — a plain vertical column at the `md` (12px) gap step, the
  sibling of `TightStack` (xs) and `NarrowStack` (sm) one rung up the scale.
  `COMPONENTS.md` documented it, but `variants.ts` never implemented it.

- **`DateCell`, `DateTimeCell` and `MinuteDateTimeCell` are exported.** They
  are the project's own sanctioned date renderers, and they lived in
  `Table/dateCells.tsx` without reaching any barrel.

### Fixed
- **A highlighted line keeps full strength.** The highlighted rule set only
  `stroke-width`. A consumer's series class dims its own line with
  `stroke-opacity`, so the highlighted line stayed faded. The rule now sets
  `opacity` and `stroke-opacity` on the line.

- **A highlighted band no longer floods the plot.** The highlighted-band rule
  set `fill-opacity: 1` and `opacity: 1`, which painted a consumer's range
  cone (`fill-opacity: 0.12`) as a solid slab. A band is context around the
  highlighted line, not the subject of the highlight, so it only has to escape
  the muting rule. A highlighted band now looks exactly as it does at rest.
  The modifier class stays on the element as a consumer hook.

- **A label on an invisible line mutes nothing.** A consumer hangs a label on
  a carrier series its CSS draws with `stroke: none`. Hovering that label
  highlighted an element that paints nothing, and muted every visible line.
  The chart now reads the label's line from the colour map; a missing key says
  the line paints no stroke, and no element mutes.

- **The label colour survives a duplicate stylesheet.** The layer wrote the
  colour as a `fill` presentation attribute, which sits below every CSS
  declaration in the cascade, so any plain `.sui-cashflow-scrub-chart__label
  { fill: … }` rule painted over it. `package.json` maps `index.css` to
  `dist/index.css` even while the `source` condition is active, so a stale
  second copy of this stylesheet can reach the page beside the fresh one. The
  colour is now an inline style, which beats every class rule that carries no
  `!important`.

- **`ScrubChart` keeps the hover readout off the label gutter.** Two columns
  of the frame hold no cell: the y-axis label column, and the caller-reserved
  right gutter where `CashflowScrubChart` parks its right-zone labels. The
  hover path used the clamping `cellAtClientX`, so a pointer in the gutter
  drew a full-height crosshair and a tooltip for the last day. The hover path
  now calls the new `cellUnderClientX`, which answers `null` outside the
  plot. `CashflowScrubChart` also draws no hover readout while a label is
  hovered, which covers the `"below"` zone labels that sit under the x-axis
  and inside the plot's span. The pan gesture and the click-to-scrub gesture
  keep the clamping reader, because both mean the edge cell when they end past
  an edge.

## 0.156.1

### Fixed
- **`ThemedNumberInput` no longer crashes the form that holds it**
  (sui#36961). 0.156.0 gave kobalte a `value` prop that called the caller's
  `value` accessor, and fed the mirror signal behind it from kobalte's own
  `onChange`. Kobalte reads that prop from `createControllableSignal`'s
  `isControlled` and `value` memos, and its hidden input reads those memos
  again inside a render effect, so kobalte re-entered the caller's accessor
  while it rendered. A caller that builds its form fields in lazy JSX getters —
  the curried form-field shape — rebuilt the field on that re-entry. Each
  rebuild emitted again, and the form died with `RangeError: Maximum call
  stack size exceeded`. The component now reads the caller's accessor in an
  effect it owns, and hands kobalte a plain signal. Kobalte can read `value`
  as often as it likes and never reaches the caller.

  The clear that 0.156.0 bought stays closed (sui#36924): an uncontrolled
  number-to-blank still empties the visible input, and a value that comes back
  still shows. The component still emits one `onChange` at mount, so a
  consumer's mount-time guard is unchanged.

## 0.156.0

### Added
- **`BandRail` labels the region, not just the crossing** (sui#36955). A
  `Threshold` is a point, but its label describes a *region*, and nothing in
  the type said which one — a reader seeing "insolvent in 6 mo" at a tick could
  not tell which side of it was the insolvent side. The new `bands` prop takes
  spans with both ends stated, drawn as labelled bars that **dim when the value
  leaves them**, so dragging teaches the direction. `start` and `end` are both
  optional and default to the domain ends, so a band may be bounded ("safe
  between $200 and $3.8k") or half-open ("insolvent above $9.3k"); an omitted
  end is a default, not arithmetic on the consumer's values. A capped end draws
  a tick to the rail because that is a crossing; an open end runs to the rail's
  edge with neither cap nor tick, because there is none there to mark.
  **Bands never share a lane** — two bars at one height read as a single bar
  spanning both, a span that neither band claims, so the box grows instead. The
  thumb's nesting ring becomes one arc per holding band, and "you are on this
  crossing" moves onto the crossing itself, since the bands take the colour the
  ring used to borrow. `aria-valuetext` now names every holding band, so a
  screen reader gets the answer the dimming gives a sighted reader.
  `thresholds` is unchanged and `bands` defaults to `[]`, so existing call
  sites render exactly as before.

- **`CashflowBalanceSeries.label` now renders.** The field has been on the
  public API for a long time and nothing drew it. A series that carries a
  `label` draws it beside its own line. A `CashflowChartMarker` label joins the
  same layer once the marker names a zone; without one, a `"rule"` marker keeps
  the top-of-rule caption it always had, so no current chart moves.
- **New `labelPlacement?: CashflowLabelZone` on both.** `CashflowLabelZone` is
  `"auto" | "body" | "right" | "below"` and defaults to `"auto"`. The zone is a
  PREFERENCE, not a lock: the chart walks body → right → below and takes the
  first zone the measured text fits. A label that fits nowhere is dropped in
  silence — nothing is written to the console.
- **The zone rides on the DATA, not on a curried variant.** `AGENT_GUIDE.md` §1
  says visual and layout props are locked at variant-definition time, and a
  zone looks like a layout prop. It is not one here. The chart family already
  draws this line twice: `ScrubChartOverrides` holds the frame SIZING knobs
  only, while `PinMarkers.lane` — a vertical stacking slot, the closest
  structural analog to a zone — stays a render-time prop. `Table` takes `align`
  per column, `BucketQueue` takes `fill` per bucket, `Dropdown` takes `shape`
  per item. Currying the zone would force every label on one chart into one
  zone, which defeats the feature.
- **A chart with no labels does not move by one pixel.** Only an EXPLICIT zone
  buys frame space: `"right"` widens a gutter past the plot, `"below"` adds a
  row under the x-axis ticks. An `"auto"` label uses whatever another label
  bought and never creates space itself. The space is reserved BEFORE the
  scales are built, because the gutter feeds the x scale and the rows feed the
  y scale — a gutter can never be sized from where a label landed.
- **`ScrubChart` and `CashflowScrubChart` draw horizontal gridlines**
  (sui#36952). `showGridlines` puts one rule across the plot at every y-axis
  tick — the same shape `Chart`'s `Grid` slot already draws for the low-level
  chart kit. The rules read the same tick memo the axis labels read, so a line
  can never sit where no label is. They are solid `--sui-border`, 1px,
  `crispEdges`, and never dashed: on a cashflow chart every short dash pattern
  already means another line type (the zero line, the runway floor, a
  comparison scenario, a ghost preview, a marker rule, the selected day, the
  Today rule, the current-balance rule), so a dashed rule would read as one of
  them.

  The prop is OPT-IN and defaults to `false`, so no existing chart gains
  chrome its consumer did not ask for. It has no effect without `yDomain`.

  `Chart/Grid` itself is not reused. It reads the whole `ChartContextValue`
  through `useChart()` and emits plot-local coordinates that assume the Chart
  root's margin translate; `ScrubChart` supplies no such context and works in
  frame coordinates. `ScrubChartGrid` sits beside `ScrubChartAxes` instead,
  sharing its tick type. It is a separate fragment in a separate layer because
  the paint order differs: the axes SVG draws AFTER the series so the labels
  stay legible, while a gridline must draw BEFORE it so the data paints over
  the chrome.

### Changed
- **`ThresholdRail` is renamed `BandRail`** (sui#36955). It named one of two
  marks, and after the change above the bands carry the answer while the
  thresholds carry only where it changes. `ThresholdRail`,
  `createThresholdRail` and the three prop types stay as deprecated aliases for
  one minor version. The `sui-threshold-rail__*` CSS prefix does **not** — it
  is now `sui-band-rail__*`, and duplicating every rule costs more than the one
  consumer edit. `Threshold`, `ThresholdSide` and `PlacedThreshold` keep their
  names, because a threshold is still what they describe.
- **`BandRail`'s drag target reads as one.** The gesture was never the weak
  part — the host takes the pointer and a click anywhere moves the thumb — but
  against `Slider` the rail had no hover state, no active state, no track fill,
  a `pointer` cursor and a thumb 10 viewBox units wide. It gains a neutral
  value fill, `grab`/`grabbing` cursors, hover and active states, and a thumb
  scaled by 1.5. The thumb stays sized in viewBox units rather than a CSS pixel
  token: `valueFromClientX` needs the viewBox to keep its aspect ratio. The box
  grows 12 units for a bare rail and 11 once a side carries a lane.

## 0.155.2

### Fixed
- **`ThresholdRail` keeps a threshold label out of the thumb** (sui#36929). A
  threshold in the first lane above the rail put its name baseline 14 units
  above the rail, and its value line 25. The draggable thumb's arrow spans 15
  units to 6 above the rail, so the name ran straight through the arrow. The
  label band now starts at the larger of the tick reach and the thumb reach, so
  the first lane's text begins 19 above the rail and clears the arrow. The tick
  stroke does not move and keeps its length of 10.

  One helper supplies the floored reach to both the lane geometry and the
  height of the viewBox. Sizing the box from the same number keeps the top
  value line inside it — lifting the labels alone would have clipped that line.
  The floor sets the base of the lane stack, so every lane above the rail
  rises by the same 5 and consecutive lanes stay one lane pitch apart. A floor
  applied to each lane on its own would have lifted the first lane alone and
  run the second lane's name through the first lane's value line. The side
  below the rail is unchanged: the thumb reaches only 9 there, less than a
  first-lane tick.

## 0.155.1

### Fixed
- **`ThemedNumberInput` clears the visible input** (sui#36924). A caller that
  set its value accessor to `undefined` emptied only the hidden form input.
  Kobalte's `rawValue` effect returns early on `NaN`, so the box the user reads
  kept the old number while the form carried nothing. The display string is now
  controlled: an accessor that returns `undefined` hands kobalte an empty
  string, which reaches the DOM through a signal that has no such guard.
  Kobalte still owns the formatting — this component keeps a mirror of the text
  kobalte last emitted and never re-implements `Intl`. An absent `value` prop
  leaves kobalte uncontrolled, so the first paint and any default value are
  unchanged.

- **`End` and `Home` only move the caret** (sui#36926). On a field with no
  `max`, `End` set the value to `9007199254740991`; `Home` set the
  `MIN_SAFE_INTEGER` twin. Kobalte merges a default `maxValue` of
  `Number.MAX_SAFE_INTEGER` into every number field and its spin-button sends
  `End` straight to that bound, and passing `maxValue={undefined}` does not
  remove the merged default. A capture listener on the input now stops each key
  before Solid delegates it to kobalte, and only when the matching bound is
  absent — so a field that declares `min` or `max` keeps kobalte's documented
  jump. The listener never calls `preventDefault`, so the caret still moves to
  the end or the start of the text.

  An `onKeyDown` prop cannot do this. Kobalte reads that prop *instead of* its
  own spin-button handler, so the guard would take the jump away from bounded
  fields too.

## 0.155.0

### Added
- **`Slider`** — a labelled range control that prints its own live value. The
  label line carries the caption on the left and `format(value)` right-aligned
  on the right, so a control reads `Safety buffer` / `6 months` on one line and
  needs no separate readout beside it. Built for the thorcasting trades
  module's draw dial (dside `sui` #36920), which pairs a slider with a typed
  field on five inputs.

  ```tsx
  <Slider label="Safety buffer" value={months()} onChange={setMonths} min={3} max={18}
          format={(n) => `${n} months`} />
  ```

  **The value stays in the caller's own units.** The component runs no
  arithmetic beyond kobalte's step snapping and formats nothing itself, so a
  dial that keeps integer cents passes cents and supplies a `format` that
  renders dollars. Assuming dollars would put a unit in the widget that only
  the consumer knows.

  **It does not emit `onChange` at mount, and that is why it exists.**
  `ThemedNumberInput` fires one `onChange(undefined)` at mount; a form that
  persists on every change writes that mount value over the stored one. This
  control emits only on a drag or a key that moves the thumb.

  Wraps `@kobalte/core/slider`, so it is Atomic (Depth 1) and owns its CSS.
  `createSlider({ format })` curries the formatter when the unit is static.
  It ships no `variants.ts`: `format` is the only override and a real caller's
  formatter carries its own units, the same reason `ThresholdRail` ships its
  base alongside its factory.

  Two things it had to correct in kobalte's defaults. Its `aria-valuetext`
  comes from an internal number formatter, **not** from `getValueLabel` — that
  only feeds `ValueLabel` — so a screen reader read `6` where the sighted user
  saw `6 months`; the thumb now carries `aria-valuetext={format(value)}`. And
  kobalte places the thumb at `left: calc(pct%)` of the track, so a flush track
  let the thumb hang 8px outside a 290px column at max; the track now insets by
  half a thumb on each side, the way a native range input does, while the label
  line stays flush so a slider still lines up with the number input beside it.

### Changed
- **`ThresholdRail`** — the docs no longer call it "the library's first true
  slider". `Slider` now also carries `role="slider"`, and ThresholdRail remains
  the choice when the axis carries named threshold ticks.

## 0.154.0

### Added
- **`Tooltip`** — `triggerAs` chooses what the trigger renders as. The trigger
  was always a `<button>`, which put every already-interactive child out of
  reach: a link or a button nested inside a button is invalid HTML, and the
  inner control stops answering clicks and stops being its own tab stop. Such
  content had to keep a native `title` instead, whose delay belongs to the
  browser and which no page can shorten.

  ```tsx
  // Content that is already a control: the trigger steps aside.
  <Tooltip content="Open the vessel call" triggerAs="span">
    <A href={`/detail/${id}`}>…</A>
  </Tooltip>
  ```

  Kobalte's trigger was already `Polymorphic` with `as: "button"` as a default
  merged *before* the caller's props, so this forwards a knob that existed and
  was not reachable. Omitting `triggerAs` renders the same `<button>` as
  before, so no existing call site changes.

  A span trigger is **not focusable**, so the tooltip is unreachable by
  keyboard through the trigger itself — give such content its own `aria-label`,
  since the inner control is what a keyboard reaches. A dense table is the
  other reason to reach for `"span"`: a button trigger per row turns a hundred
  readouts into a hundred tab stops.

## 0.153.0

### Added
- **`ThresholdRail`** — a one-dimensional value axis whose thumb rides its own
  consequences. One horizontal rail, a draggable thumb, and named ticks standing
  off the rail at the values where the answer changes. Built for the thorcasting
  trades module's draw dial (dside `sui` #36899).

  The ticks are model *outputs* plotted on the axis of the model *input*, so the
  control and the readout are one object. That is what separates it from a
  slider with a caption beside it, and it is why the rail absorbs three jobs a
  consumer would otherwise do by hand: **lanes** (colliding labels stack outward
  from the rail, capped at four, each side stacking independently), **anchor
  fitting** (a label near either end anchors `start`/`end` rather than spilling
  out of the box), and **self-sizing** (the viewBox grows only for the lanes
  actually used). The rail does no arithmetic on the thresholds it is given.

  **It never snaps.** The thumb *nests* — landing on a threshold it becomes a
  ring holding a dot, and the ring takes that threshold's tone — but the value
  passed to `onChange` is never rounded to a threshold. A dial that quietly
  edits its own output cannot be trusted to report what the user chose.
  `aria-valuetext` names the threshold too, so the nesting is not colour-only.

  Named for the shape, not the domain: thorcasting's glossary calls this a
  *crossing rail*, and maps `crossing` → `threshold` at the call site.

  Props: `domain`, `value`, `onChange`, `thresholds`, `label` (required
  accessible name), `format?`, `disabled?`. A `Threshold` is
  `{ value, label, tone?, side? }`, where `label` is **required** so meaning is
  never carried by colour alone. `tone` is the existing seven-value `Tone`
  union, so the theme owns every colour and the rail adds no colour vocabulary.
  Factory: `createThresholdRail({ format })`.

  **This is the library's first true slider** — no other component carried
  `role="slider"` or `aria-valuenow`. It therefore brings the keyboard contract
  with it: arrows move 1/100 of the domain, Shift multiplies by ten, Home and
  End reach the domain ends, and PageUp/PageDown jump between thresholds. The
  role sits on a host element rather than the `<svg>`, which is `aria-hidden`:
  an `<svg>` may not take an interactive role, and the tick labels are real text
  nodes that would otherwise compete with `aria-valuetext`.

  No `variants.ts` — one caller, and nothing static to curry beyond the
  formatter the factory already takes.

## 0.152.0

### Added
- **`Tone` gains `"highlight"`**, and `Text`/`InlineText` both gain a `tone?: Tone`
  prop. Previously the only way to apply a semantic tone (success/warning/danger/
  accent/muted) was inside a composite (`Table` fields, `ValueMatrix`) — a plain
  standalone value in a dense table cell had no way to flag itself as notable
  without a caller reaching for a literal `color`. goose's Census page needed
  exactly this: a nonzero "Gap" count/percent value that should draw the eye,
  in a plain-text table cell (`InlineText`'s documented shape).

  `tone` is data, not a curried/frozen prop — it's live on every existing `Text`
  variant for free, same as `GapCell`'s severity. `InlineText.tone` wins over the
  existing `color` escape hatch when both are given; `color` still works
  unchanged for existing callers.

  New CSS variable `--sui-highlight` (+ `--sui-highlight-rgb`), themed per theme
  (not a shared literal) — teal in `default`, off-accent hues in `hud`/`bronze`/
  `bronze-dark`/`stax`/`colorblind`, all ≥4.5:1 contrast on that theme's
  `--sui-bg-primary`, enforced by a new `contrast.test.ts` entry.

  New curried variants `HighlightBody` and `TextValueHighlightSm`, siblings of
  the existing Danger/Warning/Success `Text` variant families.

## 0.151.3

### Added
- **`FieldTable.onRowHover` reaches `BaseTable`**. `BaseTable` has fired
  `(row, index)` on row enter and `(null, -1)` on body leave since the prop
  shipped, but `FieldTable` forwards five named props to `DataTable` and
  spreads no rest — so the callback stopped one layer above the table and a
  consumer had no escape hatch. jtf-ui lists a vessel call's HELM timestamps in
  a `FieldTable` above a chart, and a row hover must highlight that timestamp's
  annotation line.

  The prop is optional and adds no wiring of its own: omit it and every existing
  table behaves exactly as before. `SelectableTable` still omits `onRowHover` on
  purpose — it has no hover wiring on its body.

## 0.151.2

### Added
- **`CashflowScrubChart.lineClass` restyles the PRIMARY balance line**
  (sui#32933). An overlay series has carried a consumer-owned `class` since it
  shipped, but the line the chart draws itself hardcoded
  `sui-cashflow-scrub-chart__line` — so a caller could dash a comparison line
  and never the baseline. thorcasting-ui needs exactly that: a dotted "draft"
  treatment on the baseline column's own projection.

  `lineClass` appends to the base class with the same concatenation the series
  lines use, so an absent prop leaves the class string byte-identical and no
  current caller changes appearance. Colour, dash and opacity stay the
  consumer's to define. The showcase adds a dotted draft section, styled from an
  inline `<style>` block beside it.

## 0.151.1

### Fixed
- **HeatStream's hover preview sizes itself to its key list** (sui#28687). The
  panel was a fixed `25vh` box whose rows are `flex: 1; min-height: 0`, so the
  height each row got was `(panel − chrome) / N` with no floor. jtf-ui's
  `/tools/explanations` passes every distinct explanation title as `keys` — 45
  today — which left **4.11px of row for an 11px label**: the glyph boxes
  overlapped and `overflow: hidden` sheared them, and the whole label column
  read as noise.

  The height is now driven by the content: one legible row per key (16px — a
  14px row plus the 2px gap), floored at the old 200px so a short list still
  renders large marks, and capped at the viewport less both margins so the panel
  can never grow off-screen. Past that cap the rows shrink together instead of
  the tail of the list clipping — the panel is `pointer-events: none`, so an
  overflow scrollbar would not be scrollable by anyone. Same 45 keys now get
  a 766px panel at 13.97px a row.

  The arithmetic lives in `internal/geometry/hoverPanelHeight` and is applied
  inline by `updatePosition()`; `.jtf-heatstream__preview` **declares no height
  at all** now. Splitting it between the stylesheet and the positioning code is
  what let the two drift, and the old rule's "keep the 0.25 factors in sync"
  comment was the warning rather than the fix.

### Changed
- **Compact HeatStream showcases actually render.** `.jtf-heatstream--compact`
  is `height: 100%` with `flex: 1` rows, so in the gallery's auto-height flow
  all three compact sections collapsed to zero and had been showing blank space.
  They now sit in a `.heatstream-compact-demo` frame (`dev/main.css`, per the
  showcase style rubric), and a new **Compact — 45 Keys** section carries the
  production shape the preview fix is about — the 8-key demos land on the 200px
  floor and could never have shown it.

## 0.151.0

### Added
- **`PivotGrid` — `isCellSelected`**, marking one cell as the current
  selection independent of `getCellHeat`'s magnitude coloring. Adds
  `sui-pivot-grid__cell--selected` (an inset accent-color ring) to the `<td>`
  and `aria-current="true"` to its interactive wrapper (`aria-selected` was
  tried first and rejected by the a11y lint — not a valid attribute on a
  plain `<button>`/`<a>`, no supporting role). Surfaced by jtf-rth's SR-05
  report: clicking a matrix cell opened a drill-down table below the grid
  with no visible trace of which cell it came from once that table scrolled
  out of view. Purely additive — optional prop, no existing behavior changes.

### Changed
- **The last two orphan showcases resolved** — differently, because they were
  different problems. `HeatStack` is now in the gallery at `#/heatstack` (362
  lines of working showcase that had never been registered in `dev/main.tsx`).
  `dev/showcases/toggle.tsx` is **deleted**: it exported a `ToggleShowcase` that
  `dev/main.tsx` already imports from `hud-toggle.tsx`, whose sections are a
  superset of it (Variants / Sizes / Colors / States / Label Position against
  Basic / With Label / Sizes / Disabled). Both files date to the initial commit;
  wiring the smaller one up would have put a second, worse Toggle page in the
  gallery.

  `dev/showcases/` now has **zero** files that nothing imports. Note the earlier
  count of four orphans (from the 2026-08-04 architecture review, and repeated
  by me) was wrong: `cashflow-day-cell.tsx` is a helper module imported by
  sibling showcases, not a page. The detection that produced "four" looked only
  for imports from `dev/main.tsx`, which sibling imports don't match.

## 0.150.2

### Fixed
- **Orthogonal edge router no longer draws through the obstacle it detoured
  around** (sui#16435). `orthogonalAvoidingObstacles` lifts to a corridor over
  an obstacle and comes back down the other side, but each vertical leg's x is
  bounded by its own node's outer edge — so when an obstacle's near edge
  reaches past that bound, the clamp yields to the node and the leg runs
  straight through the obstacle. The corridor passes *over* an obstacle, never
  *past* it.

  Both ends now check whether their own vertical leg actually intersects an
  obstacle, and if it does, anchor to the node's near **horizontal** edge and
  run up or down its centre line instead. This is the anchoring the
  x-overlap branch in the same function already used, for the same reason, and
  the arrowhead stays cardinal either way.

  Keyed on "does this leg hit something", **not** on the clamp giving up — the
  clamp also gives up when an obstacle merely comes close to a node while the
  leg stays clear, and those paths were already correct. A grid sweep over
  11,850 layouts (both directions, obstacles before/between/past the nodes)
  now reports zero crossings and zero diagonal segments; it reported 16
  crossings before.

  Affects rendered geometry in **SwimlaneChart** (`geometry/edge-views.ts`,
  two call sites, both passing explicit ports) and **AnimatedSwimlaneChart**
  (`SwimlaneAnimatedLane.tsx`, one site, no ports) — and only for edges that
  were being drawn through a node. Every path that was already correct is
  byte-identical, which the tests pin from both directions.

  **Not DagChart.** An earlier draft of this entry, PR #116 and the report on
  sui#16435 all listed it as a third consumer. It is not one: DagChart imports
  `DagSvgNode`/`DagSvgEdge`/`DagArrowMarker` from `internal/dag-svg`, but builds
  its edge geometry in its own `DagChart/edge-path.ts` and never calls this
  router. The 0.150.1 entry below is about the dag-svg DIRECTORY, where DagChart
  genuinely is a consumer — that one stands.

  A pre-assigned `fromPortY`/`toPortY` is dropped at whichever end reroutes: a
  port exists to stop several edges stacking on one side anchor, and a side
  anchor is precisely what is unreachable in that case.

### Changed
- `collectionMethodCalls` 31 → 30 (sui#12291). The three `obstacles.some(...)`
  calls in `orthogonal-routing.ts` are now `fn/some`; one of them predates this
  work.
- **`dev/showcases/router-demo.tsx` is now in the gallery**, at
  `#/router-demo` ("Edge routers (dag-svg)"). The file and its `.router-demo__*`
  styles in `dev/main.css` were written when the router was, and never
  registered in `dev/main.tsx` — so the one page built to answer "what does this
  router actually draw" rendered nowhere, and the question kept getting answered
  by reading path strings instead. Needed a `Component` wrapper (it exported
  only a grid taking a `style` prop), the registration, and three new cases that
  bracket the fix above: `CLR` (obstacle stops 6px short — ordinary side
  arrival), `ABT` (obstacle abuts the target — enters its top edge) and `ABS`
  (obstacle abuts the source — exits its top edge). Six pixels of obstacle is
  the entire difference between the first two.

### Notes
- **A correction to 0.150.1's note.** That entry said the defect was confined
  to the target side, on the reasoning that the lift runs before the corridor
  and so leaves the obstacle behind. That was wrong, and the fix here is
  symmetric. The lift starts at `fromPortY`, which is *inside* the source's
  y-band, so an obstacle merely **abutting** the source is crossed on the way
  up — no overlap with the source node required, which is what that note
  claimed would be necessary. All 16 crossings the first grid sweep found were
  this source-side case, not the target one the original report was written
  from.

## 0.150.1

### Added
- **First tests for `src/internal/dag-svg`'s edge routers** (sui#16434). 537
  lines of path routing — `orthogonalAvoidingObstacles`, `bezierAvoidingObstacles`,
  `bezierThroughChannelPath`, `orthogonalStepPath` — shipped through DagChart,
  SwimlaneChart and AnimatedSwimlaneChart with no test at all. 37 tests; 23
  mutations run against the two modules, all caught. Function coverage went
  0/8 and 0/10 to 8/8 and 10/10. No production code changed.
- **`src/test-utils/svgPath.ts`** — `parsePath`, `pathVertices`,
  `controlPoints`, `pathShape`, `samplePolyline`. A router returns a `d` string
  and nothing else, so a test either parses it or asserts on a string literal
  that pins six coordinates at once and says nothing about whether the path
  clears the obstacle. `pathVertices` deliberately excludes a cubic's control
  points — they are not on the stroke, so counting them would let a bezier
  "prove" it clears an obstacle it cuts straight through.

### Changed
- **Coverage now reports `src/internal/**`** (`vitest.config.ts`). It had been
  outside every walk: the coverage glob, `render-coverage.mjs` (which filters
  on `/src/components/`) and `execution-coverage.mjs` downstream of it. This
  makes the directory visible; it does **not** gate it, and
  `componentsNeverExecuted` is unmoved at 3 — that metric iterates the
  component entry list and looks each entry up in the report, so extra files in
  the report are invisible to it.

### Notes
- **Known defect found and left unfixed** (sui#16435). The orthogonal router's
  jammed-obstacle fallback is sound on the source side and wrong on the target
  side, where it inherits the same comment but not its reasoning: `dropX`
  clamps to `toOuterX - 2` and then descends from the corridor to the target
  port straight through the obstacle, because the corridor is only *above* the
  obstacle, never *past* it. Fires when an in-band obstacle's x-range covers
  `toOuterX - 2`. Pinned by a `KNOWN DEFECT` test rather than fixed: three
  shipped charts render this geometry, and the plausible fixes differ in what
  they do to every other edge, so it wants eyes on real charts.
- `orthogonal-routing.ts:25` declares `_EXIT_RUN` as a "legacy alias" with no
  remaining consumers. Left in place to keep this diff free of production
  changes.

## 0.150.0

### Changed
- **Test harness migration finished** (sui#12529). Sixteen test files carried a
  private `ResizeObserver` in four incompatible shapes, eight spied on
  `getBoundingClientRect`, five copied the same three DnD helpers and three
  wrote their own pointer driver. All of it now comes from `src/test-utils`.
  Eighteen files migrated, 487 lines of duplicated doubles deleted against 352
  added (net -135 under `src/`; much of what went back in is the reasoning
  below, written down where the next reader will hit it). No public API change
  and no behaviour change in any shipped component.

  Two files keep a private double **on purpose**, and both now say so in their
  own headers: `internal/dom/observeSize.test.ts` and
  `CashflowChart.test.tsx`. The rule is the same for each — their subject IS
  the rAF scheduling, and `installFakeSizer`'s `resize` awaits that frame
  before resolving, so migrating would make every "nothing has happened yet"
  assertion unfalsifiable.

### Added
- **`FakeSizer.observed()`** — the elements watched right now, across every
  live observer. Distinct from `observations`, which is an append-only log of
  how `observe()` was *called* and never shrinks; only a live set can answer
  "was the stale row unobserved, or is it still stacked up", and a leaked
  observation shows up there rather than as a wrong measurement.
  `BucketQueue/measurement` needed it; the log alone could not carry that file.

### Notes
- **Two of the four ResizeObserver "shapes" did not exist.** The fire-on-observe
  doubles in `Table/EllipsisText` and `Table/textCells` were decorative:
  `createTruncationObserver` measures synchronously inside its `createEffect`
  before it observes anything, and that first measure is what the assertions
  read. Replacing `observe()` with a no-op left all twelve tests green — the
  observer only has to *exist*, so the hook does not return a
  permanently-false accessor. Both now install a silent sizer.

  The same held inside `createTruncationObserver`'s own suite: four of six
  tests fired the observer and passed without it. Those calls are gone so each
  test claims only what it covers, which leaves the post-mount re-measure path
  resting on a single case. Recorded on the task rather than padded out.
- **A decorative drag fixture in `MutableList`** dropped in the bottom half of
  a row and asserted an order that jsdom's all-zero rects produce anyway (every
  midpoint is 0, so any positive `clientY` reads as "past everything"). Now
  drops in the top half, which zero rects cannot produce. The hit test itself
  was never at risk — `SortableList` covers both halves — but the fixture
  looked like more than it was.
- **`ScrubChart`'s rect stub documented a derivation it does not perform.** The
  comment read "31 cells across 1200 px → dayPitch ≈ 38.71" above a stub whose
  width is 1200, which reads as cause and effect. `cellAtClientX` touches only
  `rect.left`; the 1200 comes from `DEFAULT_CHART_WIDTH`. Halving the stub
  changes nothing, changing `left` fails three tests. Comment corrected.

## 0.149.0

### Added
- **Render coverage for the whole `Table/` cluster** — `DataTableContainer`,
  `FilterableTable`, `SectionTable` and `TableSectionHeader`, the last
  four-module cluster on the burn-down list. `componentsNeverRendered` tightens
  21 → 17 and `componentsNeverExecuted` 7 → 3: all four were dark as well as
  unmounted, so this moves both ratchets. 23 mutations, 22 caught (the 23rd is
  a redundant source clause, below).

  Three of the four own no DOM — they are `splitProps` wiring, where every
  decision is about WHERE a prop lands. Markup assertions would mostly have
  re-tested `BaseTable`, so these suites assert the plumbing instead.

  What is now pinned:
  - `TableSectionHeader`'s **count line**, whose three rules interact: the
    plural agrees with `total ?? count`, so a filtered view reads "1 of 5
    recordS" — plural on a count of one; `isFiltered` uses `>` not `!=`, so an
    unfiltered `total === count` reads "5 records" and not "5 of 5"; and `meta`
    REPLACES the count rather than joining it. Any fixture where count and
    total agree cannot tell the first rule from "plural agrees with count".
  - The `props.count != null` guard, so a table filtered to nothing says
    "0 records" instead of going silent.
  - `DataTableContainer`'s two **mutually exclusive scroll strategies** —
    capped mode gets `ScrollBox` + an inline `max-height` (default `500px`,
    which lives in the component and not in CSS); fill mode gets
    `ScrollFillBox` + `min-height:0` and **no** `max-height`. A cap leaking
    into fill mode would bound a container whose whole job is to grow, and
    `maxHeight` passed alongside `fill` is dropped rather than merged.
  - `FilterableTable`'s deliberate asymmetry: `filterPlaceholder` is split out
    and must not reach `BaseTable`, while `fill` is deliberately NOT split out
    and must reach BOTH the wrapper and the table. Wire only one and the table
    either never scrolls or has no bounded height to scroll within — neither is
    visible under jsdom.
  - That the table stays **mounted** across a filter change. `TableQuickFilter`
    calls its children once with an accessor; passing `filtered()` instead of
    `filtered` would remount on every keystroke, dropping scroll position and
    internal state without changing a single rendered byte.
  - `SectionTable` deriving its count from `data.length` while `total` comes
    from the prop, and that `title` does not leak onto the table — leaked onto
    a DOM element it becomes a native tooltip attribute, which renders fine and
    silently adds a hover tooltip nobody asked for.

### Notes
- One mutation **survived by design**: dropping `props.total != null &&` from
  `TableSectionHeader`'s `isFiltered` changes nothing. `undefined > n` is
  `false` (NaN comparison), so the guard is only reachable when `total` is
  `null` AND `count` is negative — `null` coerces to 0 in a relational
  comparison where `undefined` does not. Both are outside the declared types.
  The clause is redundant rather than untested; it is left in place as
  defensive intent, and no test was contrived to kill it.

## 0.148.0

### Added
- **`PivotTreemap` is exported again.** `src/index.ts` had it commented out
  since 2026-05-12 with the reason "local-link build workaround: dir not
  committed"; the directory landed eight days later and the export was never
  restored, so a fully built, tested, showcased and documented component was
  unreachable by every consumer for ~11 weeks. Adds `PivotTreemap`,
  `PivotPills`, `bucketByDims`, `EMPTY_INNER_KEY` and 6 types — export surface
  1274 → 1284.

  Every health gate was green throughout, because none of them measures the
  export surface. `scripts/doc-coverage.mjs`'s header, which named this
  component as unexported, is corrected in the same change.

## 0.147.0

### Added
- **Render coverage for the whole `Alarm` cluster** — `AlarmBands`,
  `AlarmHotZones`, `AlarmOverlay` and `AlarmStripeDefs`. Only the pure
  `alarm.ts` pipeline had tests; none of the four renderers was ever mounted.
  `componentsNeverRendered` tightens 25 → 21. 17 mutations, all caught.

  Mounted in a **real `<Chart>`**, matching the eleven existing slot tests in
  `src/components/Chart/`. `<Chart>` takes `width`/`height` as plain number
  props and measures nothing, so jsdom is not an obstacle; an explicit zero
  margin makes inner == outer, so a domain value and its pixel are the same
  number and the geometry assertions read directly.

  What is now pinned for the Alarm cluster:
  - The `Math.max(1, …)` **width floor** on both bands and zones — without it a
    range whose ends land on one pixel renders zero-width, i.e. an alarm that
    happened but is invisible. That is the exact case `AlarmHotZones` exists
    for.
  - **Lane math**: stair-stepping by `idx * laneH`, the `Math.max(1, laneCount)`
    guard (a zero lane count makes `laneH` Infinity), and the `clamp` that
    keeps an out-of-range `laneIndex` inside the plot instead of below it.
  - `AlarmStripeDefs` keeps **geometry numeric and paint tokenised** — SVG
    geometry attributes do not resolve `var()`, so a "consistency" refactor
    that tokenised `width`/`height` would collapse the tile to 0/NaN. Also that
    one `spacing` drives both the tile box and the line length, or the motif
    stops tiling seamlessly.
  - The `patternId` round-trip between `AlarmStripeDefs` and `AlarmHotZones`.
    `fill="url(#id)"` resolves document-wide, so a fixed id would silently make
    a second overlay adopt the first one's stripe.
  - `AlarmOverlay`'s **paint order** — bands before zones, per its own comment,
    invisible until a band and a zone overlap — and that hot-zone detection is
    per series rather than across the merged set.

## 0.146.0

### Added
- **Render coverage for the `DateRangePicker` sub-components** — `CalendarGrid`,
  `CalendarHeader`, `PresetButtons` and `TimeInputs` are private to the folder
  and had no test that mounted them; only the composed `DateRangePicker` and
  the pure `calendarUtils` did. `componentsNeverRendered` tightens 29 → 25.

  Mutation-tested like 0.145.0: 13 mutations, all caught. The fixture month is
  **March 2026 on purpose** — the 1st is a Sunday, the worst case for the
  Monday-first offset `(getDay() + 6) % 7`. A month starting on Monday lets an
  off-by-one through.

  What is now pinned:
  - `CalendarGrid` renders a fixed 42-cell six-week grid, Monday-first, with a
    Sunday-starting month pushed to the 7th slot and the first six filled from
    the previous month.
  - The **hover preview only applies while `rangeEnd` is unset** — once a range
    is committed, moving the mouse must not repaint it — and the previewed end
    is **clamped to `maxRangeDays`** rather than following the cursor.
  - `maxRangeDays` disables **symmetrically** around the pending start, and
    disables nothing when either the anchor or the cap is absent.
  - The today marker via fake timers, so it asserts rather than depending on
    the day the suite runs.
  - `PresetButtons` guards on `presets?.length`, so an **empty array renders no
    row at all** — not an empty one that still costs its gap and border.
  - `TimeInputs` keeps `type="time"` on both inputs (the whole design decision
    — a downgrade to `type="text"` is invisible in a DOM snapshot but drops the
    browser's hh:mm UI and validation), and reports a cleared input as `""`.
  - Every `<button>` in the folder carries `type="button"` so a picker mounted
    inside a form cannot submit it.

### Changed
- `componentsNeverExecuted` tightens 12 → 11, and the one that left is
  **`TimeInputs`** — the module `scripts/execution-coverage.mjs`'s own header
  cites as the motivating example of dark code: "no owning suite AND never
  executes, because it sits behind a condition inside a Popover that the tests
  open but never satisfy". It now executes.

## 0.145.0

### Added
- **Render coverage for the whole `DataDisplay` cluster** — `DateTimeRange`,
  `MetricCard`, `NumberWithUnits`, `ResultDisplay`, `ResultPanel` and
  `StatsTable` had no test that mounted them. `componentsNeverRendered`
  tightens 35 → 29.

  Per #12541's own rule these are not smoke tests: each asserts the
  component's actual decisions. Every branch claimed is **mutation-tested** —
  the guarded line was broken, the suite confirmed red, and the line restored.
  That caught one hollow test of my own (see below).

  What is now pinned, in rough order of how quietly it would break:
  - `NumberWithUnits` uses `v == null`, not a falsy check, so a reading of
    **zero renders "0" and not "—"**. `precision` is inert on a value that is
    already a string.
  - `MetricCard`'s `"default"` colour deliberately emits **no** modifier class;
    a refactor to `if (local.color)` would emit `sui-metric-card--default`,
    which no CSS rule matches.
  - `ResultPanel`'s `formulaProvider` default is `!== false`, not a truthiness
    check — flipping it would silently disable formula highlighting everywhere
    the prop is not passed.
  - `StatsTable`'s `?? ""` on `getRowClass`, without which a row whose callback
    returns `undefined` gets the literal class `"undefined"`. Also that
    `align` defaults to left on **both** header and cell, and `width` is
    header-only.
  - `DateTimeRange` delegates to `formatDateTimeRange` and passes `mode`
    through; asserted against the formatter's own output, so changing the
    formatting rule does not require editing these.

### Changed
- `componentsNeverExecuted` tightens 16 → 12. `MetricCard`, `NumberWithUnits`,
  `ResultPanel` and `StatsTable` were **dark** — not merely unmounted, but never
  executing a line under the whole suite. That is a separate ratchet from
  `health.mjs`, with its own baseline (`scripts/execution-baseline.json`),
  enforced by the `test` CI job.

### Fixed
- **`ResultDisplay.highlighted`'s doc comment overstated its coupling.** It
  read "when true (and `highlightable`)", but `.sui-result-display--highlighted`
  is a standalone CSS rule, so `highlighted` paints on its own. The comment is
  corrected; the **behaviour is unchanged deliberately**, since coupling them
  would silently stop painting for anyone already relying on it.

## 0.144.0

### Removed
- **`SidebarSelectorDemo` is no longer part of the public API.** It was a demo
  harness, not a library component: zero props, a fixed `<h3>Episode
  Selector</h3>`, and a hardcoded 79-line fixture of *Avatar: The Last
  Airbender* episode records. `src/components/Selector/index.ts` is
  `export * from "./SidebarSelector"`, so it reached the package root and was
  importable.

  It genuinely shipped — the fixture strings were in `dist/index113.js` and in
  the 7627-byte SSR chunk. That chunk is now 5150 bytes. Its dead CSS
  (`.episode-demo`, `.episode-demo__heading`) went with it.

  The showcase that rendered it had already written down the reason it should
  not exist: "a client that renders it inherits SUI's demo dataset, which is
  never what a client wants." That showcase section is removed too; the section
  above it already demonstrates the same three pieces against the showcase's
  own fixture.

  `EpisodeCard`, `EpisodeSelection` and their types are **kept**. Despite the
  domain-flavoured naming they are a tested, showcased renderer pair the
  showcase describes as packaged — a different question from this one.

### Changed
- `undocumentedExports` tightened 160 → 159 (the removed export was one of
  them).

## 0.143.0

### Added
- **`createStatusFlowChart` — the StatusFlowChart family is reachable from the
  package root for the first time.** `src/index.ts` re-exported exactly one
  thing from that folder: the `StatusFlowNode` **type**. The component, its
  factory and the three layout helpers `COMPONENTS.md` describes as "exposed
  for testing" were all unreachable, so the documented API could not be
  imported one value at a time.

  Same class of bug as the `DailyDateAxis` one fixed in 0.142.0 — a named
  re-export narrower than the family barrel — but type-only, so nothing of the
  value surface arrived at all. Nothing here is breaking; it is a surface that
  was documented but never shipped.

  Now exported: `createStatusFlowChart`, `pickVisibleCols`, `assignColumns`,
  `resolveParentStatuses`, and the types `StatusFlowChartDataProps`,
  `StatusFlowChartOverrides`, `StatusFlowRenderContext`, `StatusFlowColumn`,
  `StatusFlowBreakpoint`, `ColAssignment`.

  The **base component stays unexported**, per the curried-only policy. Its
  config parameter is `Pick<…>` rather than `createSwimlaneChart`'s
  `Partial<Pick<…>>`: seven of these props are required and have no sensible
  library-wide default, because there is no universal status taxonomy. Keeping
  them required makes a variant that cannot lay anything out a compile error
  instead of a blank box at runtime. For the same reason the family ships **no
  pre-baked curried variants** — SUI has nothing to bake.

### Fixed
- **`COMPONENTS.md` no longer advertises `variant`/`size` props on three
  components whose bases are deliberately unexported.** `StatusBadge` (`:138`),
  `AlertBox` (`:824`) and `EmptyState` each had an entry of the form "Key
  props: `variant` …, `size` …" with no mention of a factory or a curried
  variant, sitting in a section whose other entries *are* directly importable.
  A reader had no signal these were different — and #16394 is the evidence that
  consumers acted on it, importing `StatusBadge` and `AlertBox` straight out of
  the manifest.

  Each entry now names the base as unexported, splits data props from the
  overrides baked at definition time, and lists the factory and every curried
  variant. `EmptyState` was the subtlest: the *name* is exported, so no import
  breaks — but it is itself a curried variant, and passing the documented
  `variant` or `size` is a type error.

  Every claim in the rewritten entries is pinned against the compiler, positive
  and negative.

- **The `CashflowChart` bullet named a component that does not exist.** Only
  `WeeklyCashflowChart` is exported; the entry's own example already imported
  that name. Renamed the bullet to match.

### Changed
- `undocumentedExports` tightened 172 → 160. The twelve are the curried
  variants and factories named in the rewritten Badge/Feedback entries.

## 0.142.0

### Fixed
- **`DailyDateAxis`, `dayCellContent` and `dayCellContext` are importable from
  the package root.** They were exported from
  `src/components/DateAxis/index.ts`, shipped in the tarball, and documented in
  `COMPONENTS.md` with a copyable example — but no consumer could import them.

  `src/index.ts` re-exports the DateAxis family by an **explicit list** rather
  than `export *`, because the family's `Cell` type collides with the `Cell`
  table component at the root surface. The explicit list never grew when these
  three were added to the family barrel. Every existing `DailyDateAxis` test
  imported from `./DailyDateAxis`, so the suite was green throughout; the new
  test imports from the root instead.

  Also exported: the `DailyDateAxisProps` and `DayCellContext` types.

### Changed
- **`COMPONENTS.md`'s `ConnectionStatus` example no longer teaches a broken
  import.** It imported the base `Row` — unexported under the curried-only
  policy stated at the top of the same file — and passed `gap="xl"`, which is
  not in the `xs|sm|md|lg` scale. Now uses `LooseWrapRow`, a zero-prop curried
  variant whose documented purpose is exactly this (tile-to-tile spacing on a
  dashboard of widgets).

### Added
- **`brokenDocImports` health metric**, ratcheted at **0**. Counts import
  specifiers in `COMPONENTS.md`'s fenced examples that name something the
  library does not export. Unlike `undocumentedExports` it carries no judgment
  — an example a reader copies either compiles or it does not — so it is
  ratcheted at zero rather than burned down.

  It found the three bugs above on its first run, and it matches on the import
  statement alone: naming a base component in prose is what the manifest is
  *for*, while writing `import { Row }` is a different claim.

### Added
- **`scripts/export-surface.mjs`** — type-level extraction of the public API
  (dside `sui` 16389). Tooling only; nothing about the shipped library changes.

  `collectExportSurface` in `export-usage-report.mjs` resolves the barrel chain
  with regexes and answers *which names* are exported. This answers *what they
  are and what props they take*, via `ts.createProgram` + `getTypeChecker` —
  the semantic half nothing in `scripts/` had. It is an addition, not a
  replacement: the two were cross-checked and agree exactly on the name set
  (1260 names, zero symmetric difference), and that agreement is now pinned by
  test, so the cheap extractor stays trustworthy for name-level work.

  Of the 1260 exports: 533 types, 524 components, 95 factories, 95 functions,
  11 consts, 2 namespaces — nothing unclassified. 2405 component props are
  extracted with their real declared types, literal unions intact.

  Two decisions worth knowing about:

  - **Own props are separated from the inherited DOM surface** by declaration
    site. Unfiltered, `PrimaryButton` reports 474 properties, because Solid
    folds in every HTML button attribute; only 3 are the component's own. This
    also makes currying visible in the types — `variant` and `size` are absent
    from `PrimaryButton` because `createButton` bakes them, so the extracted
    table shows what a caller may actually pass. That is the curried-only
    policy COMPONENTS.md states in prose and cannot enforce.
  - **Components are identified by shape, not arity.** `getCellValue(row,
    column): JSX.Element` and `formatCompactDuration(ms)` both defeat the
    obvious heuristics and would be filed as components with zero props —
    indistinguishable downstream from a real component that has none.

  Downstream of this and landing separately: generated prop tables for
  COMPONENTS.md, and piece 2 of #12565's export-breakage gate. The honest
  doc-coverage metric is the entry below.

### Changed
- **`undocumentedExports` replaces the `undocumentedComponents` health metric**
  (dside `sui` 16389). Tooling only; nothing about the shipped library changes.

  The old metric read **0** for its entire life. It asked whether each of the
  145 `src/components/<Dir>` names appeared anywhere in `COMPONENTS.md`. Two
  problems, and the second is the one that mattered:

  - Directory names are short and generic, so they matched other components'
    prose. 145 of 145 passed while **32 had no section of their own** —
    `PivotGrid`, `FilterBar`, `DatePicker`, `CurrencyInput`, `EditableTitle`
    among them.
  - The granularity was wrong in a way no fix at the directory level reaches.
    619 exported components and factories live in those directories, and adding
    one to a directory already mentioned was **never checked at all** — the
    common case, since a new curried variant lands in an existing family.
    `Chart/` alone exports 40 names against one mention of "Chart".

  Same question, correct subject: does each exported *name* appear in the
  manifest? Measured at `049bb92`: **172 of 619 are named nowhere**, so that is
  the new ceiling (`scripts/health-baseline.json`) and it ratchets down from
  there. A mention anywhere still counts — see `docs/adr/0008` for why the bar
  is deliberately not "has its own section", which would read 384.

  The new metric also stops demanding documentation for components that are not
  public API (`PivotTreemap`, `StatusFlowChart` export nothing today), and
  starts demanding it for `create*` factories, which the manifest's own policy
  tells callers to reach for. `npm run doc-coverage -- --list` prints the
  backlog.

## 0.141.0

### Changed
- **`<Combobox disabled>` now disables the text input, not just the trigger**
  (dside `sui` 12528). Applies to both single and multi mode.

  The dropdown button was disabled while the text field stayed fully editable
  and focusable, carrying no `disabled`, `aria-disabled` or `data-disabled` at
  all — so a disabled combobox still accepted typing, and `onInputChange` still
  fired.

  The cause is a Kobalte contract that is easy to get backwards: `disabled` is a
  **root** prop (it is in Kobalte's `FORM_CONTROL_PROP_NAMES`), and the parts
  derive their rendered state from the FormControl context the root populates.
  Passing `disabled` to `Combobox.Input` or `Combobox.Trigger` directly feeds
  only that part's *interaction guard* — never its attributes. Both components
  were doing exactly that, and `disabled` was split into `local` so the root
  never saw it. It now goes to the root, and the redundant part-level props are
  gone so the next reader doesn't repeat the mistake.

  The input gets native `disabled` **and** `aria-disabled`. That is Kobalte's
  choice rather than ours — both come off the same `formControlContext
  .isDisabled()` in its `ComboboxInput` — which settles the accessibility
  question the ticket raised about `aria-disabled` + `readonly` as an
  alternative.

  A test asserting the old behaviour (`"leaves the text input editable when
  disabled (known gap)"`, added by #84 to pin the defect) is replaced by tests
  for the real contract. Multi mode, which had the identical bug, had no
  disabled coverage at all and now has some.

- **The `usage-manifest` pre-push check warns instead of blocking** (dside
  `sui` 12565). Tooling only; no library code changed.

  It had refused four consecutive unrelated pushes, every one of which went
  through with `--no-verify`. The last block was five **line numbers** moving in
  `thorcasting-ui` because someone added three lines above an import — no export
  was added or removed. A gate that trains you to bypass it is worse than no
  gate.

  It cannot be a gate in this shape for two reasons. It compares against
  consumer **working copies** on whoever's machine is pushing — unpinned,
  possibly mid-feature — so one developer's uncommitted work fails the other's
  unrelated push, and the printed remedy ("regenerate and commit") would commit
  a snapshot of that working tree into this repo.

  More seriously, **it is silent on the change it exists to catch.** `--check`
  compares the committed manifest against a fresh consumer scan; the manifest
  records consumers' imports and never SUI's exports, so deleting an export
  changes neither side. Remove something `thorcasting-ui` imports and the check
  passes. It blocked the noise and permitted the harm.

  `docs/usage-manifest.json` is now explicitly a **report**: regenerate it with
  `npm run usage-manifest` when you want the survey — above all before deleting
  or renaming an export, which is the moment a stale one misleads you. The gate
  worth having asks "does any repo tracking `main` unpinned import a name this
  push no longer exports?" Designed and filed on dside `sui` 12565.

  **Correction to the sentence that stood here:** this entry claimed the gate
  "needs SUI's own export surface — the tool does not compute it today". That
  was wrong. `scripts/export-usage-report.mjs` has computed it all along; see
  the fix below. What is still genuinely missing is each consumer's declared
  dependency **range**, which is what scopes the check to repos tracking `main`
  unpinned rather than pinned to an old version.

### Fixed
- **`export-usage-report` missed namespace re-exports, and half the consumers**
  (dside `sui` 12565). Tooling only; no library code changed.

  Two independent defects in `scripts/export-usage-report.mjs`.

  It matched `export * from "./x"` but not **`export * as ns from "./x"`**, so
  `fn` and `fields` (`src/index.ts:78` and `:81`) were absent from the computed
  surface. The visible consequence was a false alarm pointing at an innocent
  consumer: `jtf-ui`'s legitimate `import { fields }` was the report's only
  BROKEN import, and it was an artifact of the extractor. The namespace alias is
  now added without recursing into the module, because its members are reachable
  only as `ns.Member` — hoisting them would trade a false broken-import for a
  false clean one.

  Separately it discovered consumers itself, walking `resolve(repoRoot, "..",
  "..")` to depth 3. That reaches `<ws>/dside/dside-ui` but stops one level short
  of `<ws>/rhinotools/netsuite_extract_rs/ui`, so it reported **4 consumers where
  `usage-manifest` finds 7** — the same machine-layout assumption 12565 was filed
  about, surviving untouched in a second script. Discovery is now imported from
  `usage-manifest.mjs` (`discoverRepos`, `WORKSPACE_ROOT`) rather than
  reimplemented, so the two tools cannot disagree about who consumes SUI again.

  Finding the missing three surfaced **three real broken imports**, all in
  `migration-dashboard` (`netsuite_extract_rs/ui`), which tracks `main` unpinned
  via `github:primestageprime/solid-ui-components`: `StatusBadge` (3 sites),
  `HUDPanel` (2), `AlertBox` (1). None is an extractor artifact — `StatusBadge`
  and `AlertBox` are bases their own barrels mark "intentionally NOT exported"
  (use `createStatusBadge` / `createAlertBox`), and `HUDPanel` was removed from
  the package root in 0.54.0. Reported, not fixed: the repair belongs in that
  repo.

  `scripts/export-usage-report.test.ts` is new and covers both re-export forms,
  renames, the type/value split, and cycle termination.

## 0.140.0

### Added
- **`ThemedNumberInput` takes a `size` prop** (`"sm" | "md"`, default `"md"` —
  nothing existing moves). dside `sui`#12583.

  It was the one control in the family that rendered at exactly one size:
  `Button` has `--sm`, `Toggle` has `size="sm"`, `Dropdown` has `size="sm"`, but
  a number input was fixed at 43px by a hardcoded `padding: 12px`, so it became
  the tallest thing in any dense row and set that row's height. Thorcasting's
  chart pages hit this — the strip above the chart measures 29px on six pages
  and 43px on the two carrying a `YAxisControl`, dropping the chart 14px on
  exactly the pages with no reason to differ.

  `sm` is pinned to **29px** to match `Button --sm`: 1px border + 5px padding +
  a 17px line box + 5px padding + 1px border, with the line box stated rather
  than inherited from the UA's `normal` so a theme's font metrics cannot drift
  a toolbar row. The stepper triggers drop from a 28px to a 20px floor, since
  two stacked triggers sharing 27px of inner height would otherwise be wider
  than they are tall.

  The size modifier is now always emitted (`sui-number-input--md` as well as
  `--sm`), matching `Button` and `Dropdown`, so a theme can hook either size
  without keying off the absence of a class.

  This unblocks removing thorcasting-ui's `.yaxis-control
  .sui-number-input__input` override in `src/app.css`, which reaches into SUI's
  internal class names. It is also the prerequisite for #12296 (porting
  `YAxisControl` into SUI): a 43px number input is why the composed control
  could not sit in a toolbar either.

## 0.139.0

The first four entries had been sitting on `main` unpublished since 0.138.0:
`package.json` still named a version the registry already had, so each of their
publish runs correctly found nothing to do. All four are tooling-only, which is
why it went unnoticed. This release carries the version bump that ships them.

### Added
- **`componentsNeverExecuted` — a measured answer to "which components are
  dark?"** (dside `sui`#12541). Tooling only; no library code changed. New gate
  in the **`test`** CI job, baseline `scripts/execution-baseline.json` at **17**
  (19 when it landed; the Removed entry below took two more out).

  `componentsNeverRendered` is static, and a static rule cannot answer whether
  code runs. The obvious extension — count a module as covered when a mounted
  parent renders it — was measured against a real coverage run **before** being
  written, and it was wrong in both directions on the first list it produced:
  it would have cleared `TimeInputs` (0 of 7 functions ever called — it sits
  behind a condition inside a Popover the tests open but never satisfy) and kept
  `Section` (18 of 23) and `StaticSplitLayout` (21 of 25). Reachability in the
  JSX is not execution. So this metric is measured, not inferred.

  The two are **companions, not replacements**, and disagree on purpose: the
  static one asks *does a suite own this module*, the new one asks *is it dark*.
  `Chart/Crosshair` runs on every `ThroughputChart` test but owns no suite; only
  `TimeInputs` is dark. Of the 37 modules with no owning suite, **18 execute
  anyway and 19 do not** — and two of the 19 (`VirtualTable`, `GroupedTable`)
  are deleted in the Removed entry below, which is why the baseline lands at 17.

  It reads **function** coverage, never lines: v8 attributes module
  initialisation to the file, so `GroupedTable` — zero call sites in this repo
  or any consumer — still showed 1.8% of lines against 0 of 22 functions when
  it was measured on 2026-08-04, days before its deletion. The
  floor is exactly zero rather than a percentage, for the same reason the older
  metric's is: any other number re-opens a "how much is enough" argument the
  ratchet deliberately refuses.

  Cost, measured rather than estimated: the `test` job gains `--coverage`
  (+8% wall locally, +19% CPU; ~+20s on a 2-core runner) and does not become the
  critical path. It cannot live in `health` — that job is a fast static pass and
  must not spawn the suite.

### Fixed
- **`componentsNeverRendered` could not see the Curried Variant pattern**
  (dside `sui`#12541). Tooling only; no library code changed. Ceiling **44 → 37**.

  A Primitive that ships a Factory exports no component value at all — the name
  a test writes as JSX is born next door in `variants.ts`, where the Factory is
  called with Override Props locked in. The rule matched JSX against names the
  *module itself* exported, so `<ActionList>` never matched `createActionList`
  and `ActionList.tsx` read as never rendered. It has **555 lines of tests that
  mount it thirty-odd times**, and it was the top recommendation on the
  burn-down ranking — the second time in two days this metric was about to send
  someone to write tests that already existed (see 0.137.0's generic-JSX fix).
  Seven modules were cleared: `ActionList`, `AnimatedSwimlaneChart`,
  `ChartCanvas`, `AlertBox`, `FileDropZone`, `MessageBubble`, `ThreadGroup`.

  Two adjacent holes closed with it. A module exporting **only** Factories
  matched no PascalCase value and was `skipped` — dropped from the metric in
  both directions, which is exactly the escape hatch the header claims is shut;
  `FormulaDecomposition.tsx` had been sitting in it. And a Factory is as often
  curried **inside a test** (`const Result = createFormulaResult(cfg)`) as in
  `variants.ts`, so both now count.

  Attribution stayed narrow rather than folder-wide: the alias must come from a
  call to something imported through a relative specifier resolving to that
  module, the test must still *see* the module, and a variant one test curries
  for itself vouches for no other test. `Modal/variants.ts` curries two
  factories from two modules, and `ConfirmationModal.tsx` correctly stays on
  the list — nothing mounts any of its four variants. No module was newly
  accused; the change is strictly a false-positive removal.
- **The `usage-manifest` pre-push gate was inert on any machine but the one
  that wrote it** (dside `sui`#12565). Tooling only; no library code changed.

  `scripts/usage-manifest.config.json` held a map of name → **absolute path**,
  all of them under one developer's home directory. Everywhere else each path
  resolved `missing`, an all-missing branch fired, and `--check` returned
  having compared nothing — printing a line that reads like a routine skip.

  A local path override alone would not have fixed it: the emitted manifest
  recorded each repo's absolute `root`, so `--check`'s comparison against the
  committed file could never pass on a second machine even with correct paths.
  Both halves are gone.

  Consumers are now **discovered**: walk the parent of this checkout to depth 3
  and take every `package.json` declaring a SUI specifier in a dependency map.
  That survives both layouts in use (`<ws>/dside/dside-ui` and
  `<ws>/dside-workspace/dside-ui`) with nobody editing paths for anyone else.
  `SUI_WORKSPACE_ROOT` overrides where it looks.

  It also **found three consumers the hand-written list never had** —
  `taskmaster-v2-ui`, `rth-repair-portal-frontend`, and `migration-dashboard`
  (`netsuite_extract_rs/ui`), the last being the only `SelectableTable` caller
  in existence and the site of the silent-prop bug fixed in 0.137.0. The tool
  built to survey consumers could not see the consumer whose bug prompted the
  survey. Two of the three install via `github:`, tracking `main` with no
  version gate, which makes them the most important to watch, not the least.

  Repos are keyed by `package.json` `name` rather than directory, since three
  of them live in a directory called `ui` or `frontend`. Regeneration
  **merges**: a machine rewrites only the entries it can see and carries the
  rest forward, so neither developer's push deletes the other's repos.
  `--prune` is the deliberate way to drop a dead one. Discovery, merge and
  naming are covered by 27 new cases.

- **`componentsNeverRendered` counted two well-tested components as untested.**
  `mountsAny` required a delimiter after the tag name — `\s`, `/`, `>` or `.` —
  which is what stops `<WidgetPanel>` vouching for `Widget`. It omitted `<`, so
  a mount carrying an explicit type argument matched nothing at all. Solid
  components are generic functions and a test that pins a row shape writes the
  parameter out, so `<BucketQueue<Item> …>` and
  `<SplitQueueList<Row> …>` both read as *never rendered*.

  `BucketQueue` has **five** test files mounting it. Both components sat at the
  top of the risk ranking for the burn-down (dside `sui`#12541), so the metric
  was about to send someone to write tests that already existed — the precise
  failure mode `componentsNeverRendered` was introduced to end, since it
  replaced `foldersWithoutTests` for reading a permanent false `0`.

  The fix widens the delimiter class rather than loosening the match, so the
  `<WidgetPanel>` guard still holds; three cases pin the generic forms. The
  ceiling drops **46 → 44**, which is a measurement correction and not two
  components' worth of new coverage — no test was written for either.

### Removed
- **`VirtualTable` and `GroupedTable` are gone** (dside `sui`#12546), together
  with `VirtualTableProps`, `GroupedRow` and `RowspanColumn`. This is a
  **breaking change to the public export surface**, and the second half of the
  two-stage removal: 0.138.0 below is the warning release, which shipped the
  deprecation on its own before this break. See that entry for the survey
  behind it — zero JSX call sites and zero named imports across all seven
  SUI-dependent repos and an org-wide GitHub code search. Two later checks
  agreed: `docs/usage-manifest.json` names neither component anywhere, and the
  only call site left in this repo was a gallery section.

  Removed with them: the `@tanstack/solid-virtual` **dependency** (its only
  importer was `VirtualTable`), the `.sui-virtual-table__*` and
  `.hud-grouped-table__*` rules in `Table.css`, both gallery sections, both
  `COMPONENTS.md` entries, and the exemptions each carried in
  `scripts/style-rubric.json` and `prop-rubric.mjs` — a component's exemptions
  outliving the component is how a rubric quietly stops meaning anything. The
  `TableQuickFilter` gallery section now renders its filtered rows through
  `BaseTable`, which is what a caller should have been copying all along.

  Four ceilings drop as a consequence, not as separate work: `cssTypedProps`
  **12 → 10**, `inlineStyleSrc` **70 → 65**, `componentsNeverRendered`
  **37 → 35**, `componentsNeverExecuted` **19 → 17**. Deleting dead code is the
  only honest way a coverage ratchet ever falls without a test being written,
  and it is worth saying plainly that no test was written here. The dark-module
  backlog is **unchanged at 17** — these two were already discounted from it.

## 0.138.0

Published 2026-08-05 from commit `9ba00dd`. The version bump rode along with
the FilterBar fix below rather than a `chore: release` commit, so this section
was written after the fact — the package was already on the registry.

### Deprecated
- **`VirtualTable` and `GroupedTable` are scheduled for removal** (dside
  `sui`#12546). Both still work and still ship; using either now raises an
  editor/compiler deprecation warning. Removal lands in a later release, so
  there is a version in between that warns rather than breaks.

  **Neither has a single caller.** Surveyed 2026-08-04 across all seven repos
  depending on SUI (`jtf-ui`, `taskmaster-stdb-v2/ui`, `amygdala-ui`,
  `dside-ui`, `netsuite_extract_rs/ui`, `rth_repair_portal/frontend`,
  `thorcasting-ui`) and again via a GitHub code search over the whole
  `primestageprime` org: zero JSX call sites, zero named imports. For scale,
  the same survey counted 72 `FieldTable`/`SortableFieldTable` call sites and
  55 `BaseTable`. The only trace of `VirtualTable` outside this repo is a stale
  comment in `netsuite_extract_rs`'s dashboard sitting above code that now
  renders a `SelectableTable` — that migration already happened.

  **The two are deprecated for different reasons, and the distinction matters
  if either is ever revived.** `GroupedTable` is a clean component: it declares
  its own nine props rather than extending `BaseTableProps`, so it never made a
  promise it could not keep — it is the pattern `SelectableTable` was just
  fixed to follow. It is going solely because nobody uses it, and a single
  caller speaking up on #12546 is enough to un-deprecate it as-is.

  `VirtualTable` is not in that position. `VirtualTableProps<T> =
  BaseTableProps<T>` told the compiler its interface was `BaseTable`'s, and its
  docstring opened "Same API as BaseTable". Both were false: it renders its own
  `sui-virtual-table__*` class namespace with padding, font-size,
  text-transform, letter-spacing and colour set **inline per cell** instead of
  from the shared `Table.css`, so substituting one for the other visibly
  changes the table; and it ignores four of the props it declares (`spanRow`,
  `rowActions`, `fixedLayout`, `fit`), which land in `others` and get spread
  onto a `div` — the same silent-prop bug fixed in `SelectableTable` in 0.137.0,
  never fixed here. If virtualisation is wanted again, build it as an opt-in
  capability of `BaseTable` rather than reviving a second table implementation.

  This is also what settled the architecture review's proposal to fold
  selection, grouping and virtualisation into `BaseTable` as opt-in
  capabilities. Its headline benefit was making "grouped + selectable"
  expressible — and grouping has never had a caller, so the merge would have
  rewritten three renderers to enable a combination nobody has asked for.

### Fixed
- **`FilterBar`: a freshly-picked dimension could never be filled in from the
  UI.** The `(+)` menu synthesises a pending group for a dimension that has no
  term yet, and `renderGroups()` hardcoded `members: []` for it — so the
  popover always read "no matches", and a filter could only ever be started
  through a side channel such as a URL param.

  Additive: an `availableDimensions` entry may now carry an optional `members`
  list, used for the pending-group synthesis when present and falling back to
  the empty list otherwise. No existing caller changes behaviour.

  Found while porting `jtf-rth`s reports off `goose-ui`s `ReportFilterBar`,
  which inherited the same bug from goose — the gap was always in `FilterBar`,
  not in any one consumer.

## 0.137.0

### Added
- **`CashflowScrubChart` — `layer` on a `balanceSeries` entry, so a coincident
  overlay can paint ABOVE the primary balance line.**

  ```tsx
  balanceSeries={[
    { id: "range-hi", balanceCents: hi },                    // "under" (default)
    { id: "comparison", balanceCents: comp, layer: "over" }, // above the primary
  ]}
  ```

  SVG has no `z-index` — paint order is document order — and every overlay
  series was rendered before the primary polyline, unconditionally. A dashed
  scenario tracking the primary line exactly was therefore covered
  pixel-for-pixel: reproduced in thorcasting-ui with both polylines carrying
  BYTE-IDENTICAL 365-point strings, the chart reading as a single line. No
  consumer-side fix existed — CSS cannot reorder SVG painting, and the
  workaround (swap which line is "primary" via `balanceLineCells`) drags the
  selected/hover/marker dots onto the overlay and loses `buildLineSegments`
  null-gap breaking, since the primary line's `points` joins across holes.

  - **Ordering is per-series, not a chart-level flag**, because the motivating
    chart wants both at once: a range cone `"under"` and a comparison line
    `"over"` in the same plot. A single boolean cannot say that.
  - **Array order still decides z-order *within* each layer** — `layer` only
    picks which side of the primary line a series sorts onto. Both layers
    stay inside the same clip group, so nothing about clipping changes.
  - **Default is `"under"`**, so every existing chart paints exactly as before.
  - **Stroke width is now the thing to watch, not order.** SUI still defaults
    series to 1.4 against the primary's 1.6; `"over"` inverts who wins an
    overlap, so a series at or above the primary's width will cover it
    completely. The new showcase uses 1.2 on purpose — the solid line reads on
    both sides of the dashes, which is the point of putting it on top at all.

  Deviation bands are untouched: they stay at the very back regardless of
  their series' `layer`, since an area fill has no business over the lines.
- **A shared DOM test harness — `src/test-utils/`** (`fakeSizer`, `fakeRects`,
  `pointer`, `drag`, plus the existing `domStructure`, behind one barrel).
  Test-only; no production source changed and no public API moved.

  jsdom ships no `ResizeObserver`, no `matchMedia`, no `PointerEvent`, no
  pointer-capture methods, no `DataTransfer`, and performs no layout. Every
  test file worked around that privately: **16** carried a `ResizeObserver`
  fake in **four incompatible shapes** (silent no-op / fire-on-observe /
  recorder with a static registry / externally-triggerable), 8 spied on
  `getBoundingClientRect` with 5 independent layout models, 5 copied the same
  `makeDataTransfer` + `fireDrag` + `flush` trio verbatim, and 3 wrote their
  own `firePointer` with mutually incompatible `pointerId` / `clientY`
  conventions. A fix to any one never reached the others.

  - **`observeSize.ts:90` is the only `new ResizeObserver` in the library**, so
    one double at that global covers every measuring component.
  - **`resize()` is awaitable.** `observeSize` defers its callback out of the
    observer dispatch through rAF; the promise resolves once that frame and
    Solid's flush have run, so a caller awaits once and asserts without
    knowing the deferral exists. Its change-guard is real too — resizing twice
    to the same rounded size delivers once.
  - **`installRects` shares the installation, not the geometry.** The spy,
    the delegate-to-original fallback and the restore dedupe; the policy stays
    a parameter (`verticalRows` static and keyed by `data-dnd-id`, `liveFlow`
    reflow-aware and keyed by DOM order) because those two models are
    genuinely different and collapsing them would make the model the thing
    needing its own tests.
  - **`matchMedia` gets a `matches: false` default in `test-setup.ts`;
    `ResizeObserver` deliberately does not.** All three `matchMedia` call
    sites guard on `typeof`, so the default is behaviour-identical while
    making the reduced-motion branch reachable at all. A default
    `ResizeObserver` would not be: 25 test files render a measuring component
    without stubbing anything, and delivering `{width: 0, height: 0}` would
    flip `OverflowNav`, `FilterBar`, `ResponsiveMoney` and `SwimlaneChart`
    into their collapsed branches mid-suite.
  - `src/internal/dom/observeSize.test.ts` keeps its own lower-level double on
    purpose — its subject *is* the scheduling the shared sizer hides.

  Harness code is written function-first with hand-rolled save/restore rather
  than `vi.spyOn`, because `src/test-utils/` is **not** excluded from
  `scripts/health.mjs` (it skips only `.test.` files) and because keeping
  vitest out of the module keeps it out of the published
  `dist/test-utils/*.d.ts`. `dotChains` and `collectionMethodCalls` are
  unchanged at 7 / 31.

- **First test coverage for two previously-unreachable areas.** +54 tests.
  - `SwimlaneChart` responsive collapse (`helpers.test.ts` 19,
    `SwimlaneChart.responsive.test.tsx` 9). The entire container-width-driven
    collapse path had never executed under test — `SwimlaneChart.test.tsx`
    mounts every case with `responsiveCollapse={false}` and says so in its own
    header. Thresholds are derived from `widthForDepth` rather than guessed.
    Also documents a non-obvious transient: a node that re-enters while its
    outgoing copy is still animating renders twice until `NODE_LEAVE_MS`
    elapses, by design.
  - `Combobox` (`Combobox.render.test.tsx`, 21). The component had **zero**
    `render()` calls against 589 lines; the emphasis is the backspace wiring,
    where `computeBackspaceAction` was exhaustively unit-tested but its
    integration never was.

- **Render coverage for the untested Layout primitives** (`Grid.test.tsx` 13,
  `AutoStack.test.tsx` 14, `Sidebar.test.tsx` 23). `Sidebar` is the substantial
  one — 170 lines of width signal, localStorage round-trip and three resize
  paths, none of it previously executed. The mirrored direction for a
  left-edge handle is now pinned on both the pointer and keyboard paths (two
  independent sign flips that have to agree). `Grid` and `AutoStackRow` each
  pin a sharp edge worth knowing about: passing `style` as a **string** rather
  than an object replaces the computed base, silently discarding
  `grid-template-columns` / `--auto-stack-break` with no warning.

- **First test coverage for `SelectableTable`** (`SelectableTable.test.tsx`, 35
  tests). 295 lines, seven reactive primitives and six handlers, never mounted
  by any test — the highest-logic-density entry in the
  `componentsNeverRendered` backlog. Ratchet 47 → 46.

  Selection is driven through the checkbox **label's `mousedown`**, not the
  input's `change`: the component calls `preventDefault()` there so it can read
  `shiftKey` and own the toggle, leaving `onChange` an empty function. A test
  firing `change` would assert nothing and pass.

  Two narrow rules are pinned as-is rather than as they arguably "should" be,
  since changing either is a behaviour change to a public component: shift-click
  only **adds** a range (it never clears one), and select-all / indeterminate
  consider only the **currently rendered** rows, so a selection made before a
  filter narrowed `data` survives — which is why `toggleAll` deletes ids
  individually instead of assigning a fresh `Set`. `Clear` is deliberately the
  opposite and drops everything.

  Verified by mutation: five changes to the selection logic (empty-table
  select-all guard, the indeterminate bound, deselect-all wiping off-screen
  ids, the row-click checkbox guard, shift-range add→delete) each fail between
  one and four tests.

### Removed
- **Dead shift-tracking listeners in `SelectableTable`.** A document-level
  `keydown`/`keyup` pair, one per mounted table, maintained a `_shiftHeld` flag
  that nothing read — shift-select takes `shiftKey` off the mousedown event.
  No behaviour change; surfaced while writing the coverage above.

### Changed
- **`SelectableTableProps` no longer declares six props its renderer cannot
  honour** — `fill`, `fixedLayout`, `fit`, `spanRow`, `rowActions` and
  `onRowHover` are `Omit`ted from the inherited `BaseTableProps`. Passing one
  is now a type error rather than a silent no-op. **Potentially breaking**, but
  every break it produces is a call site that was already doing nothing; no
  consumer surveyed passes any of the six.

  These were split from the four that were merely *unwired* (see Fixed) on
  cost, not on convenience. `fixedLayout` and `fit` are one-line class toggles,
  but `fixedLayout` only truncates when the cells also clip, and this renderer
  sets no `overflow`/`text-overflow`/`white-space` from `column.width` or
  `column.ellipsis` the way `BaseTable`'s `cellStyle` does — the class alone
  would look implemented and do nothing visible. `fill` needs the frame *and*
  the action-bar column to become flex-fill contexts, which jsdom cannot verify
  at all. Add one back by implementing it and removing it from
  `SelectableTableOmitted`, never by widening the type.

- **The health ratchet now fails on a metric with no ceiling recorded.**
  `classify()` skipped any metric whose baseline was `undefined` — "it has no
  ceiling to compare against" — and `health.mjs` then printed *"✓ No
  regressions, and every ceiling is tight"*. Observed live while adding
  `componentsNeverRendered`: it computed 50, enforced nothing, and the run
  congratulated itself. It was only harmless because the same change ran
  `--update-baseline` immediately after.

  This is the failure the ratchet already refuses in the other direction — an
  unrecorded gain leaks back with CI green throughout; a metric with no ceiling
  never catches anything with CI green throughout. `classify()` returns them as
  `unbaselined`, the report marks them `✗ NO CEILING (enforcing nothing)`
  instead of `(no baseline)`, and they fail alongside unrecorded improvements
  under one message with one remedy. A recorded `0` is still the tightest
  ceiling there is and is unaffected. (dside `sui` #12542)

- **`foldersWithoutTests` is replaced by `componentsNeverRendered`**
  (`scripts/render-coverage.mjs`, surfaced by `npm run render-coverage`). The
  old metric read 0 across all 145 component folders and always had: a folder
  passed on the mere presence of a file containing `.test.`, whatever that file
  tested. `Combobox` satisfied it with 589 lines of component, zero `render()`
  calls and a real defect (#12528) behind the green.

  The replacement asks whether some test both **sees** a component module — a
  relative import resolving to it, or to a barrel that re-exports it — **and
  mounts** it, as the JSX tag of a PascalCase value it exports. Both halves are
  load-bearing and are pinned by mutation in `render-coverage.test.ts`: drop
  "must mount" and Combobox passes again (it imported a type); drop "must see"
  and `Layout/Grid`'s tests vouch for `Chart/Grid`, a different component that
  happens to share a name.

  Ratcheted at **47** (50 at introduction, less the three Layout primitives
  above). "Mounted once" is a floor, not coverage — depth is not mechanical and
  does not belong in a ratchet — but it is the question the old metric only
  pretended to answer. Backlog: dside `sui` #12541.

### Fixed
- **`SelectableTable` honours `emptyMessage`, `compact`, `hoverable` and
  `striped`, which it had silently discarded** (dside `sui` #12547). It gains
  the empty state it never had: with zero rows it now replaces the table with
  `.hud-table__empty` carrying the caller's message, falling back to
  `BaseTable`'s "No data available".

  `SelectableTableProps` extended `BaseTableProps` wholesale while `splitProps`
  listed only the eleven props the renderer read. The rest fell into `others`
  and Solid spread them onto the frame `div` — a clean typecheck, a stray DOM
  attribute, and no behaviour. This was live: `netsuite_extract_rs`'s dashboard
  passes `compact`, `hoverable` and
  `emptyMessage="No tables match the current filters."` over filtered data, so
  filtering to zero rows showed a bare header and the sentence explaining why
  never rendered.

  **Behaviour change — `stickyHeader` now defaults ON**, matching `BaseTable`
  and the doc comment the two share. It read `if (local.stickyHeader)` here
  against `!== false` there: one prop, one type, one doc, opposite defaults.
  Pass `stickyHeader={false}` to opt out. The only known consumer call site
  passes it explicitly and is unaffected.

- **`Combobox.test.tsx`'s header no longer claims jsdom is broken repo-wide.**
  It cited an `html-encoding-sniffer` / `ERR_REQUIRE_ESM` failure as the reason
  the component had no render coverage. That no longer reproduces (verified
  2026-08-04); the stale note was actively discouraging the tests the component
  needed. The file stays pinned to the node environment only because its own
  scope is genuinely DOM-free.

### Known
- **`<Combobox disabled>` still accepts typing** (dside `sui` #12528). The
  trigger is correctly disabled (`disabled`, `data-disabled`, listbox will not
  open); the text input is not, and carries no `disabled` / `aria-disabled` /
  `data-disabled`. `ComboboxSingle.tsx:130` passes `disabled` straight to
  Kobalte's `Input`, but Kobalte's root owns that prop and propagates through
  context — and `disabled` is split into `local` at `Combobox.tsx:100`, so the
  root never receives it. Left unfixed here: it is a behaviour change to a
  public component and wants a deliberate a11y call (Kobalte may keep a
  combobox input focusable on purpose, making `aria-disabled` + readonly the
  right target). Pinned by a clearly-labelled test that goes red when fixed.

## 0.136.0

### Added
- **`NestedList` / `NestedListItem` — the library's hierarchical-indent Layout
  Primitive** (`src/components/Layout/NestedList.tsx`, owns `NestedList.css`).
  Purely additive; nothing else changed shape.

  There was no component expressing "this row is one level deeper than that
  row", so consumers invented one. dside's Work Inspector reached for `GrowBox`
  per child row — but `GrowBox` is `flex: 1 1 0%`, and as a direct child of a
  COLUMN flex container that is *vertical* growth: every row stretched to
  190.6px around 52px of content and read as gaps between the cards.
  `.sui-nested-list__item` is `flex: 0 0 auto` precisely so that cannot recur.

  - **Recursive by construction.** Depth comes from a Solid context the item
    provides to its own `subtree` slot, so a recursive render function is just
    the component wrapping itself — no `level` integer threaded through call
    sites. An explicit 1-based `level` (the literal `aria-level` value)
    **re-seeds** the context, which is what a virtualised list rendering row
    4000 without its ancestors mounted needs. Level 1 = zero indent.
  - **`role="list"` / `role="listitem"` + `aria-level`, deliberately NOT
    `role="tree"`.** WAI-ARIA 1.2 lists `aria-level`/`aria-posinset`/
    `aria-setsize` among `listitem`'s supported properties (nested lists are
    their canonical use), so AT gets exact depth. `tree` carries the same
    attributes but owes the full keyboard contract — roving tabindex, arrow
    navigation, Home/End, typeahead, expand/collapse — and a Layout Primitive
    that indents arbitrary children owns neither focus nor selection, so
    claiming the role would promise navigation that does not exist.
    `aria-expanded` is **not** emitted: it is unsupported on `listitem` and
    belongs on the consumer's own twisty `<button>`. `setSize`/`posInSet` are
    emitted only when supplied — with a complete DOM the AT computes them.
  - **12px step** (`--sui-space-3`) plus a **1px `--sui-border` guide rail per
    ancestor**. Because AT reads depth off `aria-level`, the pixels only have
    to disambiguate depth for sighted users, and the rails — not the
    whitespace — carry that signal. 12px is the smallest 4px-grid step that is
    1.5x the `sm` (8px) sibling gap (so a level shift can never be misread as
    a gap) and it halves `ThreadGroup`'s 24px cost: depth 8 is 96px, not 192px,
    which is what matters in a ~380px side rail. Depth reads as geometry
    (offset + rail count), never colour alone, and both tokens are defined by
    every shipped theme.
  - **Degrades past 8 levels rather than breaking.** Visual indent caps at
    `NESTED_LIST_MAX_INDENT_STEPS` (8 = 96px) so a depth-30 node keeps its full
    content width; the row gains `data-capped="true"` and a **dashed** vertical
    rule at the content edge (a dash pattern, not a hue), and `aria-level`
    keeps counting exactly. Levels below 1 clamp to 1 rather than emitting a
    dead modifier class — `assertModifierClass` guards the indent classes, all
    nine of which exist in CSS by construction.
  - **No Override Props, so no factory and no curried variants** — every prop
    is per-instance data. These ship as no-config shells like `AutoStackRow`
    and `ProportionalStack`.

  **The three existing insets are deliberately NOT re-expressed on it**
  (noted in `ThreadGroup.tsx`, `GhostRow.tsx` and `COMPONENTS.md`):
  `ThreadGroup`'s `depth x 24px`, `IndentedGhostRow`'s one-step inset and
  `Section`'s `indent` are *visual* insets that convey nothing to assistive
  tech, whereas this is a *semantic hierarchy* primitive. Rebasing
  `ThreadGroup` would mean either widening `NestedList` with a configurable
  step to fit one legacy consumer (Rule Zero forbids widening an API to
  accommodate an existing call site) or adopting the 12px step, which silently
  changes every shipped `ConversationTree` render — neither is non-breaking.
  New hierarchies use `NestedList`; a fourth mechanism is not to be added.

  Showcase: `dev/showcases/nested-list.tsx` (gallery → NestedList), covering
  the recursive form, the flat/virtualised `level` override and a 14-level
  chain through the cap.

## 0.135.0

### Fixed
- **`HighlightSegments.onHover` now agrees with the band's own hover state.**
  The visual hover was moved onto `ctx.hoverX()` — deliberately, because
  sibling slots (PointSeries dots, the crosshair dot, PinMarkers chevrons)
  intermittently capture pointer events and fire a spurious `pointerleave` on
  the segment rect. `onHover` was left wired to that same unreliable
  `onPointerEnter`/`onPointerLeave` pair, so the two halves reported different
  things: the band stayed painted as hovered while the callback had already
  said `null`. A consumer rendering detail for the hovered segment lost it
  under a band that still looked hovered. Both now derive from the one memo.

  Caught by amygdala-ui's `DotChart`, whose merged hover tooltip went blank
  over an outlined alarm band.

### Changed
- **`HighlightSegments.onHover` no longer receives a `PointerEvent`.** Its
  signature is `(segment: T | null) => void`. There is no event to pass —
  the callback is derived from the chart's cursor position, not from a DOM
  pointer event. `onClick`, `PinMarkers.onHover` and `TimelineBar.onBarHover`
  are unchanged and still carry theirs. A caller using the second argument
  gets a compile error rather than a silent `undefined`; read viewport
  coordinates from your own listener on the chart container instead.

## 0.134.0

### Added
- **`ChartTooltip` can wrap, and now stays inside the chart.** Two new props,
  both opt-in, so every existing tooltip renders exactly as before:

  - `maxWidth` — caps the tooltip's width and lets its content wrap onto
    several lines. Without it the tooltip stays the single `nowrap` line
    `CompletionTimeline` and `ThroughputChart` are built around.
  - `fallback` — content for when `data` is empty and there is no point to
    describe, anchored to the hovered x itself. A chart can hold hoverable
    annotations (alarm bands, timeline bars) that outlive its series, and
    those still need to explain themselves when the series is empty.

  Horizontal placement is now clamped, mirroring the y-clamp that was already
  there: the tooltip prefers to sit right of its anchor, flips to the left of
  it rather than overflow the chart's right edge, and pins to the left edge
  when it is wider than the chart itself. This was a latent bug — `px()` had no
  clamp at all — that `nowrap` hid by keeping tooltips narrow, so it had to
  land with `maxWidth` rather than after it.

  The gap this closes: a consumer whose chart carries its own hover detail had
  no way to put that detail in our tooltip, so it rendered a second popup
  beside ours with its own coordinate system. The two drifted apart with page
  position and cursor-to-datum distance. dside #12494.

## 0.133.0

### Added
- **`Dropdown` items can carry a shape, not just a colour.** `DropdownItem`
  gains `shape?: Shape` — the same union the charts use. With `color`, the item
  renders that shape as its indicator instead of the plain dot, in the trigger
  and the menu alike. `color` on its own still renders today's dot, so nothing
  existing changes.

  The gap this closes: some identities are deliberately double-coded, colour
  *and* shape, so they stay distinguishable at 8px, under colour-blindness, and
  in a greyscale screenshot. A colour dot alone throws away the half of that
  encoding which survives those conditions.

  This also retires a consumer workaround: wanting the shape in the trigger
  previously meant drawing your own glyph beside the dropdown and hiding ours
  with CSS reaching into `.sui-dropdown__trigger .sui-dropdown__dot` — coupling
  to internal class names that only worked because trigger dots and item dots
  happen to sit under different parents.

  Reported by thorcasting-ui; dside #12483.

## 0.132.1

### Fixed
- **DateAxis stops mistaking its own smooth scroll for the user's.** Clicking
  the `ScrubChart` while the ribbon was still gliding moved the selection but
  left the window band frozen — intermittently, and most often on the click
  right after a big jump.

  `DateAxis` recentres on `selected`, guarded by a 250 ms window that yields to
  a user who is actively panning (`USER_SCROLL_GRACE_MS`). It flags its own
  programmatic scroll so those frames don't count as user input — but it ended
  that flag by *guessing* when the animation was over, and both guesses fired
  while frames were still arriving:

  | guess | why it was wrong |
  |---|---|
  | viewport reached the target (`\|scrollLeft − target\| <= 1`) | a smooth scroll keeps emitting sub-pixel settling frames after it arrives |
  | 800 ms elapsed (`MAX_PROGRAMMATIC_SCROLL_MS`) | a long jump (~4,900 px measured) animates for longer than that |

  Every frame landing after the flag cleared stamped `lastUserScrollAt`, so the
  axis armed the grace window against itself and silently refused the *next*
  recentre.

  A programmatic scroll now ends when its frames **stop arriving**: each one
  restarts a 150 ms inactivity countdown (`PROGRAMMATIC_SETTLE_MS`), which
  covers a glide of any length plus its settling tail.
  `MAX_PROGRAMMATIC_SCROLL_MS` survives only as a 2,500 ms backstop against a
  stuck flag. No public API change.

## 0.132.0

### Fixed
- **SSR consumers stop shipping the whole library.** The client build has been
  tree-shakeable since ADR 0005, but `dist/server.js` — what `exports["."].node`
  resolves to, and therefore what every SolidStart/SSR consumer imports — was
  left as a single 1,305,549-byte bundle. It reproduced the exact defect that
  ADR describes.

  | SSR consumer importing one `DefaultButton` | |
  |---|---|
  | before | 129,330 B |
  | after | **953 B** |

  It went unnoticed because Rollup *did* shake the bundle from 1.3 MB to 129 KB,
  which looks like tree-shaking working. What it could not remove was inlined
  Kobalte popper/tooltip machinery (plus `@floating-ui/dom`) in a bundle whose
  only component was a plain button, and bare `import "d3-dag"; import "katex";`
  statements surviving with no bound identifier.

  **Consumer-visible change:** the `"node"` export target moved from
  `./dist/server.js` to `./dist/server/index.js`. Consumers resolving through
  the `exports` map — which is all of them — need no change. The public export
  surface is unchanged at 726 names.

  Verified end-to-end rather than by bundle size: `npm pack`, install the
  tarball into a clean project, `renderToString` a real component in Node.

### Added
- **`npm run bundle-budget` — a tree-shaking gate that measures the real
  thing.** `scripts/build-config.test.ts` asserts the ADR 0005 settings are
  still *written down*; it cannot catch SUI's own source growing a new eager
  import that drags KaTeX into every consumer with both settings still in
  place. The new script builds six real consumer apps against the real `dist/`
  and checks what came out. It gates merges as its own CI job.

  Its contamination check is deliberately **not** ratcheted, unlike its size
  check. Validated by planting a `katex` import in `Button.tsx`: the client
  one-button bundle went 15,403 → 241,892 B, but the *SSR* one grew by **14
  bytes**, because katex is external there — an unremovable bare import costs
  nothing on disk while still loading the library at Node startup. Any
  size-based ceiling misses that.

  Sizes ratchet in whole KB (reusing `health-ratchet.mjs`, so the same four
  rules apply) so dependency patches that shift a bundle by tens of bytes do not
  fail CI in either direction.

### Changed
- **GitHub Issues is retired as the tracker; tasks live in dside.** Project tag
  `sui` in the `primestage` space, resolved from the new `.dside-config` at the
  repo root — note the tag deliberately does **not** match the directory name.
  This follows the same shape as the `TODO.md` retirement in 0.113.0: every open
  item was verified against the code before migrating, not filed blind.

  | Source | Outcome |
  |---|---|
  | Issue #64 (function-first burn-down) | still real → dside #12291; closed on GitHub pointing there |
  | PR #46 (DagChart cyclic layering) | **not superseded** — `main` still reads `p.y` directly in `layeringSourcesFirst` and still warns on zero-dim containers → dside #12292 |
  | PR #18 (RelativeTime + LineChart) | open since 2026-05-21; neither symbol is exported today → dside #12293 |
  | `open-work.md` cssTypedProps section | still real → dside #12294 |
  | `open-work.md` prop-scale-audit policy call | still open → dside #12295 |
  | `thorcasting-ui/docs/sui-gap-backlog.md` | 14 proposals, 3 shipped since (FileDropZone, ScenarioGlyph, ManagedListSection); remaining 11 verified absent from `src/index.ts` → dside #12296–#12301 |
  | 23 plan docs under `docs/superpowers/plans/` | no open work — their checkbox counts are unreliable (unticked but shipped); `layout-purity-migration.md`, the one true running inventory, is 101/101 done |
  | 56 `TODO`/`FIXME` markers in source | all false positives — `TODO` is a domain status value in the task-board components, not code debt |

  **Pull requests are unaffected** and still live on GitHub. `docs/agents/`
  `triage-labels.md` is deleted rather than ported: dside has no labels, no
  priority and no in-progress state.

- **`docs/handoffs/open-work.md` is retired**, and its durable content promoted
  rather than deleted — only about a quarter of it was ever a task list:
  - Ratchet mechanics, the showcase/test/depth-header requirements, the CI
    `--ignore-scripts` and no-subprocess-in-vitest rules, and the
    "no shipped caller cannot be established from inside this repo" trap →
    `AGENT_GUIDE.md` § *The health ratchet will fail you*.
  - The "explicitly out of scope — do not fix these" register → new
    **ADR 0008**, `docs/adr/0008-deliberately-unfixed.md`.
  - The BucketQueue `allKeys` / motion-seam hazards → **ADR 0004**, which had
    been sitting as a 0-byte stub since 2026-07-27 and is now partially filled.

  `CLAUDE.md` and `CONTEXT.md` updated so the deletion leaves no dangling
  pointers; the three references from shipped BucketQueue plan/spec docs were
  repointed at ADR 0004 and dside #12291.

## 0.131.0

### Added
- **`BucketQueue` — per-item checkability in select mode.** `selectable` was
  bucket-level only, so a consumer could not refuse an item that is
  incompatible with what is *already* checked; the invalid selection was made,
  and the failure only showed up (silently) on commit. Two new fail-open props
  close that:
  - **`isCheckable?: (item: T) => boolean`** — consulted only for rows in a
    `selectable` bucket while select mode is on. A refused row is inert: no
    toggle, and deliberately no fall-through to `onSelect`, which would swap
    the consumer's detail pane in response to a click meant as a check.
  - **`uncheckableReason?: (item: T) => string | undefined`** — the refused
    row's `title`. A prop rather than the consumer's job because `renderItem`'s
    output does not cover the check affordance, which is exactly what the user
    is aiming at when the refusal happens.

  A refused row **dims in place** and keeps its place in the roving-tabindex
  sequence with `aria-disabled="true"`. Filtering refused rows out instead
  would pull them from under the pointer mid-selection, leave the header count
  disagreeing with the bucket, and delete rows from the arrow sequence for
  keyboard users.

  A predicate rather than a `checkableKeys` set on purpose: a positive set must
  be exhaustive, so any item the consumer forgot would silently become
  *un*selectable — a fail-closed, which is the same class of silent failure
  this feature exists to remove.

  Purely additive: omit both props and behavior is unchanged.
  Design: `docs/superpowers/specs/2026-07-31-bucketqueue-item-checkability-design.md`.

## 0.130.0

### Changed
- **`Dot.size` and `ChartCanvas.height` are numbers of px, not CSS strings**
  (BREAKING for TS callers passing a string). Both were `number | string`,
  coercing a number to px and passing a string through verbatim. ADR 0003 and
  `scripts/prop-rubric.json` are explicit that geometry props must be semantic
  — *"geometry lengths (width/height/min/max/size) are NEVER whitelisted; they
  must become semantic (number/token) props"* — so the string arm is the
  violation, not an affordance. `cssTypedProps` 14 → 12.
  - **Nothing shipped used the string form.** The only string call sites in
    existence were two of this repo's own tests (`createChartCanvas({ height:
    "50vh" })` and `<Dot size="1.5rem" />`), and `STYLE_GUIDE.md`'s expansion
    gate is explicit that test-only usage is not demand. Every consumer call
    site passes a number already (`createChartCanvas({ height: 100 })`,
    `<Dot size={8} />`).
  - **If you need a viewport-relative chart height**, put a class on the
    container rather than a `"50vh"` height — the prop is a baked per-variant
    decision (`createChartCanvas({ height })`), not a call-site override.

### Note on the remaining 12
`Surface.minWidth`/`maxWidth` were listed in the prior handoff as part of this
"no cross-repo entanglement" slice. **They are not** — a consumer declares its
own `minWidth?: string; maxWidth?: string` wrapper and spreads it straight into
`createSurface`'s output, so narrowing them breaks its typecheck exactly the way
`DataTableContainer.maxHeight` does. Left for a coordinated bump.

## 0.129.0

### Fixed
- **`Stack`/`Row` regain the `md` and `lg` gap steps, and `Surface.gap` stops
  lying.** `SurfaceProps.gap` publicly accepted `"md"` and `"lg"`, then
  collapsed anything non-`none` to `"sm"` before forwarding to the inner
  `Stack`/`Row` — so `NoteCard`, `WideCard`, and every consumer variant built
  with `createSurface({ gap: "md" })` rendered at 8px no matter what they
  asked for. The `surface--gap-*` class Surface emits alongside it has no CSS
  rule anywhere and never had one; it stays as the inert back-compat hook it
  already was.
  - The fix is to make the scale real rather than to narrow the type.
    `.stack--gap-md`/`.row--gap-md` are **12px** and `.stack--gap-lg`/
    `.row--gap-lg` are **16px**, continuing this repo's own 4/8/12/16 ramp and
    matching `.grid--gap-md`/`.auto-stack-row--gap-md`, which have been 12px
    all along — "the gap scale is `xs|sm`" was only ever true of
    `Stack`/`Row`/`Sidebar`/`ProportionalStack`, never of `Grid`/`AutoStack`.
  - `Surface.gap` now forwards **verbatim** and additionally accepts `"xs"`,
    so its scale is exactly the `Stack`/`Row` scale plus `none`.
  - **Visual change**: anything that already asked for `gap="md"`/`"lg"` moves
    from 8px to its declared step. In this repo that is `NoteCard`, `WideCard`,
    and the `split-queue-list` showcase's `DetailCard`. Nothing that asked for
    `xs`/`sm`/`none` moves.
  - This reverses the `xs|sm` trim from `928651f` (2026-06-26) and `9158c75`
    (2026-07-17). Those landed on the finding that nothing depended on `md`/
    `lg`; that finding did not survive contact with consumers. `thorcasting-ui`
    carries a compatibility shim in `src/components/ui.tsx` re-implementing
    `gap`/`align`/`justify` as inline styles over a full
    `none|xs|sm|md|lg|xl|2xl` scale, headed *"SUI 0.80 regression"*, and
    `jtf-ui`'s `NoxWidgets.tsx` builds a `createSurface({ … gap: "md" })` that
    has been silently 8px. Consumers dropping that shim should note SUI's `lg`
    is 16px where the shim used 20px.
  - A `Layout.test.tsx` case now asserts each step against `Layout.css` itself,
    not just the emitted class name — the class name alone would pass for a
    step with no rule behind it, which is the exact failure
    `internal/dom/assertModifierClass.ts` exists to catch.

## 0.128.0

### Added
- **`BucketQueue`: collapsible buckets.** Two additive `Bucket` fields let a
  **populated** bucket render as a click-to-expand summary line, which the
  component previously only ever did for an **empty** one. `collapsible: true`
  opts a bucket in; `collapsedByDefault: true` starts it collapsed and is
  **ignored without `collapsible`**, since on its own it would strand the
  bucket's items behind no affordance. Built for a staging pile — a discard
  queue that must not dominate the bar but has to be openable to pull rows back
  out before committing.
  - The header becomes a `<button aria-expanded>` and takes a **tone-coloured
    chevron in place of its tone dot**, in the dot's own 8px slot: labels stay
    on one left edge and the bucket still carries exactly one role-coloured
    mark, so nothing about a non-collapsible queue's rail changes.
  - The state is the **component's own and sticky**. There is no
    `expandedKeys`/`onToggleExpand` pair — expand/collapse never needs to leave
    the component. `collapsedByDefault` applies only until the user first
    toggles the bucket, after which their choice holds for the component's
    life, **including across the bucket draining to empty and refilling**: if
    the user opened the pile, they wanted it open, and emptying it elsewhere in
    the consumer's UI does not silently re-close it.
  - A collapsed bucket **sizes exactly as an empty one** — pinned to its
    summary line, out of the weighted water-fill, and never `fill`ing, with
    `capRows` moot — so those flags compose with no special-casing. Its rows
    leave the keyboard sequence, and `selectedKey` is left untouched (`onSelect`
    still only ever emits `null` from the triage advance).
  - An **empty** `collapsible` bucket is indistinguishable from any other empty
    bucket: its `emptyLabel`, its dot, and no toggle, because there is nothing
    to expand into.
  - `naturalHeights` / `allocateHeights` gain an optional `collapsed?: boolean[]`.
    Both are exported public API; omitting it is byte-identical to before.

### Fixed
- **`BucketQueue`: a transfer into a bucket that renders no rows no longer
  suppresses the source bucket's animation.** `play()` narrowed a batch of
  transfers to those with a live destination row and then bailed on the
  **whole batch** when none survived — so the vacated slot's gap-closing FLIP
  went with it and every row beneath a departing one jumped. The FLIP pass is
  independent of arrivals; only the arrival animation needs a destination
  element. Reachable only via a collapsed bucket today (an item moving into an
  *empty* bucket makes it populated, so it renders), but the bug was in the
  choreographer, not the new feature. A row landing in a collapsed bucket now
  closes its source gap as usual and pulses the destination's count so it is
  seen being received. `MotionContext` gains `bucketEl` for this.

### Changed
- **`BucketQueue` internals split for the 500-line limit.** The header moved to
  `BucketHeader.tsx` and the live-measurement concern (the row/header/empty-strip
  `ResizeObserver` wiring) to `measurement.ts`. No public API change.

## 0.127.0

### Added
- **`DateCell` accepts `timeZone`**, matching `DateTimeCell`'s semantics
  exactly. Previously `DateCell`'s `format="iso"` path had no way to pin a
  zone and fell through to the viewer's local one, so a UTC instant near
  midnight could render as the wrong calendar day west of UTC. Unset behavior
  is unchanged (host-local, matching pre-existing output). Closes #68.
- **`ValueMatrix` / `PivotGrid`: `colLabel` / `rowLabel` widened to
  `=> string | JSX.Element`.** Both already fed straight into JSX
  (`TableColumn.header`, which already accepted `string | JSX.Element`; a bare
  `<span>`), so the narrower `=> string` type blocked passing e.g.
  `NumberWithUnits` in a column header for no runtime reason. Purely
  additive — unblocks jtf-ui's `ComplianceThresholdTable`. Closes #69.

### Fixed
- **`SurfaceDataProps` documented in `COMPONENTS.md`.** Passing
  `padding`/`radius`/`bg`/`borderColor`/etc. to a curried `Surface` variant
  (e.g. `WarningSurface`) fails with TS2322 by design (ADR 0001 — visual
  config is locked at curry time) — nothing previously told a caller why.
  Closes #66.

### Changed
- **Function-first burn-down (#64), continued** — `dotChains` 54 → 33,
  `collectionMethodCalls` 209 → 139, one component (folder) per commit:
  `_contrastMath.ts`, `CashflowScrubChart/`, `ConversationTree.tsx`,
  `AnimatedSwimlaneChart/`, `ThroughputChart.tsx`, `StatusFlowChart/`,
  `SwimlaneChart/`. Adds `fn.every` (mirrors `fn.some`), used here and at
  several other existing `.every(` call sites. Two native multi-key
  `.sort()` comparators with no prior direct test coverage — a 3-key lane
  reorder in `AnimatedSwimlaneChart` and a topological rank in
  `StatusFlowChart`/`SwimlaneChart` — became chained stable `sortBy` passes
  per `src/fn/README.md`'s two-key convention, extended to three; verified
  differentially against the pre-refactor comparators (thousands of
  randomized trials, 0 mismatches) rather than trusting the translation by
  inspection alone.
- **Two of the six issues staged for this burn-down had premises that
  didn't survive contact with the code.** #45 (`Stack`/`Row` `gap` typed
  `"xs"|"sm"`, claimed the runtime supports `md`/`lg`) — the `md`/`lg` CSS
  was deliberately removed twice (`928651f`, `9158c75`) after audits found
  nothing depended on it; widening the type without matching CSS would
  reintroduce the exact silent-zero-gap bug `assertModifierClass` exists to
  catch. #67 (`SpreadCenterRow`, see the corrected TODO.md row below) —
  `SpreadRow` already bakes in `align: "center"` + `justify: "between"`, so
  the requested variant would ship as a byte-identical duplicate. Neither
  was closed unilaterally; both were left commented with the evidence for a
  maintainer to close.

- **Raising a health ceiling now requires `--reason="…"`**, recorded in
  `scripts/health-baseline.json` under `_raises` so it outlives the commit
  message.

  `cssTypedProps` had **two** ways to grant an exemption: `scripts/prop-rubric.json`,
  which demands a justification string and prints it in `--report`, and the
  health baseline, which is just a number. The rubric's own header states the
  manifest is the only route ("Peter ruled: no escape hatches") — but `67b89c7`,
  message *"bless TableColumn.minWidth"*, raised the baseline 13 → 14 and never
  touched the manifest. That reason is gone.

  Fixed generally rather than per-metric, since the hole was in the baseline
  mechanism, not in one metric.

- **`TODO.md` is retired.** `CLAUDE.md` names GitHub Issues as the tracker, and
  the file had not been touched since 2026-05-15 (68 items done, 4 open). Each
  open item was verified before migrating rather than filed blind:

  | Item | Outcome |
  |---|---|
  | `SurfaceDataProps` strips overrides | still real → issue #66 |
  | `SpreadCenterRow` variant | **correction above** — re-investigation found `SpreadRow` already bakes in `align: "center"` (since the initial commit); `align` being in `RowOverrides` was true but beside the point → issue #67 |
  | `ComplianceThresholdTable.label` widening | **misattributed** — the blocker is SUI's `ValueMatrix.colLabel: => string` → issue #69 |
  | ISO-date locale shift in `routes/index.tsx` | **stale** — jtf-ui no longer uses `DateCell` there. Investigating it surfaced a real gap: `DateCell` has no `timeZone` prop while `DateTimeCell` does → issue #68 |

  References in `README.md`, `CONTEXT.md` and `COMPONENTS.md` updated so the
  deletion leaves no dangling pointers.

- **`health` is now a required status check on `main`**, alongside `test`,
  `typecheck` and `build`. It previously reported without gating, which is how
  the ratchet drift below went unnoticed — a loosened ceiling never blocked
  anything.

  Contributor-visible consequence: a PR that *improves* a metric is now blocked
  until the tightened baseline is committed (`npm run health --
  --update-baseline`). That is the point — an unrecorded gain is one a later
  change can undo. The failure message names the exact command.

  `lint` remains ungated. Branch protection lives in repo settings, not in this
  repo, so it is not visible from a checkout:
  `gh api repos/primestageprime/solid-ui-components/branches/main/protection`.
  Note `enforce_admins` is `false`, so an admin pushing directly to `main` still
  bypasses all of these; the gate binds PR merges.

### Fixed
- **The health ratchet was drifting upward, not holding.** `--update-baseline`
  rewrote *every* metric at once, and it was the only escape hatch — so
  accepting one deliberate increase silently blessed every unrelated drift in
  the same command. The git history shows the damage: `dotChains` was burned
  down 127 → 55 and `collectionMethodCalls` 362 → 225 by real work, then both
  crept back to **59 / 230** as side effects of commits about other things
  (`e72db8f` "bless baseline for Auth composites", `6cc7609` "fix(themes):
  button labels clear WCAG 4.5:1"). A ratchet whose most recent action was
  loosening isn't a ratchet.

  Three rules now hold it:

  | | Behaviour |
  |---|---|
  | `--update-baseline` | **Only lowers.** Locks in gains; cannot raise any ceiling. |
  | `--update-baseline=a,b` | Additionally permits `a` and `b` to rise — and nothing else. |
  | an unnamed metric that rose | Fails the run, and **refuses the whole write** rather than applying it partially. |
  | an improvement not locked in | Fails too, so a gain can't leak back later with CI green throughout. |

  Unknown metric names are rejected up front, since a typo would otherwise fail
  to bless silently and then report the "unexpected" regression.

  Guarded by `scripts/health-ratchet.test.ts` (7 tests), each negative-tested by
  reverting to the blanket write and confirming failure. `scripts/health.mjs`
  gains `--baseline-path=` so those tests run against throwaway files instead of
  mutating the committed baseline.

### Changed
- **CI no longer rebuilds SUI on every job.** `package.json`'s `prepare` runs
  `npm run build`, and npm fires `prepare` on every root `npm ci` — bolting a
  ~33s full client+server build onto the front of all five CI jobs, four of
  which never read `dist/`. Measured on run `30478430052`: the `lint` job took
  **55s, 33s of it building**, while Biome's actual work is 206ms. The `build`
  job built twice (once via `prepare`, once explicitly), and `publish.yml`
  built **three** times — `npm ci`, the Build step, and again when `npm publish`
  fired `prepare` while packing.

  All installs in both workflows now pass `--ignore-scripts`; the one job that
  genuinely needs `dist` builds it explicitly. This is a workflow-only change —
  no published artifact differs, and `prepare` still builds, because it is the
  only lifecycle hook npm runs for consumers pinning SUI as a git dependency.

  Verified in a clean clone with no `dist/` present: 2686 tests, `lint:ci`,
  `tsc --noEmit`, `typecheck:dev` and `health` all pass. A new guard step in
  `publish.yml` asserts `dist/{index.js,server.js,index.d.ts,index.css}` are
  non-empty before packing, so deleting the Build step fails the publish
  loudly instead of shipping an empty package.

## 0.126.0

### Fixed
- **`dist/index.css` was 78.1% base64-encoded KaTeX fonts**, downloaded by every
  user of every SUI-consuming app on first load, render-blocking — even though
  four of the five consumers render no formulas at all.

  | | Raw | gzip | brotli |
  |---|---|---|---|
  | Before | 1,843,596 | 1,044,358 | 885,277 |
  | **After** | **384,820** | **89,466** | **70,460** |

  A **92% reduction in transfer size**. The compression ratio was the tell: CSS
  normally compresses to ~10–15% of raw, but this only reached 43%, because
  base64 binary is already-compressed data gzip cannot squeeze.

  Cause: a plain `import "katex/dist/katex.min.css"` in `MathFormula.tsx`.
  **Vite's library mode inlines every referenced asset as a `data:` URI
  regardless of size — `assetsInlineLimit` does not apply there** (verified:
  setting it to 0 changed nothing). That embedded all 60 KaTeX font files, in
  three formats. Inlining also defeats what `@font-face` does for free: fonts
  stop downloading lazily, and format negotiation dies, so the woff + ttf
  copies — 1,089,952 bytes — were pure waste to every modern browser, which
  only ever uses woff2.

  KaTeX's stylesheet now ships as `dist/katex.css` beside real font files in
  `dist/fonts/`, wired in via an `@import` at the top of `dist/index.css`. Fonts
  are fetched lazily, only when a formula actually paints, and only in the
  format the browser picks — a consumer that renders no formulas now downloads
  **zero** font bytes.

  **Non-breaking**: consumers importing
  `@primestageprime/solid-ui-components/index.css` need no changes. Bundlers
  inline the `@import` at build time, so there is no extra round trip in
  production. `MathFormula.tsx` keeps its import so `vite serve` and
  source-linked consumers (`SUI_SOURCE_LINKED`) still style formulas — the
  stub applies to library builds only.

  See `docs/adr/0006-katex-css-fonts-not-inlined.md`; guarded by
  `scripts/build-config.test.ts`.

## 0.125.2

### Fixed

- **`lint`, `lint:ci` and `check` can no longer report success without having
  run.** `@biomejs/biome` was declared in devDependencies and present in the
  lockfile but **not installed**; verifying locally with `npx biome` resolved an
  unrelated registry package called `biome` (v0.3.3) that exits 0 having linted
  nothing. Every local "lint clean" was a different tool succeeding at nothing,
  three lint findings reached `main`, and one let a release publish from a
  commit whose CI then failed.

  The defect is not "the tool was missing" — it is that **"tool absent" and
  "tool ran, all clean" were indistinguishable at the call site.** That is
  strictly worse than having no linter: a repo with no linter is honest about
  it; a repo whose linter silently isn't there manufactures confidence.

  These scripts now go through `scripts/lint-ci.mjs`, which resolves the
  **scoped** package (so a stray `biome` on `PATH` or in the registry cannot
  satisfy it), verifies the resolved name, prefers the package's own bin, and
  **exits non-zero with instructions** if it cannot find the real thing.
  Demonstrated against all three cases, including the one that normally goes
  untested: passes clean (exit 0), fails on a real lint error (exit 1), and
  fails loudly when `@biomejs/biome` is made unresolvable (exit 1, actionable
  message) rather than passing vacuously.
- **`AGENT_GUIDE.md`** records the hazard directly: never verify with
  `npx <tool>`, run the repo's own scripts; when a check never fails, suspect
  the checker; and a new gate must demonstrate three cases — clean, real
  failure, and **tool unresolvable**.

## 0.125.1

### Changed

- **Documentation correction — the 0.124.1 `FilterBar` cause was misattributed.**
  That entry blamed SSR/hydration for the empty ref array. It was wrong: the
  affected consumer runs `ssr: false` and never hydrates the component.
  Object-identity churn through `For` was also tested and ruled out. The
  changelog entry and the code comment now say the trigger is **unknown**, so
  nobody hitting this later chases a hydration bug that cannot apply. The fix is
  unchanged and does not depend on the answer — refusing a zero-width reading is
  correct regardless of what produced it.
- **`AGENT_GUIDE.md`** records the sharpest form of the browser-verification
  trap: a DOM probe against rAF-scheduled geometry returns *identical* output
  for a healthy build and a broken one, because in a hidden tab the measurement
  never runs in either. Forcing a paint is what makes the numbers change; the
  fix is what makes them correct once a paint happens. Includes the corollary
  that any automated visual assertion from a headless or background context
  passes vacuously unless it forces a paint or guards on `visibilityState`.

## 0.125.0

### Added

- **Dev-time warning when a templated modifier class has no CSS rule behind
  it.** `Stack`, `Row` and `Grid` build their modifier classes by string
  template — `` `row--gap-${gap}` `` — so ANY value yields a class name, and a
  value with no matching rule renders as **nothing at all**: no crash, no
  fallback, just no spacing. A consumer passing `gap="md"` to `Row` (whose scale
  is `xs | sm`) got `.row--gap-md`, and three pages rendered at zero gap for two
  weeks before anyone noticed. The type system should catch this and normally
  does; it didn't there because that consumer had no `typecheck` script and its
  bundler strips types rather than checking them. Render is the last place left
  to catch it, so that is where this looks.

  The message names the component, the prop, the value and the dead class, so
  it's actionable without a hunt, and it points at the fix (a named curried
  variant rather than passing the prop at all). It fires **once per class**, and
  it asks the STYLESHEET rather than a hard-coded list of valid values — the CSS
  is the source of truth for which modifiers exist, so the check cannot drift
  from it the way a duplicated list would.

  Dev only: `import.meta.env.DEV` is statically replaced, so the whole thing
  dead-codes out of a production bundle (verified — the warning text is absent
  from `dist`). Also SSR-safe.

  **A miss re-collects the stylesheets before warning.** Caching the class set
  on the first call that sees any rule reported perfectly good classes as
  missing when it happened to run before `Layout.css` arrived — observed
  accusing `.stack--gap-sm` on a page where it plainly exists. A warning that
  cries wolf gets muted, and then it protects nothing.

## 0.124.1

### Fixed

- **`FilterBar` tier-three overflow did not fire in a real consumer — active
  filters were clipped instead of collapsing.** The width measurement collected
  per-group element refs into a positional array from inside the `For`
  (`ref={(el) => { groupEls[i()] = el; }}`) and read `offsetWidth` from it.
  In the affected consumer that array came back empty, so every width
  read `0`, and **zero widths are indistinguishable from "everything fits"**: the
  bar set `visibleGroups` to the total, rendered every group, and let the
  `overflow: hidden` row clip the surplus. Measured in a real consumer at
  1512px: eight groups, no chip, `scrollWidth` 1863 against `clientWidth` 1055,
  four groups rendered outside the box — invisible, unremovable, and still
  filtering. That is the exact failure the tier exists to prevent, and strictly
  worse than the reflow it replaces, because reflow is at least honest.

  It also could not recover: the widths were cached in a signal and re-measured
  only on a group-count change, which re-measured into the same zeros. So a
  resize, or removing a group, faithfully redid the arithmetic on stale numbers
  and reached the same wrong answer.

  The measurement now reads the **live DOM** —
  `groupsRef.querySelectorAll(".sui-filter-bar__group")` — with no ref array and
  therefore no ref-identity or ordering coupling to break. Two guards refuse to
  cache a bad reading: the rendered element count must match the group count
  (so nothing is measured while trimmed), and **any zero width aborts** rather
  than latching. The single measurement taken on trust is replaced by a bounded
  per-frame retry (20 frames), and `observeSize` re-measures when it has no
  usable widths instead of recomputing against stale ones.

  **The trigger is not understood, and is deliberately not claimed here.** An
  earlier version of this entry blamed SSR/hydration; that was wrong — the
  affected consumer runs `ssr: false` and never hydrates this component.
  Object-identity churn through `For` was also tested and ruled out. If you are
  reading this because you hit something similar, do not go looking for a
  hydration bug. What is known is only that the positional ref array read empty
  where the live DOM did not; the fix is shaped to be correct without knowing
  why, which is why it refuses a zero-width reading rather than trying to time
  the measurement better.

## 0.124.0

### Added

- **`FilterBar`** (Depth 1) — promoted from the matchmaking workshop bench into
  the catalog. A progressive-disclosure filter bar **height-locked to one line,
  with every expansion rendered as an overlay**, so filtering never pushes the
  content below it down — the reason it exists, and the fix for a chip bar that
  reflows the page while you use it. **OR within a dimension, AND across
  dimensions**, and an empty/absent group means *all*, matching
  `MultiSelectFilter`'s empty-means-all so a consumer's cross-filtering state
  layer needs no translation. Presentational and fully controlled: it never sees
  rows and holds no filter state. Exports `FilterBarProps`, `FilterGroup`,
  `FilterMember`.

  Three changes from the bench version, each driven by a real consumer
  requirement rather than the demo:
  - **`FilterMember.count` is now optional.** An honest facet count for a member
    of dimension *d* must be computed with *d*'s own filter excluded, or every
    unselected member of an active dimension reads 0 and the picker looks broken
    exactly when someone is switching selections. A required field that invites a
    wrong answer is worse than an absent one — omit it rather than guess.
  - **"Added but empty" is internal state, and `onAddFilter` is gone from the
    API.** Picking a dimension from `(+)` is a disclosure detail, not a filter;
    reporting it would force any consumer serialising filter state (e.g. to a
    URL) to encode a half-made filter that means nothing to a reader of that URL.
  - **Tier-three overflow is implemented.** The spec described three tiers; the
    bench had two, because it never had enough dimensions to reach the third.
    With eight active dimensions and a row that is `overflow: hidden`, trailing
    groups were not collapsing — they were being **clipped**: invisible,
    unremovable, and still filtering. That is worse than the reflow the bar
    replaces, so trailing groups now collapse into a `+N` chip whose overlay
    lists them, each reachable and removable. It is a width decision, measured
    through `internal/dom/observeSize` (same approach as `OverflowNav`).

### Fixed

- **The published package now ships `src`, so its `source` export condition
  resolves.** `exports` declared `"source": "./src/index.ts"` across 11 subpaths
  while `files` was `["dist"]`, so the condition dangled for anyone installing
  from the registry — invisible through a local symlink, where `src/` exists.
  The condition was added deliberately for local consumers reading SUI from
  source, so it is kept and honoured rather than dropped. Consumers that do not
  request the `source` condition still resolve `dist` exactly as before, so the
  per-module bundle win from 0.122.0 is untouched.

### Changed

- **`AGENT_GUIDE.md`** documents the browser-verification traps that nearly
  caused a phantom regression to be reported: a tab that never laid out reports
  a 0×0 viewport and coordinates in the hundreds of thousands, `rAF` is frozen
  while a tab is hidden (so anything landing via `observeSize` waits for a frame
  that never comes), and grid cards must be grouped by row before their heights
  are compared.

## 0.123.0

### Added

- **`WrapItemStack`, `LooseWrapRow`, `LooseCardGrid`** (Layout curried
  variants). Purely additive — no existing variant or behaviour changed, no new
  dependency, and the `--gap-xs` token is untouched (redefining 4px→8px would
  collapse two scale steps across every consumer).
  `WrapItemStack` holds ONE item in a `WrapRow` at its content's **natural**
  width (`min-width:0; max-width:100%`, gap:xs). Deliberately **not** `flex:1`,
  which is what separates it from every other `min-width:0` column
  (`GrowStack`, `GrowTightStack`, `GrowColumn`, `ScrollColumn`, `GrowBox`): in a
  WRAPPING row `flex:1` equalises the items, destroying the natural-width
  packing a wrap row exists to do. Measured in a 600px row against a
  567px-natural table — guards 567px, `GrowTightStack` 25px (crushed), bare
  `TightStack` 567px; and with content wider than the row (1415px table) —
  guards capped at 600 and scrolling internally, bare `TightStack` 1415px,
  blowing the row out. Both guards are load-bearing.
  `LooseWrapRow` and `LooseCardGrid` are the `sm` (8px) siblings of `WrapRow`
  and `CardGrid`, which sit at `xs`. `LooseWrapRow` leaves `align` **unset**,
  exactly as `WrapRow` does, so items take the flex default `stretch` and tiles
  sharing a line render at equal height — the whole reason it exists rather
  than reusing an `sm` wrap row that already ships (`WrappedClusterRow` centres
  a short tile in a tall neighbour's band; `BaselineWrapRow` aligns by first
  text line). `LooseCardGrid` keeps `CardGrid`'s auto-fit `minmax(280px, 1fr)`
  tracks; only the gutter differs.

### Fixed

- **`MetricCard` fills its slot on both axes instead of shrink-wrapping.** It
  was `display: inline-block`, so it filled its slot only when the slot happened
  to match its content width; dropped into a grid cell, or inside a stretching
  wrapper such as a `Tooltip` trigger, it rendered visibly narrower and ragged
  beside un-wrapped siblings (measured on a report KPI row: triggers at
  312/417px holding cards at 102–198px). `height: 100%` is the same defect on
  the other axis — the wrapper already stretches to the row height but the card
  stayed at its content height, so one taller sibling left the rest short
  (triggers 106px, cards 79px). Both axes are fixed on the CARD, not by making
  the trigger a flex container: that route was measured and rejected because it
  stretches the card vertically but makes it shrink-wrap horizontally again as a
  flex item, re-breaking the width (309px back to 213–217px), and it would stop
  the trigger hugging its content — which is what places a glossed table header
  inside a right-aligned `th`. Shrink-to-fit is unaffected where it applies: a
  flex child sizes from `flex-basis: auto`, so a card in a flex row keeps its
  content width (showcase: all 12 cards byte-identical on both axes). No API
  change; a card that was shrink-wrapping inside a plain BLOCK container now
  fills it — wrap it in a flex parent to restore the old sizing.
- **`.sui-tooltip__trigger` inherits the text properties `font` does not
  cover.** The trigger set `font: inherit`, but the shorthand covers only
  family/size/weight/style/variant/line-height — not `text-transform`,
  `letter-spacing`, `word-spacing` or `text-align` — and the trigger is a
  Kobalte `<button>`, whose UA stylesheet resets them, so any content wrapped in
  `<Tooltip>` lost an ancestor's casing and tracking. Most visible in table
  headers, where `Table.css` pairs `text-transform: uppercase` with a
  `letter-spacing` on every `th` rule. `text-align` is narrower than it looks:
  the trigger is an inline-block, so while it hugs its text the ancestor's
  alignment places the whole box; it surfaces once the content WRAPS — a
  multi-word header in a narrow column fills that column and centres its text
  inside what may be a right-aligned cell (measured: `Gross Profit Margin` in a
  116px right-aligned `th` filled 114px and centred). The `--cell` modifier
  still pins `left` for its own clip/ellipsis reasons. No API change.
- **`BucketQueue` no longer constructs its own `ResizeObserver`.** It landed
  after the 0.113.3 migration with a raw observer, putting `src` back to holding
  one outside the primitive; it now routes through `observeSize`, so `src`
  again contains exactly one `new ResizeObserver`, inside the primitive. Its
  per-bucket row measurement (0.120.0) is unchanged — the re-pointing is now a
  per-slot disposer map keyed by bucket rather than `unobserve`/`observe` on a
  shared observer.

### Changed

- **`observeSize(el, cb, options?)`** takes an optional third argument,
  forwarded verbatim to `observe()`. It exists for `{ box: "border-box" }`:
  default content-box observation does not fire when only padding or a border
  changes, so a callback measuring the BORDER box (`offsetHeight`) silently
  stops responding to a themed padding change — no error, no warning, just stale
  metrics. **Strictly additive**: omit it and behaviour is byte-identical, and no
  existing caller changed. The change-guard and the rAF coalescing sit on the
  single dispatch path, so they apply on the border-box path too — a `box`
  option cannot become a way around the loop-safety the primitive exists for.
- **`GrowStack` doc comment** now describes the variant rather than its first
  call site — comment only, no API or behaviour change. It read "for a main
  content column that takes its share of a two-column row", which excluded the
  full-width page-column case it has always supported.

## 0.122.0

### Fixed
- **Every consumer was bundling KaTeX and `d3-dag` whether or not it used them.**
  A consumer importing a single `DefaultButton` shipped **332,999 bytes**, of
  which **318 KB was libraries the button never calls** — KaTeX (~227 KB, via
  `MathFormula`) and `d3-dag` (~63 KB, via `DagChart`). The same import is now
  **14,938 bytes**, a 96% reduction.

  Component-level tree-shaking was never the problem; Rollup was already
  discarding the other 143 components correctly. The leak was that `katex` and
  `d3-dag` declare no `sideEffects` in their own `package.json`, so a bundler
  must keep their `import` statements even after discarding the only component
  that used them — and from inside a single-file `dist` there is no way to undo
  that.

  The fix is entirely in build config: the client build now emits **one file per
  module** (`output.preserveModules`) and the package **declares its side
  effects** (`"sideEffects": ["**/*.css"]`). **No component source changed, and
  no rendering behavior changed.**

  ⚠️ **These two settings are a pair, and each is completely inert alone** —
  `sideEffects` by itself measured zero change, `preserveModules` by itself
  measured zero change. Removing either silently restores the 318 KB with no
  test failure or visible symptom in this repo. `scripts/build-config.test.ts`
  guards them; `docs/adr/0005-per-module-dist-and-sideeffects.md` records the
  measurements and the rejected alternative (lazy `import()`, which was 7×
  worse and made rendering async).

  Consumer-visible packaging change: `dist` now contains ~1,300 files rather
  than ~10. The `exports` map is unchanged, so the per-module files are present
  but NOT addressable — this does not widen the public API. `.` still resolves
  to `dist/index.js`, and `dist/index.css` is unaffected (still all-or-nothing;
  per-component CSS remains a separate, unsolved problem).

## 0.121.0

Biome lint is now a CI gate, at **zero errors and zero warnings**. It had
drifted to 15 errors and 37 warnings while `ci.yml` ran only
test/typecheck/health/build, and the a11y errors among them were shipping to
every consumer. The new `lint` job runs `lint:ci`
(`biome lint src --error-on-warnings`) so the clean state ratchets, in the same
spirit as `scripts/health.mjs`; plain `npm run lint` stays warning-tolerant for
local iteration.

Worth knowing about the new gate: Biome's a11y rules only analyze intrinsic
(lowercase) JSX elements. SUI composes most markup from Layout variants —
`<Grid>`, `<ClusterRow>`, `<NarrowStack>` — which are custom components and
therefore invisible to those rules. Nine of the removed warnings were
`biome-ignore` directives sitting on such components, where they could never
have fired. **A green lint job is not a11y coverage.**

### Fixed
- **`ServiceHealthDot`'s sparkline popover was unreachable by keyboard.** The
  root was a `<span>` revealing the popover on `mouseenter` only, so the age
  readout and heartbeat sparkline — which exist nowhere else — were invisible
  to keyboard and AT users. The root is now a `<button type="button">` with
  `aria-expanded`, and `focus`/`blur` mirror `mouseenter`/`mouseleave`.
  Activation stays a no-op: reaching the control is itself the reveal.
- **`SlotCard`'s remove control could never be focused.** It was a `<span>`
  with an `onClick`, while `SlotCard.css` already carried a `:focus-visible`
  rule for it that could never match. It is now a `<button type="button">`
  with an `aria-label`, so it is tab-reachable independently of the card's
  `onSelect`.
- **`SortableList.css` declared `.sui-sortable-list__grip` after the more
  specific `--bare` variant rule.** Specificity still resolved it correctly, so
  there is no visual change; the base rule now precedes its variants so the
  cascade reads in ascending order.

Both tag changes preserve every existing class name; only the element name
differs, and the UA button chrome is reset so rendering is unchanged.

### Changed
- `EntityCard`, `FileDropZone` and `EditableTitle` carry documented
  `biome-ignore` rationales where a native element is genuinely wrong —
  `EntityCard` hosts its own remove `<button>` (nesting buttons is invalid
  HTML), `FileDropZone` wraps the hidden `<input type="file">` it delegates to,
  and `EditableTitle`'s fall-through label is pointer-only by design with the
  keyboard route on its sibling branch.
- `biome.json` gains scoped overrides: `src/fn/**` exempts `noArguments` (the
  helpers dispatch on `arguments.length`, as `src/fn/README.md` describes), and
  test files relax the a11y rules, `noExplicitAny` and
  `noApproximativeNumericConstant` (π-shaped decimals are sample float data,
  not constants).
- Nine inert `biome-ignore` directives became plain comments. They sat on
  custom components, which Biome does not analyze, so they suppressed nothing —
  but their rationale is worth keeping, so the prose survives verbatim minus
  the directive. Suppressions on raw DOM elements in the same files (e.g. the
  pickers' `<button role="gridcell">`) are live and untouched.
- Dead code removed: an unused `onSelect` parameter on `CensusView`'s
  `buildColumns` (row activation is the Table's own `onRowClick`), an unused
  `vi` import in `Toast.test`, an unused binding in `DistributionSparkline`'s
  domain test, and an `as any` cast in `date-time.test` that the real
  `string | JSX.Element` type never needed.

## 0.120.0

`BucketQueue` now measures a row per bucket rather than one for the whole bar,
and a bucket can opt into absorbing the height nobody else wanted. Together
these close a reported band of dead space under a queue in a fixed column.

### Fixed
- **`BucketQueue` sized every bucket from ONE row measurement**, so a queue
  whose buckets have different row heights mis-sized all but the bucket the
  sample came from. Reported from a pane with two single-line balance rows
  (31px) above nineteen two-line config rows (50px): Configs' natural height
  came out `32 + 19×31 + 2 = 623` instead of `984`, the water-fill decided it
  was satisfied, and **138px of the 865px available was allocated to nobody** —
  a band of dead space under a bucket whose own body was scrolling.

  The queue now measures **one row per bucket** and sizes each from its own.
  A bucket with nothing to measure yet borrows the topmost measured sibling
  before falling back to the constant, and it **keeps its last real
  measurement** when its rows are momentarily unmounted — rows are re-created
  whenever `buckets` or `items` gets a new identity, and the replacement's
  height only lands on the ResizeObserver's next delivery (never, in a
  backgrounded tab), so dropping it made the bucket borrow a sibling's row
  height mid-flight.

  Rows must still be uniform *within* a bucket; they no longer need to match
  *across* buckets.

### Added
- **`Bucket.fill?: boolean`** — absorb the leftover height instead of
  shrink-wrapping to content. Once every bucket has been allocated up to its
  natural height, whatever remains is split among the `fill` buckets in
  proportion to `weight`.

  Shrink-wrapping leaves the remainder unallocated, which is right for a bar
  floating in a page and wrong for a queue in a fixed column with a control
  pinned under it — there the remainder shows up as dead space above that
  control, and it grows the shorter the list is. Fixing the measurement above
  only closes that gap while the list happens to overflow.

  ```tsx
  const buckets: Bucket[] = [
    // Meant to stay small: capped, and does not fill.
    { key: "balance", label: "Balances", tone: "success", capRows: 3 },
    // Reaches the bottom of the column whether it holds 3 configs or 30.
    { key: "configs", label: "Configs", tone: "accent", fill: true },
  ];
  ```

  Two rules: it **overrides `capRows` for that bucket** (the cap exists to stop
  content-driven growth, not to refuse space nothing else wants), and only a
  **populated** bucket fills — an empty one stays pinned to its summary line
  rather than stretching a "nothing here" strip over half the pane. If every
  `fill` bucket is empty the remainder is left unallocated, as before.

  Purely additive: **a queue declaring no `fill` lays out exactly as it did in
  0.119.0**, pinned by a test.
- **`naturalHeights(input)` and `retainRowHeights(keys, measured, prev)`**
  exported from `BucketQueue` alongside `allocateHeights` (with the
  `NaturalInput` type), so the whole sizing model is available outside the
  component. `AllocateInput` gains an optional `fills: boolean[]`.
- **A `fill` bench in the dev showcase** — one-line Balances rows above
  two-line Configs rows with a button pinned underneath, and toggles for
  `fill`, row shape, and list length, so both defects are reproducible by eye.

## 0.119.0

Every SUI `Button` variant now clears WCAG 4.5:1 for its label, at rest and on
hover, in all six themes. Getting there took a cascade fix, two new tokens, and
a retune of two existing ones per theme — details below.

### Fixed
- **`variant="primary"` labels vanished on hover, in every theme.**
  `.sui-btn:hover` sets a `color` for all buttons and sits at the same
  specificity (0,3,0) as `.sui-btn--primary:hover`, so it won for any property
  the variant rule didn't declare. The variant declared `background` but not
  `color`, so the label rendered accent-on-accent-dim — **1.05:1** in the
  default theme, i.e. the same colour as its own fill. The variant's rest-state
  `color: #ffffff` was never involved; `:hover` outranks it.
- **`variant="danger"` lost its danger semantics on hover** — same cascade trap,
  so the label turned accent-blue over a red wash. It now stays
  `var(--sui-danger)`.
- **`--sui-accent` was used as label text** by `.sui-btn:hover`,
  `.sui-btn--active`, and the `outlined` / `text` / `icon-only` variants —
  despite `contrast.test.ts` documenting it as a fill token explicitly exempt
  from passing as text. Those labels now use `--sui-accent-dim`, which is
  retuned below to actually be text-safe on the surfaces buttons use.

### Added
- **`--sui-on-accent` / `--sui-on-warning`** — per-theme label colours for
  accent and warning FILLS. A filled control needs its own label token: white
  reads 3.68:1 on the default theme's accent and 1.82:1 on STAX's lime, so
  there is no cross-theme constant that works. Dark themes resolve these to
  `--sui-bg-deep`; light themes to white or ink. `_baseline.css` reads them with
  a `#ffffff` fallback, so a third-party theme predating the tokens still
  renders.
- **`src/themes/__tests__/buttonHoverContrast.test.ts`** — two-layer contract,
  covering every variant in both rest and hover states.
  - *Layer 1, structural:* any `.sui-btn*:hover` rule that sets a `background`
    must also set a `color`. Token-independent, so it fires on the next filled
    variant added regardless of palette — this is the layer that stops
    recurrence. `--ghost` is exempt with a recorded reason.
  - *Layer 2, resolved cascade:* builds `_baseline.css` + theme CSS, resolves
    each variant's `color`/`background` by specificity then document order,
    composites with alpha, and asserts 4.5:1. `contrast.test.ts` cannot catch
    this class of bug — it checks token *pairs*, and the bug was a token
    becoming text by cascade accident.
  - `PALETTE_DEBT` is the escape hatch for a pair the team decides not to fix.
    It is currently **empty**. The contract is two-sided: an entry may not
    regress below its recorded ratio, and once a palette change lifts it past
    4.5:1 the test fails until the entry is deleted.
- **`src/themes/__tests__/_contrastMath.ts` / `_cssRules.ts`** — WCAG colour
  math extracted from `contrast.test.ts` and shared, so alpha compositing has
  one implementation rather than two that can diverge, plus a small CSS rule
  scanner. Two latent bugs fixed while extracting:
  - `parseColor`'s `rgba(var(--x-rgb), a)` branch matched on `[^)]+`, which
    cannot span the nested `var(...)` — that branch was dead code.
  - `parseTokens` did not strip comments, so a comment mentioning a token by
    name parsed as a declaration whose value ran to the next `;`, swallowing the
    real declaration after it.

  No token value exercised either path, so `contrast.test.ts`'s existing results
  are unchanged.

### Changed
**Token values retuned.** `--sui-accent-dim` and `--sui-danger` were tuned to
clear 4.5:1 on bare `--sui-bg-primary` and cleared it by so little that any
tinted surface pushed them under — both are rendered as text on *their own*
translucent washes (a button's hover fill), which tints the backdrop toward the
label. Each moves away from its theme's page (lighter on dark themes, darker on
light) by 1–17%; hues are preserved. `--sui-danger-rgb` moves in lockstep.

| theme | `--sui-accent-dim` | `--sui-danger` |
|---|---|---|
| default | `#5585ef` → `#618ef0` | `#f05151` → `#f47979` |
| hud | `#0099bb` → `#0a9dbe` | `#ff3366` → `#ff4e7b` |
| bronze | `#a85234` → `#9e4d31` | `#a8443a` → `#953c33` |
| bronze-dark | `#c56940` → `#ca754f` | `#d55b51` → `#dd7b72` |
| stax | `#5f7a20` → `#5a741e` | `#b3372c` → `#a33228` |
| colorblind | `#3888d3` → `#4a93d7` | `#e66100` → `#ea7723` |

`colorblind`'s vermilion keeps its hue (a 4% lift toward white), so the
blue/orange confusion-axis separation the CB-safe palette is built on is
unchanged. `colorblind-modifier.css` carries the same new value.

**Visible changes to expect:**
- Filled `primary` and `warning` buttons in the four dark themes now carry a
  near-black label instead of white — white never cleared 4.5:1 on those fills.
- Hover labels on `default` / `ghost` / `outlined` / `icon-only` are the
  text-safe accent rather than the raw accent: slightly deeper on light themes,
  slightly brighter on dark.
- `bronze`'s primary button fills with `--sui-accent-dim` and darkens on hover.
  Its rust accent sits mid-lightness — white reads 3.90:1 on it and dark ink
  4.18:1, so *no* label colour clears 4.5:1 and the fill had to move.
- `stax`'s primary button now **lightens** on hover instead of darkening. Its
  lime accent is very light, so the label is dark ink (7.67:1); darkening to
  `--sui-accent-dim` would have dropped that label to 2.63:1.
- `bronze` and `stax` warning buttons darken on hover. The shared 90%-warning
  wash lightens against a light page, which cost the white label its margin.

**Consumer note:** apps that hardcode these token values, or that override
`.sui-btn--primary` / `.sui-btn--warning` colours locally, should re-check
against the new tokens.

## 0.118.0

### Added
- **`NotificationItem.actions` — any number of actions per notification.** Each
  action carries its own `onClick`, `href`, `tone` (`accent`/`muted`/`danger`),
  `icon`, and `disabled`, and renders in a wrapping row. Whether an action
  closes the panel is now per-action: navigating ones do (you have left the
  panel), in-place ones don't (you are still triaging), and `dismissPanel`
  overrides either way. This is what lets a feed be cleared in one pass instead
  of reopening the bell between every click.
- **`NotificationItem.body` — consumer-owned row content.** A thunk rendering
  arbitrary JSX between the detail line and the action row, for the rows a
  string can't express (a progress bar, a diff, an avatar row). SUI still
  renders the unread gutter, tone well, title row and action row on every row,
  so a heterogeneous feed keeps scanning as one inbox rather than a pile of
  cards. It is a **thunk**, not a `JSX.Element`, deliberately: feeds get built
  as module-scope arrays, and JSX constructed there escapes the reactive root —
  anything reactive inside would warn and silently stop tracking. The thunk
  defers construction into the row's render.
- **Six prefab action builders** — `viewAction(href, label?)`,
  `dismissAction(fn, label?)`, `markReadAction(fn, label?)`,
  `acceptAction(fn, label?)`, `declineAction(fn, label?)`,
  `deleteAction(fn, label?)`. Builders that take the handler, per the `Table`
  field-module precedent. None sets `dismissPanel` — the default already
  resolves correctly for each. `NotificationAction` is public, so a consumer
  needing a seventh writes an object literal.
- **`Button` gained `tone="danger"`**, the destructive peer of `tone="accent"`.
- **`ActionWrapRow`** — a wrapping Layout row that centres its cross-axis, for a
  cluster of inline actions whose labels must share a line. `align` is
  load-bearing, not cosmetic: an inline action renders as a bare anchor when it
  navigates and a padded text button when it doesn't, and those have different
  box heights — under `WrapRow`'s default stretch both boxes fill the line but
  the anchor keeps its text at the top while the button centres its own, putting
  the labels ~9px apart.
- **`InboxPopoverSurface`** — `PopoverSurface`'s wider sibling (400–460px) for a
  popover whose rows carry inline actions rather than being single-action menu
  items. The **minWidth** is what does the work: the surface is shrink-to-fit, so
  a wrapping action row wraps instead of forcing the box wider and a raised cap
  is never reached. Plain menus and dropdowns keep the narrow 280–360px measure.

### Changed
- **`NotificationCenter.onAction` also makes the row body activatable.** It
  keeps its old meaning (it is still the fallback for an action with no handler
  of its own) and additionally wires `role="button"`, a tab stop, and
  Enter/Space onto the row — but **only when supplied**, so a row without it
  stays inert and advertises nothing. Same conditionally-interactive pattern as
  `FocusLabelBand` and `HeatStream`.
- **The `→` suffix now renders only on the `href` branch.** The arrow means
  "this navigates"; on every action of a multi-action row it read as noise.
  A non-`href` action's label is now unadorned.
- **`NotificationCenter` split into `types.ts` / `actions.ts` /
  `NotificationRow.tsx` / `NotificationCenter.tsx`.** Internal only — every
  public name still resolves from the same import paths.

### Fixed
- **`Button`'s tone matrix now reaches text buttons.** `.sui-btn--tone-*` lives
  in `Button.css` at the same `(0,1,0)` specificity as `.sui-btn--text` in
  `themes/_baseline.css` — which `themes/loader.ts` injects into `<head>` at
  runtime, *after* the bundled component CSS, so the variant won every tie.
  `tone="muted"` on a `TextButton` therefore rendered **accent**, and any new
  tone would have too. The text-variant tone rules now sit at `(0,2,0)` in the
  baseline, the same specificity lift `.sui-btn.sui-btn--pill` already takes.
  **Consumer-visible**: a `TextButton` explicitly passing `tone="muted"` now
  renders muted instead of accent. No such call site existed in SUI.

- **`NotificationCenter`'s panel no longer runs off the left edge of the
  viewport.** The panel hangs from the trigger's right edge, so a trigger near
  the left of the screen pushed the panel's left edge off-screen — already true
  at the old 284px measure, and worse now the inbox is 400px. `computePosition`
  clamps so the panel always keeps an 8px margin of viewport on its left, and
  re-measures once mounted so the clamp uses the real width. A trigger in the
  usual top-right header position is unaffected — its natural offset is already
  inside the clamp.

### Removed
- **`NotificationCenterProps.badgeTone`.** It was declared, documented as
  RESERVED, referenced nowhere, and rendered nothing — `CountBadge` is
  deliberately single-tone per the #2 Rule. Passing it has never had an effect,
  so removing it changes no rendering; it only stops the type advertising a
  control that does not exist.

### Deprecated
- **`NotificationItem.action`** — superseded by `actions`, which folds it in as
  a single-element list. Still honoured, and still closes the panel on
  activation: an action with no `onClick` routes to `onAction(item)` exactly as
  before, which is what keeps this release additive rather than breaking.
## 0.117.0

### Added

- **`DistributionSparkline`** — the sparkline for a series whose SPREAD
  matters, not just its direction. Draws a solid box for min..max with the
  direction shading, two dashed rules for the percentile band, a hairline at
  the mean, and the series clipped to the plot. `TrendSparkline` is unchanged
  and remains the right answer when "which way is this heading" is the whole
  question.

  `yDomain` is **required**, and it is data rather than visual config:
  auto-scaled, every range box fills its rect and the encoding says nothing.
  The picture only means something when a whole set shares one domain — and
  what counts as "the set" (every source, the filtered ones, one source over
  time) is a modelling decision the client owns, so the component takes the
  answer instead of guessing it. `p95DomainOf` and `extentDomainOf` ship
  alongside as the two rules we reach for most; neither is imposed.

  It has no size. The SVG fills its container in both axes and stretches, so
  it absorbs height from its row and width from its column — the same
  component serves a 28px table cell, a definition-list row and a 120px
  dashboard tile with no size prop at any of those call sites. Strokes are
  non-scaling, so a wide short cell does not produce fat horizontals and
  hairline verticals. As space runs out the marks thin themselves out via
  container queries (percentile rules below 100px wide or 40px tall, the mean
  below 60px/24px), because four horizontal marks in a table row is mud.

  Curried variant `P95Sparkline`; factory `createDistributionSparkline` for
  currying others.

  ```tsx
  const axis = p95DomainOf(sources.map((s) => s.values));
  <P95Sparkline values={source.values} yDomain={axis} />;
  ```

## 0.116.0

### Added

- **`FileDropZone`** — a drop target that is also a click-to-browse picker
  (`FileDropTarget`, `CompactFileDropTarget`). It validates the extension,
  shows a self-clearing rejection notice derived from `accept`
  (`PDF only — drop a .pdf file`), and hands the file to the caller; upload,
  parsing and results stay the caller's. Keyboard-operable (Enter/Space,
  without the page scrolling under it) and `aria`-labelled. Owns a minimal
  structural CSS file for the dashed outline, its drag-over/disabled states
  and the two densities — the same documented exception `Fab` carries, because
  a dashed target is not expressible as a `Surface` variant and the drag-over
  highlight is a state of the component, not of the surface scale. Added
  because two consumers had hand-rolled it, one of them carrying a code
  comment asking upstream for exactly this.
- **`SlotCard` gained an `error` slot, an `action` prop, and two templates.**
  `error` is a danger-toned line at priority 1 (a failure reason never drops).
  `action` (`{ label, onClick }`) mounts a trailing SUI-chosen ghost button on
  templates configured for it — typed rather than a JSX slot so SUI keeps
  owning the button variant — and its click never reaches the card's
  `onSelect`. New templates: `DenseStatusNote` (`DenseStatusRow` plus the
  failure line) and `TitleAssetProgress` (`TitleProgress` plus a
  sub-identifier and the action). Together they cover a work queue's running,
  queued and finished cards.
- **`NoShrinkColumn`** — a Layout variant that keeps its intrinsic width in a
  flex row (`flex-shrink:0`) while stacking its children. The column sibling
  of `NoShrinkClusterRow`: pair it with `GrowColumn` when a fixed data column
  (timestamps, IDs) sits beside a prose column that absorbs the slack.
- **`SectionTable` + `TableSectionHeader`** — a table that groups its rows
  under section headers, and the composable header itself (title + record
  count on one line).
- **`CashflowScrubChart` gained `yPadFraction`** — an optional tight,
  zero-independent y-domain.

### Fixed

- **A `SlotCard` row whose every slot is absent now renders no element at
  all**, so it costs neither markup nor the stack's gap. This is what lets a
  template carry a conditional row (`DenseStatusNote`'s error line) without a
  succeeded card growing a blank line.
- **`SlotCard`'s overlay cards reserve room for their overlays.** The corner
  badge and the remove glyph were landing on the first line of text as soon as
  the text was long enough to reach the corners. The remove ✕ is now revealed
  on hover or keyboard focus rather than always showing, so a resting list
  isn't a wall of ✕.
- **A vertical `Divider` collapsed to nothing in its most common host.**
  `height: 100%` has no definite basis to resolve against in a flex row sized
  by its content, so the rule simply didn't render. It now spans the row via
  `align-self: stretch`, keeping `min-height: 100%` for parents that do have a
  definite height.
- **`observeSize` applied library-wide.** Every remaining measuring component
  constructed a raw `ResizeObserver` writing signals synchronously, which
  re-queues the observer inside the browser's own delivery phase and produces
  "ResizeObserver loop completed with undelivered notifications" (several
  offenders render many times per page — `ResponsiveMoney` once per money
  cell, `createTruncationObserver` once per truncatable cell). Migrated:
  `MultiSelectFilter`, `ResponsiveMoney`, `createTruncationObserver`,
  `useContainerNarrow`, `ScrollRegion`, `OverflowNav`, `StaticSplitLayout`,
  `MessageBubble`, `CashflowChart`, `AnimatedSwimlaneChart`, `SwimlaneChart`,
  `ThroughputChart`, `StatusFlowChart`, `DagChart`. No public props changed
  and no measurement logic moved — only the scheduling. (`BucketQueue`, which
  landed on main after this work, still runs its own multi-element observer.)
- **`MessageBubble` leaked its ResizeObserver** — it was never disconnected,
  so the observer outlived every unmounted bubble. Now disposed via
  `onCleanup`.
- **`observeSize` tolerates entries without size data.** Polyfills and test
  doubles dispatch minimal `{ target }` entries; the primitive falls back to
  measuring the element rather than throwing on `contentRect.width`.

## 0.115.0

### Added
- **`NotificationCenter` gained `when`, `read`, and `onMarkAllRead`.** `when` is
  a pre-formatted relative time the consumer humanizes ("2m", "1d") — SUI ships
  no date formatter, so the string crosses the boundary already rendered. `read`
  drops an item's unread dot and removes it from the derived badge count.
  `onMarkAllRead` is what MOUNTS the pinned footer action: omit it and neither
  the footer nor its divider render, so the panel never shows a dead affordance.
  `markAllReadLabel` overrides the wording. All three are optional and additive.
- **`NotificationItem.tone` is now live.** It was declared in the props from the
  start and never rendered. It now colours the row's glyph well and picks the
  glyph (`info` → info, `task` → clock, `warning` → warning), defaulting to
  `info`.
- **`GrowTightStack`** — a Layout variant that grows to fill its share of a
  parent row and may shrink past its content (`flex:1; min-width:0`) while
  stacking its children with an `xs` gap. The tight sibling of `GrowStack`
  (whose `sm` gap reads as separate sections) for the text column of a
  media-object row. Added because the geometry had no variant — per the
  layout-purity rule, the missing variant is the finding.

### Changed
- **`NotificationCenter`'s panel is now an inbox, not a card stack.** Pinned
  header (label + de-emphasized count lozenge), scrolling rows, optional pinned
  footer. Rows became unboxed media objects — unread gutter, tone glyph well,
  text column — washed and bordered only on hover, so a long feed stays quiet at
  rest. This supersedes the three-line `CompactSurface` card canon the component
  shipped with; the only `Surface` in the panel is now the `PopoverSurface`.
  Precedent recorded in `docs/agents/design-decision-tree.md`, which also gains
  a *Notification / activity panel* branch it was missing.
- **`NotificationCenter`'s bell now has hover and open states.** It previously
  had neither — a bare transparent button, with nothing tying it to the panel
  hanging off it. It now takes a faint accent wash on hover, and while open an
  accent-tinted well with an accent border **plus** the glyph swapping
  `outline`→`solid`. Two independent signals, so the state survives a monochrome
  or colourblind theme. The open skin matches
  `.sui-dropdown--subtle.sui-dropdown--open`. The trigger also gained a fixed
  32px box so its corner badge clears the glyph instead of sitting on it, and
  the badge is ringed in the background colour to punch out of the open tint.
- **The derived badge count now excludes `read` items** as well as `transient`
  ones. Unchanged for consumers that never set `read`.

### Fixed
- **`Link` now carries a type scale (13px/500) instead of inheriting one.** It
  declared only colour, decoration, and cursor, and appears in no theme — so it
  rendered at whatever font-size it happened to inherit, the document's 16px in
  practice. Inside any dense component that made an inline link *larger than the
  0.875rem title above it*, and made it silently disagree with a sibling
  `TextButton` rendering the same affordance. 13px/500 matches `.sui-btn` in
  `themes/_baseline.css` deliberately: a text button and an inline link are
  alternate renderings of the same inline action — one navigates, one calls back
  — so a component that picks between them by `href` presence must not change
  size as a result. **Consumer-visible**: an app using `<Link>` in 16px prose
  will see those links render at 13px; wrap them in the appropriate `Text`
  variant if you want the prose scale back.
- **`NotificationCenter`'s two action branches no longer sit at different
  indents.** The `href` branch used `NavLink`, which is a nav-RAIL item and bakes
  `padding-left:16px` — so a link CTA rendered ~16px right of a `TextButton` CTA
  in the row above it. It now uses `Link` (the unpadded accent anchor, the right
  atom for an inline CTA), and both branches are wrapped in a `ClusterRow` so
  they size to their content and left-pack instead of stretching as column
  children and centring their own labels.
- **`NotificationCenter` item titles use `TextTitle` instead of `TextValue`.**
  `TextValue` is `1.5rem/600` — the metric-readout variant, for numbers like
  "42.3". Against the `0.75rem` detail line that was a 2× scale jump inside a
  340px popover, so a long title rendered as a five-line headline slab.

## 0.114.0

### Added
- **`fn.find`, `fn.findLast`, `fn.findIndex`, `fn.some`** — four more data-last
  helpers in the same dual (curried / direct) shape as `map` and `filter`.
  `find` and `findLast` carry the type-guard overload. `findLast` exists so a
  backward search needs no `.reverse()` link, which the house style forbids.

### Fixed
- **`Icon`'s `edit` and `trash` glyphs are now visible in the gallery.** Both
  existed in `ICON_PATHS` and were exported, but neither appeared in any
  `ICON_GROUPS` array — and the showcase renders the groups, so the two were
  undiscoverable to anyone browsing the icon set. A test now asserts that
  `ICON_GROUPS` covers every `ICON_PATHS` entry exactly once, and that no group
  lists a name with no path. No API change; both names already worked.
- **Bucket sizing no longer assumes a particular `renderItem`.** Four fixes, all
  in service of a consumer rendering whatever it likes:
  `.bucket-queue__row:first-child` used `border-top: none`, making that one row
  1px shorter than the rest — since sizing measures one row and multiplies by
  the count, every bucket under-counted by `(rows − 1)` px and scrolled a sliver
  it had room for (it now hides the border with `transparent` rather than
  removing it); the measured row is taken from the first *populated* bucket
  (bucket 0 is routinely empty, and measuring nothing left everything on the
  `ROW_FALLBACK` constant); the empty strip is measured too, since `emptyLabel`
  is consumer JSX and can wrap; and the `ResizeObserver` now watches the
  row/header/strip rather than only the root, on the `border-box` — a theme
  switch, a late web font or a changed `renderItem` resizes a row without
  resizing the root, so a root-only content-box observer never re-fired.

  **Known limitation:** the model measures one row and multiplies, so rows must
  be uniform within a queue. A `renderItem` whose height varies per item makes
  each bucket's natural height an estimate.

### Changed
- **BREAKING — `ProgressionQueue` is renamed `BucketQueue`.** 0.113.1 exported
  `ProgressionQueue`; that name is gone, with no alias. "Progression" implied
  stepwise forward movement the component never had — direction and distance
  fall out of bucket order, and a move from bucket 3 to bucket 1 is not
  special-cased. Renamed with it: the `sections` prop is now `buckets`, the
  `ProgressionSection` type is now `Bucket`, and the `.prog-queue__*` /
  `data-pq-*` hooks are now `.bucket-queue__*` / `data-bq-*` (`.prog-queue__section`
  specifically becomes `.bucket-queue__bucket`). Consumers importing only
  `SplitQueueList` are unaffected.
- **BREAKING — `onSelect` widens to `(key: string | null) => void`.** `null`
  means the worked bucket drained, so a consumer can clear its detail panel. It
  fires only from the triage advance, never from a click. **`strict: true` does
  not reliably catch this**: passing a Solid `Setter` directly
  (`onSelect={setSelected}`) still compiles, because `Setter`'s overloads absorb
  the wider parameter — and then stores `null` in your signal. Grep for
  `onSelect={setX}` rather than trusting the compiler; the fixed form is
  `onSelect={(k) => setSelected(k ?? undefined)}`.
- **`BucketQueue` is now the library's single queue component.** It gains
  multi-select grouping (`checkedKeys` / `onToggleCheck`, scoped to buckets
  marked `selectable`), roving-focus keyboard navigation
  (`focusedKey` / `onFocusChange`), `scrollToKey`, per-bucket `emptyLabel`, and
  a transfer animation played whenever an item's `bucketOf` result changes.
- **Moving the selected item advances the selection** to the next item still
  waiting in the bucket it left (successor taken from the source bucket's
  pre-move order, skipping anything that departed in the same batch). Processing
  the tail falls back *up* rather than jumping to the top; draining the bucket
  fires `onSelect(null)`. The roving tab stop follows; DOM focus deliberately
  does not move.
- **`renderItem` now returns bare content** — the row owns its padding, so a
  selected row's accent bar can never touch consumer content and the header,
  rows and empty strip share one left edge.
- **Checked rows no longer paint a background fill.** Checking is a bulk action,
  so the tint became a band of low-contrast rows that fought the hover fill. The
  filled checkbox is now the entire treatment.
- **A selected row no longer paints a background fill** — it keeps only the inset
  accent bar, and hover owns the fill. The previous persistent fill sat behind
  row text at too low a contrast.

### Deprecated
- **`SplitQueueList` is a compile shim over `BucketQueue`** and is removed in
  the next major. It is **not** pixel-identical — the merged component draws its
  own chrome. `topCapRows` maps to the resolved bucket's `capRows`;
  `topOnly`, `topFloorRows`, `animationMs` and `rowHeight` are accepted but
  ignored. `static` mode still delegates to
  `StaticSplitLayout`, which is **not** deprecated.

### Removed
- `SplitQueueList`'s two-pane animation engine (`flight`, `play`, `flip`,
  `arrival`, `animation`, and its `layout` module) — ~2,700 lines. Its
  `keyboard` module was not removed — it moved (and was adapted) to
  `BucketQueue/keyboard.ts`.

### Migration
Replace `resolved` / `unresolved` with one `items` array plus `bucketOf`:

```tsx
<BucketQueue<T>
  buckets={[
    { key: "done", label: "Categorized", tone: "success" },
    { key: "todo", label: "Suggestions", tone: "accent", selectable: true },
  ]}
  items={[...resolved, ...unresolved]}
  bucketOf={(i) => (isDone(i) ? "done" : "todo")}
  keyOf={(i) => i.key}
  renderItem={renderRow}
/>
```

There is no `selectMode` prop — pass `checkedKeys` to turn select mode on.

## 0.113.1

### Fixed

- **`NotificationCenter` overlay chrome moved to CSS.** 0.113.0 shipped the component with its trigger + corner-badge positioning as inline `style={{…}}` object literals, which regressed the `health` vision ratchet (`styleRubricViolations` 0→4, `inlineStyleSrc` 75→79) — ADR-0003's inline-style rubric can't categorize `position`/`display`/`cursor`/`border`. The static positioning chrome now lives in a minimal `NotificationCenter.css` (the same overlay-chrome exception `PopoverMenu`/`Dropdown`/`Toast`/`Fab` take); only the dynamic panel position rides inline via the computed `panelStyle()`. No public API or visual change.

## 0.113.0

### Added

- **`NotificationCenter`** (Depth 3) — generic, router-agnostic notification center: a bell trigger with a rolling count badge and a dropdown of notification items (title + optional detail + optional CTA), built as a zero-CSS composite. Handles open/close (controlled **and** uncontrolled `open`), outside-click/Esc close, a busy spinner, and a polite `aria-live` announcement; the consumer supplies `items` and navigates via the `onAction` callback — no `@solidjs/router` dependency and no dependence on consumer CSS. Items render as the three-line card canon (`CompactSurface` → title row / muted detail / accent action). Extracted from thorcasting-ui. `badgeTone` and item `tone` are reserved in the exported types (a single non-danger treatment ships now — minimal-variant rule).
- **`CountBadge`** (Badge family) — count-only rolling corner pill (composes `DigitRoller`) for overlaying a trigger's corner.
- **`PopoverSurface`** Surface Curried Variant + **`Surface` `shadow` prop** — elevated floating panel (bg-elevated, hairline border, drop shadow, 280–360px wide) for overlay controls.
- **`Icon` `bell` glyph** (outline + solid).
- **`.sui-sr-only`** global utility — screen-reader-only clip technique for `aria-live` status regions.

## 0.112.1

### Fixed

- **`setPointerCapture` no longer crashes a drag gesture when its element is disconnected.** `Chart.onPointerDown` called `setPointerCapture` on a stored `svgEl` ref (not `e.currentTarget`); when a reactive re-render or mid-gesture unmount detached that ref, Chromium threw `InvalidStateError`, which propagated uncaught through Solid's event delegation and crashed the consumer app (Vite overlay). The `?.` only guarded the method being absent (jsdom), not it throwing. New shared helper `safeSetPointerCapture()` swallows the two benign, expected failures — `InvalidStateError` (element disconnected) and `NotFoundError` (no active pointer) — and warns on anything else; all four capture sites (`Chart`, `DateAxis`, `ScrubChart`, `DagChart`) route through it, folding `DagChart`'s existing inline try/catch into the shared helper. (Log prefix changed from `[DagChart] setPointerCapture threw:` to `[SUI] setPointerCapture threw:`.)

## 0.112.0

### Added

- **`Auth/` category — `ManagedListSection` + `DismissibleNoticeBanner`** (ruled 2026-07-22): user-confirmed Auth0 account linking (add/remove login methods, two-click confirms, first-use popup-retry) and the unlinked-sibling notice banner, migrated from thorcasting-ui. Both take the auth API via the `auth` Data Prop (structural `AuthApi` in `Auth/types.ts`) — dependency injection; SUI gains no dependency. Apps pass `authApi` from `@primestageprime/auth0-stdb-client`.
- **`NoticeBar`** Surface Curried Variant — full-width flush informational bar (row, center, accent-tinted, radius none) for top-of-app notices.

## 0.111.1

### Fixed

- Build fix: the barrel no longer exports an uncommitted module (0.111.0 failed to publish). No API change from 0.111.0.

## 0.111.0

### Added

- **`BucketQueue<T>`** (ruled 2026-07-22) — a Composite (Depth 2) that stacks N always-present buckets into one full-height bar, bucketing items through their lifecycle as a progression (e.g. terminal-happy on top, terminal-unhappy in the middle, transient at the bottom). Every bucket shows its count at all times. **Sizing is a weighted water-fill measured in JS** (pure CSS can't express it): an empty bucket collapses to just its summary line; a populated bucket shrink-wraps; when the populated buckets overflow the height they share it by `weight`, each capped at its content, so a bucket that shrinks under its share hands the surplus back and the others expand to fill. Chrome is thematically **neutral** — the only role color is a **dot** beside each bucket label. Controlled, optional selection (`onSelect`/`selectedKey`); fills its parent's height or an explicit `height`. Generic over the item type: the consumer owns `buckets`, `items`, `bucketOf`, `keyOf`, `renderItem`. The pure sizing core is exported as `allocateHeights(input)`. Full docs in `COMPONENTS.md`.

## 0.110.0

### Changed

- **`floatCol` displays the value AS GIVEN — it no longer rounds, and the `precision` prop is removed** (ruled 2026-07-22). Rounding a displayed number is a DATA decision, not a display one: it belongs at the storage/query layer (or the calculation function deriving the value) so every view of the same figure agrees, and so a table can't paper over storage imprecision. `floatCol` now groups thousands (pure presentation) and renders exactly the number it's handed. **BREAKING — `floatCol(source, { precision })` no longer compiles; move the rounding to where the value is produced.** If a float shows too many digits, round it in SQL / the store / the calc fn, not in the column.
- **`aggregateCol` and `avgCol` drop `precision` too** — same rule. An aggregate's precision is the `combine` function's job: `avgCol` shows the RAW mean (a mean is rarely a clean number), so a rounded average is `aggregateCol(keys, (v) => Math.round(mean(v)), …)` — the rounding lives in the calculation, never a display knob.
- The low-level `FloatCell` renderer is unchanged and keeps its `precision` prop — it's the primitive escape hatch (`col(…, "float")`, `columnHelpers`), not the curried column. The doctrine applies to the curried `floatCol`/`aggregateCol`/`avgCol` surface.

## 0.109.0

### Changed

- **`FieldTable` runs on `table-layout: auto` — the width model IS the engine** (ruled 2026-07-21). Every column emits `width` = its MAX (auto layout's preferred width) and `min-width` = its MIN; the legacy auto algorithm distributes surplus over minimums ∝ (preferred − min), which is exactly the model's range-proportional rule. The table grows to Σmax and stops; between Σmin and Σmax variable columns shrink proportionally to their range; below Σmin the frame scrolls. Fixed layout (which cannot express min+max) and the 0.108.2 trailing spacer column are retired. Variable columns render their cells inside a size-contained clip block so nowrap content cannot inflate the minimum.
- **Fill mode is shrink-to-fit** (ruled 2026-07-21) — a fill-mode `FieldTable` (no `maxRows`) hugs its content height when the rows fit, and shrinks to the container (inner scroll, sticky header) only when they overflow. Previously the frame carried `flex:1` and stretched a 4-row table into a full-height, mostly-empty panel. Fill mode still expects a definite-height flex parent as its budget; **dside/thorcasting re-eyeball item — fill tables that relied on the frame visually stretching now hug their rows.**
- **Label floors budget the header tracking** (ruled 2026-07-21: headers ALWAYS keep the inter-column gap) — `BaseTable` headers render uppercase with `0.1em` letter-spacing (~0.17ch/glyph at the frame's mono basis) that the raw char-count floor never budgeted, so long-label fixed columns overflowed across the gap into the neighboring header ("CAPTURE EFFICIENCY" ran into "PROJECTED NOX"). The floor now costs labels at `ceil(length × 1.17)`. Label-floored columns are ~17% wider; header spill is structurally impossible.
- **`statusCol` geometry derives from its mapping** — content-fit fixed at the longest badge label plus an 18px badge-chrome budget (the sm badge's own padding/border/letter-spacing, which the flat 9ch geometry never included — a 9-glyph VIOLATION badge is 82px and clipped in its 67px content box). The static 9ch geo remains only as the `col(…, "status")` fallback.

### Added

- **`fields.enumCol(key, values, { tone?, header? })`** (ruled 2026-07-21) — a small fixed-set string column: because the value set is known at configure time, geometry is content-fit FIXED at the longest member (a Before/During/After enum sizes to 6ch instead of textCol's 8–40ch flex). Floored at the header label; left-aligned plain word (not intCol's numbers, not statusCol's badges); null blank; off-set values render muted; any member over 20 characters throws at configure time pointing to `textCol`.
- **Sized text set: `text5Col` / `text10Col` / `text15Col` / `text20Col`** (ruled 2026-07-21) — curried FIXED-width text columns for short strings whose length class is known (codes, phone numbers, short ids). Pick the smallest class the values fit, rounded up to the nearest 5; same ellipsis-with-tooltip cell as `textCol`, floored at the label.
- **Sized name set: `name10Col` … `name30Col` and `identityLink10Col` … `identityLink30Col`** (ruled 2026-07-21) — the same 5-ch ladder for name columns and identity links (the identity column is usually the link). When the name population is known, pick the nearest class ≥ the longest legitimate value; unknown populations keep the survey-driven 50ch `nameCol`/`identityLinkCol` default.
- **`col()` accepts the sized classes** — `"text5"`…`"text20"` and `"name10"`…`"name30"` join the escape hatch's named-geometry vocabulary (flowing alignment), so composite custom cells can be content-fit instead of riding the text flex.

### Fixed

- **Fill-mode `FieldTable` scrolls internally** — the `.sui-field-frame--fill` modifier makes the frame the definite-height flex context the composed fill table needs; the inner `ScrollFillColumn` is the single scroll owner (repro: NOx Report bottom bag table showed only its header).
- **`col()` aligns like the real factory of its geometry** — numeric customs right-align (a dotted-header metric column read differently from its plain floatCol siblings); date/dateTime/selection/chart center; flowing text stays left.

## 0.108.2

### Fixed

- **`FieldTable`: fixed columns stay fixed when the table stretches** — a trailing auto spacer column (empty header/cells, zero geometry) absorbs stretch slack; without it, `table-layout: fixed` inflated every width-carrying column proportionally (a stretched two-column table ballooned its 19ch timestamp). The spacer collapses to nothing at the table's minimum width.

## 0.108.1

### Fixed

- **Field-table headers never overlap their neighbors** (ruled 2026-07-21), three mechanisms:
  - **Label floor** — a column is never narrower than its own header label (`floorGeoAtLabel`; a "Postal Code" header over 5-digit data widens the column instead of painting over the next header). Every labeled factory floors its geometry.
  - **Sort-glyph budget** — sortable mode widens every sortValue-carrying column by the 2ch indicator allowance (`resolveFields(…, { sortable })`), so the ▲/⇅ glyph never rides past the label.
  - **Flexible width basis** — flexible (no-css) columns now emit their floored `minCh` (+ cell chrome) as a width; `table-layout: fixed` splits leftover space equally among width-less columns and ignores `minCh`, which made the floor invisible and ate the standard inter-column gap.
- **Dev catalog panes stretch tables to the available width** — inspection surface, not dashboard tiles; the library's Σmax "tile" cap is unchanged for consumers.

## 0.108.0

### Added

- **`fields.linkedCountCol(source, { href, header?, id?, tone? })`** (ruled 2026-07-20) — an integer drill-down count: a POSITIVE count links via `href`, zero/null renders the plain cell, never a dead link. Built as `withHref` over `intCol` (geometry, formatting, sort, null-blank, tone all inherited); the zero-has-no-destination gate is a count *semantic*, which is the scoped exception to the combinator-first ruling. Spec: `docs/superpowers/specs/2026-07-20-linked-count-col-design.md`.
- **`fields.withHref` / `withHint` / `withWhen` column combinators** (ruled 2026-07-20) — function-first decoration of ANY built column, dual form like `fn`: `withHref(href, col)` links the cell (nullish href → plain cell); `withHint(text, col)` grows a dotted-underline tooltip on the header; `withWhen(pred, col)` renders the cell only when the predicate holds — per-row colspan takeovers collapse to predicate-gated columns (a partial week blanks its stats and shows the row action instead).
- **`fields.group(label, [...members])`** (ruled 2026-07-20) — two-row spanned category headers as a fourth `FieldSpec` variant: the resolver stamps each member with the group label and BaseTable derives the colspan header row (ungrouped columns span both rows). The last "stays raw by design" demand falls — the JTF Table Catalog bench is 31/31 SUI-compliant.
- **`fields.aggregateCol`** (ruled 2026-07-20) — generic aggregate column: the math (sum/mean/custom) is named at configure time, emphasis at int geometry.
- **`EllipsisText` + `createTruncationObserver`** (ruled 2026-07-20) — "if and only if the ellipsis appears, there is a tooltip with the full value." A ResizeObserver-backed truncation hook re-measures on every reflow (the old mount/window-resize measurement went stale on container reflow); `LongTextCell`, `StringCell`, `IdCell`, and `listCol`'s +N-more all route through it.
- **`fn.flatMap`, `fn.prop`, `fn.length`, `fn.lengthOf` + direct application form** (ruled 2026-07-18) — every `fn` helper now applies directly as `map(f, arr)` alongside the curried `map(f)`; function-first property access joins the module.
- **`ACTION_ICONS`: `remove` → trash, `run_checks` → refresh** — the trailing remove-action and conditional run-action columns are now expressible with stock `actionCol`.
- **Health ratchets: `dotChains` + `collectionMethodCalls`** (ruled 2026-07-18) — method chaining and bare collection-method calls are counted and may only go down; `src/fn/` is the sanctioned home for the native calls. ~20 trickle commits migrated existing chains onto `fn` composition.

### Fixed

- **Field tables: right-edge column clipping** — the `<table>` element kept the sans font family, so its ch-based `min-width` resolved ~4.5% wider than the frame's identical budget; `table-layout: fixed` stretched every column past its geometry and the frame clipped the last column mid-glyph (also the cause of overlapping headers on narrow panes). The table element now shares the frame's ONE ch basis (12px mono).
- **`withHref`/`identityLinkCol`: nullish href renders the plain cell** — never a dead link (zero-count buckets, missing spreadsheet URLs).
- **`PopoverMenu`: panel portals to `document.body`** so an `overflow: hidden` ancestor can't clip it; header-slot tests query the portalled panel.
- **`Dropdown` self-themes via tokens** in component CSS.

### Changed

- **JTF Table Catalog bench: 31/31 SUI-compliant; the not-yet-curried demand rail is EMPTY.** The closing rulings (all 2026-07-20): row navigation collapses to the identity cell (`identityLinkCol` is the nav; FieldTable never grows `onRowClick`); per-row colspan collapses to `withWhen`-gated columns + a row action; the QaqcTriage "P% (N)" composite collapses to the linked count; NOx preview's added calls are REMOVED from the picker (they live in the bag table) so `createFieldSelection` covers selection entirely; a known-set string column is `statusCol`, never a flexing `textCol` — the identity column is the table's only flexible one.
- Bench replicas migrated to fields registries: QaqcAssetTriage, Weekly QA/QC, NOx preview + report bag, Cached Vessel Calls, HourLevelDataTable (grouped), HourlyDataTable, Durability, 1000-Hour Manifest, MetricsStatsTable, MinMaxTable, VesselCallNox/RogDetail, NoxWidgets, Fortnight list, PowerLogCacheView.

## 0.107.0

### Added

- **Table-level sorting** (ruled 2026-07-18) — **`SortableFieldTable`** (curried; or `sortable` on `FieldTable`): a sortable table makes every column sortable except types with no valid sort order (selection, actions, lists, charts); no per-column opt-out. Mechanics: `TableColumn.sortValue?: (row) => raw` — field accessors return JSX, so the comparator now reads the raw channel (this also fixes the silently broken sort on all pre-existing field columns); `fields.col()` takes `sortValue` as its 5th argument.
- **`TableQuickFilter`** (ruled 2026-07-18) — the client-side filter module extracted from `FilterableTable`, composable with ANY table: fixed toolbar (input + shown-of-total count), children receive the filtered-rows accessor once so the composed table never remounts while typing. `FilterableTable` is now `BaseTable` composed with it. (Sibling: the generic `QuickFilter` collection filter is unchanged.)
- **`fields.identityLinkCol(key, { href, glyph?, header? })`** (ruled 2026-07-18) — the IdentityLink cell: an entity with a detail page displays its name AS the link by default. Configure-time `href(row)`, optional `glyph(row)`, name geometry, accent ink, blank for empty names.
- **`fn` namespace** (ruled 2026-07-18) — data-last functional utilities + typed `pipe` (12-arity overloads, NO untyped rest fallback — a mis-wired pipe is a compile error): `map`, `filter` (type-guard narrowing), `pluck`, `sortBy` (stable, non-mutating), `sum`, `mean`, `join`, `groupBy`. Self-contained under `src/fn/` (liftable to its own package); 16 call sites migrated off dot-chains.
- **`fields.statusCol` / `fields.listCol` / `fields.avgCol`** (ruled 2026-07-18, shipped post-0.106) — curried badge-mapping cell, comma-list cell with +N-more overflow and full-list tooltip, and configured-keys row-mean cell (accent by default).

### Changed

- **Name columns are FIXED at 50ch** (ruled 2026-07-18) — names never get squeezed; `name`/`identityLink` geometry pins at the survey-backed 50ch cap and ellipsis clips only dirty data past it. The field frame now floors its table at the Σmin budget and scrolls the excess horizontally; the resolver's floor counts css-width columns at their full consumed width.
- **Blank empties in fields** (ruled 2026-07-18) — `textCol`/`nameCol`/`statusCol`/`listCol`/`avgCol` render nullish values as blank, never an em-dash or EMPTY badge; visible placeholders are opt-in only where they carry meaning.
- **Client guidance: curried variants ONLY** (ruled 2026-07-18) — every "use curried variants or `create*()`" note (26 barrels + AGENT_GUIDE) now reads curried variants only; the app-local factory path is removed from the docs. `create*` exports remain for existing consumers pending migration.
- jtf-ui migrated: ViolationsPreview (SortableFieldTable + TableQuickFilter + identityLinkCol vessel, data-layer compliance tones), MissingInfoPreview (statusCol/listCol), FortnightReportBody OCR table, power-log-ocr avgCol. JTF Table Catalog bench: 15 of 32 SUI — the fortnight route group is fully migrated.

## 0.106.0

### ⚠ Breaking

- **`fields.selectionCol` signature** — now takes a `FieldSelection` (from `createFieldSelection({ rows, key })`) instead of `(isSelected, toggle)` positional callbacks, in exchange for the select-all header and shift-range behavior. (The fields system was unreleased pre-0.106, so no production consumer breaks.)
- **`fields.floatCol` precision** — moved from a positional second argument into the options object: `floatCol(key, { precision, tone })`.

### Added

- **Table fields system promoted** (ruled 2026-07-17) — exported from the barrel as the `fields` namespace + top-level **`FieldTable`**. A table is an ordered gesture of field ids resolved against a plain registry object; field types own ALL geometry in ch/em; call sites never see width/align/CSS. `FieldTable` owns the width-budget frame internally and adds `emptyMessage` and a semantic `maxRows` scroll cap (em-based, zoom-proportional). Dedicated `Table Fields` showcase; workshop bench retired.
- **Tone treatment functions** (ruled 2026-07-17) — `intCol`/`floatCol`/`textCol` accept a configure-time `tone: (value, row) => Tone`; `Tone` (`default|success|warning|danger|accent|muted`) lives in `src/types.ts` as the shared semantic vocabulary. Clients name meanings; themes own colors.
- **Generic selection** (ruled 2026-07-17) — `fields.createFieldSelection({ rows, key })` + `selectionCol(selection)`: select-all/none header checkbox (indeterminate over a partial selection) and shift-click range selection across the current sort order (Gmail semantics, keyed anchor; shift-mousedown suppresses the native text-selection smear).
- **`Checkbox`: `indeterminate` prop** — semantic mixed-state for aggregate checkboxes; synced to the DOM property via ref, dash styling in every theme.
- **`ValueMatrix`** (ruled 2026-07-17) — a row-axis × column-axis grid of computed values (NOT a row table): `rows`, `cols`, `value(row, col)`, configure-time `tone(value, row, col)` and `selected(row, col)`, null → em-dash, selected cell wears weight + a soft halo. `createValueMatrix` curries the mapping surface (`rowAxisLabel`/`rowLabel`/`colLabel`/`format`/`tone`) into a domain matrix (jtf's ComplianceThresholdTable is now a thin wrapper; fits thorcasting's viable-price × salaries grid). Dedicated showcase.
- **`fields` humanize** — handles snake_case keys (`metric_id` → "Metric Id") alongside camelCase.

### Changed

- jtf-ui easy-tier tables migrated to `FieldTable`/fields registries (StatisticsSummary, MinMaxTable, ftir-gap-fill, power-log-ocr, FortnightReportBody's seven metric tables); every call-site width/align/color deleted. Field-type catalog for the remaining tiers: `docs/superpowers/plans/2026-07-17-field-type-catalog.md`.

## 0.105.0

### ⚠ Breaking

- **`HeatStack` renders rows in input order** (first item at top). It previously reversed the array ("earliest at bottom"); Peter ruled that a bug — visual order now matches array order. Consumers relying on the bottom-up stacking must reverse their input.
- **`TagInput` removed** — unused by every production consumer (dside, Amygdala, jtf, goose, wellappoint, thorcasting), pruned per the new production-repo prune rule.
- **`BigNumberInput`: deprecated `prefix`/`sign` static-glyph props removed** (superseded by currency masking; no production caller).
- **`MultiSelectFilter`: `optionWidthEstimate` tuning prop removed** (fit estimate fixed at ~90px/option; no production caller ever set it).

### Added

- **`ChartHeader`** — Composed (Depth 2), zero CSS. The standard chart title strip (mono accent title left, muted meta right, spread). `CompletionTimeline` now composes it, removing the last real inline-style cluster in src.
- **`createDropdown` + `InlineSubtleDropdown`** — Dropdown gains the Overrides/DataProps split (`size`/`subtle` curried); `InlineSubtleDropdown` (sm, subtle) is the compact inline-picker form thorcasting configures by hand today.
- **CONTEXT.md: `Structural` Primitive subkind** — chart/SVG-geometry primitives (axes, grids, series, bands) are now a defined third subkind alongside Atomic and Layout.
- **Gallery chrome: `.demo-frame` / `.demo-cols`** — dashed demo frames and comparison columns for visualizing invisible layout components; `stack.tsx` and `row.tsx` showcases recomposed onto them (21 → 2 inline styles).
- **`--sui-series-1..8` categorical data-viz palette** — every theme (default, HUD, bronze, colorblind) now declares eight fixed, CVD-validated series slots; callers colour chart series / legend swatches / category dots by `var(--sui-series-N)` instead of hardcoding hues. Eight is a hard cap; the status tokens (`--sui-success`/`--sui-warning`/`--sui-danger`) are reserved for meaning and never a series slot. See ADR 0003.
- **`BaseTable`: `onRowHover` callback** — fires with the hovered row for cross-highlighting between a table and a linked chart.
- **`Chart`: `responsive` prop** — fills the container width via a `viewBox` aspect ratio instead of a fixed pixel width.
- **Inline-style rubric linter (`scripts/style-rubric.mjs`) + ADR 0003** — a compiler-API walker classifies every `src` inline style against a category allow-list (`scripts/style-rubric.json`); a static-literal inline is now a `styleRubricViolations` health violation (ratcheted at 0). Curried variants in `variants.ts` are the sanctioned home for static presentational config.
- **Production usage manifest (`scripts/usage-manifest.mjs` + `docs/usage-manifest.json`)** — surveys which SUI exports each production consumer (dside, amygdala, jtf, goose, wellappoint, thorcasting) actually imports; `--check` guards the manifest against drift in the pre-push gate.
- **12 curried variants promoted for the jtf-ui migration** (real call sites, no new props/components). Text: **`EmphasisBody`** / **`AccentEmphasisBody`** (inline bold 600, plain + accent), **`NoteText`** (italic sublabel note), **`WarningBody`** / **`SuccessBody`** (status-tinted body, joining `DangerBody`), **`DangerSublabel`** (inline error caption), **`CaptionLabel`** / **`AccentCaptionLabel`** (uppercase letter-spaced section captions, secondary + accent), and **`TopicTitle`** (`title` variant, `as="h4"` — the h4 level of the `PageTitle`/`SectionTitle`/`SubsectionTitle` heading series). Button: **`SmallOutlinedButton`** (outlined, sm). Modal: **`PrimaryConfirmationModal`** (md, clip, primary) / **`LargePrimaryConfirmationModal`** (lg sibling).

### Changed

- **Workshop benches count toward showcase purity** (ruling reversal): benches use curried SUI layouts/text for chrome like any showcase; inline styles only for genuinely dynamic experiment geometry.

### Fixed

- **`StackedProgressBar` segments actually stack now.** Solid silently drops the first of two computed keys in a style object literal, so the cumulative `left`/`bottom` offset never rendered — every segment sat at the start edge, overlapping, since the component's inception (found by the new test batch, verified in Chrome). Fixed with explicit per-orientation style objects; regression test asserts the offsets.
- **`HotkeyButton.isEditableTarget`** now returns a real boolean (`isContentEditable ?? false`) instead of `undefined` for non-editable elements.

### Added

- **`npm run health`** — vision-adherence health check with a CI ratchet (`scripts/health.mjs` + `scripts/health-baseline.json`, new `health` job in ci.yml). Mechanical KPIs — bare hex colors in CSS/TSX, inline `style={{}}` counts in src and showcases, folders without tests, undocumented components, missing Depth headers — may only decrease; a deliberate increase requires committing an updated baseline. `--verbose` lists offenders, `--update-baseline` locks in improvements.

### Removed

- **`hopper.tsx` ("All Components") deleted from the gallery.** The legacy kitchen-sink showcase predated the workshop system; every component it demoed has a dedicated showcase.
- **`animation-experiments.tsx` moved to `workshop:animation-lab`** — the animation R&D lab is now a proper bench (`dev/showcases/workshop/animation-lab.tsx`) with a strict lab contract in its header (named isolated experiments, real library internals only, leaf module, extract-then-A/B). Workshop benches are labs and are now exempt from the showcase-purity health KPI.

### Fixed

- **Token purity extended to TSX/TS: all remaining bare hex colors removed from src.** `SidebarSelector` demo fixtures, `MetricValueCell`'s violation default, `ConversationTree` bubble colors, `WorkProgressCard`'s bar palette, and `WarningTitle` now use `--sui-*` tokens (originals kept as fallbacks); the health scan now covers `.ts` files too. Static inline styles in `Section`, `CensusView`, and the `SidebarSelector` demo moved to their component CSS.
- **`StatusCard` no longer crashes on mount when `ResizeObserver` is unavailable** (jsdom/SSR) — guarded like `MessageBubble`.
- **Test coverage: 23 previously-untested component folders now have tests** (+125 tests; issue #48 phase 4 batches 1-2). 46 component headers gained explicit kind/depth declarations; 27 uncataloged components documented in COMPONENTS.md; worst showcases (recent-starred, progress-card, checkbox) recomposed with curried vocabulary.

- **Token purity: all 25 bare hex colors removed from component CSS** (plus `GroupedTable`'s inline `#ff6b6b` → `var(--sui-danger)`). Every hardcoded color now derives from a `--sui-*` token with the original value as fallback: dark-text-on-accent → `var(--sui-bg-deep)` (Button/ActionRow/AssigneeChips, matching SegmentedControl's precedent), Alarm reds → `var(--sui-danger)`, MathFormula number gold and RecentStarred star colors → `var(--sui-warning)`, RecentStarred surface palette → bg/border/text tokens, Table info-tag blue → accent tokens, and derived shades (CashflowChart project/onetime bars, Table danger hover, Alarm count tint) via `color-mix()` on the token. Themes now retint these components; under the default theme values shift only marginally toward their semantic tokens.

- **`Sparkline`** — Atomic (Depth 1). Generic inline SVG polyline sparkline with `line` and `sawtooth` modes; color is prop-driven (`var(--sui-accent)` default). Complements `TrendSparkline` (trend-colored) and `HeartbeatSparkline` (0..1 health strips).

## 0.104.0

### Added

- **Choreography module (public API)** — `choreograph`/`step`/`weightedStep`/`commit` sequence named animation EFFECTS (`collapse`, `expand`, `fadeIn`, `fadeOut`, `slideDown`, `rollUp`, `glowIn`, `settleIn`) across components around an explicit state-commit point; targets are `data-anim` handles (spread via the `anim(handle)` helper). Weight-fractions of one timing budget; hidden-tab hardened. Exported from the root barrel.
- **`GhostRow` / `IndentedGhostRow`** — de-emphasized clickable row (dim unless `selected`, pointer only when clickable; indented form for rail children). `createGhostRow` factory.
- **`createIcon` + `InlineMetaIcon`** — Icon gains the Overrides/DataProps split (`variant`/`size` curried, `name` stays data); `InlineMetaIcon` (outline, xs) ships for icon-beside-sublabel meta rows.
- **`createThreePanelLayout`** — geometry props (panel widths, height, aside cap) become curry-able Overrides so apps bake their layout rulings once.
- **`NoWrapSublabel`** — Text variant with `white-space: nowrap` baked (trailing meta that must stay one line).

### Changed

- **Numeric counts roll by default.** `DigitRoller` now auto-tracks its previous value: a bare `<DigitRoller value={n}/>` rolls odometer-style (direction-aware) on every change — `previousValue` becomes an optional override for replaying a specific transition, and `animate` defaults to true (`animate={false}` opts out). `CountChip` and `TagPill` (purely-numeric plain labels) compose it internally, so every count in the library gets the roll with zero call-site changes. Caveat: the roll requires the component instance to SURVIVE the value change — lists that rebuild row objects each update must render with `<Index>`/stable keys, not `<For>` (see the new STYLE_GUIDE "List Identity" section).

## 0.103.0

### ⚠ BREAKING

- **Layout Purity migration — the entire library recomposed.** All 95 components were migrated to the new Layout Purity commandment (STYLE_GUIDE.md): no component owns box-model geometry (`flex`/`grid`/`gap`/`align`/`justify`/`overflow`) — everything composes named `Layout` variants. Public **props are byte-identical** (zero call-signature changes), but the rendered **DOM wrapper structure and internal class names changed across the library**: consumer CSS that targets a component's internal classes or relies on its exact element nesting may break. Off-scale internal gaps (6/12/16px) were snapped to the `xs(4)`/`sm(8)` scale, so small visual spacing shifts are expected.
- **`createBox`/`createStack`/`createRow` factories: caller `style` no longer clobbers baked style.** The factories previously shallow-merged, so a caller's `style` object wiped the variant's baked styles entirely — which shipped `ScrollYBox` (and every scroll variant) with its `overflow` silently deleted whenever a consumer passed `style={{ "max-height": … }}`. Styles now merge per-property (baked first, caller wins). Any consumer that depended on full-object clobbering will now see the variant's baked properties come through.

### Added

- **~28 new Layout variants + 2 primitives** — role-named vocabulary demanded by the migration, including `Grid`/`createGrid` and `AutoStackRow`/`AutoStackItem` (responsive 2-D primitives), `ClipBox`, `ScrollBox`, `ScrollFillBox`, `ScrollXBox`, `ScrollYBox`, `ScrollFillColumn`, `ClipFillColumnFlush`, `CenteredColumn`, `LabelValueGrid`, `ChipCluster`, `BaselineWrapRow`, `GrowClusterRow`, and more — each with a when-to-use comment in `Layout/variants.ts`.
- **`Icon`: `pause`, `agent`, `dependency` glyphs.** `agent` (robot head) is the automated counterpart to `user`, mirroring dside's `Species: Human | Agent`.
- **`HotkeyButton`: optional leading `icon` prop** (backwards compatible) — associates an action with its thematic glyph.
- **`typecheck:dev` gate** — `tsconfig.dev.json` now compiles the dev gallery, and CI enforces it, so the Overrides/DataProps currying rules are type-checked at every call site including showcases.

### Deprecated

- **`ButtonGroup`** — tagged `layout` but deprecated; migrate to the curried variants shipped alongside. No breaking change; existing call sites keep working.

### Fixed

- **`Divider` — rendered nothing.** The CSS set `border:none` and a 1px box but never a color, so solid dividers were transparent and dashed/dotted had no border style at all. Now draws `var(--sui-border)` in all orientation/variant combinations.
- **`Surface` — `active` state was invisible on variants with baked colors.** `bg`/`borderColor` are applied as inline styles, which silently overrode the `.surface--active` class, so `InteractiveCard active` (and any colored variant) never showed its selection. Active now owns background/border. Also themed the active colors (`--sui-accent` tokens replace hardcoded cyan).
- **`BaseTable` / `DataTableContainer` / `SelectableTable` — `maxHeight` scroll actually scrolls.** Consequence of the style-merge fix above; `SelectableTable` additionally had a latent regression (it read a no-longer-overflowing container style) that the migration restored.

## 0.102.0

### Added

- **`ScenarioGlyph`** — Atomic (Depth 1), Badge family. The accent-coloured, filled-or-hollow, **shaped** sibling of `ScenarioDot`: where `ScenarioDot` is always a circle, `ScenarioGlyph` renders any `ShapeGlyph` shape (`circle` / `chevron` / `diamond` / `square` / `pentagon` / …) so a scenario is recognisable by its **shape** as well as its colour — the same glyph on its chip, its calibrate column header, and its config-membership icons. `filled` → a solid glyph (the selected scenario / the drawn line); omitted → an outline only (unselected). Wraps the SVG-only `ShapeGlyph` primitive in an inline `<svg>` (with `overflow: visible` so a full-diameter hollow stroke never clips) so it drops into a text row exactly like `ScenarioDot`. Props: `color`, `shape`, `filled?`, `size?` (default 10), plus pass-through span attrs (`title` for hover). Data-only, no curried variant.

### Changed

- **`ShapeGlyph` — new built-in shapes + a `hollow` mode.** Added `diamond`, `square`, and `pentagon` to the built-in `Shape` union (centered in the 16×16 viewBox alongside `chevron`/`chevron-down`/`pin`). Added a `hollow?: boolean` prop that renders any shape — **including `circle`, which previously could not** — as an outline: no fill, the descriptor colour becomes a min-weight stroke. Strictly additive; existing filled call-sites (`PinMarkers`, `GhostPin`, chart markers) are unchanged.

## 0.101.0

### Added

- **`ServiceHealthDot`** — Composite (Depth 2). 6px dot + name label for app-shell navbar liveness clusters. Alive: success color, opacity decays `max(0.15, 1 − (ageMs/staleThresholdMs) × 0.85)` toward the staleness horizon. Dead (`ageMs` null/undefined or ≥ threshold): danger color at full opacity with a 1s pulse animation. Hover reveals a popover with service name, age label, a `HeartbeatSparkline` (`state="connected"|"error"`), and a `Xs ago / now` footer. No internal clock — pure render of caller-supplied `ageMs` + `samples`; the 1 Hz tick and history accumulation live in the caller. No curried variant (all props are data). Key props: `name`, `ageMs`, `staleThresholdMs` (default 15 000), `samples`. Ports the hand-rolled `ServiceDot` from rhinotools/AppNav.tsx with inline hex colors swapped to `--sui-success` / `--sui-danger` / `--sui-text-muted` tokens.

- **`CensusView`** — Composite (Depth 3). Bucketed census composition: tables grouped by size/access bucket, each rendered as a compact sticky-header `BaseTable`. Click-to-select opens a sticky `InfoPanel` detail rail with row counts (`NumberWithUnits`), field-type chips (`CountChip`), schema list, and an optional `actions` slot. Quick-filter (`QuickFilter`) narrows all buckets simultaneously. Gap column uses `GapCell`. Status badges mapped from `NormStatus` → `StatusBadge` variant. Exports: `CensusView`, `CensusTable`, `CensusColumn`, `NormStatus`, `CensusBucketId`, `CensusViewProps`, `CENSUS_BUCKETS`, `bucketOf`.

- **`GapCell` / `gapSeverity`** — Remaining-work table cell for census/migration gap columns: bold count + percentage + a 40×4 completion bar, colored by severity ramp (0%→success, ≤50%→warning, >50%→danger). Blank when uncounted. Pure `gapSeverity()` function exported for tests/reuse.

### Changed

- **Docs/showcase coverage** — Added `TrendSparkline` showcase (up/down/flat fixtures, `yDomain` shared-scale example, live-appending signal demo) and registered it in the dev gallery. Added `COMPONENTS.md` entries for `RingChart`, `WorkerCard`, and `TrendSparkline` with APIs sourced directly from component source files.

## 0.100.0

### Added

- **`AssigneeIcon` (`title` data prop)** — hover text carrying the FULL name (or a richer status line) behind the ambient initials; falls back to `initials` when omitted (previous behavior). Also feeds the `aria-label`. Initials are for the ambient display; `title` is for recovery — pass the full display name wherever a roster uses `deriveInitials`. Flows through `ActionListAssignee` (alias of `AssigneeIconProps`) with no ActionList change.

## 0.99.0

### Added

- **`AssigneeIcon` (`size` Override + `createAssigneeIcon`)** — the outline person/AI glyph gains its first presentational knob: `size` (glyph height in px; width keeps the 25:23 box, and the SVG viewBox scales stroke + initials with it). Per the currying rule it is an Override — freeze it with `createAssigneeIcon({ size })` (new factory, with `AssigneeIconOverrides`/`AssigneeIconDataProps` split); the bare `AssigneeIcon` export is unchanged: zero-config, 23px row default, data props only (`initials`/`kind`/`active`). Motivating caller: dside's navbar presence cluster, which needs the same glyphs as its ActionList rows, just bigger.
- **`composeTagPairs(tags, cfg)`** — pure, reusable helper in the Badge family (`src/components/Badge/tagPairs.ts`, exported from the family index and root barrel). Turns a flat list of `SourceTag` (`{ dim, value }`) into presentation-ready `ComposedTag`s for TagPill / ActionList tags. A pair rule (`{ parent, child }`) whose **both** dims are present collapses those two tags into ONE split lozenge of the two VALUES — the dim names drop out of sight but survive in the `title` for hover recovery (`customer:stax` + `project:jtf` → key `stax`, value `jtf`, title `customer: stax · project: jtf`, `sources` = `[parent, child]`). A dim present **without** its partner is not abbreviated and falls through to the labeled form (`key = dim`, `value = value`, title `dim: value`). Deterministic: pairs emit first in rule order, then the remaining labeled tags in input order — or by `cfg.order` (unknown dims after, stable) when given. Each source tag is consumed at most once; a duplicated dim pairs on its first occurrence and extras stay labeled. Pure, no DOM; empty inputs return `[]`.

## 0.97.1

### Fixed

- **`<Chart>` — drag that leaves the plot** — a click-drag range selection now (1) still ends and **commits** when the mouse button is released **outside** the chart, and (2) reads a drag past an edge as "dragged to the end of the chart" instead of freezing the selection at the last in-bounds pixel. The `<svg>` takes **pointer capture** on `pointerdown`, so `pointermove`/`pointerup` keep firing after the pointer leaves its bounds; `pointerleave` no longer cancels an in-progress drag while capture is held; and drag extension maps the pointer through a plot-**clamped** x (the crosshair keeps the nullable mapping, so hover still hides off-plot). All capture calls are optional-chained (jsdom implements none). Affects any chart composing `<DragRangeSelect>` / `<CommitOnReleaseDragRangeSelect>`.

## 0.97.0

### Added

- **Cashflow / money primitives** — new `ScenarioDot` badge, `ResponsiveMoney`, and an internal `money` formatting helper, plus refinements to `CashflowScrubChart`, `ScrubChart`, and `SplitQueueList` (decoupled balance line, scenario dots, responsive money rendering). Bundled into this release.
- **`EditableTitle` / `ActionListItem` / `ActionList` — `editTrigger: "clickSelected"`** (third mode; still strictly non-breaking). The file-list rename idiom: a click on the title opens the inline editor **only when the row is already selected** — the first click on an unselected row falls through to row selection, and a second click on the now-selected title edits. Modifier clicks (shift/ctrl/meta/alt) never edit (they stay selection gestures), and `stopPropagation` keeps the already-selected row from re-toggling. `ActionListItem` feeds the row's selection state to `EditableTitle` via the new `rowSelected?: boolean` prop; `ActionList` already threads `selected`, so consumers only opt in by passing `editTrigger="clickSelected"`. `"singleClick"` (default) and `"doubleClick"` are unchanged.

## 0.96.0

### Added

- **`ActionList` / `ActionListItem` / `EditableTitle`** — two opt-in, strictly non-breaking row affordances (consumers that pass neither prop see byte-identical behavior):
  - **`editTrigger?: "singleClick" | "doubleClick"`** (default `"singleClick"`, today's behavior), threaded `ActionList → ActionListItem → EditableTitle` (new exported type `EditTrigger`). In `"doubleClick"` mode the title renders as a non-`<button>` element (`<span role="button">`) so a **single click falls through to row selection** while a **double click opens the inline editor**; Enter/Space keep the editor keyboard-reachable, and the hover dotted-underline affordance plus Enter/blur-commit / Escape-cancel lifecycle are unchanged. In the default mode the title stays a `<button>` and a single click edits, exactly as before.
  - **`onOpen?: (id: string) => void`** on `ActionList` (`onOpen?: () => void` on `ActionListItem`). When provided, each row renders a small magnifying-glass icon button (inline SVG riding `currentColor`, matching the `StarToggle` icon idiom) in the meta cluster just left of the dismiss cap; clicking it calls `onOpen(id)` and never toggles row selection or opens the editor (`stopPropagation` + it is a `<button>`, already excluded from the row click target). It reveals on row hover via opacity only, honoring the geometry-stable hover invariant. Absent → no button renders.

## 0.94.2

### Fixed

- **`SplitQueueList` (`focusedKey`)** — selecting a row while no explicit `focusedKey` is supplied no longer paints the head of the list as focused. The `focusedKey` memo fell back to `keys[0]`, so a consumer that drives focus for only part of its state (e.g. a `null` focus when a committed item is selected) saw the top "to-configure" row light up as if selected. The focus fill is now strictly the explicit `focusedKey` (`null` when omitted); the head-of-list fallback is retained purely for the keyboard roving-tabindex tab stop, so ARIA/keyboard behavior is unchanged.

## 0.94.0

### Added

- **`deriveInitials(names)`** — pure, reusable helper in the ParticipantAvatar family (`src/components/ParticipantAvatar/initials.ts`, exported from the family index and root barrel). Returns a `Map<name, initials>` that disambiguates a roster instead of collapsing it to identical letters. Default is the first letter of the first word; a colliding name uses **as many letters as necessary** — the shallowest ladder rung (first initial → **word initials** → **first-word letters**) whose value stays globally unique (`Peter Stradinger` + `Peter Falk` → `PS` + `PF`; `Peter Falk` + `Paula Falk` → `Pe` + `Pa`). A name is never dragged deeper just because a neighbour must — in {Peter Stradinger, Peter Falk, Paula Falk, Peter Strong}, Peter Falk keeps its unique `PF` while Paula drops to `Pa`, and Falk is not merged into the Stradinger/Strong pair. Capped at 2 chars (AssigneeIcon's fit): names indistinguishable within the cap (`Peter Stradinger` + `Peter Strong`) share their longest common initials (`Pe`) and rely on the caller's `title`/tooltip for the full name. Deterministic and order-independent (a function of the name set); unicode-aware; identical full names get identical initials. Feed its values into `AssigneeIcon` / `ParticipantAvatar` `initials`.

## 0.93.0

### Added

- **`ActionList`** — selection-event metadata + range-select mode, closing two more gaps dside hit:
  - **`onSelectionChange` gains an optional second argument**, `meta?: ActionListSelectionMeta` (`{ kind: "toggle" | "range" | "clear" | "apply"; clickedId?: string; shiftKey?: boolean }`). It describes the gesture that drove the change — `clickedId` is the row the user interacted with (toggle/range) and `shiftKey` reflects whether Shift was held — so a consumer can, e.g., keep a vim `j`/`k` cursor in sync with mouse clicks. `toggle`/`range`/`clear`/`apply` all carry meta; a prune (a selected row leaving `items`) emits none. **Existing single-arg consumers are untouched** — the extra argument is simply ignored.
  - **`rangeSelectMode?: "extend" | "replace"`** (default `"extend"`, today's anchor-state-across-span merge). `"replace"` makes a shift-click produce exactly the `[anchor..clicked]` span, discarding any selection outside it (classic file-list semantics; dside's original behavior). Works in both controlled and uncontrolled modes. The fold logic lives in a pure, unit-tested `foldRange` helper alongside `idRange`.

  All additions are backward compatible.

## 0.90.0

### Added

- **`DagChart` (`gap`)** — new optional `gap?: [xGap, yGap]` prop controlling the spacing budgeted around each node, in screen axes (same orientation as `nodeSize`'s `[width, height]`). In a horizontal-flow DAG the inter-column corridor is `xGap`, so raise it when edges carry labels wide enough to collide with the node boxes (the corridor was previously pinned to the internal `[40, 40]` default and not configurable). Threaded through `computeLayout` and the fallback grid layout, and swapped into d3-dag's internal `[within-layer, between-layer]` axes exactly like `nodeSize`. Defaults to `[40, 40]` — no change for existing consumers.

## 0.89.1

### Changed

- **`Chart` (`YAxis`)** — the y-axis title now tracks the tick labels instead of sitting at a fixed 28px offset. It measures the widest tick label's rendered width via SVG glyph metrics (`getComputedTextLength`) and places the rotated title just past it (`label-x + max-label-width + gap`), so wide labels no longer overlap the title and narrow labels no longer leave a gaping margin. Falls back to a character-count estimate when DOM text metrics are unavailable (SSR / jsdom).

## 0.89.0

### Added

- **`ActionList`** — closes the gaps found when dside adopted the list:
  - **Controlled selection.** New `selectedIds?: string[]` makes selection fully controlled — the list ignores its internal state, renders exactly the passed ids as selected, and never mutates on its own; every interaction (toggle, shift-range, Escape, apply) is emitted as an intent via `onSelectionChange` for the consumer to honour. Uncontrolled mode (omit `selectedIds`) is unchanged.
  - **Shift-click range select.** Shift-clicking a row applies the anchor row's (last plain-clicked) current selected state across the whole contiguous span between anchor and click — select the anchor then shift-click to select the span, deselect it to deselect the span; the anchor stays put so a further shift-click re-ranges. Restores the range-select dside lost when it moved off its hand-rolled list. Range math lives in a pure, unit-tested `idRange` helper.
  - **`clearSelectionOnApply?: boolean`** (default `true`, today's behavior). Set `false` to keep the selection after an action fires — for in-place batch actions like claim/release.
  - **Multi-assignee.** `ActionListItemData` gains `assignees?: ActionListAssignee[]`, rendered as a tight roster of glyphs; the singular `assignee?` still works and plural wins when both are given.
  - **`onTagClick?: (item, tag) => void`.** When provided, tag pills become buttons — clicks fire the callback and never toggle row selection (`stopPropagation`), with a colour-only (geometry-stable) hover brighten. Without it, tags stay inert exactly as before.

  `ActionListItem` gains `assignees?` / `onTagClick?`, and its `onSelect` now receives the originating `MouseEvent` (for `shiftKey`). All additions are backward compatible.

## 0.88.0

### Added

- **`ActionList`** — multi-select. Passing `actions: ActionListAction[]` (`{ hotkey, label, onApply(selectedIds) }`) turns each row's non-interactive area into a click-to-toggle selection target and reveals an actions bar while the selection is non-empty. Clicks on a row's inner controls (title editor, status chip, dismiss ×) never toggle, so selection doesn't fight inline editing or drag-to-reorder. Selected rows light a persistent accent border + subtle accent wash (colour-only — geometry-stable, like hover). Each action renders as a reused `HotkeyButton` (the `[c]laim` affordance); pressing the bracketed hotkey or clicking the button applies it to the selected ids and then clears the selection. Escape clears the selection (unless an inline editor is focused). Selection is uncontrolled and observed via `onSelectionChange`. `ActionListItem` gains `selected?` / `onSelect?`; `HotkeyButton` now exports `isEditableTarget`.

## 0.87.0

### Added

- **`ActionList`** (Depth 3) — drop-in, data-driven list of editable action rows, graduated from the list-item workshop bench. Curried via `createActionList` with a single Override (`statusTones`, default `{ DONE: "dim", DOING: "highlight" }`, neutral fallback); the exported `ActionList` variant takes only data + callbacks: `items` (`{ id, name, status?, assignee?, tags? }`), `statusOptions`, `onSort`, `onDelete`, `onRename`, `onStatusChange`. Tone = whole-row opacity (dim 25%, neutral 50%, highlight 100%) over an all-accent foreground.
- **`ActionListItem`** (Depth 2) — the row composite: status chip, editable title, assignee icon, tag pills, and a hover-revealed semi-circular dismiss cap flush with the row edge. Hover never shifts geometry (opacity-only reveals over a transparent border).
- **`StatusChip`** (Depth 1, Badge family) — fixed-width editable status chip (width = longest option in ch, text centered): click the text to edit inline, click the hover-revealed caret to pick from `options`; Escape cancels without committing. The editable sibling of `StatusBadge`.
- **`TagPill`** (Depth 1, Badge family) — pill tag; `label` containing `:` (or the explicit `{ key, value }` form) renders a split lozenge with a bold namespace segment; `active` adds the accent fill. The free-text sibling of `StatusBadge`/`CountChip`.
- **`AssigneeIcon`** (Depth 1, ParticipantAvatar family) — person-silhouette / antennaed-robot-head outline glyph holding up to 2 centered initials, `currentColor`-driven; the outline sibling of `ParticipantAvatar`.
- **`EditableTitle`** (Depth 1) — hover-underlined click-to-edit text whose inline input is fitted to the rendered text via a hidden-replica grid; Enter/blur commits, Escape cancels.

### Changed

- **`SortableList`** — new optional `rowChrome?: "surface" | "bare"` (default `"surface"`, unchanged) and `gap?: number` (default `8`). `"bare"` strips the row wrapper's Surface chrome and hides the grip until row hover, for self-styled row content like `ActionListItem`.

## 0.86.0

### Added

- **CashflowScrubChart** — `CashflowChartMarker` gains `variant?: "flag" | "rule"` and `label?: string`. The default `"flag"` is the existing clickable instance marker (flag + dashed drop-rule + dot). The new `"rule"` renders a non-interactive full-height dotted reference rule with its label always visible at the plot top — for marking a date like "Today" rather than a selectable instance. No change for existing callers.

## 0.85.3

### Fixed

- **CashflowScrubChart** — the per-instance SVG `clipPath` id is now generated with Solid's `createUniqueId` (the mechanism **Chart** already uses) instead of `Math.random`, making it deterministic across server/client renders (no hydration-mismatch risk). No visual change.

### Internal

- **Shared chart helpers** — duplicated chart arithmetic consolidated into `src/internal/` (not re-exported from the public barrel; `dist/index.d.ts` byte-identical):
  - `internal/geometry/insetSpan` — the 1D "inset a total extent by leading/trailing amounts" plot-region identity previously recomputed by hand in **Chart** (`innerWidth`/`innerHeight`), **ScrubChart** (both plot-span triples), and **CashflowChart** (all `PAD` edge arithmetic, now routed through two span accessors).
  - `internal/format/number` — `formatGroupedNumber` + `formatCompactNumber` ("3.4k" / "1.2M"), the en-US grouping policy that appeared verbatim five times across the **ScrubChart** / **CashflowScrubChart** helpers (`defaultFormatY`, `fmtDollars`, `fmtAxisDollars`). Near-miss formatters with observably different output (**ThroughputChart**, **CompletionTimeline**, **CashflowChart**'s `formatDollars`) were deliberately left untouched — unifying them would be a visual change; they're catalogued in the module header.
- **Oversized-module splits** — no import-specifier, API, or behavior change; `src` now has no file over the repo's ~500-line guideline:
  - `internal/animation/trajectories.ts` (883 lines) → a `trajectories/` directory of 8 concern-sized modules (primitives, timing, math, slurp morph, layout snapshot, per-card builders, top-level builders, barrel).
  - `SwimlaneChart/geometry.ts` (643) → a `geometry/` directory with one module per `compute*` function (edge views, side badges, port assignments, boundary badges, view bounds) plus shared input types.
  - `SplitQueueList/flight.ts` (690) → a 229-line reactive controller plus `play.ts` (the forward/reverse flight orchestrators), `flip.ts` (FLIP snapshot), and `arrival.ts` (arrival bg-fade), split along the file's existing reactive-shell vs imperative-engine seam; the controller keeps sole ownership of the shared scroll lock (flights write it only through an injected setter).

## 0.85.2

### Internal

- **Test coverage** — no component API or runtime behavior change; a sweep adding tests to previously-untested components (149 new tests across the 0.85.x line; suite now 1351). Newly covered: **Modal**, **Select**, **TagInput**, **DateRangePicker** (+ its `calendarUtils` TZ-aware date math), **MultiSelectFilter**, **Heatmap**/**HeatmapMulti**, **WeekCalendar** (+ `parseWeekCalendarTime`), **Treemap**, **ProductGrid** (+ `isSolutionSatisfied` and the solution→need cross-highlighting), **ConversationTree** (grouping/threading/dividers), **HeatStream**, and **SidebarSelector** (+ `EpisodeCard`/`EpisodeSelection`). Also added a unit test for the shared `clamp` helper.

## 0.85.1

### Changed

- **Toolchain / dependencies** — no component API or runtime behavior change. Upgraded the build/test toolchain and bumped dependencies:
  - **TypeScript 5.9 → 6.0.** The config was already modern (`target`/`module` ESNext, `moduleResolution` bundler, `strict`), so only two `tsconfig.json` adjustments were needed: dropped the deprecated `baseUrl` (the unused `~/*` alias still resolves via `paths` under bundler resolution), and added `"types": ["node"]` since 6.0 changed the `types` default from "all `@types/*`" to none. Emitted declarations are byte-identical to the 5.9 output (535 `.d.ts` files).
  - **vite-plugin-dts 4 → 5**, **katex 0.16 → 0.17**, **@types/node 25 → 26**, plus minor bumps (`solid-js` 1.9.14, `vite` 6.4.3, `vitest` 4.1.9, `@kobalte/core` 0.13.12, `@tanstack/solid-virtual` 3.13.32, `d3-dag` 1.2.1, `vite-plugin-solid` 2.11.12). `jsdom` is intentionally held at 26 — 27 ships an ESM-only CSS engine that breaks vitest's forks pool.
  - **`katex` is now declared only as a direct `dependency`**, no longer duplicated in `peerDependencies` (it was in both). No action needed by consumers — it remains bundled as before.

### Internal

- **`clamp` helper** consolidated into `src/internal/math/clamp.ts` — replaced two identical local definitions and several inline `Math.max(min, Math.min(max, x))` sites across Dropdown, ScrubChart, SlotFillBar, SplitQueueList, Alarm, BatchBar, and Sidebar. No behavior change.
- **Test coverage** — added tests for two previously-untested interactive primitives: **Modal** (portal render/teardown, Escape/backdrop/close-button dismissal, body-scroll lock, size/variant classes, `createModal` curry) and **Select** (single/multi value rendering, placeholder, clear button, reactive updates).

## 0.85.0

### Changed

- **SplitQueueList** — the animated queue now **fills its parent's height when `height` is omitted**, instead of collapsing to a hardcoded 420px. The root renders at `height: 100%` and self-measures its parent-allotted box (reusing the existing `rootEl` `ResizeObserver` — no new observer), feeding that measured height into the pane layout so the panel stretches to the bottom of a flex / `height:100%` container and re-flows on resize. Passing an explicit `height` keeps the prior fixed-px behavior unchanged; 420 is now only the pre-measure / unmeasurable floor (e.g. jsdom, which reports 0 from `getBoundingClientRect`). Consumers that dropped the panel into a sized parent and relied on the 420 fallback should either pass an explicit `height` or ensure the parent is height-constrained. (`StaticSplitLayout` already had this fill behavior.)

## 0.84.2

### Changed

- **CSS lint** — no runtime or visual change; takes `src` to zero Biome diagnostics (from 78 at the start of the 0.84.x cleanup). Resolved the remaining CSS warnings case-by-case:
  - **`noImportantStyles`** — removed five `!important` declarations that were provably unnecessary (the rule already won by source order): `Surface --active` background/border-color, `BatchBar` and reduced-motion `transition`, and `HeatStreamGrid --all-selected` colours. Kept six with scoped `biome-ignore` + rationale where genuinely load-bearing: `MathFormula` (overrides KaTeX's own `.katex` span colours and host table row styling), `SlotFillBar` (cancels a per-instance **inline** transition, which only `!important` can beat), and `Cell` (keeps rows transparent regardless of theme-level `tr` rules).
  - **`noDescendingSpecificity`** — reordered six rules render-neutrally so a base rule precedes its modifier(s) (`List`, `Heatmap`, `Table` ×2, `HeatStreamGrid`); documented four with `biome-ignore` where reordering would fragment an intentional grouping or a load-bearing cascade (`SplitQueueList`, `Section`, `Toast`, `MathFormula`).

## 0.84.1

### Changed

- **Tooling / types** — no component API or runtime behavior change. Burned down lint and typing debt surfaced by Biome:
  - Eliminated every `noExplicitAny` warning in `src` (22 → 0). The `Table` components and `StatsTable` now bound their row generic with `object` (new exported `TableRow` type) instead of `Record<string, any>` — this still admits interface-typed rows, which a `Record<string, unknown>` bound would reject for lacking an index signature. `DagChart`'s d3-dag layering cast is now `as unknown as Layering` (the library's own exported operator type) rather than `as any`; `TabbedSidePanel` dropped an unnecessary `as any` on `style`; and the drag-and-drop test helpers (`DnDHierarchySortBar`, `SortableList`, `MutableList`) build typed synthetic events via `Object.assign(new Event(…), …)`.
  - **`BaseTable`** sort comparator refactored into a typed `sortKey` helper — no `any`, no bare `<`/`>` on `unknown`. Ordering is preserved (strings via `localeCompare`, numbers/Dates/booleans numerically, nulls last) and is now covered by new tests exercising each branch plus the asc → desc → cleared click cycle. The sort path previously had no test coverage.
  - Applied safe Biome autofixes across `src` (string concatenation → template literals, bracket → dot member access) and fixed two nonstandard `linear-gradient` directions in `Layout/Sidebar.css`: the `--sidebar-handle-dir` custom property was a no-op (the gradient is symmetric about its midpoint, so `to left` and `to right` render an identical centered line) and is replaced by a plain `to right`.

## 0.84.0

### Added / Changed

- **Accessibility** — keyboard and ARIA support across ~50 components; the Biome `a11y` rule group is now enforced at **error** for `src` (the `dev/` gallery stays exempt), so regressions fail the lint gate. Highlights, all behavior-preserving unless noted:
  - **Keyboard activation** for clickable elements that were mouse-only: heat/treemap cells (`Treemap`, `Heatmap`, `HeatStream`, `HeatStack`, `HeatStreamGrid`), cards/rows (`Card/StatusCard`, `ProductGridCard`, `SprintSelector`, `MessageBubble`), chart controls (`Chart` pins/series, `CashflowScrubChart` markers, `AnimatedSwimlaneChart` cards, `DagChart` edge actions), and axis cells. Each adds `role="button"`, `tabindex`, and an `onKeyDown` (Enter/Space) that fires the exact same action as the click — gated on the relevant callback prop so non-interactive instances stay out of the tab order.
  - **New keyboard resize** (feature): `Layout/Sidebar` and `ResizableContainer` drag handles now implement the window-splitter/separator pattern — focusable, with `aria-valuenow/min/max` and arrow-key resize (Shift = larger step, Home/End to bounds), persisted like the pointer drag.
  - **Form labels** associated with their controls via `createUniqueId()` (`Inputs/NameInput`, `ThemedInput`, `ThemedTextarea`); a consumer-supplied `id` still wins.
  - **`TruthIndicator`** now renders a native `<button>` when interactive (was a `<span role="button">`), gaining native focus/activation; read-only stays a `<span role="img">`.
  - `type="button"` added to action buttons (`Modal`, `Tabs`, `Section`, `RecentStarred`, several `Table` buttons); decorative chart SVGs get `role="img"` + `aria-label` or `aria-hidden`; redundant roles removed. Legitimate ARIA composites (calendar `grid` pickers, segmented `radiogroup`, `listbox`/`menu`, decorative SVG chrome) are documented with scoped `biome-ignore` rationale rather than altered.

## 0.83.2

### Changed

- **Tooling / repo** — no component API or runtime behavior change. Adopted **Biome** as the lint/format/typecheck gate for the published library, tuned to existing conventions (`noNonNullAssertion` off; cosmetic rules as warnings; correctness rules as errors). Added `lint`, `lint:fix`, `lint:all`, `format`, `format:write`, `typecheck`, and `check` scripts. Applied a one-time safe baseline: `import type` conversions and unused import/variable removal across `src`, plus hand-fixed correctness items (`isNaN` → `Number.isNaN`, optional chaining, an O(n²) `reduce`-spread in `AreaFocusGrid`, JSX comma-operator removal in the `Chart` unknown-lane warnings, `forEach` side-effect callbacks wrapped in blocks, and dead duplicate CSS declarations in `Treemap`). The 117 pre-existing accessibility findings are baselined as warnings — a tracked backlog to burn down and promote back to `error`.
- **Test setup** — `test-setup.ts` installs a minimal functional canvas 2D context, removing the per-run "getContext not implemented" jsdom spam and letting `ScrubChart` exercise its real label-measurement path. All 1193 tests pass.

## 0.83.1

### Changed

- **`SwimlaneChart`** — internal refactor, no API change. All the chart's pure geometry (edge routing, side/boundary badges, per-edge ports, and the content-bounds/viewBox aggregation) moved out of the 1000-line component into a dedicated, independently-tested `geometry.ts`; each component memo is now a thin wrapper. Adds the component's first test coverage — headless characterization suites (node/edge geometry, column positioning, routing styles, collapse-into-summary badges) plus direct unit tests for the bounds math. Component 1013 → 649 lines; behavior is unchanged (edge-path geometry is byte-identical under snapshot).

## 0.83.0

### Added

- **`Dropdown`** — full listbox keyboard navigation and ARIA semantics (no API change). The trigger now exposes `aria-haspopup="listbox"` / `aria-expanded` / `aria-controls`; the menu is a `role="listbox"` of `role="option"` items with `aria-selected`. A **roving tabindex** keeps one tab stop; **Arrow Up/Down · Home/End** move focus, **Enter/Space** select, **Escape** closes and refocuses the trigger, and **Tab** leaves the widget. Opening focuses the selected option (or first); selecting or closing returns focus to the trigger. Rendering is unchanged.

## 0.82.1

### Changed

- **`Table` cell renderers** — internal refactor, no API change. The 880-line `CellRenderers.tsx` was split by concern into sibling modules (`cellStyle`, `textCells`, `numericCells`, `dateCells`, `statusCells`, `createCellRenderer`) re-exported through an unchanged barrel, so every import keeps working. Added direct smoke-test coverage for all cell renderers, the styling HOCs, and the column factory (previously untested).
- **`ExtractionBoard`** — internal refactor, no API change. The presentational card vocabulary (columns, cards, bars, badges) moved out of the 737-line component into a self-contained `cards.tsx`, leaving the orchestrator at 407 lines.

## 0.82.0

### Added

- **`StaticSplitLayout`** — the non-animated "two stacked labeled sections with a seam" layout is now its own public component, replacing the `static` flag on `SplitQueueList`. It renders a read-only TOP list of recent items over an arbitrary BOTTOM block you compose, sharing SplitQueueList's chrome but none of its queue/animation/selection/keyboard machinery. Clean, self-contained props (`items`, `renderItem`, `bottomContent`, `label`, `emptyLabel`, `capRows`, `rowHeight`, `height`, `class`) so the queue-only and static-only props can't be mixed — invalid combinations are unrepresentable.

  ```tsx
  <StaticSplitLayout items={recent()} renderItem={(r) => <Row {...r} />} bottomContent={<Picker />} />
  ```

### Deprecated

- **`SplitQueueList`** — the `static` prop (and its `topItems` / `renderTop` / `bottomContent` companions) is deprecated in favor of the standalone `StaticSplitLayout`. It still works — it maps the old prop names onto the new component and delegates — but will be removed in the next major.

## 0.81.1

### Fixed

- **`SplitQueueList`** — the resolve/unresolve collapse animation now deep-clones the collapsing row's content (`cloneNode`) instead of round-tripping it through `innerHTML`, so nodes are copied verbatim (no re-parse, no injection surface) and richer `renderItem` output survives the animation intact. Separately, a row's `min-height` now uses the component's *measured* row height rather than the raw `rowHeight` prop, keeping each row's reserved slot consistent with the pane sizing (the two could previously disagree when the measured height differed from the prop).

## 0.81.0

### Added

- **`SplitQueueList`** — full keyboard operation and screen-reader semantics, with no API changes (existing consumers get this for free). Each pane is now a `role="listbox"` of `role="option"` rows with `aria-selected` reflecting `selectedKey`; a **roving tabindex** keeps exactly one tab stop at a time, **Enter/Space** select the focused row (mirroring a click), and **Arrow Up/Down · Home/End** move focus across both panes as one top-to-bottom sequence. A visually-hidden `aria-live` region announces the resolved/unresolved counts as the queue changes, and rows show a `:focus-visible` ring.

### Changed

- **`SplitQueueList`** — internal refactor, no behavior change. The ~1.2k-line component was split by concern into `flight.ts` (the resolve/unresolve animation engine), `animation.ts` (pure helpers), `keyboard.ts` (roving-tabindex state machine), `types.ts`, and a dedicated `StaticSplitLayout` component (down to a 316-line reactive shell). Forward/reverse flights now share deduped helpers, and `static` mode no longer spins up the FLIP/animation machinery it never used.

## 0.80.2

### Fixed

- **`Checkbox`** — completes the 0.80.1 fix: a label-less checkbox is *actually* clickable now. Overlaying the input with `inset:0` was not enough — the painted `.sui-checkbox__box` span is itself positioned (`position:relative`, for its `::after` checkmark) and follows the input in the DOM, so it painted on top and swallowed the click (`elementFromPoint` at the control center returned the box, not the input). The input now has `z-index:1` to sit above the box. Verified end-to-end with a real browser click toggling a table row-select checkbox.

## 0.80.1

### Fixed

- **`Checkbox`** — a checkbox with no `label` is clickable again. The hidden native input was `width:0;height:0`, leaving no hit target when there was no associated `<label>` to click (e.g. table row-select checkboxes), so toggling silently did nothing. The input now overlays its control (`inset:0; opacity:0; cursor:pointer`), restoring clicks with or without a label.

## 0.80.0

### Added

- **`Icon`** — added a `download` glyph.

## 0.79.2

### Fixed

- **`TitledTimeRangeHeader`** — fix the 0.79.1 type regression: widening `title` to `string | JSX.Element` collided with the DOM `title` attribute (typed `string`) inherited via `HTMLAttributes`, breaking `tsc`. The props now `Omit` the DOM `title`, so the rich-heading prop typechecks cleanly.

## 0.79.1

### Changed

- **`TitledTimeRangeHeader`** — `title` now accepts `JSX.Element` as well as `string`, so callers can render a rich heading (e.g. an icon beside the name) instead of plain text. Backward-compatible: existing string callers are unaffected.

  ```tsx
  <TitledTimeRangeHeader title={<VesselName type={t} name={n} />} start={s} end={e} />
  ```

- **`ProgressCard`** — recomposed from `Surface` + `Text` primitives instead of a hand-rolled card; same public API.

## 0.79.0

### Added

- **`SortableList`** — a generic vertical drag-to-reorder list of full-width rows, the reusable equivalent of dside's todo reorder. Data/callback-only API (`items` / `getId` / `onReorder` / `renderItem`, optional `label`); each row gets a drag grip and, while dragging, an explicit **placeholder gap** opens in the slot where the row will land (sized to the dragged row) and the list reflows live to preview the result — committing on drop. No curried variant (data-only).

  ```tsx
  <SortableList items={rows()} getId={(r) => r.id} onReorder={setOrder} renderItem={(r) => <Row {...r} />} />
  ```

- **`MutableList`** — `SortableList` specialized into editable cards: each card has an inline-editable name (click → input; Enter/blur commits `onRename`, Escape reverts) and a delete button revealed on hover at the right (`onDelete`). Data/callback-only (`items` / `getId` / `getName` / `onReorder` / `onRename` / `onDelete`, optional `renderDetail`). Delete fires directly — the consumer owns any confirmation.

- **`createDnDReorder`** (in `hooks`) — the headless engine behind the reorder components: native HTML5 DnD with the placeholder-drop-target pattern (dragged item spliced out and re-inserted at the live `insertPos`, container-level geometry hit-testing so cursor dead zones still track, and the SolidJS dragstart-defer handled). Axis-generic (`"x"` / `"y"`); reusable for building custom reorder UIs.

- **`DefaultButton`** — curried `variant: "default"` button, completing the curried Button set so call sites never need the bare `Button`.

### Changed

- **Layout gap scale trimmed to `"xs" | "sm"`** (BREAKING). `Stack` / `Row` / `ProportionalStack` (and `Sidebar` / `OverflowNav`) no longer accept `md` / `lg` / `xl` gaps — nothing in shipped UIs needed 16/24/32px gaps. Removed the dead variants `SpacedStack`, `SectionStack`, `SpacedClusterRow`. `FillColumn` / `PaneRow` (added in 0.78.5 at `md`) and `ProportionalStack`'s default now use `sm`. Consumers passing `gap="md|lg|xl"` must move to `sm`/`xs` or a local explicit style.
- **`DnDHierarchySortBar`** — rebuilt on `createDnDReorder`; the pill reorder now opens a placeholder gap that tracks the pointer across the whole row (replacing the old insert-and-shift-on-drop). Same public contract.

### Removed

- **`Surface` padding/radius trimmed** (BREAKING). `padding` is now `"none" | "sm" | "md"` (removed unused `xs` and `lg`); `radius` is now `"none" | "sm" | "md"` (removed unused `lg`). The unconsumed `paddingTop` prop and the `PanelSurface` variant are gone. `md` is retained (it is the default and the status surfaces' padding/radius).

## 0.78.5

### Added

- **`FillColumn` / `PaneRow` / `ScrollColumn`** — baked page-skeleton layout components so consumer apps stop hand-rolling `createStack`/`createRow` with `gap`/`fill`/`style` at call sites. `FillColumn` is the outermost route-body column — it **grows** to fill the remaining height of a flex-column parent (`flex:1; min-height:0`) rather than claiming `height:100%`, so it coexists correctly with a fixed header sibling (e.g. a page title) and still forwards a concrete height to a `fill` table/scroll child. `PaneRow` is a full-height two-pane row (`fill` + `flex:1; min-height:0`) for a sidebar+main split where each pane owns its own scroll. `ScrollColumn` is a flex column that scrolls its own overflow (`flex:1; min-width:0; overflow:auto`) — the main/detail pane beside a `Sidebar`.
- **`Sidebar`** — a fixed-width side column that is **drag-resizable**, with the chosen width **persisted in `localStorage`** keyed by `id` (per-machine, so different screens keep their own preference; restored on the client, SSR renders the canonical default). Drag the inner edge to resize (clamped 200–720px, default 300px); double-click the handle to reset. `handle="right"` (default) for a left-docked sidebar, `handle="left"` for a right-docked one. Bakes the width/`flex-shrink`/internal-scroll plumbing so call sites pass only `id`, optional `handle`/`gap`, and children:

  ```tsx
  <PaneRow>
    <Sidebar id="triage-calls" handle="right">…list…</Sidebar>
    <ScrollColumn>…detail…</ScrollColumn>
  </PaneRow>
  ```

## 0.78.4

### Fixed

- **`SplitQueueList`** — the static bottom panel now scrolls instead of clipping its overflow. The panel carried both `.sui-sql__static-bottom` and `.sui-sql__list--bottom`; at equal specificity (0,1,0) the later generic `.sui-sql__list--bottom { flex: 0 0 auto }` won, sizing the panel to its content so `overflow:auto` never engaged and content was cut off by the root `overflow:hidden`. The static-bottom rule is now scoped to `.sui-sql--static .sui-sql__static-bottom` (0,2,0) so it wins the cascade.

## 0.78.3

### Added

- **`HotkeyButton` / `createHotkeyButton`** — a button that renders its label with the hotkey character emphasized (e.g. "Done" with the **D** bold + underlined) and, when armed, fires `onTrigger` on a window `keydown` (guarded against modifier keys and focused inputs). Label/key/trailing content render tight on one line so the JSX compiler can't inject whitespace nodes (no "D one" gap).

## 0.78.1

### Added

- **`Surface`** — new `xs` (4px) padding token and a directional `paddingTop` override (`"none" | "xs" | "sm" | "md" | "lg"`). `paddingTop` is declared after the uniform padding rules so it wins, letting a surface keep its side/bottom padding while pulling a heading flush near the top for a terser layout (e.g. `createSurface({ padding: "lg", paddingTop: "xs" })`).

### Changed

- **`ThemedTextarea`** — dropped the fixed `min-height: 100px`; height now follows the `rows` attribute / content, so a textarea starts terse (single line with `rows={1}`, growing as needed) instead of always reserving ~4 lines. Consumers wanting a taller default set `rows` or a `min-height`.

## 0.78.0

### Added

- **`TimelineBar` gains `highlightedState`** — a group-highlight affordance. Unlike `selectedId`/`hoveredId` (single-bar), `highlightedState?: string | null` flags **every** bar whose `state` equals the value with `data-highlighted="true"`, so a legend hover or `onBarHover` reading `bar.state` can light up *all* segments of a given status at once (e.g. every `WARNING` bar across multiple lanes). Default `null` (nothing highlighted). Styling is left to the consumer via the data attribute; the chart stylesheet ships a reference treatment (`[data-highlighted="true"]` → brighter stroke + accent glow). The DotChart showcase wires a hoverable OK/WARNING/ALARM legend to demonstrate it.

## 0.76.1

### Added

- **`HeatStream`** — two new cell statuses, `empty` and `info`. `empty` renders a fully transparent cell (for grid positions that should read as blank rather than "missing"); `info` renders the informational blue (`--status-info`, default `#3b82f6`), complementing the existing `missing` red so a grid can show a neutral/positive baseline with red call-outs. Cell gap is now configurable via the `--jtf-hs-gap` custom property (default `1px`), and preview-row labels are wider to fit longer captions.

## 0.76.0

### Added

- **`SplitQueueList`** — a linked two-list "processing queue" in one fixed-height column: the **top** holds *resolved* (done) items, the **bottom** holds *unresolved* (to-process). Resolving moves a card up across the seam so recent work stays adjacent to what's next. Generic over the item type `T`; the consumer owns the data and the card content (`renderItem`), SUI owns the layout + animation. **It is fully controlled and driven by array mutation — there is no `resolve()` method:** moving a key `unresolved → resolved` (append) plays the forward animation, and `resolved → unresolved` (prepend) plays the mirrored reverse. The top pane is content-driven, measured in JS via `ResizeObserver` (pure CSS can't express it): `topFloorRows` (default **0**) collapses it to a header-only strip at 0 resolved and grows one row per card; `topCapRows` (default **3**) caps growth and then **scrolls** with the newest row flush at the seam; the bottom pane takes the remainder and absorbs slack when short. The resolve/unresolve motion is a height-collapse on the exiting side mirrored by a pane-grow (or capped scroll) on the entering side, with the panes always summing to the total height so the seam glides with no gap; the arriving card's background **fades in** on landing. **Selection is controlled and the detail panel is consumer-composed** — `onSelect(key)` fires on any row click (clicking no longer resolves), `selectedKey` rings the matching row in either panel, and `focusedKey`/`onFocusChange` drive the orange "current" highlight (the two compose). `topOnly` renders just the resolved panel. Honors `prefers-reduced-motion`. Key props: `resolved: T[]`, `unresolved: T[]`, `renderItem`, `keyOf`, `focusedKey?`, `onFocusChange?`, `selectedKey?`, `onSelect?`, `resolvedLabel`, `unresolvedLabel`, `allClearLabel?`, `topCapRows=3`, `topFloorRows=0`, `rowHeight=40` (initial estimate; measured), `height=420`, `animationMs=800`, `topOnly=false`. See `src/components/SplitQueueList/README.md` for the full usage guide. (`onResolve` from earlier drafts is deprecated/unused — resolve is array-driven.)

## 0.70.0

### Changed

- **`BatchBar` is now self-estimating — everything smart lives in SUI.** New declarative API: pass `batches: { rows: number; state: "pending" | "running" | "done" }[]` (`BatchSpec[]` — discrete states, **no fractions**) + `totalRows` + `committedRows`. BatchBar observes the batch lifecycle, measures each batch's wall-clock duration on `running → done`, folds the real `(rows, durationMs)` sample into an internal online linear regression (`T̂(rows) = base + perRow·rows`, seeded with a low-weight prior so batch #1 isn't garbage and the denominator is never singular), and eases each running batch's fill on an internal `requestAnimationFrame` loop — **race** (near-linear to ~90% at the estimate) → **creep** (decelerating, asymptotes below 1) → **snap** (a real `done` event tweens to 1.0 over ~180ms). The curve never self-reaches 1.0, so a real completion always finishes the bar. The fill renders via `scaleX` (compositor-only); the rAF loop starts on demand and stops itself when nothing is animating. All easing constants (`P_KNEE = 0.90`, `SNAP_MS`, the prior, τ) are encapsulated, not configurable. New `useBatchProgress()` returns a shared `ProgressController` so many bars can learn into one model (the whole board). New estimator/engine logic lives in `src/internal/progress/` with an injectable clock for deterministic tests.
- **`ExtractionBoard` adopts the declarative bar.** The board creates one shared progress engine per instance and hands every Doing bar (multi-batch and single-fill) the same learned model. `BoardTable.transferredRows` is now **committed rows only** (jumps on completion, not interpolated). Small (single-fill) tables drive one synthetic whole-table batch off `status` doing → done.

### Breaking

- `BoardTable.batches` changed from `{ total: number; done: number; inFlight: number[] }` (app-computed in-flight **fractions**) to `TableBatch[]` = `{ rows: number; state: "pending" | "running" | "done" }[]` (declarative, no fractions). The board now derives all fractions/estimates/durations/interpolation internally. **Migration:** emit `batches: { rows, state }[]`, set `transferredRows` to committed rows only, and delete any app-side `inFlight`/`interpolatedRows` computation. The legacy numeric `BatchBar` API (`donePct` / `inFlightPct` / `batches: number[]`) is kept (deprecated) for backward compatibility.

## 0.69.0

### Changed

- **Reconciled the divergent `feat/batch-bar` line into `main`.** The two lines had forked with parallel component sets — `main` carried `CurrencyInput` (0.68.0), `ExtractionBoard`, `ScrollRegion`; `feat/batch-bar` carried `BulkActionBar`, `FormComposite`, `MonthOfYearPicker`, `RangeAmountGroup`, `TrendSparkline` (+ `trendOf`), and `BaselineDot`, plus the `CashflowScrubChart` `scrub` prop and the `AppShell` `fixed` prop. This release **unifies both sets** so consumers no longer have to choose a line. No component or API was dropped: `CashflowScrubChart` keeps `scrub`, `AppShell` keeps `fixed`, and all the batch-bar components are exported alongside the main-line additions. Merge was a clean union (3 trivial conflicts: version, lockfile, one export block); full test suite (976) and build verified green post-merge.

## 0.68.0

### Added

- **`CurrencyInput`** — a curried variant of `ThemedNumberInput` for money amounts. Masks the value as USD currency (Kobalte `formatOptions: { style: "currency", currency }`) and caps its width to the widest expected value so it never stretches to fill its column. The cap is **derived, not magic**: `"$10,000,000,000.00"` is 18 characters → `18 × 0.62rem + 4rem` stepper/padding chrome = **15.16rem** (default). Tabular figures keep the masked digits from reflowing as you type. The full `ThemedNumberInput` API (value accessor, `onChange`, `name`, `label`, `min`/`max`, `step`, `errorMessage`, `description`) passes through unchanged; adds `maxValue?` (default `$10,000,000,000` — drives both the width cap and the numeric ceiling unless `max` is set) and `currency?` (ISO-4217, default `"USD"`). Exports the `currencyWidthRem(maxValue?)` helper for sharing the exact rem cap. This is the curried money field — do not configure `ThemedNumberInput` with `formatOptions` at the call site.
- **Fixed-width fields convention** (`src/internal/fieldWidth`) — a reusable rule for fields whose content has a known maximum width: `fieldWidthForChars(chars, chromeRem)` returns `chars × 0.62rem + chromeRem` (rounded up; `0.62rem` is a generous tabular-glyph advance at the body font size). Always pair the cap with `font-variant-numeric: tabular-nums`. Drives `CurrencyInput` and `MoneyCell`; `DatePicker`'s existing 10-char ISO cap is documented under the same convention (see COMPONENTS.md).

### Changed

- **`MoneyCell`** — gained the same width discipline as `CurrencyInput`: renders with **tabular figures + right alignment** and a **width cap** derived from a new `maxValue?` prop (default `$10B`; pass `maxValue={null}` to opt out). It is the display counterpart to `CurrencyInput`, so a money input and its column line up. Backward-compatible — existing `MoneyCell` usages get the cap at the default ceiling.

## 0.67.0

### Changed

- **`ThroughputChart`** — gained an opt-in **COMPLETION mode** (per-hour completed-item bars + a cumulative-% line on one shared 0–100 axis), selected by passing `completions` (raw events the chart buckets itself) instead of `dataPoints`. In completion mode the chart self-sizes (measures its own width via `ResizeObserver`, SSR/jsdom-safe). New optional props: `completions`, `now?`, `totalCount?`, `baselineCompleted?`, `barsLabel?`, `cumulativeLabel?`, `height?`, `initialWidth?`; `dataPoints` is now optional. **Fully backward-compatible** — with the completion props absent the chart renders the original rows/min area + line + average reference + crosshair exactly as before. Built for an ETL "tables done / hr + % complete" header.

### Removed

- **`CompletionChart`** (added in 0.66.0) — folded into `ThroughputChart`'s new COMPLETION mode so the progress chart is one component, not a near-duplicate. Migrate `<CompletionChart {...} />` → `<ThroughputChart {...} />` (identical completion props). 0.66.0 was published only briefly with no downstream consumers.

## 0.66.0

### Added

- **`ExtractionBoard`** — a composite swimlane board for an ETL extraction view. One swimlane per configured category, columns left → right `Summary │ Done │ Doing │ Todo │ +N`. The client supplies CONFIG (categories, data types + icons, column labels, multi-batch threshold, motion timing) and a reactive `tables: BoardTable[]` store; the board DERIVES the whole view as pure functions over `tables` (no simulation inside) — the Summary aggregate (counts + colsByType sum + monotonic status), the latest Done/Skipped card, the Doing card(s) (single fill bar ≤ threshold, multi-batch `BatchBar` above), the next Todo, and the +N lozenge. Lanes sort by Summary status (active → top, pending → middle, complete → bottom) with a debounced re-sort so a lane is seen completing before it sinks. Structural transitions animate via an internal FLIP engine (slurp the folded Done card into the Summary → slide the just-finished Doing card into Done → grow the next Todo out of the lozenge). Composes `Surface` / `Text` / `StatusBadge` / `CountChip` / `Icon` / `Tooltip` / `SlotFillBar` / `BatchBar` / `ProportionalStack`. Curried via `createExtractionBoard(config)` (bakes the config; the returned component takes `tables` only).
- **`CompletionChart`** — a sibling of `ThroughputChart` (same module) that plots PROGRESS rather than instantaneous rate: per-hour completed-item bars + a cumulative-% line on one shared 0–100 axis (bars scaled by the busiest bucket, so the two series coexist without a second axis). Data-only and self-sizing — the caller hands over raw completion events + the window/total, and the component buckets them itself and measures its own width with a `ResizeObserver` (SSR/test-safe fallback). Built for an ETL "tables done / hr + % complete" header but item-agnostic. Composes the `Chart` family + `Legend`. Public API: `{ completions, now, windowHours, totalCount, baselineCompleted?, height?, barsLabel?, cumulativeLabel? }`.

## 0.65.1

### Fixed

- **`AnimatedSwimlaneChart`** — resize handling no longer emits the benign `ResizeObserver loop completed with undelivered notifications` window error. The `ResizeObserver` callback previously wrote `stageWidth` synchronously during the observer dispatch, which mutated the observed subtree's layout (`stageWidth → maxDepth → lane rows`) mid-dispatch and made the browser defer remaining notifications. The width write is now coalesced into a single `requestAnimationFrame` (newest measured width wins; pending frame cancelled on cleanup), so the layout mutation happens after the dispatch completes. Public API/props are unchanged.

## 0.64.0

### Added

- **`ScrollRegion`** — a dynamic fade scroll-affordance component: a vertically-scrolling viewport whose top/bottom edges fade in only when there is more content to scroll toward (no fade at the true start/end), so users get a clear "there's more" cue. Curried via `createScrollRegion`; ships optional bounded presets `ScrollRegionMd` (~240px) and `ScrollRegionLg` (~360px) for non-flex contexts. The base `ScrollRegion` is height-agnostic and fills its flex parent — prefer it in flex layouts; the fade logic is identical either way.
- **`MathFormula` `wrap` variant** — opt-in `wrap?: boolean` prop (also a passthrough on `FormulaDecomposition`) that renders each top-level term as its own inline KaTeX element inside a `flex-wrap` row, so a formula too wide for its container breaks onto multiple lines at top-level operator boundaries. Pure CSS wrapping — no JS measuring, no shrink-to-fit, no horizontal scroll. Default behaviour is unchanged: without `wrap`, the historical single-line rendering is preserved.

### Fixed

- **`Panel`** — bottom corner brackets are now pinned to the visible frame on scroll instead of drifting with scrolled content, so the HUD corner brackets stay anchored to the panel edges.

## 0.61.5

### Added

- **Global themed thin scrollbars** — the self-contained themes (`hud`, `bronze`, `bronze-dark`) and the dev `_baseline` now style every scrollbar (`scrollbar-width: thin`; transparent track; thumb `--sui-border`, `--sui-border-bright` on hover; radius `--sui-radius-sm`), replacing native browser scrollbars in consuming apps.
- **`ChartCanvas` primitive** — curried canvas-in-frame for Chart.js consumers: `createChartCanvas({ height })` plus `ChartCanvasMd` (240px), `ChartCanvasLg` (300px), `ChartCanvasMlg` (350px), `ChartCanvasXl` (420px). `ref` forwards to the inner canvas; `children` is an absolutely-positioned overlay slot (e.g. `InlineChartErrorOverlay`).
- **`BaseTable` `spanRow`** — per-row tail-collapse hook (`spanRow?: (row, rowIndex) => TableRowSpan | null`): the row's leading cells render normally, then the remaining columns collapse into one spanning cell — for partial-data summary rows like "12 of 16 evaluated" + an action.
- **`InlineText`** — styleless inline text primitive for data-driven colored values.
- **`GrowBox`** — flex-grow child layout variant.
- **`SmallWarningButton`** — small warning-toned Button variant.
- **`PopoverMenu` `header` slot** — optional non-interactive header content rendered above the menu actions.

## 0.61.1

### Added

- **`BaseTable` `rowActions` prop** — `rowActions?: (row: T, rowIndex: number) => JSX.Element`. When provided, a tight, right-aligned trailing cell is rendered on every body row (with a matching empty trailing header cell so columns stay aligned). The action content is hidden by default and hover-revealed (`opacity` fade) on row hover, and always visible on keyboard `:focus-within` for a11y. Clicks inside the action cell stop propagation, so they never trigger `onRowClick`. Purely additive — tables without `rowActions` render exactly as before. The hover CSS lives in SUI (`.hud-table__actions-cell` / `.hud-table__actions-content` in `Table.css`), so no per-consumer CSS is needed. Passes through `FilterableTable` automatically.

  ```tsx
  <BaseTable
    data={rows}
    columns={cols}
    rowActions={(r) => (
      <Button variant="icon-only" onClick={() => onDelete(r)}>
        <Icon name="close" />
      </Button>
    )}
  />
  ```

## 0.61.0

### Removed

- **`OverrideToggle`** — dropped the domain-specific `AUTO | (PROD | OFF)` curried variant from the library. Per the "names shapes, not domains" rule, deployment/override jargon belongs in consumer apps, not SUI. `SegmentedControl` and the `createSegmentedControl` factory remain exported; rebuild the variant in your app's own `variants.ts`:

  ```ts
  import { createSegmentedControl } from "@primestageprime/solid-ui-components";

  export const OverrideToggle = createSegmentedControl({
    options: [
      { value: "auto", label: "Auto", group: "mode" },
      { value: "prod", label: "Prod", group: "override", color: "success" },
      { value: "off",  label: "Off",  group: "override", color: "danger"  },
    ],
  });
  ```

## 0.60.0

### Added

- **`SegmentedControl`** — a generic single-select segmented control for choosing across 3+ mutually-exclusive states. States can carry a `group` key (a divider renders at group boundaries) and a per-state `color` (with a control-level fallback). Controlled (`value` + `onValueChange`, fires only on change), radio-group a11y with full keyboard nav (arrows/Home/End, roving tabindex, disabled-skipping), per-segment and whole-control `disabled`. Ridged-groove seam between segments; fixed single (md) size; always content-width. Ships `createSegmentedControl` and exports `SegmentOption`, `SegmentedControlProps`, `SegmentedControlOverrides`, `SegmentedControlDataProps`.
- **`OverrideToggle`** — curried `SegmentedControl` for the `AUTO | (PROD | OFF)` case: `Auto` in its own group; `Prod`/`Off` in the override group; selected colors distinct (Auto accent, Prod success, Off danger).
- Dev showcase **SegmentedControl** — OverrideToggle, ungrouped control-level color, and disabled states.

## 0.59.0

### Added

- **`WorkProgressCard`** — a status-aware work card whose bottom progress bar is derived entirely from metadata. Data-only props (`status`, `title`, `claimedBy?`, `subtitle?`, `estimate?`, `actual?`); the library decides all colors/proportions, so callers never style it. Bar treatment: in-progress→blue, complete→forest green, over-budget→crimson (bar reproportioned to actual), unused budget→dark grey, blocked/question→⚠/? sign over the work-so-far, new/closed→empty.
- **Card-progress derivation helpers** (pure, unit-tested — exported for custom renderers): `deriveCardBar({ status, estimate?, actual? })` → `{ segments, sign }`; `statusAccent(status)`; `actualFromSegments(segments, now)` (Σ closed-segment durations + open segment to `now`, the live-actual formula); `isRunning(segments)`. Plus `CARD_BAR_COLOR` / `CARD_SIGN_COLOR` and types `WorkStatus`, `CardProgressInput`, `CardBar`, `CardBarSegment`, `CardSign`, `WorkSegment`.
- Dev showcase **WorkProgressCard** — the nine states (A–I) plus a live simulation (Play / Step / Reset) of three tasks accruing actual time from work segments off a clock.

## 0.58.2

### Fixed

- **`DateAxis` / `ScrubChart` recentre now honours a new selection made mid-animation.** Clicking a new spot while the view is still gliding toward the last click smoothly redirects to the new spot instead of finishing the old move. The programmatic smooth-scroll's own scroll events were being mistaken for user scrolls, re-arming the grace window and suppressing the next recentre.

## 0.58.1

### Fixed

- **`CashflowScrubChart` deviation band colours were reversed.** A `balanceSeries` `fill` now shades green where the series rises **above** its reference line and red where it dips below (previously the opposite). `positiveClass` / `negativeClass` semantics flip accordingly.

## 0.58.0

### Added

- **`CashflowScrubChart` now overlays multiple balance lines** via a new `balanceSeries` prop. Each series supplies its y-values through a `(cell, index) => number | null` accessor (a `null` breaks the line into a gap — e.g. a forecast that only renders after `today`) and styles itself with a CSS class. The primary running-balance line is unchanged; the y-domain auto-widens to span every series.
- **Deviation bands.** A `balanceSeries` entry may carry a `fill` to shade the deviation between itself and a reference line (the primary line by default): green where the reference runs above the series, red where it dips below. The band is split at every crossing so each region is one solid colour. Themeable via `--sui-cashflow-band-positive` / `--sui-cashflow-band-negative`.
- **Export `CashflowBalanceSeries` and `CashflowSeriesFill` from the package root** so consumers can type their `balanceSeries` arrays and `fill` descriptors.

## 0.57.0

### Added

- **Export `StatusFlowNode` and `RenderNodeContext` from the package root.** These are the consumer-facing types for building `SwimlaneChart` data (`nodes: StatusFlowNode[]`) and writing a custom `renderNode` card. They were reachable only internally before; consumers had to derive them from `SwimlaneChartDataProps`.

## 0.56.0

### Added

- **`SwimlaneChart` now sorts swimlanes into vertical status bands** — DOING (top) → TODO/mixed (middle) → DONE (bottom). Within a band, lanes order by recency of activity, so actively-worked and just-completed lanes float to the top. Lanes slide between bands via a CSS-transitioned transform.
- **Completion hold** — a lane moving down (e.g. into DONE) holds its position for `reorderHoldMs` (default 10000ms) so a finishing item can be appreciated before it re-sorts; upward moves are prompt.
- New optional timing knobs on `SwimlaneChart`/`createSwimlaneChart`: `laneSlideMs` (lane slide duration, default 420), `reorderHoldMs` (default 10000), `laneResizeSettleMs` (resize debounce, default 3000).

### Changed

- **Lanes shrinkwrap to their visible cards.** A lane is only as tall as its tallest currently-visible column instead of reserving a fixed multi-row block, and children top-align under the parent at 1rem spacing. Lanes grow immediately when a card appears but debounce shrinks (reset by any node movement) so cards finish moving before the lane tightens; lozenge-targeted arrows re-anchor as the lane resizes.

## 0.55.0

### Added

- **`SwimlaneChart` node cards now render `claimedBy`, `estimate`, and `actual`.** `StatusFlowNode` gained three optional fields: `claimedBy` (top-left of the card, status moves to the top-right), `estimate` (bottom-left), and `actual` (bottom-right, accent-colored). The default card layout is now `claimedBy ┄ status` on top, the title filling the middle (clamped to 3 lines, full text in the hover popover), and `estimate ┄ actual` pinned to the bottom. All three are optional and their lines are omitted when absent.

### Changed — BREAKING

- **`SwimlaneChart` / `AnimatedSwimlaneChart` are now curried (data-only).** The default-named exports no longer accept visual/layout overrides (`nodeSize`, `columns`, `centerStatus`, `terminalStatus`, `timing`, `routingStyle`, `breakpoints`, `renderNode`, `renderPopover`, gaps) at the call site — only `nodes` and `onNodeClick`. This brings the chart in line with the curried-only export convention (0.52.0).
  - Migrate call-site overrides into a curry: `<SwimlaneChart nodeSize={…} renderNode={…} nodes={…} />` → `const Chart = createSwimlaneChart({ nodeSize, renderNode }); <Chart nodes={…} />`.
- **Removed the `SwimlaneChartProps` / `SwimlaneChartOverrides` / `AnimatedSwimlaneChartProps` / `AnimatedSwimlaneChartOverrides` type exports.** Use `SwimlaneChartDataProps` (alias of `AnimatedSwimlaneChartDataProps`) for the data-prop type. The base component is no longer exported. See the "AnimatedSwimlaneChart (public `SwimlaneChart`)" entry in `COMPONENTS.md`.

## 0.54.0

### Removed — BREAKING

- **Removed the deprecated `HUDSection`, `HUDPanel`, and `HUDList` aliases** from the package root. These re-exported config-bearing base components and were the last base-export leaks after the 0.52.0 curried-only refactor. Migrate:
  - `HUDPanel` → a Panel variant (`InfoPanel`, `AccentPanel`, `DangerPanel`, `CompactPanel`, …) or `createPanel({ … })`; a plain default panel is `createPanel({})`.
  - `HUDSection` → a Section variant (`CollapsibleSection`, `DecoratedSection`, `BorderedSection`) or `createSection({})`.
  - `HUDList` → `ScrollList` (scrolling) or `createList({})` (plain). `ListItem` / `HUDListItem` are unchanged.
- `HUDModal`, `HUDTabs`, `HUDButtonGroup` already resolve to curried variants; `HUDPage`, `HUDListItem`, and `createHUDPanel` are unaffected. See the "Curried-only exports" section in `COMPONENTS.md` for the full migration guidance.

## 0.53.0

### Added

- **`ScrubChart` click-to-select on the chart body** — a click on the chart frame (no drag) now scrubs the selection to the cell at the pointer x, complementing the existing drag-to-pan gesture from 0.51.0. The pointer handler defers capture until movement crosses a 4-px threshold, so a clean tap resolves as `onScrub(idx)` while a drag activates pan as before. Releasing back near the start after a drag does **not** stray-fire `onScrub` — the pan flag is sticky once set. Cell-index mapping reads the chart frame's bounding box and subtracts `plotLeft`, so clicks on the y-axis label column don't get misread as "click on cell 0".

## 0.52.0

### Changed — BREAKING (API surface)

- **The package now exports only curried components.** Base components that carried visual/static configuration props (`variant` / `size` / `tone` / `glow` / `align` / `corners` / etc.) are no longer exported from the package root. Consumers must use the curried named variants or the `createX(...)` factories; the bare base components are now internal. This enforces the library directive that an exported component exposes only props knowable at runtime or configured by a specific client — every visual decision is baked at variant-definition time.
  - Affected components: `Button`, `StatusBadge`, `Panel`, `Surface`, `Text`, `StatusLight`, `ThreadGroup`, `MessageBubble`, `ParticipantAvatar`, `Section`, `List`, Layout's `Stack` / `Row` / `Box` / `AppHeader`, `ActionRow`, `AssigneeChips`, `Divider`, `ProgressCheck`, `ButtonGroup`, `Tabs`, `TruthIndicator`, `OverflowNav`, Feedback's `AlertBox` / `EmptyState`, Modal's `Modal` / `ConfirmationModal`, and `Toast`.
  - Each now exposes `createX(defaults)` + curried named variants + an `XDataProps` type. The base component value and the full `XProps` type are no longer part of the public surface.
  - Components with no design-config props (e.g. `CountChip`, `AppShell`, `AppMain`, `Page`, `Tooltip`, `ListItem`, `InlineChartErrorOverlay`) are unaffected and remain exported directly.
  - **Migration:** swap the configured base for the matching variant — `<Button variant="primary">` → `<PrimaryButton>`, `<StatusBadge variant="compliant">` → `<CompliantBadge>`, `<Stack>` → `<TightStack>` / `<ContentStack>` / etc., `<Modal size="lg">` → `<LargeModal>`. For combinations without a named variant, curry your own once with `createX({...})` and reuse it. `Toast` consumers keep using `showToast(...)` / `<ToastRegion>` (unchanged).
  - The legacy `HUD*` aliases that resolved to bases now resolve to the curried variants where one exists; `HUDSection`, `HUDPanel`, and `HUDList` still re-export base components and remain deprecated pending removal.

## 0.51.0

### Added

- **DateAxis drag-to-pan** — mouse/pen click-and-drag horizontally on the date ribbon now pans the visible window (changes `scrollLeft`) in addition to the existing scrollbar / wheel / programmatic-recentre paths. A 4-px movement threshold defers pointer capture, so a click without movement still resolves to the per-cell `onClick` (tap-to-select) — no regression for keyboard or touch flows. Touch is left to native horizontal scroll (`pointerType === "touch"` early-return) so phones / tablets keep pan-x. Cursor flips to `grab` to advertise the affordance.
- **DateAxis sticky month/year labels** — two small pills (`MAY 2026` / `JUN 2026`-style, theming via `--sui-bg-elevated` + `--sui-text-secondary`) overlay the left and right edges of the visible ribbon and update reactively as the viewport scrolls. The right label is hidden when it would match the left (single-month viewport), reducing visual clutter. Implemented by wrapping the scroll container in a new `.sui-date-axis-wrapper` positioned ancestor; the labels sit `position: absolute` outside the scroll context with `pointer-events: none` so they never block scrub/pan gestures on the cells below.

### Changed — BREAKING (behavioural)

- **`ScrubChart` chart-frame drag now pans the inner DateAxis** instead of changing the selection. Dragging anywhere on the line-chart area pulls the window-band overlay around the chart (and the cells under the axis along with it), at a rate where one cell of motion on the graph maps to one cell of motion on the axis (`axisScrollLeft += dx * (cellWidth / dayPitch)`). To change the selected day, click (or tap) a cell on the DateAxis — the existing auto-recentre then slides the axis so the selected cell sits at the centre of the viewport (and the window-band on the chart follows). The `onScrub` prop is unchanged in shape and is still fired by axis cell clicks; only the trigger source has changed (drag no longer fires it). Consumers that relied on chart-drag-to-scrub will see no `onScrub` calls during graph drags after upgrading — wire to axis clicks instead. The overlay cursor flips from `ew-resize` to `grab` / `grabbing` to advertise the new gesture.

## 0.48.0

### Added

- **ScrubChart axes** — `ScrubChart` (and the `CashflowScrubChart` composite that wraps it) now grows a built-in y-axis and x-axis chrome.
  - **Y-axis** activates when the new `yDomain?: [number, number]` prop is set. ScrubChart computes a shared d3 linear scale (nice'd), draws the axis line + tick marks + right-anchored labels, and exposes `ctx.yToPlot(value)` to the `renderChart` slot so consumer-drawn series automatically share the same scale. Tick count is tunable via `yTickCount?: number` (default `5`); labels format via `formatYLabel?: (v: number) => string`.
  - **Auto-sized y-axis column** — the label column width is measured from the longest formatted tick label (canvas `measureText`, with a per-character estimate fallback for SSR/test environments) plus an 8px gap, so the axis sits as close to the container edge as the data allows. No manual sizing. An optional `yAxisWidth?: number` escape hatch on bare `ScrubChart` is available for advanced alignment use cases (e.g. two charts sharing a column); `CashflowScrubChart` does not expose it.
  - **X-axis ticks** activate via `xTickCadence?: "none" | "auto" | "week" | "month" | "quarter" | "year"` (default `"none"`). `"auto"` walks the week → month → quarter → year ladder and picks the finest cadence whose tick count stays under `xMaxTicks` (default `12`); if even the coarsest exceeds the cap it strides by `ceil(count / max)`. Default per-cadence labels: `MMM d` (week), `MMM` with `'YY` on January transitions (month), `QN 'YY` (quarter), `YYYY` (year). Custom formatter receives `(cell, resolvedCadence)` so it can vary output by unit.
  - **`renderChart` ctx** grows `plotLeft` / `plotTop` / `plotRight` / `plotBottom` / `plotWidth` / `plotHeight` describing the inner drawing region (full frame minus reserved axis margins). `cellToX(i)` / `cellBounds(i)` are now offset by `plotLeft` so consumer-drawn series land inside the plot region without doing the math themselves. `ctx.width` / `ctx.height` remain the full frame dimensions (backward compatible).
- **CashflowScrubChart** now ships these axes out of the box — running-balance line gets a dollar y-axis (compact `$1.5M` / `$5k` / `−$200` labels) and an auto-cadence x-axis. The internal renderer was switched to `ctx.yToPlot` + `ctx.plotLeft/Right/Top/Bottom` so the line, zero-line, selected-rule, and dot all align to the shared scale automatically.

### Changed

- **ScrubChart `cellToX(i)` coordinate system** — values are now offset by `plotLeft` (which is `0` when no `yDomain` is supplied, so existing consumers are unaffected). The window-band overlay and pointer-scrub mapping respect the same offset. If you've been calling `cellToX` from a `renderChart` that draws into a sibling SVG covering the full frame (the normal pattern), no change is needed.
- **`ScrubChartContext`** type expanded with the plot-region + `yToPlot` fields above. Additive; existing consumers continue to compile.

## 0.47.1

### Added

- **`source` export condition** for `.`, `./styles.css`, `./themes/*.css` — opt-in path for local consumers (npm link / file: dep / workspace) to read SUI from `src/` instead of `dist/`. Enables readable component names + `autoname` signal labels in the consumer's Solid DevTools, plus instant HMR on SUI edits. Activate by adding `"source"` to the consumer's `resolve.conditions` in `vite.config`. Production consumers are unaffected — the condition only fires when explicitly listed. See `docs/local-development.md` for full setup.

## 0.47.0

### Added

- **CashflowScrubChart** — Domain Composite (Depth 3). Zero-config drop-in over `ScrubChart` that bakes in the cashflow day-cell renderer (date corner + diverging green/red bar + dollar amount) and the running-balance line drawing. Call site is `cells: CashflowCell[]` + `selected` + `onScrub` — no `renderChart` / `renderCell` boilerplate. Per-day payload `CashflowCell = Cell & { cashflowCents: number; balanceCents: number }`: net day flow (signed) + cumulative running balance. Theming hangs off `--sui-cashflow-positive` / `--sui-cashflow-negative` (bar + amount colour) and `--sui-cashflow-cell-positive-bg` / `--sui-cashflow-cell-negative-bg` (cell background tint); window-band tokens inherited from `ScrubChart`. For a different visualisation on the same cell shape, drop down to bare `ScrubChart` and supply your own render slots.
- **`CashflowCell` type** exported from the package root for callers building their own cell arrays.

## 0.46.0

### Added

- **Stack** / **Row** grow a `fill?: boolean` prop. `Stack fill` applies `height: 100%; min-height: 0`; `Row fill` applies `width: 100%; min-width: 0` — forwarding the parent's size through so a scrolling descendant (e.g. a `fill` BaseTable) has a concrete dimension to size against. Additive, no breaking change. `fill` is also a lockable override on `createStack` / `createRow`.

### Changed

- **BaseTable** `fill` now makes internal scrolling the default instead of a no-op. When `fill` is set (and `maxHeight` is not), the table fills its parent and scrolls its body with the sticky header pinned — no more `maxHeight="100%"` + manual flex-ancestor plumbing. Implemented by splitting the scroll container off the sticky-header wrapper: a new inner `.hud-table__scroll` `<div>` wraps the `<table>` and owns `overflow-y: auto`, while the outer `.hud-table--fill` becomes a clipping flex column. `maxHeight` is unchanged as the explicit "cap at Npx and scroll" escape hatch (its inline style now lands on the inner scroll region). **FilterableTable** `fill` passes through the same way (toolbar stays fixed, table fills + scrolls). The extra wrapper `<div>` is the only DOM change for existing tables; default and `maxHeight` tables render and scroll as before.

## 0.45.0

### Changed — BREAKING

- **ScrubChart** rewritten with a linear-scale + visible-axis-window model, replacing the original fisheye geometry. Every cell now sits at uniform pixel pitch (`width / cells.length`), and ScrubChart owns a translucent rect overlay that tracks the slice of cells currently visible in the inner DateAxis viewport — classic overview + detail. Click-and-drag on the chart maps each pointer x directly to a cell index; there's no anchored start-layout, no `selectedAnim` tween, no `requestAnimationFrame` loop.

  **Removed:** `selectedFraction`, `sideCompression`, `gutterHeight` props; the gutter SVG + diagonal connectors; the in-chart day-edge vertical lines; the `layoutCells` / `xToCell` exports (and the `scales.ts` module that backed them). The `selectedFraction`/`sideCompression` factory variants no longer exist.

  **Added to `ScrubChartContext`:** `dayPitch` (number, the linear cell width in chart px), `windowCells` (`[firstIdx, lastIdx]` of cells in the axis viewport), `windowBounds` (`[leftX, rightX]` in chart px covering that slice). `visibleCells` is gone — iterate `ctx.cells` directly and use `ctx.cellToX(i)` for positions.

  **Theme tokens:** new `--sui-scrub-chart-window-fill` and `--sui-scrub-chart-window-stroke` CSS variables let consumers re-skin the window-band overlay.

  **Migration:**

  ```tsx
  // Before (0.44.0 — fisheye)
  <ScrubChart
    cells={cells} selected={i} onScrub={setI}
    selectedFraction={0.67} sideCompression={28}
    renderCell={renderCell}
    renderChart={(ctx) => {
      const points = ctx.visibleCells.map((j) => `${ctx.cellToX(j)},${y(ctx.cells[j])}`).join(" ");
      return <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`}><polyline points={points} /></svg>;
    }}
  />

  // After (0.45.0 — linear + window)
  <ScrubChart
    cells={cells} selected={i} onScrub={setI}
    renderCell={renderCell}
    renderChart={(ctx) => {
      const points = ctx.cells.map((c, j) => `${ctx.cellToX(j)},${y(c)}`).join(" ");
      return <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`}><polyline points={points} /></svg>;
    }}
  />
  ```

  The fisheye model didn't read well in practice — cell widths morphed under the cursor in ways that fought the user. The overview-plus-detail framing matches how the component is actually used (chart is the big picture, axis is the zoomed-in detail), and the math is dramatically simpler.

## 0.44.0

### Added

- **ScrubChart** — Composite (Depth 2). Pairs `DateAxis` with a user-supplied chart slot via a 20 px SVG gutter that draws diagonal connectors between each cell's chart-side and axis-side bounds. The focused cell occupies a fixed fraction of chart width (default 2/3) and morphs smoothly when scrubbed; neighbours compress into the side bands (fisheye). Two scale knobs (`selectedFraction`, `sideCompression`) tune the geometry. Scrubbing supports axis-cell click and drag-on-chart; drags use `setPointerCapture` and anchor to a start-frozen layout so the pointer-to-cell mapping doesn't shift as the layout morphs. Internal fractional `selectedAnim` drives a 250 ms ease-out tween on programmatic change via `requestAnimationFrame`. Generic over `C extends Cell` so consumers attach payload directly. Ships `createScrubChart` factory (no concrete named variant yet — single known use case; add one when a second emerges) plus pure helpers `layoutCells` / `xToCell` for chart authors who want the fisheye math standalone.
- **DailyDateAxis** — Curried day-cell variant restoring the original DateAxis ergonomics on top of the cadence-generic surface: takes `start: Date`, `end: Date`, `selected?: Date`, `onDayClick?: (day: Date) => void`, and a `renderDay?` whose `DayCellContext` includes `isFirstOfMonth` / `isLastOfMonth`. Internally generates `dailyCells(start, end)` and maps the date-keyed selection back to integer indices.
- **Cell helpers** — Pure functions exported from `./components/DateAxis`: `dailyCells`, `weeklyCells` (Monday-anchored by default; pass `0` for Sunday), `monthlyCells` (1st-of-month UTC), `hourlyCells` (UTC-hour-anchored). Each returns `Cell[]` whose `[start, end)` cover the requested range.

### Changed — BREAKING

- **DateAxis** is now cadence-generic. The component takes `cells: C[]` (where `C extends Cell`) instead of `start` / `end`, an integer `selected?: number` instead of `selected?: Date`, an `onCellClick?: (index, cell) => void` instead of `onDayClick?: (day: Date) => void`, and a required `renderCell` instead of an optional `renderDay`. The cell context shrinks to `{ isToday, isSelected, index }` — month-edge detection (`isFirstOfMonth` / `isLastOfMonth`) is day-specific and moves to `DayCellContext`, surfaced by the new `DailyDateAxis` variant and the exported `dayCellContext` helper. New behaviour: when `selected` is provided, the axis scrolls smoothly to centre it (skipped while the user is actively panning manually). New optional prop `scrollableRef` lets `ScrubChart` subscribe to the axis's scroll position.

  **Migration to keep day-cell ergonomics:**

  ```tsx
  // Before
  <DateAxis start={start} end={end} selected={day} onDayClick={setDay} renderDay={renderDay} />

  // After — same API, just rename to DailyDateAxis
  <DailyDateAxis start={start} end={end} selected={day} onDayClick={setDay} renderDay={renderDay} />
  ```

  **Migration to use the new generic surface directly:**

  ```tsx
  import { DateAxis, dailyCells, dayCellContent } from "@primestageprime/solid-ui-components";

  const cells = dailyCells(start, end);
  <DateAxis cells={cells} selected={index} onCellClick={(i) => setIndex(i)} renderCell={dayCellContent} />
  ```

- The package root export `Cell` is now reserved by the existing table-cell component. The DateAxis time-bucket type is exported from the package root as **`DateAxisCell`** instead. Deep imports (`from "@primestageprime/solid-ui-components/components/DateAxis"`) still see it as `Cell`.

## 0.43.0

### Added

- **DateAxis** — Atomic (Depth 1). A standalone horizontal day-cell ribbon (one cell per calendar day, horizontal scroll for long ranges, today marker, month label above the number on the first/last day of each month). NOT the chart-internal `XAxis` — plain HTML, no scale or chart context, usable as a bottom-of-chart date header or a freestanding "rules" axis. Props: `start`/`end` (inclusive range), `today?`, `cellWidth?`, `selected?`, `onDayClick?` (clickable + keyboard-activatable days for scrubbing a linked view), and `renderDay?: (day, ctx) => JSX.Element` — a per-cell render prop where the caller owns each cell's content *and* size (the axis grows to fit and the scrollbar sits below). Ships `createDateAxis` (baking the `cellWidth` override) plus the pure helpers `eachDayOfRange` / `isSameCalendarDay`.

## 0.42.0

### Added

- **DnDHierarchySortBar** — Atomic (Depth 1). A drag-to-reorder horizontal row of dimension pills for reordering a tag hierarchy (extracted from dside's `DesignView` nest-order bar). Controlled: `items: { id, label }[]` + `onReorder: (nextOrderedIds) => void`, plus an optional `label` (default "nest by"). No curried variant — every prop is data/callback, so there's nothing presentational to freeze.

## 0.41.0

### Added

- **Fab** — floating action button (Composite, Depth 2). Composes `Button` + `Icon`; round 56px, default color, placement-agnostic (the container positions it — no `position`/`offset` props). Required `icon` + `label` (the accessible name). Ships a `createFab` factory and the `AddFab` curried variant (`createFab({ icon: "plus" })`) for drop-in add actions: `<AddFab label="Add item" onClick={fn} />`.
- **BottomSheet** — container-bounded bottom sheet (Atomic, Depth 1). Slides up from the bottom of its parent — NOT a viewport overlay like `Modal`: the scrim and sheet are `position: absolute` inside a `position: relative` parent with a 60% max-height, so it can never cover a sibling region above it. Controlled via `open` + `onClose`, with a grabber handle and scrim-click dismiss.

### Changed — BREAKING

- **AnimatedSwimlaneChart** (alias `SwimlaneChart`): status-driven rewrite. The component now takes a `StatusFlowNode[]` instead of positional `DAGNode<T>[]`, and ships the polished lozenge + slurp + orthogonal-arrows + arrow-settle + hover-popover animation that previously lived only in the workshop. Consumers only have to pass `nodes`; sizes, timing, lozenge geometry, routing, and breakpoints all have library defaults overridable once via the curry factory.

  **New minimum usage:**

  ```tsx
  import { createAnimatedSwimlaneChart } from "@primestageprime/solid-ui-components";

  const ProjectFlow = createAnimatedSwimlaneChart({});

  <ProjectFlow nodes={tasks} />
  ```

  `tasks` is `StatusFlowNode[]`: `{ id, title, status, parentId?, dependsOn?, subtitle? }`.

  **Migration from the old positional-DAG API:**
  1. Convert each `DAGNode<T>` into a `StatusFlowNode`. The `x`/`y`/`lane` positional fields are dropped; you supply `status` instead, and the chart computes column positions itself.
  2. If you previously used `lane` to group nodes into rows, set `parentId` on the children to the id of the lane's parent node, and add the parent node itself.
  3. Replace `<AnimatedSwimlaneChart {...positionalProps} />` with a curried `createAnimatedSwimlaneChart({})` and pass only `{ nodes }`.

  Old positional rendering is no longer available. If you need it back temporarily, pin the package to the previous version.

## 0.37.1

### Fixed

- **TabbedSidePanel**: `PaddedBody` now sets `min-width: 0` and `min-height: 0`. Without this, the CSS default `min-width: auto` on flex children let any descendant with intrinsic width (DAG SVG, wide tables, long words) propagate up through the panel and overflow its container. Symptom: side panel growing past its allocated flex width with horizontally clipped content. Promotes a downstream override that lived in `amygdala-ui/src/styles/sui-theme-overrides.css`.

## 0.36.0

### Added

- **TabbedSidePanel**: new `contentPadding` prop (`"none" | "sm" | "md"`, default `"sm"`). Adds a small inboard gap between the vertical tab strip and the body so content no longer visually collides with the strip labels. **Default-changing visual bump** — every existing consumer gains ~8px of inboard padding on the body. Pass `contentPadding="none"` to preserve the previous flush behavior. Threaded through `RightDetailTabbedPanel` and `LeftNavTabbedPanel` curried variants.

## 0.35.0

### Added

- **Bronze theme** — a light, serif (Lora), friendly variant. Lora is used for prose; Inter for utility text (buttons, badges, subtitles, list metadata). Warm bone background, rust accent.
- **Theme architecture** — extracted shared component CSS into `_baseline.css`, loaded once on app boot. Per-theme CSS files now declare only tokens plus theme-specific overrides. A new `manifest.ts` registry is the single source of truth driving the loader, the dev switcher, and package exports.
- New token `--sui-font-utility` for small-text components. Defaults to `--sui-font-family` via CSS var fallback, so existing themes need not declare it.

### Changed

- `default.css` is now **tokens-only**. Consumers using `loadTheme()` (the documented JS API) are unaffected. Consumers loading `@primestageprime/solid-ui-components/themes/default.css` directly by URL will see component CSS go missing — they must also load `@primestageprime/solid-ui-components/themes/_baseline.css` (or move to the JS API). See `src/themes/README.md` for details.
- The dev `ThemeSwitcher` is now a dropdown sourced from the manifest rather than a 2-state toggle.

### Dev / internal

- **DotChart showcase** rebuilt as a reference for the amygdala-ui dotchart pattern: two stacked `<TimelineBar>` strips anchored in the chart's bottom margin (`bandY={{ anchor: "margin-bottom" }}`) so they sit along the bottom of the x-axis, with tick marks pushed below the strips via `XAxis.tickOffset` / `labelOffset`. Includes a data-check panel (hover any bar to pop dashed reference lines at its `start`/`end` and highlight its row in a tabular dump of `id`, `lane`, formatted clock + offset times, duration, and raw epoch ms). Dev-only — no library exports changed.

### Breaking changes

**Domain-name rename pass.** SUI now names *shapes*; consumer apps name *domain concepts*. Three components carried maritime/engine-domain names that misrepresented their generic shape — they've been renamed (or removed) accordingly.

| Old | New | Migration |
|---|---|---|
| `VesselCard`, `VesselCardProps` | `RemovableItemCard`, `RemovableItemCardProps` | Find/replace symbol names. Props unchanged. No CSS-class changes — `RemovableItemCard` is zero-CSS and emits no own selectors. |
| `VesselCallHeader`, `VesselCallHeaderProps` | `TitledTimeRangeHeader`, `TitledTimeRangeHeaderProps` | Find/replace symbol names *and* prop names — see below. |
| `EngineDataSection`, `EngineDataSectionProps` | *(removed)* | Inline the pattern using existing Primitives — see below. |

**`TitledTimeRangeHeader` prop renames** (in addition to the component symbol):

| Old prop | New prop |
|---|---|
| `vesselName` | `title` |
| `connectedAt` | `start` |
| `disconnectedAt` | `end` |
| `assetId` | `assetLabel` |

The CSS class prefix changed in lockstep: `sui-vessel-call-header*` → `sui-titled-time-range-header*`. Consumers that target these classes directly need to update their selectors. The `badge`, `action`, and `href` props are unchanged.

**`EngineDataSection` replacement.** The component baked the "Add Power Log" warning copy and `defaultKw` / `auxEngineHref` props into a thin wrapper around existing Primitives. Inline the pattern at the call site:

```tsx
import { NarrowStack, TextTitle, TextBody, AlertBox, NumberWithUnits } from "@primestageprime/solid-ui-components";

<NarrowStack>
  <TextTitle>{heading}</TextTitle>
  {tableContent}
  <Show when={showWarning}>
    <AlertBox
      variant="warning"
      title="Power Log Required"
      action={<a href={auxEngineHref}>Add Power Log</a>}
    >
      <TextBody>
        Using default (<NumberWithUnits value={defaultKw} units="kW" precision={0} />).
        Add aux engine data to improve accuracy.
      </TextBody>
    </AlertBox>
  </Show>
</NarrowStack>
```

The inlined version drops the `EngineDataSection`'s own chrome — adjust spacing/typography wrappers at the call site if the visual result differs from the original.

## 0.26.0

Wave 2 composites/extensions drop: promotes patterns hand-rolled in
dside-ui (Plan/Focus/Retro modes) so other apps can reuse them.

### Added

- **`CollapsiblePanel`** (composed) — `<CollapsiblePanel side label
  persistKey? defaultCollapsed?>{children}</CollapsiblePanel>`. Renders an
  `<aside>` with a thin collapse chevron when expanded, and a ~24px
  vertical strip with a rotated label + expand chevron when collapsed.
  Mirrors collapse state to `localStorage` when `persistKey` is set.
  Includes `createCollapsiblePanel(defaults)` factory.
- **`WeekCalendar`** (composed) — `<WeekCalendar days startHour endHour
  pxPerHour? blocks renderBlock highlight? />`. Pure layout primitive:
  time gutter on the left, day columns each with absolute-positioned
  block slots. Time strings parse with the dside "1-8 means PM"
  convention via the exported `parseWeekCalendarTime` helper. Optional
  `highlight` adds a cyan glow on the matching slot. Includes
  `createWeekCalendar(defaults)` factory.
- **`ActionRow`** (composed) — `<ActionRow tone? leading? trailing?
  actions?>{children}</ActionRow>`. Hover-revealed action bar
  (visibility-toggled so layout doesn't shift); `tone` drives border +
  background accent (e.g. red for `danger`, cyan for `accent`). Action
  buttons accept their own `tone: "accent" | "muted" | "outline"`.
  Includes `createActionRow(defaults)` factory.
- **`AssigneeChips`** (atomic, promoted) — `<AssigneeChips ids
  resolveName size? />`. Filled cyan pill per id; `resolveName`
  resolver replaces the hard-coded `SAMPLE_TEAM` lookup used in the
  dside-ui original. Includes `createAssigneeChips(defaults)`.

### Changed

- **`BurndownChart`** gains `size?: "xs" | "sm" | "md"` (default `"md"`,
  backward-compatible). `"xs"` strips Grid / X-axis / Y-axis and shrinks
  the chart footprint to ~180×60 for inline card use.
- **`Button`** gains a first-class `tone?: "accent" | "outline" |
  "muted"` prop orthogonal to `variant`, mirroring the trio used by
  several inline button factories in dside-ui (`triageBtnStyle`,
  `standupBtn`, `focusBtn`, `carryoverBtn`, `planWeekBtnStyle`).
  Implemented as `sui-btn--tone-*` modifier classes; no existing
  variant/size styles change.
- **`ButtonGroup`** gains a matching `tone?` prop surfaced as
  `sui-btn-group--tone-*` for consumers that want to scope tone styles.

## 0.25.0

Wave 1 atoms drop: extracts patterns hand-rolled in dside-ui so other apps can
reuse them without re-implementing.

### Added

- **`Markdown`** (atomic) — `<Markdown source={string} />`. Renders h1–h3,
  unordered lists, **bold**, *italic*, `code`, and paragraph breaks via a
  small inline parser (no runtime dependency). Exports `renderMarkdownHtml`
  helper and `createMarkdown(defaults)` factory.
- **`MarkdownEditor`** (composed) — `<MarkdownEditor value onChange rows? />`.
  50/50 split textarea + live `<Markdown>` preview. `createMarkdownEditor`
  factory.
- **`Kbd`** (atomic) — keyboard hint chip. Two modes:
  - `<Kbd letter="C" rest="onfirm" />` renders an underlined letter followed
    by the rest of the word (for hotkey hints).
  - `<Kbd>Esc</Kbd>` renders literal children inside a styled `<kbd>`.
  - `createKbd(defaults)` factory.

### Changed

- **`Modal`** gains `size="fullscreen"` (90vw × 90vh, max 1400px wide,
  100vh tall) and a new `header?: JSX.Element` slot for custom header
  content. Existing `title`/`subtitle`/`size` usages remain valid.
- **`Toggle`** gains `variant="thematic"` — pill-switch design with cyan
  accent fill, sliding thumb, uppercase label, and soft glow when on.
  Default and minimal variants unchanged.

## 0.24.5

DagChart: fix layering direction so source nodes (no incoming edges) sit at the leftmost column in horizontal layouts

## 0.24.4

DagChart: highlightedEdges prop applies sui-dag__edge--highlighted class for per-edge emphasis

## 0.24.3

DagChart: switch to layeringLongestPath so source nodes (no incoming edges) always sit at the leftmost column

## 0.24.2

DagChart: edge endpoints now clipped to node borders (fixes short-edge midpoint sitting inside nodes); edge delete × button now correctly clickable (pointer-events fix)

## 0.24.1

DagChart: edge delete × badge always rendered (opacity-gated) and z-ordered above nodes — fixes click race and short-edge invisibility

## 0.24.0

DagChart: optional `onEdgeClick(source, target)` with hover delete badge on edges.

## v0.21.0 — ProductGrid

Promoted `ProductGrid` (Composed, Depth 2) into the library, extracted from
the sandbox `elements-grid` step. It lays items out as an (area × focus)
pivot with two zones split by a focus label band: above-the-line solutions
on top (work tracked through todo → doing → done) and below-the-line needs
underneath (auto-met when every solution they reference is fully done).
Composes `StackedProgressBar` for both per-card and per-focus aggregate
status bars.

Major lines (white) separate areas and rows; minor lines (toned-down)
separate sub-columns within an area. Selection is bidirectional: clicking a
need surfaces its solving solutions; clicking a solution surfaces every need
that depends on it; clicking a focus highlights its whole sub-column. The
component supports both controlled and uncontrolled selection, and accepts
an optional `work` map so consumers can animate the counts externally.

### Added

- **`ProductGrid`** (`ProductGrid/ProductGrid.tsx`) — props:
  - `items` — `ProductGridItem[]` (`id`, `area`, `focus`,
    `position: "above" | "below"`, `shortName`, `description`, optional
    `work`, optional `solvedBy`)
  - `areaOrder` — left-to-right ordering of areas (empty areas are dropped)
  - `work?` — `Record<id, { todo, doing, done }>`; overrides each item's
    static `work` field (used by consumers driving an animation tick)
  - `selection?` / `onSelectionChange?` — controlled selection of either an
    item or a focus column; omit both for internal-only state
  - `class?`, `style?`
- `isSolutionSatisfied(work?)` helper exported alongside the component.
- Showcase at `#/product-grid` with two datasets (elements / statements
  derived from the 100-statement vocabulary), a tab to switch between
  them, an animated work store advancing one unit per tick, and a
  selection-driven items table beneath the grid.

### Changed

- `dev/sandbox.tsx`: removed the now-promoted `elements-grid` step.

## v0.20.0 — SlotFillBar

Promoted `SlotFillBar` (Atomic, Depth 1) into the library, extracted from the
sandbox queue-animation step. It's a fill-from-left progress bar for an
ordered queue of equal-sized work slots that move through
`todo → doing → done`, with two distinct transition modes baked in:
**slide** for `todo → doing` (clip-path inset interpolated, colour snaps so
the slide reads as one solid wave) and **fade** for `doing → done` (overlay
background-colour transitions in place while the static fill grows by one
slot to absorb it). Honours `prefers-reduced-motion`.

### Added

- **`SlotFillBar`** (`SlotFillBar/SlotFillBar.tsx`) — props:
  - `slots` — total slot count
  - `done` — fully-completed slot count (drives the static fill)
  - `active` — `{ index, phase: "doing" | "done" } | null`
  - `height` (default 24), `maxWidth` (default 400, `null` to remove)
  - `todoColor` / `doingColor` / `doneColor` — CSS colour overrides
  - `label` — accessibility / hover title; defaults to `"<done>/<slots> done"`
- Showcase at `#/slot-fill-bar` with static, doing, and an animated
  example that walks a single fake task through the 20 phase-transitions
  of a 10-slot queue (1s tick).
- 7 SlotFillBar tests.

### Changed

- `dev/sandbox.tsx`: removed the now-unused `TransitionBar` and
  `TaskTransitionAnimation` helpers (single-task transition prototype
  superseded by `SlotFillBar`).

## v0.19.1 — Combobox: two-step backspace highlight-then-delete

### Fixed

- **`Combobox` (multi-mode)** — hitting Backspace on an empty input
  immediately deleted the last selected chip with no visual cue, so
  users trying to clear search text often lost a selection. New
  behavior matches Gmail's "to:" field and GitHub's label picker:
  1. Backspace on non-empty input → standard text deletion (no chip change)
  2. Backspace on empty input → highlight the last chip with a danger-tinted
     focus ring (no delete yet)
  3. Backspace again on empty input → delete the highlighted chip
  4. Escape or any printable key → clears the highlight (no delete)

### Implementation notes

- Disables Kobalte's built-in `removeOnBackspace` on the multi-mode root
  and owns the entire backspace contract in our wrapper.
- The state machine is extracted as a pure function (`backspace.ts`,
  `computeBackspaceAction`) and unit-tested without Solid rendering.
- Single-mode behavior is unchanged.

## v0.19.0 — More shell primitives + showcase coverage sweep

### Added

- **`AppNavLink`** (`Layout/AppNavLink.tsx`) — button-based top-bar nav link
  with an active state. Pair with `AppHeader`. Use over the `<a>`-based
  `NavLink` when the consumer dispatches navigation through a router
  callback rather than `<a href>`.
- **`SidebarPanel`** (`Layout/SidebarPanel.tsx`) — flexible-width sidebar
  with edge delineation + internal scroll. The non-mock counterpart to
  `DelineatedSidebar` (which is pinned at 400px for drafting). Takes
  `width` (default 280) and `side` (`"left"` | `"right"`).
- 11 new showcases that close the gap from `TODO.md`: `BurndownChart`,
  `CompletionTimeline`, `Dropdown`, `PopoverMenu`, `ProgressCheck`,
  `QuadrantGrid`, `RingChart`, `SprintSelector`, `TagInput`,
  `ThroughputChart`, `WorkerCard`.
- Tests for `AppNavLink` and `SidebarPanel`. 50 tests pass across 10 files.

## v0.18.0 — Shell primitives extracted from dside

Pulled recurring layout/UI patterns from the `dside-ui` consumer into the
library so the consumer can drop ~80 inline-style fragments and several
hand-rolled mini-components.

### Added

- **`AppShell`** + **`AppHeader`** + **`AppMain`** (`Layout/AppShell.tsx`) —
  full-viewport vertical column with non-shrinking header and flexing main.
  `AppHeader` has `size` (sm/md/lg padding) + `inline` mode for sub-bars
  inside the main area. Replaces hand-written `display: flex; flex-direction:
  column; height: 100vh` shells.
- **`CountChip`** (`Badge/CountChip.tsx`) — `<count> <LABEL>` pill that
  emphasizes itself when count > 0 and dims when zero. Replaces inline
  `inline-flex; padding 2px 8px; border 1px solid …` chips.
- **`StickyGroupHeader`** + **`SectionLabel`** (`Section/`) — sticky-positioned
  group divider for scrolling lists, plus the uppercased dimmed label
  typography that goes inside it. Replaces inline sticky styling for
  status-grouped sidebars.
- Showcases for `AppShell`/`AppHeader`/`CountChip`/`StickyGroupHeader`/
  `SectionLabel`, plus quick-win showcases for `Duration` and `StatusLight`
  (previously only mentioned inline elsewhere).
- Smoke tests for all new components — 45 tests across 10 files.

### Fixed

- `HeatStack` was missing from `src/index.ts` even though every other
  Heat\* component was exported. Now wired up.

## v0.17.0 — Audit pass: tests, conventions, monolith → Chart-family

Repo-wide cleanup pass driven by an analysis review. No public API changes
beyond two compatible renames.

### Added

- **Vitest baseline** — `vitest` + `jsdom` + `@solidjs/testing-library`
  wired up. 34 smoke tests across Button, Text, Layout (incl.
  ProportionalStack/Item), Surface, Toggle, TruthIndicator, QuickFilter.
  Scripts: `npm test`, `npm run test:watch`.
- `scripts/audit-inline-styles.mjs` + `npm run audit:styles` — surfaces
  inline `style={…}` repeats; recurring fragments are candidates for new
  curried variants.
- `README.md` — index pointing at each existing doc (COMPONENTS,
  STYLE_GUIDE, AGENT_GUIDE, DESIGN_LANGUAGE, CHANGELOG, TODO).
- Showcases for `TruthIndicator` and the generic `QuickFilter` atom.
- Showcase-coverage gap list captured in `TODO.md` (14 components).

### Changed — internal-only refactors (public API preserved)

- **`ThroughputChart`**, **`CompletionTimeline`**, **`BurndownChart`** now
  internally compose the `Chart` family (`<Chart>` + `<Grid>` + axes +
  `<LineSeries>` / `<AreaSeries>` / `<BarSeries>` / `<ReferenceLine>` +
  `<Crosshair>` + `<ChartTooltip>`). All three keep their pre-v0.17 prop
  surfaces — drop-in.
- **Sticky header by default** for `BaseTable` (carried over from v0.16).
- **Index re-exports normalized**: `Surface`, `Text`, and `Layout` now
  use `export * from "./variants"` instead of manually-listed variant
  names — adding a new variant in `variants.ts` is automatically public,
  no drift.
- **Duration**: switched to a named export (default re-export retained
  for back-compat; remove in next major).
- **MathFormula**: katex stylesheet side-effect import moved out of
  `MathFormula/index.ts` and into `MathFormula.tsx` so consumers that
  only touch the library root no longer ship KaTeX's CSS.
- Dev theme injection consolidated into a shared `dev/load-theme.ts`
  helper; `ThemeSwitcher` and `Sandbox` both call it.
- `Table/QuickFilter.tsx` file renamed to `Table/FilterableTable.tsx`
  to match the v0.16 export rename.

### Repo / build

- Settled on **npm**; removed `pnpm-lock.yaml`; added `packageManager`
  and `engines` fields to `package.json`.
- Documented the folder-naming convention in `STYLE_GUIDE.md` (singleton
  vs category folders) and flagged the four legacy mismatches
  (`Badge`/`Card`/`DragDrop`/`Selector`) for next-major rename.

## v0.16.0 — Sandbox harness; new atoms; chart family; vocabulary

A larger release than usual — the project picked up a mock-drafting harness
and a small vocabulary doc, plus several new components and a generic chart
family. The high-level theme: composability over monoliths.

### Added — components

- **`ConversationTree`** (Depth 3) — Multi-participant message thread,
  optionally threaded via `replyToId`. Deterministic muted cool-palette
  per-author color (HSL 185–260, S 32–45%, L 60–67%); initials avatar
  fallback. Consecutive same-author messages within `groupWithinMs` (default
  5min) fold into one block; day change or gap > `absoluteAfterMs` (default
  1h) inserts a labeled divider. Per-bubble full timestamp on hover.
  `currentUserId` flips alignment for the viewer's messages with stronger
  fill. Bubble cap 80ch; body 80% width with right-side bubbles overlapping
  the left. `clampLines` (default 5) collapses long messages behind
  `(more…)`; `maxLines` (default 20) caps the expanded height with internal
  scroll.
- **`HeartbeatSparkline`** (Depth 1) — Pure-SVG rectangular sparkline of
  `% of timeout consumed`. Variants `connected` (green), `disconnected`
  (grey), `error` (red, blinks). Caller-fed samples (0..1).
- **`LiveHeartbeatTrace`** (Depth 2) — Adds the tick timer + sample buffer
  + state derivation on top of `HeartbeatSparkline`.
- **`ConnectionStatus`** (Depth 3) — Stacked indicator: name on top,
  sparkline (or `StatusLight` dot) beneath. Reassuring when healthy — no
  time-since text.
- **`TruthIndicator`** (Depth 1) — Boolean indicator: green check for true,
  red prohibition (circle + slash) for false. `value`, `size` (sm/md/lg),
  optional `onClick` makes it a button.
- **`QuickFilter`** (Atomic, Depth 1, top-level) — Generic filter input
  over a list with a render-prop child. Tokenized AND-matching across
  whitespace-split tokens. Composes with list/table/tree.
- **`Chart` family** (Depth 2) — Slot-style composable chart:
  `<Chart>` + `<Grid>` + `<XAxis>` + `<YAxis>` + `<LineSeries>` +
  `<AreaSeries>` + `<PointSeries>` + `<BarSeries>` (stacked +/-) +
  `<ReferenceLine>` + `<Crosshair>` + `<ChartTooltip>` + `useChart()` +
  `linearScale` + `domainOf`. Reactive against any signals (`xDomain`,
  `yDomain`, `data`).
- **`ProportionalStack`** + **`ProportionalItem`** (primitives) — Flex
  container that always uses available space and splits among children by
  `weight`; oversized children scroll inside their slot.

### Added — curried variants

- Layout: `DelineatedSidebar`, `PageCanvas`, `ScrollPanel`.
- Text: `EllipsizedTitle`, `HintText`, `ScoreValue`, `MultiplierLabel`,
  `FormulaVar`.
- Toggle: `TruthToggle` and a new `createToggle()` factory.

### Added — dev / docs

- `dev/sandbox.tsx` — ephemeral page-mockup harness routed at
  `#/sandbox/<step-id>`. Steps live in source for HMR; an "+ add scratch
  step" button appends in-memory scratch steps. Default content is a
  `MockBaseline` (PageCanvas → DelineatedSidebar + ContentStack/SimplePanel)
  with parameterized empty-state hints. Five seed steps demonstrate the
  drafting vocabulary.
- `DESIGN_LANGUAGE.md` — vocabulary glossary mapping shorthand phrases
  ("the baseline", "shrink-wrapped delineated sidebar", "quickfilter",
  "detail area", "proportional stack") to their structural definitions and
  the curried variants that implement them.
- `dev/main.css` Sandbox harness styling (black chrome, `#333` mock frame,
  grid + step list + scratch-step add button).
- Sidebar filter input on the showcase nav.

### Changed

- `BaseTable` ships with **sticky header on by default** — table headers
  must never scroll off-screen. Opt out via `stickyHeader={false}`. The
  table wrapper's `overflow: hidden` is reset to `visible` when sticky is
  on so an outer scroll container (e.g. `ScrollPanel`) becomes the sticky
  reference.
- `Table/QuickFilter` (the table-bound Depth-2 wrapper) renamed to
  `FilterableTable` — frees the `QuickFilter` name for the new generic
  atom. File path also renamed: `Table/QuickFilter.tsx` →
  `Table/FilterableTable.tsx`.
- `HeartbeatSparkline` polyline no longer fills (variant fill was
  accidentally inheriting onto the line; now applies only to the trailing
  head dot).
- `Button`, `Stack`, `Row`, `Box`, `Text`, `Panel`, `Section`, `Surface`
  base components now re-exported from their respective `index.ts` files
  alongside the `createX` factories.
- `ConnectionStatus` and `ConversationTree` showcases use the standard
  Depth 2/3 two-column "composed from" layout.
- `Duration` switched from default export to named export (default still
  re-exported for back-compat; drop in next major).
- `MathFormula` no longer ships KaTeX's stylesheet to consumers that don't
  import it (side-effect imports moved into the component file).

### Repo / build

- Settled on npm; removed `pnpm-lock.yaml`; added `packageManager` and
  `engines` fields.

## v0.15.0 — ConnectionStatus family

New three-layer component family for service liveness indicators:

### Added

- **`HeartbeatSparkline`** (Atomic, Depth 1) — Pure SVG rectangular sparkline
  for "% of timeout consumed" over time. No timers, no business logic. Variants:
  `connected` (green), `disconnected` (grey), `error` (red, blinks). Caller-fed
  `samples: number[]` of values 0..1.
- **`LiveHeartbeatTrace`** (Composed, Depth 2) — Adds the tick timer + sample
  buffer + state derivation on top of `HeartbeatSparkline`. Caller passes
  `lastHeartbeatAt` + `timeoutMs` (+ optional `errorAt`); component derives
  state and pushes samples each tick.
- **`ConnectionStatus`** (Composed, Depth 3) — Stacked indicator: name label
  on top, sparkline (or `StatusLight` dot) beneath. No time-since readout —
  reassuring when healthy. Use for dispatcher / worker liveness rows.
- Re-exported `Button`, `Stack`, `Row`, `Box`, `Text`, `Panel`, `Section`,
  `Surface` base components from their respective `index.ts` files (previously
  only the `createX` factories were exposed; consumer code referencing the
  base components now type-checks).
- `dev/` showcase: filter input above the sidebar nav for fast component
  lookup; new `connection-status` showcase under Depth 3.

### Fixed

- Dev showcase entry imports for `Button`, `Stack`, `Text`, `Panel` no longer
  fail to resolve at the package boundary.

## v0.14.0 — DateTimeCell: time-zone, zone-abbrev suffix, plain empty variant

Three additive, opt-in capabilities on `DateTimeCell`. Zero breaking changes —
every existing call site renders byte-identical output because all new props
default to pre-0.14 behavior (host-local zone, no suffix, italic empty).

### Added

- **`timeZone?: string`** on `DateTimeCell` — IANA zone identifier
  (e.g. `"America/Los_Angeles"`). When set, the date is formatted in that zone
  via `Intl.DateTimeFormat({ timeZone }).formatToParts(...)`; when unset the
  renderer continues to use the host system's local zone via native `Date`
  getters (identical to pre-0.14 output). No Luxon dependency added.
- **`showZoneAbbreviation?: boolean`** on `DateTimeCell` — when `true`, appends
  a ` (PDT)`-style suffix to the formatted string, derived from
  `Intl.DateTimeFormat({ timeZone, timeZoneName: "short" })` using
  `formatToParts` to cleanly extract the abbreviation. Honors `timeZone` when
  provided, otherwise uses host-local zone. Default `false`. Chosen over a new
  format token because the boolean composes orthogonally with the existing
  `format` / `showSeconds` / `locale` API and matches `showSeconds`'s naming.
- **`emptyVariant?: "default" | "plain"`** on `DateTimeCell` — `"default"`
  (unchanged) renders the existing italic `—`; `"plain"` renders a non-italic
  `—` for downstream themes that prefer upright empty cells. Implemented as a
  new `.cell-empty--plain` class that flips `font-style: normal`.
- **CSS hook `--cell-empty-font-style`** on `.cell-empty` — the italic default
  is now `font-style: var(--cell-empty-font-style, italic)`, so an ancestor
  (table wrapper, theme root) can set `--cell-empty-font-style: normal` and
  restyle every empty-cell fallback globally without per-component props.

### Why this shape

Downstream `amygdala-ui` has a `DateRenderer` that formats ISO timestamps in
an IANA zone as `yyyy-MM-dd HH:mm:ss (ZZZZ)` (Luxon-backed) with a
non-italic empty fallback. Before 0.14 it could not wrap `DateTimeCell`
without losing zone handling, the zone abbreviation, or visual parity on the
empty state. After 0.14 the wrapper collapses to:

```tsx
<DateTimeCell
  value={props.timestamp}
  timeZone={props.timezone}
  showZoneAbbreviation
  emptyVariant="plain"
/>
```

and the Luxon dependency can drop out of that renderer.

### Behavior for existing consumers

None. All new props are optional and default to the pre-0.14 code path:
- `timeZone` unset → `Date` getters → host-local output (identical).
- `showZoneAbbreviation` unset → no suffix appended (identical).
- `emptyVariant` unset → class `cell-empty` only → italic fallback (identical).
- `.cell-empty` default `font-style` resolves to `italic` when
  `--cell-empty-font-style` is not set (identical).

## v0.13.0 — LongTextCell: clampLines + tooltip reveal

Additive extension to `LongTextCell`. No breaking changes — consumers
that pass only `maxLength` / `expandable` retain the exact current
behavior (char-count truncation with inline "more..."/"less" toggle).

### Added

- **`clampLines?: number`** — CSS `-webkit-line-clamp` truncation. When
  set, the full value is rendered and truncation is detected at runtime
  by comparing `scrollHeight` / `scrollWidth` against client dimensions.
  Overrides `maxLength`. Re-measures on window resize and when the value
  or `clampLines` changes.
- **`reveal?: "inline" | "tooltip"`** (default `"inline"`) — selects the
  reveal mechanism for the full value when truncated. `"tooltip"`
  composes the library's existing Kobalte-backed `Tooltip` (viewport-
  aware placement, auto-flips when overflowing) and shows the full value
  on hover instead of rendering an inline toggle button.
- **`tooltipPlacement?: "top" | "bottom" | "left" | "right"`** (default
  `"top"`) — preferred tooltip placement when `reveal="tooltip"`.

### Why

The downstream `StringRenderer` in amygdala-ui needed CSS line-clamp +
viewport-aware hover tooltip, which the previous char-count-only
`LongTextCell` couldn't express. With these additive props, downstream
projects can retire their local `useSmartTooltip` / `TruncationContext`
primitives and thin-wrap `LongTextCell` instead.

## v0.12.0 — `--sui-space-*` token scale

Exposes a dedicated spacing-token scale on both built-in themes.
Non-breaking — only adds new custom properties; no existing tokens were
renamed, removed, or changed. No upstream components were refactored to
adopt the tokens in this release (consumers and a future upstream
refactor sprint will migrate separately).

### Added

- **`--sui-space-*` scale** in `src/themes/default.css`,
  `src/themes/hud.css`, and `src/styles/global.css`. Eleven stops on a
  4px base grid with explicit half-steps at `0-5` (2px), `1-5` (6px),
  and `2-5` (10px). Token names follow Tailwind-style numeric suffixes
  so each integer step = 4px. Full scale:

  | Token | px |
  |-------|-----|
  | `--sui-space-0` | `0` |
  | `--sui-space-px` | `1px` |
  | `--sui-space-0-5` | `2px` |
  | `--sui-space-1` | `4px` |
  | `--sui-space-1-5` | `6px` |
  | `--sui-space-2` | `8px` |
  | `--sui-space-2-5` | `10px` |
  | `--sui-space-3` | `12px` |
  | `--sui-space-4` | `16px` |
  | `--sui-space-5` | `20px` |
  | `--sui-space-6` | `24px` |

- **`COMPONENTS.md` → Theming → Spacing Scale** table documenting
  typical use per stop.

### Rationale / data

Scale sized from a histogram of `padding|margin|gap|inset|top|right|bottom|left`
px literals across a downstream consumer repo (`amygdala-ui`,
`sui-migration-staging` branch — 175 files, CSS + inline JSX combined).
Top-9 values cover ~95% of occurrences:

| Rank | Value | Count | Maps to |
|------|-------|-------|---------|
| 1 | 8px | 181 | `--sui-space-2` |
| 2 | 4px | 130 | `--sui-space-1` |
| 3 | 12px | 97 | `--sui-space-3` |
| 4 | 6px | 82 | `--sui-space-1-5` |
| 5 | 16px | 77 | `--sui-space-4` |
| 6 | 2px | 50 | `--sui-space-0-5` |
| 7 | 10px | 38 | `--sui-space-2-5` |
| 8 | 24px | 34 | `--sui-space-6` |
| 9 | 20px | 32 | `--sui-space-5` |

### Omitted stops (and why)

- **No `--sui-space-7` / `32px`.** Only 1 occurrence in the sampled
  consumer. Callers needing it can round up to `--sui-space-6` or
  pass a literal; re-introduce if data changes.
- **No `48px` / `64px` jumbo stops.** Not seen in consumer data.
  Upstream adds them when a real page-gutter need arises — no
  speculative stops.
- **`7px` (11 occ.) and `14px` (7 occ.) not encoded.** Off-grid
  and infrequent; callers should round to `--sui-space-2` (8) or
  `--sui-space-4` (16). Flagged as rounding targets rather than
  adding `1-75` / `3-5` stops.
- **`1px` and `2px` in `border:` / `border-*:` properties.** Not
  counted as spacing — they remain literal per convention.
  `--sui-space-px` and `--sui-space-0-5` are for spacing-property
  use (e.g. `margin: 1px`, `top: 2px`).

### Known divergences from a pure 4px grid

`--sui-space-1-5` (6px) and `--sui-space-2-5` (10px) are explicit
half-steps. They exist because the consumer distribution showed
these values used heavily (82 + 38 occurrences) and rounding would
force a visible design shift. A future sprint may deprecate them
in favour of a strict 4px grid once downstream callers are
audited component-by-component.

## v0.11.1 — ThreePanelLayout column placement fix

CSS-only patch release.

### Fixed

- **Fix column placement when side panels are omitted.** Previously the
  center/right panels could land in the wrong grid track when `leftPanel`
  was absent: CSS grid auto-placement fills tracks in DOM order, so
  omitting the left cell pushed `center` into the `0px` first track and
  `right` into the `1fr` second track, producing overlap. Now
  `.sui-three-panel__left` / `__center` / `__right` carry explicit
  `grid-column: 1 / 2 / 3` so placement is role-based regardless of which
  siblings are rendered. The mobile (≤900 px) block resets all three back
  to `grid-column: 1` so the single-column stack is unaffected.

## v0.11.0 — Atomic primitive: ThreePanelLayout (Phase 1.8)

Ships the top-bar + three-column (left / center / right) page scaffold
identified by the migration audit's Phase 1.8 batch. This is the final
Veronica primitive of Phase 1 — with it merged, all upstream prerequisites
for the downstream alarm-lab / analysis-page migration are complete.

### Added

- **`ThreePanelLayout`** (`src/components/ThreePanelLayout/ThreePanelLayout.tsx`)
  — Atomic (Depth 1). Top-bar + three-column page scaffold. Owns
  `ThreePanelLayout.css`. Imports zero other library components (pure leaf
  primitive). Annotated `Component<ThreePanelLayoutProps>` for
  TS2742 / pnpm-portability. Exported types: `ThreePanelLayoutProps`.
- **Configurable panel widths.** `leftPanelWidth?` / `rightPanelWidth?`
  (defaults `"220px"` / `"240px"`) let callers pick column sizes per-page
  without needing a separate "variant" component. Omitted side-panel slots
  collapse their grid column to `0` so the center expands fully.
- **App-chrome-decoupled height.** `height?` (default `"100%"`) accepts any
  CSS length — callers that want "viewport minus app header" pass
  `"calc(100vh - var(--app-header-height, 64px))"` (or equivalent) from the
  host app. Upstream stays fully decoupled from app-specific header tokens.
  `fullHeight?` is kept as a backwards-compatible alias for `height="100%"`
  so existing downstream call sites (`<ThreePanelLayout fullHeight>`) migrate
  without an API rewrite — `height` wins if both are supplied.
- **Mobile collapse.** At `max-width: 900px` (matches the downstream
  `$mobile-width`) the content grid switches to a single column, side panels
  drop their border and cap at `200px` max-height. Breakpoint is hardcoded
  because the library has no `--sui-breakpoint-*` scale yet — revisit once a
  breakpoint scale lands.

### Tokens

- Colors / borders use the existing theme tokens:
  `--sui-bg-primary`, `--sui-text-primary`, `--sui-border`.
- Spacing (8 / 12 / 16 px gaps and paddings) is hardcoded to match the
  downstream `$gap-small` / `$gap-medium` / `$gap-large` and
  `$padding-small` / `$padding-medium` scales; the library has no
  `--sui-space-*` tokens yet. Follows the same pattern as `Divider.css`.
- No new tokens were introduced in `themes/hud.css` or `themes/default.css`.

### Divergences from the downstream driving site (intentional)

- Downstream `threePanelLayout.module.scss` uses `height: calc(100vh - $header-height)`
  where `$header-height` is an app-level SCSS variable. Upstream replaces this
  with a caller-supplied `height` prop to avoid leaking app-specific tokens
  into the library.
- Downstream hardcodes `grid-template-columns: 220px 1fr 240px`. Upstream
  exposes `leftPanelWidth` / `rightPanelWidth` props with those values as
  defaults.
- Downstream uses SCSS CSS modules; upstream uses a single plain CSS file
  with BEM-ish `.sui-three-panel__*` class names and `--sui-*` tokens.

## v0.10.0 — Composite primitive: DateRangePicker (Phase 1.7)

Ships the composed date-range picker identified by the migration audit's
Phase 1.7 batch. Folds the downstream `forms/DateRangePicker/` subdirectory
(root component + CalendarGrid + CalendarHeader + PresetButtons + TimeInputs +
`calendarUtils.ts`) into a single upstream composite with only the root
component exported. Phase 5 (Forms) can now delete the entire downstream
subdirectory and import `DateRangePicker` from the library.

### Added

- **`DateRangePicker`** (`src/components/DateRangePicker/DateRangePicker.tsx`)
  — Composite (Depth 2). Popover-anchored date-range picker built on
  `@kobalte/core/popover`. Owns `DateRangePicker.css`. Composes the upstream
  `Button` (Atomic) for preset chips. Internal `CalendarGrid`,
  `CalendarHeader`, `PresetButtons`, `TimeInputs` live as private files under
  the component directory and are NOT re-exported — zero-config at the call
  site (Decision 1a). Annotated `Component<DateRangePickerProps>` for
  TS2742 / pnpm-portability. Exported types: `DateRangePickerProps`,
  `DateRange`, `DateRangePreset`.
- **`timeZone?: string` prop on `DateRangePicker`.** Optional IANA TZ
  identifier (e.g. `"America/Los_Angeles"`, `"UTC"`). When set, the trigger
  label, month header, calendar-day highlighting, and committed time-of-day
  selections are all resolved in this TZ; when omitted, the component falls
  back to the browser's local TZ. Pre-empts Phase 5 migration mismatch: the
  downstream app pins operational timestamps to Pacific via
  `CellRenderers.tsx`, `OperationalEdgesTable.tsx`,
  `CandlestickRenderer.tsx`, `TimeRangeSelector.tsx` — forwarding the same
  IANA TZ here keeps the picker aligned with the surrounding UI at
  day-boundary transitions. Implementation uses a two-pass
  `zonedDateTimeToInstant` helper to resolve `HH:mm` + (year, month, day)
  into a committed UTC instant, and a cell-vs-instant comparison pair
  (`cellMatchesBoundary`, `cellInRange`) so the cell `Date` objects built
  by `getCalendarDays` line up with boundary instants observed in the
  target TZ.

### Behavioral delta vs project-local downstream

- **`class` now APPENDS to the default trigger class** (`sui-drp__trigger`)
  rather than replacing it. The project-local downstream substituted the
  caller's `class` for its internal `styles.trigger`; upstream layers the
  two via `["sui-drp__trigger", props.class].filter(Boolean).join(" ")`.
  Callers who previously passed `class` to customize the trigger keep
  default trigger styling and get their overrides layered on top. Phase 5
  migrations benefit automatically; any downstream consumer relying on the
  old replace-semantics must move trigger styles into a CSS override that
  coexists with `sui-drp__trigger`.

### Scope decisions

**Decision 1 — Sub-components private.** Only `DateRangePicker` is exported
from the library root. `CalendarGrid`, `CalendarHeader`, `PresetButtons`, and
`TimeInputs` are implementation details. Matches the audit's recommendation
and keeps the public surface minimal.

**Decision 2 — Vanilla `Date` + `Intl.DateTimeFormat`.** No Luxon, no
date-fns, no caller-supplied formatter contract. The downstream used Luxon
for weekday offsets and month/short-date formatting; all of that is replaced
with `new Date(year, month, 1).getDay()` + `Intl.DateTimeFormat` at zero
bundle cost. Keeps the library dep-light (Luxon would have added ~70 kB to
every consumer; requiring formatter props would have added 4–5 props to
every call site). Locale-aware formatting comes from the browser's built-in
i18n — no work for callers.

**Decision 3 — Presets caller-supplied.** `presets?: DateRangePreset[]`
matches the downstream contract. Omit or pass `[]` to suppress the preset
row. No built-in default preset set.

**Decision 4 — Browser-local timezone by default, opt-in `timeZone?` prop.**
The initial release shipped browser-local behavior only. Post-review
revision: added `timeZone?: string` (IANA identifier) so callers can pin
the picker to the same TZ the rest of their app renders in — preventing
off-by-one mismatches at TZ boundaries. Omitting the prop preserves
browser-local behavior; passing it threads TZ-aware comparison + formatting
through every touch point (trigger label, month header, calendar-cell
highlighting, committed `HH:mm` resolution).

### Kobalte — built from scratch, no `@kobalte/core/date-picker`

Kobalte does not ship a `date-picker` primitive (checked
`@kobalte/core/dist` subpaths). The picker is built on
`@kobalte/core/popover` plus hand-rolled calendar math and day buttons.
Popover is already covered by `vite.config.ts`'s `noExternal` pattern
(`/^@kobalte\//`), so no SSR config changes were needed.

### Divergences from downstream (intentional)

- Internal sub-components are not exported (downstream had them as separate
  files inside the feature folder; upstream treats them as private).
- Luxon replaced with vanilla `Date` + `Intl.DateTimeFormat`.
- SCSS CSS modules replaced with a plain `.css` file using BEM-ish
  `.sui-drp__*` class names and `--sui-*` theme tokens.
- `sanitizeMaxRangeDays` downgrades the dev-mode `throw` to a `console.error`
  + graceful fallback (`import.meta.env.DEV` is not available in this
  library's tsconfig/context; throwing in prod would have been worse than
  the downstream dev-only throw).

### Known gaps

- **No upstream test coverage for `calendarUtils`.** The downstream ships a
  Vitest `calendarUtils.test.ts` with month-boundary / range / clamp /
  sanitize coverage. Upstream has no test framework configured — tests are
  not ported in this release. Tracking follow-up: add Vitest to
  `solid-ui-components` so this and any future utility modules can ship
  with tests.

## v0.9.0 — Data primitives: ValueRenderer + ChangeRenderer + CandlestickRenderer (Phase 1.6)

Ships the three data-primitive components identified by the migration audit's
Phase 1.6 batch. Consolidates the downstream renderer family
(`ObjectRenderer` + `ChangeRenderer` + `ChangeObjectRenderer`) into a
`ValueRenderer` meta-primitive with a pluggable `renderValue` dispatcher plus
a `ChangeRenderer` composite that reuses the same dispatch on both sides.
`CandlestickRenderer` ships separately (OHLC shape does not fit the generic
dispatch).

### Added

- **`ValueRenderer`** (`src/components/ValueRenderer/ValueRenderer.tsx`) —
  Atomic (Depth 1). Labeled label/value layout with a hybrid dispatcher:
  zero-config for primitives (`string`, `number`, `boolean`, `null`/`undefined`),
  arrays, plain objects, and pre-rendered JSX; host supplies an optional
  `renderValue?: (v: unknown) => JSX.Element | undefined` to inject domain
  renderers (status badges, candlesticks, epoch-millis dates, etc.). Returning
  `undefined` from the override falls through to the default dispatcher. Object
  rendering recurses through the same pipeline so overrides apply at every
  nesting level. Owns `ValueRenderer.css`. Annotated `Component<ValueRendererProps>`
  for TS2742 / pnpm-portability. Exported types: `ValueRendererProps`,
  `RenderValueFn`.
- **`ChangeRenderer`** (`src/components/ChangeRenderer/ChangeRenderer.tsx`) —
  Depth 2 (Composite). Before/after pair with a directional arrow; both sides
  render through `ValueRenderer` so a single `renderValue` override applies
  consistently to both. Accepts optional custom `arrow` element. Owns
  `ChangeRenderer.css`. Annotated `Component<ChangeRendererProps>`.
- **`CandlestickRenderer`** (`src/components/CandlestickRenderer/CandlestickRenderer.tsx`) —
  Atomic (Depth 1). OHLC box visualization: open/close flanks, high/low stacked
  markers, mean inside the box. Default bullish/bearish coloring via
  `--sui-success`/`--sui-danger`; `getBoxColor` override for custom rules
  (e.g., doji detection). No component imports; owns `CandlestickRenderer.css`.
  Annotated `Component<CandlestickRendererProps>`. Exported types:
  `CandlestickRendererProps`, `Candlestick`.

### Scope decisions

**Decision 1 — Dispatch API shape.** Hybrid: minimal built-in default dispatch
for primitives and plain objects, with a `renderValue` prop as an explicit
extension hook. Ship no opinionated sub-renderers (e.g., status-keyword
detection, epoch-millis-as-date heuristics) — those are domain policies that
belong to the host. Objects on each side dispatch through `ValueRenderer` in
`ChangeRenderer`, which means a single host-supplied `renderValue` applies to
primitive values on both sides AND to nested values inside objects.

**Decision 2 — No sub-renderers upstream.** Downstream's
`String/Number/Duration/Date/StatusBadge` renderers carry
host-specific concerns (smart tooltip hook, alarm-color generation, Luxon
duration formatting, pacific-timezone format strings) that are not generic
enough for an atomic library. `ValueRenderer`'s default dispatcher renders
primitives inline without importing sub-atomics, honoring the "atomics must
NOT import other atomics" rule. Phase 7 can collapse the downstream
renderer files into call sites of `ValueRenderer` with a host-local
`renderValue` that wires in whatever domain atomics the app keeps around
(e.g., a project-local `StatusBadgeRenderer` + `DateRenderer` would stay
downstream as thin renderers; `ObjectRenderer.tsx` goes away entirely).

**Decision 3 — Single v0.9.0 release.** All three components share CSS
conventions (`--sui-*` tokens, label/value grid), ship together as the audit's
Phase 1.6 batch, and have low individual surface. One PR, one review, one
release. No batch chaining.

### Documented divergences

- **`ChangeRenderer` does not replicate downstream `ChangeObjectRenderer`'s per-key
  aligned grid.** When `before`/`after` are objects, each side renders through
  `ValueRenderer`'s default key/value entry list — the key-level diff (added /
  removed / changed / unchanged highlighting) remains a domain concern. If
  downstream needs that behavior, it stays as a domain component that
  composes `ValueRenderer` + custom per-key layout.
- **`CandlestickRenderer` does not embed a hover tooltip.** The downstream
  `useSmartTooltip`-based floating panel is host-specific. Callers wrap the
  base in the library `Tooltip` to reintroduce the behavior.

### CSS

- `src/components/ValueRenderer/ValueRenderer.css` — label/value grid, object
  entry list with alternating-row tint, primitive variants.
- `src/components/ChangeRenderer/ChangeRenderer.css` — pair layout, arrow
  styling, opacity-based before/after emphasis.
- `src/components/CandlestickRenderer/CandlestickRenderer.css` — OHLC box,
  absolute-positioned high/low markers, token-driven bullish/bearish fill.

### Component classification

- `ValueRenderer` — **Atomic (Depth 1)**. No component imports; owns CSS.
- `ChangeRenderer` — **Depth 2 (Composite)**. Composes `ValueRenderer`; owns
  its own CSS for the pair layout.
- `CandlestickRenderer` — **Atomic (Depth 1)**. No component imports; owns CSS.

The taxonomy is unchanged — `STYLE_GUIDE.md` already accommodates Depth 2
composites that own CSS for their own layout concerns on top of Atomic children.

### Phase 1.6 sequencing unblocks

These three exports plus `PivotTable` (still outstanding) complete the data
primitives batch. Phase 7 (downstream `renderers/*` migration) can now consume
`ValueRenderer`, `ChangeRenderer`, `CandlestickRenderer` directly from
`solid-ui-components`.

## v0.8.0 — Toast (Phase 1.5)

Wraps `@kobalte/core/toast` into an opinionated toast component plus the
provider atomics needed to host it. Completes the notification surface so
downstream's `amygdala-ui/src/components/toast/Toast.tsx` and the
`Routes.tsx` provider mount can both resolve from `solid-ui-components` at
Phase 8 swap time.

### Added

- **`Toast`** (`src/components/Toast/Toast.tsx`) — Themed toast with four
  variants (`info` | `success` | `warning` | `error`), optional
  `description`, `actions` (array of `ToastAction { label, onClick, variant? }`),
  `duration`, `persistent`. Extends `ToastRootProps` so any kobalte passthrough
  (priority, swipe handlers, etc.) still works. Annotated `Component<ToastProps>`
  for TS2742 / pnpm-portability.
- **`ToastRegion`** / **`ToastList`** — Curried atomics that wrap
  `@kobalte/core/toast`'s `Region` and `List` with baked-in styling. Mount once
  near the app root (inside a `Portal`) and call `showToast(...)` from
  anywhere.
- **`showToast(input)`** — Typed imperative helper. Returns
  `{ id: number, dismiss: () => void }`. Callers pass the same shape as
  `ToastProps` (minus `toastId`, which kobalte injects).
- **`toaster`** — Re-export of kobalte's raw toaster for `update` / `clear` /
  `promise` use cases not covered by `showToast`.
- Exported types: `ToastProps`, `ToastAction`, `ToastVariant`,
  `ToastRegionCurriedProps`, `ToastListCurriedProps`, `ShowToastInput`,
  `ToastHandle`.

### Provider surface decision

Ships a **two-option surface**:

1. `ToastRegion` + `ToastList` curried atomics — the 80% case; zero-config.
2. Raw `toaster` re-export — imperative escape hatch (`update` / `clear` /
   `promise`).

For callers that genuinely need `Toast.Root` / `Toast.Title` /
`Toast.Description` directly (rare — custom layouts, multi-region setups),
`@kobalte/core/toast` is already an installed peer and can be imported
directly. No upstream re-export is needed for that case.

Phase 8's `Routes.tsx` diff becomes a 1-line import swap —
`import { Toast } from "@kobalte/core/toast"` → `import { ToastRegion, ToastList }
from "solid-ui-components"` — plus renaming `<Toast.Region>` / `<Toast.List />`.

### Toaster API decision

Ships `showToast(input)` wrapper (typed to `ToastProps`) **and** re-exports the
raw `toaster` for `clear()` / `update()` / `promise()` edge cases. The wrapper
aligns with the new `Toast` prop shape so callers don't re-type the JSX at each
site; the raw re-export keeps every kobalte capability accessible.

### API divergences from downstream

- `toastId` is typed `number` (kobalte-native), not `string` as the audit
  sketch suggested.
- Variant set is `info | success | warning | error` (audit). Downstream's
  `"default"` maps to `"info"` — Phase 8 call-site rename.
- Action button styling is baked into `Toast.css` rather than composing the
  `Button` atomic (Atomic components may not import other Atomics per
  `STYLE_GUIDE.md`).
- Close-button glyph is inlined as a hardcoded `<svg>` in `Toast.tsx` rather
  than composing the `Icon` atomic — same rationale. Geometry mirrors the
  Icon atomic's `close` outline path so visual weight matches.

### Driving downstream sites

- `amygdala-ui/src/components/toast/Toast.tsx` (base component)
- `amygdala-ui/src/components/Routes.tsx` (`Toast.Region` + `Toast.List` mount)
- `amygdala-ui/src/contexts/VesselTypePromptProvider.tsx` (imperative
  `toaster.show` / `toaster.dismiss`)

### Unblocks

- Phase 8 `toast/` migration + `Routes.tsx` provider swap.

## v0.7.0 — ThemedNumberInput (Phase 1.4)

Rounds out the themed input family with a numeric field. Kobalte-backed
(`@kobalte/core/number-field`) — gets the stepper keyboard semantics, bounds
enforcement, and locale-aware formatting without re-implementing them.

### Added

- **`ThemedNumberInput`** (`src/components/ThemedNumberInput/`) — Themed
  numeric field with stacked increment/decrement triggers. Key props: `value`
  (`Accessor<number | undefined>`), `onChange`, `name`, `label`, `description`,
  `errorMessage`, `min`, `max`, `step?` (default `1`). Friendly `min`/`max`
  names map to kobalte's `minValue`/`maxValue`; all other `NumberFieldRootProps`
  forward via spread. Visual family with `ThemedInput` / `ThemedTextarea`
  (shared paddings, borders, focus ring).

### API divergences from downstream

- Downstream `amygdala-ui/src/components/forms/inputs/NumberInput.tsx` used
  `value?: number | Accessor<number | undefined>` and `onChange?: (value: number) => void`.
  Upstream tightens to `value?: Accessor<number | undefined>` (accessor-only —
  matches the rest of the library's reactive-prop convention) and changes
  `onChange` to `(value: number | undefined) => void` so callers don't need to
  guard on `NaN` when the field is cleared (kobalte emits `NaN`; we normalize
  to `undefined` at the boundary).
- Downstream surfaced `min` / `max` as its own props while the rest of the
  kobalte API was spread; upstream keeps that same friendly surface but
  explicitly `Omit`s `minValue` / `maxValue` from the forwarded kobalte props
  so the two spellings can't collide.

### Driving downstream site

- `amygdala-ui/src/components/forms/inputs/NumberInput.tsx` (sole call site).

### Unblocks

- Phase 5 forms — numeric threshold / bound fields (engine parameters, alarm
  thresholds, sampling rates).

## v0.6.0 — Selection Primitives (Phase 1.3)

Adds unified `Select` and `Combobox` primitives — each folds the single- and multi-mode downstream variants into a single upstream component via a `multiple?: boolean` literal that narrows `value` / `onChange`.

### Added

- **`Select`** (`src/components/Select/`) — Kobalte-backed single + multi select. Key props: `options`, `value`, `onChange`, `label`, `description`, `placeholder`, `id`, `multiple?`. All other `SelectRootProps` are forwarded. Multi-mode trigger renders a comma-joined preview + inline clear button; single-mode uses `disallowEmptySelection={false}`.
- **`Combobox`** (`src/components/Combobox/`) — Kobalte-backed single + multi combobox. Supports freeform creation on Enter via `onCreate`, per-chip removal via `onRemove` (multi-mode), input-change callback via `onInputChange`, and a `showChips` toggle (default `true` in multi-mode).

### Shared behavior

- Both components compose the existing `Icon` atomic (check / chevron-down / close) — no new iconography.
- Both CSS files use only `--sui-*` tokens; structural rules land in `dist/index.css`.
- Both ship in client + server bundles (SSR-safe via `vite-plugin-solid` `ssr: true` + kobalte `noExternal`, matching Tooltip's Phase 1.2 pattern).

### API divergences from downstream

- Single-site `onCreateNew` is renamed to `onCreate` for symmetry with the multi-site contract. Downstream call-site renames happen in a later phase.
- `showChips` defaults to `true` in multi-mode (was downstream-opt-in). Set `showChips={false}` to retain the listbox-only indicator behavior.

### Driving downstream sites

- Phase 5 forms (priority / status / tag pickers)
- Phase 8 `select` / `combobox` / `MultiCombobox` migrations

## v0.5.0 and earlier

See git log for prior history.
