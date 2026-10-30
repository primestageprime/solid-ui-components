// PaceProjectionChart — several people racing to one total, each with a
// dashed projection to their finish and an initials disc where it lands. The
// showcase owns the domain arithmetic (pace → finish day) and the dates.
import { createSignal, type Component } from "solid-js";
import {
  PaceProjectionChart,
  type PaceSeries,
} from "../../src/components/PaceProjectionChart";
import { Slider } from "../../src/components/Slider";
import { SectionTitle, MutedBody } from "../../src/components/Text";

const TOTAL = 32;
const people = [
  {
    id: "p",
    label: "Peter",
    color: "#c96442",
    initials: "PS",
    log: [
      [0, 0],
      [5, 4],
      [9, 7],
      [14, 12],
    ],
  },
  {
    id: "k",
    label: "Kali",
    color: "#3b82f6",
    initials: "KA",
    log: [
      [0, 0],
      [4, 6],
      [10, 15],
      [15, 21],
    ],
  },
  {
    id: "j",
    label: "Jo",
    color: "#16a34a",
    initials: "JO",
    log: [
      [0, 0],
      [7, 2],
      [13, 4],
    ],
  },
];

export const PaceProjectionChartShowcase: Component = () => {
  const [today, setToday] = createSignal(16);
  const series = (): PaceSeries[] =>
    people.map((p) => {
      const points = p.log.map(([x, y]) => ({ x, y }));
      const last = points[points.length - 1];
      const pace = last.y / Math.max(1, last.x);
      return {
        ...p,
        points,
        finishX: pace > 0 ? last.x + (TOTAL - last.y) / pace : null,
      };
    });
  return (
    <div class="component-section component-section--full">
      <div class="example-group">
        <SectionTitle>PaceProjectionChart</SectionTitle>
        <MutedBody>
          Solid: progress so far. Dashed: projected at each person's pace, cut
          at the window. Dotted with diamonds: the plan. Accent rule: today (day{" "}
          {today()}).
        </MutedBody>
        <div class="pace-projection-chart-demo">
          <PaceProjectionChart
            series={series()}
            total={TOTAL}
            plan={[
              { x: 0, y: 0 },
              { x: 14, y: 10 },
              { x: 28, y: 21 },
              { x: 42, y: 32 },
            ]}
            today={today()}
            xTicks={[
              { x: 14, label: "Nov 4" },
              { x: 28, label: "Nov 18" },
              { x: 42, label: "Dec 2" },
            ]}
            xMax={56}
          />
          <Slider
            label="Today"
            min={0}
            max={56}
            value={today()}
            onChange={setToday}
          />
        </div>
      </div>
    </div>
  );
};
