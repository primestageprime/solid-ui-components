// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// WorkerCard — Depth 2 (owns CSS)
// Composes the Surface primitive (card chrome) and Text
// primitive (name/timer/meta) and hand-rolls only the
// bespoke status micro-badge + expand/collapse rows.
// Displays the status of an extraction worker with
// animated expand/collapse for plan and progress rows.
// ============================================
import { type Component, type JSX, splitProps, Show } from "solid-js";
import { Surface } from "../Surface/Surface";
import { Text } from "../Text/Text";
import { SpreadRow, ClusterRow } from "../Layout/variants";
import "./WorkerCard.css";

export type WorkerStatus =
  | "idle"
  | "claimed"
  | "extracting"
  | "writing"
  | "complete";

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
  idle: "IDLE",
  claimed: "CLAIMED",
  extracting: "EXTRACTING",
  writing: "WRITING",
  complete: "DONE",
};

const CYAN = "var(--sui-accent)";
const GREEN = "var(--sui-success)";
const RED = "var(--sui-danger)";
const DIM = "var(--sui-text-secondary)";
const MUTED = "var(--sui-text-muted)";

// Card surface backgrounds (mirror the former .worker-card / status CSS rules).
const BASE_BG = "var(--sui-bg-secondary, rgba(13,26,42,0.8))";
const SUCCESS_BG = "rgba(var(--sui-success-rgb), 0.04)";
const DANGER_BG = "rgba(var(--sui-danger-rgb), 0.04)";

function statusColor(s: WorkerStatus): string {
  switch (s) {
    case "idle":
      return MUTED;
    case "claimed":
    case "extracting":
      return CYAN;
    case "writing":
    case "complete":
      return GREEN;
  }
}

export const WorkerCard: Component<WorkerCardProps> = (props) => {
  const [local, others] = splitProps(props, [
    "slotId",
    "status",
    "now",
    "startedAt",
    "extractStartedAt",
    "jobsCompleted",
    "avgRatePerSec",
    "estimatedS",
    "elapsedS",
    "overdue",
    "rows",
    "pkStart",
    "pkEnd",
    "batchSize",
    "totalRecords",
    "columnCount",
    "currentJob",
    "class",
    "children",
    "style",
  ]);

  const isActive = () =>
    local.status === "extracting" || local.status === "writing";
  const showPlan = () => local.status === "claimed" || isActive();

  const elapsed = () => {
    if (local.status === "complete" || local.status === "idle")
      return local.elapsedS ?? 0;
    if (local.startedAt > 0)
      return Math.floor((local.now - local.startedAt) / 1000);
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

  const effectiveColor = () =>
    local.overdue ? RED : statusColor(local.status);
  const effectiveLabel = () =>
    local.overdue ? "OVERDUE" : STATUS_LABELS[local.status];
  const barColor = () => (progress() > 1 ? RED : CYAN);

  const isBatchMode = () => !!(local.pkStart && local.pkEnd);

  const cardClass = () => {
    const cl = ["worker-card", `worker-card--${local.status}`];
    if (local.overdue) cl.push("worker-card--overdue");
    if (local.class) cl.push(local.class);
    return cl.join(" ");
  };

  // Border-color / background that the former .worker-card status modifier
  // rules produced (replicating the CSS cascade exactly, including the
  // overdue + status precedence). Passed to Surface as inline overrides.
  const cardBorderColor = () => {
    switch (local.status) {
      case "claimed":
      case "extracting":
        return CYAN;
      case "writing":
        return GREEN;
      case "complete":
        return local.overdue ? RED : GREEN;
      case "idle":
        return local.overdue ? RED : MUTED;
    }
  };

  const cardBg = () => {
    if (local.status === "complete")
      return local.overdue ? DANGER_BG : SUCCESS_BG;
    if (local.overdue) return DANGER_BG;
    return BASE_BG;
  };

  // Padding (10px 14px) sits off Surface's padding scale (sm=8/md=16), so it's
  // supplied inline. Radius 8px maps cleanly to radius="md". Consumer-provided
  // style still wins (spread last) to preserve the previous behaviour where
  // `style` landed on the root div.
  const cardStyle = (): JSX.CSSProperties => {
    const base = (
      typeof local.style === "object" ? local.style : {}
    ) as JSX.CSSProperties;
    return { padding: "10px 14px", ...base };
  };

  return (
    <Surface
      class={cardClass()}
      radius="md"
      padding="none"
      bg={cardBg()}
      borderColor={cardBorderColor()}
      style={cardStyle()}
      {...others}
    >
      {/* Row 1: Identity */}
      <SpreadRow class="worker-card__identity">
        <ClusterRow>
          <Text as="span" class="worker-card__name" color={effectiveColor()}>
            W{local.slotId}
          </Text>
          <span
            class="worker-card__badge"
            style={{
              background: `${effectiveColor()}22`,
              color: effectiveColor(),
            }}
          >
            {effectiveLabel()}
          </span>
        </ClusterRow>
        <Text
          as="span"
          class="worker-card__timer"
          color={
            local.overdue ? RED : local.status === "complete" ? GREEN : DIM
          }
        >
          {formatTime(elapsed())}
        </Text>
      </SpreadRow>

      {/* Row 2: History */}
      <SpreadRow class="worker-card__history">
        <Text as="span">{local.jobsCompleted} jobs done</Text>
        <Show when={local.currentJob}>
          <Text as="span" color={CYAN}>
            · {local.currentJob}
          </Text>
        </Show>
        <Show when={local.avgRatePerSec > 0}>
          <Text as="span" color={DIM}>
            {fmtNum(local.avgRatePerSec)} rec/s avg
          </Text>
        </Show>
      </SpreadRow>

      {/* Row 3: Plan (animated expand/collapse) */}
      <div
        class={`worker-card__plan ${showPlan() ? "worker-card__plan--visible" : "worker-card__plan--hidden"}`}
      >
        <SpreadRow class="worker-card__plan-inner">
          <Show
            when={isBatchMode()}
            fallback={<Text as="span">single stream</Text>}
          >
            <Text as="span">
              PK: {fmtNum(Number(local.pkStart))} –{" "}
              {fmtNum(Number(local.pkEnd))}
            </Text>
          </Show>
          <Text as="span" color={MUTED}>
            <Show when={isBatchMode()}>
              {fmtNum(local.batchSize!)} batch &middot;{" "}
            </Show>
            <Show when={!isBatchMode() && local.totalRecords}>
              {fmtNum(local.totalRecords!)} records &middot;{" "}
            </Show>
            {local.columnCount ?? "?"} cols
          </Text>
        </SpreadRow>
      </div>

      {/* Row 4: Progress (animated expand/collapse) */}
      <div
        class={`worker-card__progress ${isActive() ? "worker-card__progress--visible" : "worker-card__progress--hidden"}`}
      >
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
          <Text as="div" class="worker-card__rows" color={CYAN}>
            {fmtNum(local.rows!)} rows
            <Show
              when={
                !isBatchMode() && local.totalRecords && local.totalRecords > 0
              }
            >
              {" "}
              ({((local.rows! / local.totalRecords!) * 100).toFixed(1)}%)
            </Show>
          </Text>
        </Show>
      </div>

      {/* Idle state */}
      <Show when={local.status === "idle"}>
        <Text as="div" color={MUTED} class="worker-card__idle">
          waiting for batch
        </Text>
      </Show>
    </Surface>
  );
};
