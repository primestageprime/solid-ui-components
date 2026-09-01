import { type Component, createSignal } from "solid-js";
import { BandRail } from "../../src/components/BandRail";
import type { Band, Threshold } from "../../src/components/BandRail";
import { Stack } from "../../src/components/Layout/Stack";

/** Money, written the way the design snapshots write it: $200, $3.8k, $11k. */
const money = (v: number): string =>
  v >= 1000 ? `$${Math.round(v / 100) / 10}k` : `$${Math.round(v)}`;

const DRAW_DOMAIN: readonly [number, number] = [0, 11550];

const DRAW_THRESHOLDS: Threshold[] = [
  { value: 200, label: "safe in 6 mo", tone: "success" },
  { value: 3800, label: "safe in 12 mo", tone: "success" },
  { value: 9300, label: "or hire a bookkeeper", tone: "warning" },
  {
    value: 11000,
    label: "max draw · breaks even",
    tone: "muted",
    side: "below",
  },
];

/** The colliding case: two thresholds a few dollars apart. */
const PRICE_DOMAIN: readonly [number, number] = [80, 240];

const PRICE_THRESHOLDS: Threshold[] = [
  { value: 95, label: "market low", tone: "success" },
  { value: 102, label: "floor if sold out", tone: "muted", side: "below" },
  { value: 103, label: "target met from here", tone: "success" },
  { value: 120, label: "today", tone: "muted" },
  { value: 145, label: "market high", tone: "success" },
  { value: 230, label: "best take-home", tone: "warning" },
];

/**
 * The answers, as spans.
 *
 * Deliberately NOT the threshold wording. A tick says where the answer
 * changes, so "safe in 12 mo" belongs AT $3.8k; a band says what holds across
 * a span, so the same fact reads "12+ months of runway" over everything below
 * it. Repeating the tick's words on a bar makes the two marks look redundant
 * when they are answering different questions.
 */
const DRAW_BANDS: Band[] = [
  { end: 3800, label: "12+ months of runway", tone: "success" },
  { start: 3800, end: 9300, label: "6 to 12 months", tone: "success" },
  { start: 9300, end: 11000, label: "under 6 months", tone: "warning" },
  { start: 11000, label: "past break-even", tone: "danger" },
];

const DrawDial: Component = () => {
  const [draw, setDraw] = createSignal(6000);
  return (
    <Stack gap="sm">
      <BandRail
        domain={DRAW_DOMAIN}
        value={draw()}
        onChange={setDraw}
        thresholds={DRAW_THRESHOLDS}
        bands={DRAW_BANDS}
        format={money}
        label="Monthly owner draw"
      />
      <span class="text-meta">Drawing {money(draw())} a month.</span>
    </Stack>
  );
};

/** Four bands that all overlap, so every one takes its own lane. */
const OVERLAP_BANDS: Band[] = [
  { start: 0, end: 8000, label: "cash-flow positive", tone: "success" },
  { start: 2000, end: 9500, label: "covers payroll", tone: "accent" },
  { start: 4000, end: 11000, label: "covers rent", tone: "highlight" },
  { start: 6000, label: "eats the buffer", tone: "warning" },
];

const OverlapDial: Component = () => {
  const [draw, setDraw] = createSignal(5000);
  return (
    <Stack gap="sm">
      <BandRail
        domain={DRAW_DOMAIN}
        value={draw()}
        onChange={setDraw}
        bands={OVERLAP_BANDS}
        format={money}
        label="Monthly owner draw, overlapping answers"
      />
      <span class="text-meta">
        Drag and watch the arcs. At {money(draw())} the ring carries one arc per
        band that still holds.
      </span>
    </Stack>
  );
};

const PriceDial: Component = () => {
  const [price, setPrice] = createSignal(120);
  return (
    <Stack gap="sm">
      <BandRail
        domain={PRICE_DOMAIN}
        value={price()}
        onChange={setPrice}
        thresholds={PRICE_THRESHOLDS}
        format={money}
        label="Price per unit"
      />
      <span class="text-meta">
        Drag onto "today" at $120 to see the thumb nest inside the ring.
      </span>
    </Stack>
  );
};

export const BandRailShowcase: Component = () => (
  <div class="component-section component-section--full">
    <h2>BandRail — Primitive (Depth 1)</h2>
    <p class="text-meta">
      A one-dimensional value axis whose thumb rides its own consequences. The
      marks are model <em>outputs</em> plotted on the axis of the model{" "}
      <em>input</em>, so the control and the readout are one object. The
      consumer supplies what it has already computed; the rail does no
      arithmetic and never snaps the value it reports.
    </p>
    <p class="text-meta">
      Two marks. A <strong>threshold</strong> says <em>where</em> the answer
      changes. A <strong>band</strong> says <em>what</em> it becomes and over
      what span — the ambiguity thresholds alone could not fix, because a tick
      reading "insolvent in 6 mo" never said which side was the insolvent side.
      A band dims when the value leaves it, so dragging teaches the direction.
    </p>

    <div class="example-group">
      <h3>Composed — a draw dial</h3>
      <p class="text-meta">
        Drag, or focus the rail and use the arrow keys. Shift steps ten times as
        far; Home and End go to the domain ends; PageUp and PageDown jump
        between thresholds.
      </p>
      <DrawDial />
    </div>

    <div class="example-group">
      <h3>Composed — overlapping answers</h3>
      <p class="text-meta">
        Four bands overlap, so each takes its own lane — bands never share one.
        Two bars at the same height would read as a single bar spanning both,
        which is a span neither band claims. Height is the honest cost.
      </p>
      <OverlapDial />
    </div>

    <div class="example-group">
      <h3>Bounded, half-open, and neither</h3>
      <p class="text-meta">
        A capped end draws a tick down to the rail: that is a crossing. An open
        end runs to the rail's edge with no cap, because there is no crossing
        there to mark.
      </p>
      <BandRail
        domain={[0, 100]}
        value={50}
        bands={[
          { start: 20, end: 60, label: "bounded both ends", tone: "success" },
          { start: 70, label: "open to the right", tone: "warning" },
          { end: 15, label: "open to the left", tone: "accent", side: "above" },
        ]}
        format={(v) => `${v}%`}
        label="Share of capacity"
      />
    </div>

    <div class="example-group">
      <h3>Composed — labels that would collide</h3>
      <p class="text-meta">
        "floor if sold out" and "target met from here" sit a dollar apart. The
        first takes the other side of the rail; the second stacks into the
        second lane. Lanes are capped at four so a label can never leave the
        box.
      </p>
      <PriceDial />
    </div>

    <div class="example-group">
      <h3>Ends of the domain</h3>
      <p class="text-meta">
        A label at either end anchors inward rather than spilling out of the
        box. Both of these sit exactly on the rail's ends.
      </p>
      <BandRail
        domain={[0, 100]}
        value={50}
        thresholds={[
          { value: 0, label: "nothing at all", tone: "muted" },
          { value: 100, label: "everything there is", tone: "warning" },
        ]}
        format={(v) => `${v}%`}
        label="Share of capacity"
      />
    </div>

    <div class="example-group">
      <h3>Bare rail, and disabled</h3>
      <p class="text-meta">
        With no thresholds the rail is a plain dial. Disabled, it leaves the
        focus order and takes no input.
      </p>
      <Stack gap="md">
        <BandRail
          domain={[0, 100]}
          value={35}
          format={(v) => `${v}%`}
          label="Plain dial"
        />
        <BandRail
          domain={DRAW_DOMAIN}
          value={3800}
          thresholds={DRAW_THRESHOLDS}
          format={money}
          label="Monthly owner draw, locked"
          disabled
        />
      </Stack>
    </div>

    <div class="example-group">
      <h3>Atoms / Variants</h3>
      <p class="text-meta">
        Owns its CSS and composes no other component. Factory:{" "}
        <code>createBandRail({"{ format }"})</code> — curry the formatter
        when it is a static decision. Tone comes from the shared{" "}
        <code>Tone</code> union, so the theme owns every colour.
      </p>
    </div>
  </div>
);
