import { type Component, createSignal } from "solid-js";
import { BandRail } from "../../src/components/BandRail";
import type { Threshold } from "../../src/components/BandRail";
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

const DrawDial: Component = () => {
  const [draw, setDraw] = createSignal(6000);
  return (
    <Stack gap="sm">
      <BandRail
        domain={DRAW_DOMAIN}
        value={draw()}
        onChange={setDraw}
        thresholds={DRAW_THRESHOLDS}
        format={money}
        label="Monthly owner draw"
      />
      <span class="text-meta">Drawing {money(draw())} a month.</span>
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
      ticks are model <em>outputs</em> plotted on the axis of the model{" "}
      <em>input</em>, so the control and the readout are one object. The
      consumer supplies thresholds it has already computed; the rail does no
      arithmetic and never snaps the value it reports.
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
