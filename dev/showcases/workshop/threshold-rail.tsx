// Bench — ThresholdRail against the design source.
//
// Both rails below carry the exact thresholds from
// ~/Downloads/thorcastingmocks/thorcasting-trades-module-snapshots.html,
// figures q2-runway-rail and q3-rail. The point of the bench is to compare the
// live render against those figures: tick lengths, lane pitch, where each
// label anchors, and whether the thumb nests when it lands on a threshold.
import { type Component, createSignal } from "solid-js";
import { SectionTitle } from "../../../src/components/Text";
import { Stack } from "../../../src/components/Layout/Stack";
import { ThresholdRail } from "../../../src/components/ThresholdRail";
import type { Threshold } from "../../../src/components/ThresholdRail";

const money = (v: number): string =>
  v >= 1000 ? `$${Math.round(v / 100) / 10}k` : `$${Math.round(v)}`;

/** q2-runway-rail — the draw dial. Four ticks, none colliding. */
const Q2: Threshold[] = [
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

/** q3-rail — the price dial. Two labels collide; one stacks, one goes below. */
const Q3: Threshold[] = [
  { value: 95, label: "market low", tone: "success" },
  { value: 102, label: "floor if sold out", tone: "muted", side: "below" },
  { value: 103, label: "target met from here", tone: "success" },
  { value: 120, label: "today", tone: "muted" },
  { value: 145, label: "market high", tone: "success" },
  { value: 230, label: "best take-home", tone: "warning" },
];

const ThresholdRailBench: Component = () => {
  const [draw, setDraw] = createSignal(6000);
  const [price, setPrice] = createSignal(120);

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Threshold Rail</SectionTitle>

      <div class="example-group">
        <h3>q2-runway-rail — draw dial</h3>
        <Stack gap="sm">
          <ThresholdRail
            domain={[0, 11550]}
            value={draw()}
            onChange={setDraw}
            thresholds={Q2}
            format={money}
            label="Monthly owner draw"
          />
          <span class="text-meta">{money(draw())} a month</span>
        </Stack>
      </div>

      <div class="example-group">
        <h3>q3-rail — price dial, colliding labels</h3>
        <Stack gap="sm">
          <ThresholdRail
            domain={[80, 240]}
            value={price()}
            onChange={setPrice}
            thresholds={Q3}
            format={money}
            label="Price per unit"
          />
          <span class="text-meta">
            {money(price())} — land on $120 to see the thumb nest
          </span>
        </Stack>
      </div>
    </div>
  );
};

export const meta = { label: "Threshold Rail" };

export default ThresholdRailBench;
