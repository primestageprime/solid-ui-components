// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// WorkerCard — Depth 1 (owns CSS)
// Displays the status of an extraction worker with
// animated expand/collapse for plan and progress rows.
// ============================================
import { Component, JSX, splitProps, Show } from "solid-js";
import "./WorkerCard.css";

export type WorkerStatus = "idle" | "claimed" | "extracting" | "writing" | "complete";

export interface WorkerCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Worker slot number (1-4) */
  slotId: number;
  /** Current worker status */
  status: WorkerStatus;
  /** Current time (Date.now()) — parent drives the clock */
  now: number;
  /** Timestamp when batch was claimed */
  startedAt: number;
  /** Timestamp when extracting began (for progress bar timing) */
  extractStartedAt: number;
  /** Number of batches this worker has completed */
  jobsCompleted: number;
  /** Average throughput across completed jobs */
  avgRatePerSec: number;
  /** Estimated duration for the current batch (seconds) */
  estimatedS: number;
  /** Final elapsed time (set on complete) */
  elapsedS?: number;
  /** Is the current batch past its estimate? */
  overdue?: boolean;
  /** Current row count */
  rows?: number;

  // ── Batch mode (id-range) ──
  /** PK range start (batch mode only) */
  pkStart?: string;
  /** PK range end (batch mode only) */
  pkEnd?: string;
  /** Batch size (batch mode only) */
  batchSize?: number;

  // ── Single mode ──
  /** Total records in table (single mode only) */
  totalRecords?: number;

  /** Column count of the table being extracted */
  columnCount?: number;
  /** Optional label for the current in-flight job (e.g. "batch #34"). Rendered
   *  next to the jobsCompleted summary in the history row. */
  currentJob?: string;
}

function formatTime(s: number): string {
  if (s < 0) return "--";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

const STATUS_LABELS: Record<WorkerStatus, string> = {
  idle: "IDLE", claimed: "CLAIMED", extracting: "EXTRACTING",
  writing: "WRITING", complete: "DONE",
};

const CYAN = "var(--sui-accent)";
const GREEN = "var(--sui-success)";
const RED = "var(--sui-danger)";
const DIM = "var(--sui-text-secondary)";
const MUTED = "var(--sui-text-muted)";

function statusColor(s: WorkerStatus): string {
  switch (s) {
    case "idle": return MUTED;
    case "claimed": case "extracting": return CYAN;
    case "writing": case "complete": return GREEN;
  }
}

export const WorkerCard: Component<WorkerCardProps> = (props) => {
  const [local, others] = splitProps(props, [
    "slotId", "status", "now", "startedAt", "extractStartedAt",
    "jobsCompleted", "avgRatePerSec", "estimatedS", "elapsedS", "overdue",
    "rows", "pkStart", "pkEnd", "batchSize", "totalRecords", "columnCount",
    "currentJob", "class", "children",
  ]);

  const isActive = () => local.status === "extracting" || local.status === "writing";
  const showPlan = () => local.status === "claimed" || isActive();

  const elapsed = () => {
    if (local.status === "complete" || local.status === "idle") return local.elapsedS ?? 0;
    if (local.startedAt > 0) return Math.floor((local.now - local.startedAt) / 1000);
    return 0;
  };

  const extractElapsed = () => {
    if (local.extractStartedAt <= 0) return 0;
    if (local.status === "complete") return local.elapsedS ?? 0;
    return Math.max(0, (local.now - local.extractStartedAt) / 1000);
  };

  const progress = () => {
    if (local.status === "complete") return 1;
    if (local.estimatedS <= 0) return 0;
    return extractElapsed() / local.estimatedS;
  };

  const effectiveColor = () => local.overdue ? RED : statusColor(local.status);
  const effectiveLabel = () => local.overdue ? "OVERDUE" : STATUS_LABELS[local.status];
  const barColor = () => progress() > 1 ? RED : CYAN;

  const isBatchMode = () => !!(local.pkStart && local.pkEnd);

  const cardClass = () => {
    const cl = ["worker-card", `worker-card--${local.status}`];
    if (local.overdue) cl.push("worker-card--overdue");
    if (local.class) cl.push(local.class);
    return cl.join(" ");
  };

  return (
    <div class={cardClass()} {...others}>
      {/* Row 1: Identity */}
      <div class="worker-card__identity">
        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
          <span class="worker-card__name" style={{ color: effectiveColor() }}>
            W{local.slotId}
          </span>
          <span class="worker-card__badge" style={{
            background: `${effectiveColor()}22`,
            color: effectiveColor(),
          }}>
            {effectiveLabel()}
          </span>
        </div>
        <span class="worker-card__timer" style={{
          color: local.overdue ? RED : local.status === "complete" ? GREEN : DIM,
        }}>
          {formatTime(elapsed())}
        </span>
      </div>

      {/* Row 2: History */}
      <div class="worker-card__history">
        <span>{local.jobsCompleted} jobs done</span>
        <Show when={local.currentJob}>
          <span style={{ color: CYAN }}>· {local.currentJob}</span>
        </Show>
        <Show when={local.avgRatePerSec > 0}>
          <span style={{ color: DIM }}>{fmtNum(local.avgRatePerSec)} rec/s avg</span>
        </Show>
      </div>

      {/* Row 3: Plan (animated expand/collapse) */}
      <div class={`worker-card__plan ${showPlan() ? "worker-card__plan--visible" : "worker-card__plan--hidden"}`}>
        <div class="worker-card__plan-inner">
          <Show when={isBatchMode()} fallback={<span>single stream</span>}>
            <span>PK: {fmtNum(Number(local.pkStart))} – {fmtNum(Number(local.pkEnd))}</span>
          </Show>
          <span style={{ color: MUTED }}>
            <Show when={isBatchMode()}>
              {fmtNum(local.batchSize!)} batch &middot;{" "}
            </Show>
            <Show when={!isBatchMode() && local.totalRecords}>
              {fmtNum(local.totalRecords!)} records &middot;{" "}
            </Show>
            {local.columnCount ?? "?"} cols
          </span>
        </div>
      </div>

      {/* Row 4: Progress (animated expand/collapse) */}
      <div class={`worker-card__progress ${isActive() ? "worker-card__progress--visible" : "worker-card__progress--hidden"}`}>
        <div class="worker-card__bar-track">
          <div
            class={`worker-card__bar-fill ${local.status === "extracting" ? "worker-card__bar-fill--extracting" : ""}`}
            style={{
              width: `${Math.min(progress() * 100, 100)}%`,
              background: barColor(),
            }}
          />
        </div>
        <Show when={local.rows != null}>
          <div class="worker-card__rows" style={{ color: CYAN }}>
            {fmtNum(local.rows!)} rows
            <Show when={!isBatchMode() && local.totalRecords && local.totalRecords > 0}>
              {" "}({(local.rows! / local.totalRecords! * 100).toFixed(1)}%)
            </Show>
          </div>
        </Show>
      </div>

      {/* Idle state */}
      <Show when={local.status === "idle"}>
        <div style={{ "font-size": "11px", color: MUTED, "text-align": "center", padding: "6px 0" }}>
          waiting for batch
        </div>
      </Show>
    </div>
  );
};
