// StepTimeline — a cumulative count over a day, with numbered event flags.
import { createSignal, type Component } from "solid-js";
import { StepTimeline } from "../../src/components/StepTimeline";

const T = (hhmm: string): number => Date.parse(`2026-10-01T${hhmm}:00Z`);

// The Taskmaster canon's timeline(t1): steps done over the day, one flag per
// start and completion.
const SERIES = [
  { t: T("08:00"), value: 0 },
  { t: T("08:14"), value: 1 },
  { t: T("09:40"), value: 2 },
];
const MARKERS = [
  { id: "s1-start", t: T("08:02"), label: "Step 1", kind: "started" },
  { id: "s1-done", t: T("08:14"), label: "Step 1", kind: "completed" },
  { id: "s2-done", t: T("09:40"), label: "Step 2", kind: "completed" },
  { id: "s3-start", t: T("17:35"), label: "Step 3", kind: "started" },
];
const DOMAIN = [T("08:00"), T("18:00")] as const;

export const StepTimelineShowcase: Component = () => {
  const [selected, setSelected] = createSignal<string | undefined>("s2-done");
  const [collapsed, setCollapsed] = createSignal(false);
  return (
    <div class="component-section component-section--full">
      <h2>StepTimeline — Composite (Depth 3)</h2>
      <p class="text-meta">
        A collapsible <code>ChartFrame</code> (200px, header included) around a{" "}
        <code>StackedTimelineChart</code> curried with a linear crossing: one
        band that rises square at each completion, hour ticks (UTC), whole-count
        y labels, and LevelsTimeline's numbered flags with their rules through{" "}
        <code>MutationFlags</code>. Click a flag to select it; the chevron
        collapses the timeline to its header. Owns no CSS and draws no chart of
        its own.
      </p>

      <div class="example-group">
        <h3>The canon's task: 2 of 4 steps done, step 3 started at 17:35</h3>
        <div class="step-timeline-demo">
          <StepTimeline
            series={SERIES}
            markers={MARKERS}
            domain={DOMAIN}
            total={4}
            selectedId={selected()}
            onSelect={setSelected}
            collapsed={collapsed()}
            onCollapsedChange={setCollapsed}
          />
        </div>
        <p class="text-meta">
          Selected flag: {selected() ?? "none"} · collapsed: {String(collapsed())}
        </p>
      </div>
    </div>
  );
};
