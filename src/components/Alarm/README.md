# Alarm overlay

Visual overlays for marking alarm conditions on a `<Chart>` from this
library. Three layers, each consumable on its own:

| Layer | What it is | When to use |
|---|---|---|
| Pure helpers | `detectRanges`, `padRanges`, `findHotZones`, `subtractZones`, `clampRanges`, `alarmPipeline` | Anywhere — they have no rendering deps. Unit-testable. |
| Base components | `AlarmBands`, `AlarmHotZones`, `AlarmStripeDefs` | When you want fine control over what renders or want to compose with non-alarm overlays. |
| Curried component | `AlarmOverlay` | The common case — drop in one tag and get the full treatment. |

The pipeline encodes the visual rules in this order:

```
raw points
    │
    ▼ detectRanges(data, yThreshold)        ── points whose y ≥ threshold
ranges
    │
    ▼ padRanges(ranges, padFraction, width) ── widen so adjacent ranges overlap
padded ranges
    │
    ▼ findHotZones(padded, depthThreshold)  ── where ≥ N alarms concur, collapse
hot zones                                       to a striped block
    │
    ▼ subtractZones + clampRanges           ── render-ready bands & blocks
```

## Quick start (curried)

```tsx
import {
  Chart, Grid, XAxis, YAxis, LineSeries,
  AlarmOverlay,
} from "solid-ui-components";
import "solid-ui-components/index.css";
import "solid-ui-components/themes/default.css";

function MyChart() {
  return (
    <Chart width={480} height={220} xDomain={[0, 199]} yDomain={[0, 100]}>
      <AlarmOverlay
        series={[
          { data: pointsA, threshold: 60 },
          { data: pointsB, threshold: 40 },
        ]}
        padFraction={0.12}
        depthThreshold={5}
      />
      <Grid />
      <XAxis />
      <YAxis />
      <LineSeries data={pointsA} x={(d) => d.x} y={(d) => d.y} stroke="#ff8080" />
      <LineSeries data={pointsB} x={(d) => d.x} y={(d) => d.y} stroke="#ffd060" />
    </Chart>
  );
}
```

That gets you, per series:

* a smooth translucent red band wherever the metric crosses its threshold,
* a striped block where ≥ N (`depthThreshold + 1`) padded ranges overlap,
* lane subdivision so two series stair-step top-to-bottom instead of stacking,
* a `×N` count badge in the top-right of each striped block.

## Compositional usage (base components)

Use the bases when `AlarmOverlay` doesn't fit — e.g. you want only the
blocks, or you want to combine alarm overlays with non-alarm SVG drawn
in a particular z-order, or you're computing ranges from a stream rather
than re-running the pipeline on every render.

```tsx
import {
  Chart, Grid, XAxis, YAxis, LineSeries,
  AlarmStripeDefs, AlarmBands, AlarmHotZones,
  detectRanges, padRanges, findHotZones, subtractZones, clampRanges,
} from "solid-ui-components";

function MyChart() {
  const xMin = 0, xMax = 199;
  const padded = padRanges(detectRanges(points, 50), 0.12, xMax - xMin);
  const zones = findHotZones(padded, 5);
  const bands = clampRanges(subtractZones(padded, zones), xMin, xMax);
  const visibleZones = clampRanges(zones, xMin, xMax);

  return (
    <Chart width={480} height={220} xDomain={[xMin, xMax]} yDomain={[0, 100]}>
      <AlarmStripeDefs />
      <AlarmBands ranges={bands} />          {/* below */}
      <AlarmHotZones zones={visibleZones} /> {/* above bands */}
      <Grid /><XAxis /><YAxis />
      <LineSeries data={points} x={(d) => d.x} y={(d) => d.y} stroke="#00d4ff" />
    </Chart>
  );
}
```

## Pure helpers (no chart needed)

```ts
import {
  detectRanges, padRanges, findHotZones,
  subtractZones, clampRanges, alarmPipeline,
} from "solid-ui-components";

// Each step is independently usable / testable:
const ranges = detectRanges(points, 50);
const padded = padRanges(ranges, 0.12, /* domain width */ 199);
const zones  = findHotZones(padded, 5);          // depth > 5 triggers
const bands  = subtractZones(padded, zones);     // ranges that survived
const safe   = clampRanges(bands, 0, 199);       // trim to chart edges

// Or the whole pipeline at once:
const out = alarmPipeline(points, {
  yThreshold: 50,
  padFraction: 0.12,
  xDomainWidth: 199,
  depthThreshold: 5,
});
```

## Visual treatments at a glance

| Condition | Treatment |
|---|---|
| No alarm | (nothing) |
| One alarm event | Smooth translucent band, full lane height |
| 2–N overlapping alarms (depth ≤ `depthThreshold`) | Bands stair-stepped into per-series lanes |
| > `depthThreshold` adjacent alarms in one series | Striped block in that series's lane with `×N` count badge |

## Theming

All visual decisions are CSS custom properties on `:root`. Override any
of them in your theme to retint:

| Var | Default | Description |
|---|---|---|
| `--sui-alarm-band-fill` | `#ff4040` | Smooth-band fill color |
| `--sui-alarm-band-fill-opacity` | `0.22` | Smooth-band fill opacity |
| `--sui-alarm-zone-stroke` | `#ff4040` | Striped-block border color |
| `--sui-alarm-zone-stroke-width` | `2` | Striped-block border width |
| `--sui-alarm-zone-stripe-fill` | `#ff4040` | Stripe ground and line color |
| `--sui-alarm-zone-stripe-bg-opacity` | `0.30` | Stripe-ground opacity |
| `--sui-alarm-zone-stripe-line-opacity` | `0.55` | Stripe-line opacity |
| `--sui-alarm-zone-stripe-line-width` | `3` | Stripe-line width |
| `--sui-alarm-zone-stripe-spacing` | `10` | Stripe spacing (pattern px) |
| `--sui-alarm-count-fill` | `#ffd0d0` | Count-badge text color |
| `--sui-alarm-count-font` | `"JetBrains Mono", monospace` | Count-badge font |
| `--sui-alarm-count-size` | `11px` | Count-badge font size |
| `--sui-alarm-count-weight` | `600` | Count-badge font weight |

## API reference

### `Pt`, `Range`, `HotZone`

```ts
type Pt = { x: number; y: number };
type Range = { start: number; end: number };
type HotZone = Range & { count: number };  // count = source ranges intersecting
```

### Pure helpers

| Function | Signature |
|---|---|
| `detectRanges` | `(data, yThreshold) → Range[]` |
| `padRanges` | `(ranges, padFraction, xDomainWidth) → Range[]` |
| `findHotZones` | `(ranges, depthThreshold) → HotZone[]` |
| `subtractZones` | `(ranges, zones) → Range[]` |
| `clampRanges` | `(ranges, xMin, xMax) → typeof ranges[number][]` |
| `alarmPipeline` | `(data, opts) → { ranges, padded, hotZones, visibleRanges, visibleHotZones }` |

### Components

| Component | Required context | Notes |
|---|---|---|
| `AlarmStripeDefs` | inside `<Chart>` | Render once; the `patternId` must match the consumer. |
| `AlarmBands` | inside `<Chart>` | One per series (or per logical channel). |
| `AlarmHotZones` | inside `<Chart>` + a matching `AlarmStripeDefs` | One per series. |
| `AlarmOverlay` | inside `<Chart>` | Curried — emits the above three for an array of series. |
