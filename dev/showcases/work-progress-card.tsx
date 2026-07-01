/**
 * WorkProgressCard — a status-aware work card whose bottom progress bar is
 * derived entirely from metadata. The consumer passes only domain data
 * (status + estimate + actual); colors and proportions are decided by the
 * library (cardProgress.ts), not the caller.
 *
 * Bar treatment:
 *   • in progress → blue fill to actual/estimate, faded-blue remainder
 *   • over budget → bar reproportioned to actual; estimate's share filled,
 *                   crimson overrun past it
 *   • complete    → fill turns forest green; unused budget is dark grey
 *   • blocked / question → work-so-far in blue, ⚠ / ? sign over the bar
 *   • new / closed → empty
 *
 * Live view: actual accrues from work segments — `actualFromSegments(segs,
 * now)` = Σ(endᵢ−startᵢ) + (now−start) — so an STDB-backed card stays current
 * just by re-reading the clock; it freezes when the task ends.
 */
import { createSignal, onCleanup, For, type Component } from "solid-js";
import {
  WorkProgressCard,
  actualFromSegments,
  isRunning,
  type WorkStatus,
} from "../../src/components/WorkProgressCard";

const CARD_W = 300;
const CARD_H = 108;

const Slot: Component<{ children: any }> = (props) => (
  <div style={{ width: `${CARD_W}px`, height: `${CARD_H}px` }}>
    {props.children}
  </div>
);

const Grid: Component<{ children: any }> = (props) => (
  <div
    style={{
      display: "grid",
      "grid-template-columns": `repeat(3, ${CARD_W}px)`,
      gap: "16px",
      "justify-content": "start",
    }}
  >
    {props.children}
  </div>
);

// ── states gallery ───────────────────────────────────────────────────────────
const STATES: {
  title: string;
  subtitle: string;
  status: WorkStatus;
  estimate?: number;
  actual?: number;
}[] = [
  { title: "A · new", subtitle: "0% — not started", status: "NEW" },
  {
    title: "B · in progress",
    subtitle: "40% of estimate",
    status: "DOING",
    estimate: 5,
    actual: 2,
  },
  {
    title: "C · in progress",
    subtitle: "120% — over budget",
    status: "DOING",
    estimate: 5,
    actual: 6,
  },
  {
    title: "D · done",
    subtitle: "on time (~95%)",
    status: "DONE",
    estimate: 100,
    actual: 95,
  },
  {
    title: "E · done",
    subtitle: "under budget (60%)",
    status: "DONE",
    estimate: 5,
    actual: 3,
  },
  {
    title: "F · done",
    subtitle: "over budget (120%)",
    status: "DONE",
    estimate: 5,
    actual: 6,
  },
  {
    title: "G · blocked",
    subtitle: "waiting on dependency",
    status: "BLOCKED",
    estimate: 5,
    actual: 2,
  },
  {
    title: "H · question",
    subtitle: "awaiting an answer",
    status: "QUESTION",
    estimate: 5,
    actual: 2,
  },
  {
    title: "I · closed",
    subtitle: "incomplete",
    status: "CLOSED",
    estimate: 5,
    actual: 3,
  },
];

// ── live simulation ──────────────────────────────────────────────────────────
const SIM_TASKS = [
  { name: "ends early", estimate: 10, endsAt: 3 },
  { name: "ends on time", estimate: 10, endsAt: 9 },
  { name: "ends late (+5s)", estimate: 10, endsAt: 15 },
];
const SIM_MAX = 15;

const LiveTasks: Component = () => {
  const [now, setNow] = createSignal(0);
  const [playing, setPlaying] = createSignal(false);
  let raf: number | undefined;
  let lastWall = 0;

  const stop = () => {
    setPlaying(false);
    if (raf !== undefined) cancelAnimationFrame(raf);
    raf = undefined;
  };
  const loop = () => {
    const t = performance.now();
    setNow((n) => Math.min(SIM_MAX, n + (t - lastWall) / 1000));
    lastWall = t;
    if (now() >= SIM_MAX) return stop();
    raf = requestAnimationFrame(loop);
  };
  const play = () => {
    if (playing()) return stop();
    if (now() >= SIM_MAX) setNow(0);
    setPlaying(true);
    lastWall = performance.now();
    raf = requestAnimationFrame(loop);
  };
  const step = () => {
    stop();
    setNow((n) => Math.min(SIM_MAX, n + 1));
  };
  const reset = () => {
    stop();
    setNow(0);
  };
  onCleanup(stop);

  const segmentsFor = (endsAt: number) =>
    now() >= endsAt ? [{ start: 0, end: endsAt }] : [{ start: 0 }];

  return (
    <div
      style={{
        "margin-top": "32px",
        display: "flex",
        "flex-direction": "column",
        gap: "12px",
      }}
    >
      <div style={{ "font-size": "13px", color: "rgba(255,255,255,0.7)" }}>
        Live — three tasks started together (10s estimate). Actual accrues from
        work segments (<code>now − start</code>) while running and freezes when
        each ends.
      </div>
      <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
        <button type="button" onClick={play}>
          {playing() ? "⏸ Pause" : "▶ Play"}
        </button>
        <button type="button" onClick={step} disabled={playing()}>
          Step →
        </button>
        <button type="button" onClick={reset}>
          ↺ Reset
        </button>
        <span
          style={{
            "font-family": "ui-monospace, monospace",
            color: "rgba(255,255,255,0.6)",
            "margin-left": "8px",
          }}
        >
          t = {now().toFixed(1)}s
        </span>
      </div>
      <Grid>
        <For each={SIM_TASKS}>
          {(task) => {
            const segs = () => segmentsFor(task.endsAt);
            const actual = () => actualFromSegments(segs(), now());
            const status = (): WorkStatus =>
              isRunning(segs()) ? "DOING" : "DONE";
            return (
              <Slot>
                <WorkProgressCard
                  claimedBy="dana"
                  title={task.name}
                  subtitle={`${actual().toFixed(1)}s / ${task.estimate}s`}
                  status={status()}
                  estimate={task.estimate}
                  actual={actual()}
                />
              </Slot>
            );
          }}
        </For>
      </Grid>
    </div>
  );
};

export const WorkProgressCardShowcase: Component = () => (
  <div
    class="component-section--full"
    style={{
      padding: "24px",
      display: "flex",
      "flex-direction": "column",
      gap: "16px",
    }}
  >
    <div
      style={{
        "font-size": "14px",
        color: "rgba(255,255,255,0.7)",
        "max-width": "760px",
      }}
    >
      Data-only card — pass <code>status</code>, <code>estimate</code>, and{" "}
      <code>actual</code>; the library derives the bar (blue in-progress, green
      complete, crimson over-budget, grey unused, ⚠/? for blocked/question). The
      nine states below are static; the live view drives <code>actual</code>{" "}
      from work segments off a clock.
    </div>
    <Grid>
      <For each={STATES}>
        {(s) => (
          <Slot>
            <WorkProgressCard
              claimedBy="dana"
              title={s.title}
              subtitle={s.subtitle}
              status={s.status}
              estimate={s.estimate}
              actual={s.actual}
            />
          </Slot>
        )}
      </For>
    </Grid>
    <LiveTasks />
  </div>
);
