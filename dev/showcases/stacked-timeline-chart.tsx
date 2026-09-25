// StackedTimelineChart — stacked bands over time that fill their box, with a
// captioned rule, numbered event rules, a hover readout and a pick.
//
// The showcase plays the CONSUMER. It curries the tick text once (hours on y,
// months on x — a library cannot guess units), owns the event list, and snaps
// every pick to the Monday of its week before adding an event there — the chart
// reports the RAW date and never snaps, because it does not know whose
// calendar it is on. Hover to read the week; click to add a numbered rule.
import { type Component, createSignal } from "solid-js";
import {
  createStackedTimelineChart,
  type StackedTimelineEvent,
} from "../../src/components/StackedTimelineChart";
import { CardSurface } from "../../src/components/Surface";
import { FillChartFrame } from "../../src/components/ChartFrame";
import { FixedHeightBox } from "../../src/components/Layout";
import { CaptionLabel, SectionTitle } from "../../src/components/Text";

const START = new Date("2025-01-01T00:00:00Z");
const END = new Date("2026-01-01T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

/** Two bands: one steady, one that rises for the summer and eases after. */
const SERIES = [
  { id: "steady", label: "Steady", points: [{ at: START, value: 15 }] },
  {
    id: "seasonal",
    label: "Seasonal",
    points: [
      { at: START, value: 20 },
      { at: new Date("2025-06-02T00:00:00Z"), value: 30 },
      { at: new Date("2025-09-01T00:00:00Z"), value: 15 },
    ],
  },
];

/** The Monday on or before a moment, in UTC. */
const mondayOf = (at: number): number => {
  const day = new Date(at);
  const midnight = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
  );
  return midnight - ((day.getUTCDay() + 6) % 7) * DAY;
};

const isoDate = (at: number): string => new Date(at).toISOString().slice(0, 10);

/** This consumer's axes, curried once. */
const HoursTimeline = createStackedTimelineChart({
  margin: { top: 20, right: 16, bottom: 28, left: 34 },
  yTickFormat: (value) => `${value}h`,
  xTickFormat: (value) =>
    new Date(value).toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
});

export const StackedTimelineChartShowcase: Component = () => {
  const [events, setEvents] = createSignal<readonly StackedTimelineEvent[]>([
    { at: new Date("2025-06-02T00:00:00Z"), label: "1" },
    { at: new Date("2025-09-01T00:00:00Z"), label: "2" },
  ]);

  const pick = (at: Date) => {
    const monday = mondayOf(at.getTime());
    if (events().some((event) => new Date(event.at).getTime() === monday)) return;
    const next = [...events(), { at: new Date(monday), label: "" }]
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .map((event, index) => ({ ...event, label: String(index + 1) }));
    setEvents(next);
  };

  return (
    <div class="component-section">
      <SectionTitle>StackedTimelineChart</SectionTitle>
      <CaptionLabel>
        Composite (Depth 2). Fills its box; a captioned rule, one numbered rule
        per event, a hover readout, and a raw-date pick the caller snaps.
      </CaptionLabel>
      <div class="example-group">
        <CardSurface>
          <div class="stacked-timeline-chart-demo">
            <HoursTimeline
              series={SERIES}
              xDomain={[START, END]}
              yDomain={[0, 80]}
              rule={{ value: 40, label: "full-time" }}
              events={events()}
              hoverLabel={(at) => {
                const monday = mondayOf(at);
                return `${isoDate(monday)} to ${isoDate(monday + 6 * DAY)}`;
              }}
              onPick={pick}
            />
          </div>
        </CardSurface>
      </div>
      <div class="example-group">
        <h3>In a FillChartFrame, inside a fixed-height box — thorcasting's Work Mix</h3>
        <FixedHeightBox>
            <FillChartFrame title="Work Mix" yTitle="Hours">
              <HoursTimeline
                series={SERIES}
                xDomain={[START, END]}
                yDomain={[0, 80]}
                rule={{ value: 40, label: "full-time" }}
                events={events()}
              />
            </FillChartFrame>
        </FixedHeightBox>
      </div>
    </div>
  );
};
