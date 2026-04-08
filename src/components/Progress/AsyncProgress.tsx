// ============================================
// AsyncProgress — Depth 1 (owns CSS)
// Time-based progress bar that estimates completion
// from historical max durations stored in localStorage.
// ============================================
import { Component, JSX, splitProps, createSignal, createEffect, onCleanup } from "solid-js";
import "./AsyncProgress.css";

export interface AsyncProgressProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Identifier for this process type, used as localStorage key. e.g. "ocr", "publish" */
  processId: string;
  /** Label displayed above the bar. e.g. "Processing with Claude Vision" */
  label: string;
  /** Set to true when the process is running, false when done/idle. */
  active: boolean;
}

const STORAGE_PREFIX = "async-progress-max-";

function getMaxDuration(processId: string): number {
  try {
    const v = localStorage.getItem(STORAGE_PREFIX + processId);
    return v ? parseFloat(v) : 0;
  } catch { return 0; }
}

function saveMaxDuration(processId: string, durationSec: number): void {
  try {
    const current = getMaxDuration(processId);
    if (durationSec > current) {
      localStorage.setItem(STORAGE_PREFIX + processId, durationSec.toFixed(1));
    }
  } catch {}
}

function formatSeconds(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}m ${sec}s`;
}

export const AsyncProgress: Component<AsyncProgressProps> = (props) => {
  const [local, others] = splitProps(props, ["processId", "label", "active", "class", "children"]);

  const [elapsed, setElapsed] = createSignal(0);
  const [maxDuration, setMaxDuration] = createSignal(getMaxDuration(local.processId));
  let startTime = 0;
  let intervalId: ReturnType<typeof setInterval> | undefined;

  createEffect(() => {
    if (local.active) {
      // Starting
      startTime = Date.now();
      setElapsed(0);
      setMaxDuration(getMaxDuration(local.processId));
      intervalId = setInterval(() => {
        setElapsed((Date.now() - startTime) / 1000);
      }, 250);
    } else if (intervalId) {
      // Stopping — record duration
      clearInterval(intervalId);
      intervalId = undefined;
      const finalElapsed = (Date.now() - startTime) / 1000;
      if (finalElapsed > 1) {
        saveMaxDuration(local.processId, finalElapsed);
      }
    }
  });

  onCleanup(() => {
    // Save on unmount if still running (e.g. parent Show condition changes)
    if (intervalId) {
      clearInterval(intervalId);
      const finalElapsed = (Date.now() - startTime) / 1000;
      if (finalElapsed > 1) {
        saveMaxDuration(local.processId, finalElapsed);
      }
    }
  });

  const percent = () => {
    const max = maxDuration();
    if (max <= 0) return null; // no history — indeterminate
    return Math.min(elapsed() / max, 1.2); // cap at 120% for overrun
  };

  const classes = () => {
    const cl = ["async-progress"];
    if (local.class) cl.push(local.class);
    return cl.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      <div class="async-progress__header">
        <span class="async-progress__label">{local.label}</span>
        <span class="async-progress__timing">
          {formatSeconds(elapsed())}
          {maxDuration() > 0 && ` / ~${formatSeconds(maxDuration())}`}
        </span>
      </div>
      <div class="async-progress__bar-track">
        {percent() !== null ? (
          <div
            class={`async-progress__bar-fill${(percent()! > 1) ? " async-progress__bar-fill--overrun" : ""}`}
            style={{ width: `${Math.min(percent()! * 100, 100)}%` }}
          />
        ) : (
          <div
            class="async-progress__bar-fill"
            style={{
              width: "30%",
              animation: "async-progress-indeterminate 1.5s ease-in-out infinite",
            }}
          />
        )}
      </div>
    </div>
  );
};
