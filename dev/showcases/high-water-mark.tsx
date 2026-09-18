// createHighWaterMark — an axis ceiling that rises with the data and falls only
// when asked. Not a visual component: a hook. It is shown here beside the
// chart it was built for, because the thing worth seeing is the AXIS NOT
// MOVING while the line does.
//
// Drag the scale down: the line falls, the y-axis holds at the highest peak
// seen. Drag it up past that peak: the axis makes room at once. Press the
// shrink button: the axis eases down to fit the line as it stands.
import { type Component, createMemo, createSignal } from "solid-js";
import { CashflowScrubChart } from "../../src/components/CashflowScrubChart";
import type { CashflowCell } from "../../src/components/CashflowScrubChart";
import { monthlyCells } from "../../src/components/DateAxis";
import { IconOnlyButton } from "../../src/components/Button";
import { Icon } from "../../src/components/Icon";
import { GrowFillBox, SpreadRow } from "../../src/components/Layout";
import { Slider } from "../../src/components/Slider";
import { CardSurface } from "../../src/components/Surface";
import {
  CaptionLabel,
  SectionTitle,
  TextTitle,
} from "../../src/components/Text";
import { createHighWaterMark } from "../../src/hooks";

const MONTHS = monthlyCells(
  new Date("2025-01-01T00:00:00Z"),
  new Date("2026-01-01T00:00:00Z"),
);

/** A balance that climbs $8k a month from $40k, times `scale`. In cents. */
const cellsAt = (scale: number): CashflowCell[] =>
  MONTHS.map((cell, index) => ({
    ...cell,
    cashflowCents: Math.round(800_000 * scale),
    balanceCents: Math.round((4_000_000 + 800_000 * index) * scale),
  }));

const peakOf = (cells: readonly CashflowCell[]): number =>
  Math.max(0, ...cells.map((cell) => cell.balanceCents));

export const HighWaterMarkShowcase: Component = () => {
  const [scale, setScale] = createSignal(1);
  const cells = createMemo(() => cellsAt(scale()));
  const top = createHighWaterMark(() => peakOf(cells()));

  return (
    <div class="component-section">
      <SectionTitle>createHighWaterMark</SectionTitle>
      <CaptionLabel>
        Hook. `ceiling()` rises with the data and holds when it falls;
        `reset()` eases it down to the current peak.
      </CaptionLabel>
      <div class="example-group">
        <Slider
          label="Scale the balance"
          value={scale()}
          onChange={setScale}
          min={0.25}
          max={2}
          step={0.05}
          format={(value) => `${Math.round(value * 100)}%`}
        />
        <CardSurface>
          <div class="high-water-mark-demo">
            <SpreadRow>
              <TextTitle>Cash Flow</TextTitle>
              <IconOnlyButton
                onClick={top.reset}
                aria-label="Fit y-axis to current values"
                title="Fit y-axis to current values"
              >
                <Icon name="shrink" size="sm" />
              </IconOnlyButton>
            </SpreadRow>
            <GrowFillBox>
              <CashflowScrubChart
                cells={cells()}
                yMax={top.ceiling()}
                scrub={false}
                chartHeight="fill"
                showGridlines
              />
            </GrowFillBox>
          </div>
        </CardSurface>
      </div>
    </div>
  );
};
