// ============================================
// RelativeTime — Atomic (Depth 1)
// Owns CSS (RelativeTime.css), no component imports.
// Renders a relative time string ("just now", "5m ago", "2h ago", "Apr 28")
// with optional staleness color thresholds. Auto-updates via a shared
// 30s tick signal so all instances refresh together.
// ============================================
import { Component, JSX, createSignal, createMemo, splitProps, onCleanup } from "solid-js";
import "./RelativeTime.css";

/**
 * Acceptable input shapes:
 * - `Date` instance
 * - `number` of milliseconds since epoch
 * - `bigint` of microseconds since epoch (matches SpacetimeDB Timestamp `__timestamp_micros_since_unix_epoch__`)
 */
export type RelativeTimeValue = Date | number | bigint;

export type RelativeTimeStaleness = "fresh" | "stale" | "errored";

export interface RelativeTimeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Timestamp to render. */
  value: RelativeTimeValue;
  /** Older than this many seconds → renders with `stale` color. Omit to disable. */
  staleAfterSec?: number;
  /** Older than this many seconds → renders with `errored` color (overrides stale). Omit to disable. */
  errorAfterSec?: number;
  /** Prefix string, e.g. `"claimed "` → "claimed 5m ago". */
  prefix?: string;
  /** Format mode. `"ago"` (default) appends " ago". `"bare"` omits suffix ("5m"). */
  mode?: "ago" | "bare";
  /** Tick frequency in ms. Default 30000. Pass 0 to render once and never update. */
  updateIntervalMs?: number;
}

// Shared tick signal — every <RelativeTime/> on the page reads the same `now()` so they
// all re-render in lockstep without each spinning its own interval. Lazy: the timer only
// starts when at least one component is reading it, and stops when the last one unmounts.
const [now, setNow] = createSignal(Date.now());
let tickHandle: ReturnType<typeof setInterval> | undefined;
let tickRefcount = 0;

const startTicking = (intervalMs: number) => {
  tickRefcount += 1;
  if (tickHandle === undefined && intervalMs > 0) {
    tickHandle = setInterval(() => setNow(Date.now()), intervalMs);
  }
};

const stopTicking = () => {
  tickRefcount -= 1;
  if (tickRefcount <= 0 && tickHandle !== undefined) {
    clearInterval(tickHandle);
    tickHandle = undefined;
    tickRefcount = 0;
  }
};

const toEpochMs = (value: RelativeTimeValue): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "bigint") return Number(value / 1000n); // micros → ms
  return value;
};

const ABSOLUTE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * Format a duration in seconds as a compact relative string.
 * Pure function — caller computes the delta.
 */
export const formatRelativeDuration = (deltaSec: number, mode: "ago" | "bare" = "ago"): string => {
  const abs = Math.abs(deltaSec);
  const future = deltaSec < 0;
  const suffix = mode === "ago" ? (future ? " from now" : " ago") : "";

  if (abs < 5) return mode === "ago" ? "just now" : "now";
  if (abs < 60) return `${Math.round(abs)}s${suffix}`;
  if (abs < 3600) return `${Math.round(abs / 60)}m${suffix}`;
  if (abs < 86_400) return `${Math.round(abs / 3600)}h${suffix}`;
  if (abs < 86_400 * 30) return `${Math.round(abs / 86_400)}d${suffix}`;
  // Old enough that a relative number is unhelpful — caller usually wants the absolute date.
  return "";
};

const stalenessFor = (
  deltaSec: number,
  staleAfterSec: number | undefined,
  errorAfterSec: number | undefined,
): RelativeTimeStaleness => {
  if (errorAfterSec !== undefined && deltaSec >= errorAfterSec) return "errored";
  if (staleAfterSec !== undefined && deltaSec >= staleAfterSec) return "stale";
  return "fresh";
};

export const RelativeTime: Component<RelativeTimeProps> = (props) => {
  const [local, others] = splitProps(props, [
    "value",
    "staleAfterSec",
    "errorAfterSec",
    "prefix",
    "mode",
    "updateIntervalMs",
    "class",
  ]);

  const intervalMs = local.updateIntervalMs ?? 30_000;
  if (intervalMs > 0) {
    startTicking(intervalMs);
    onCleanup(stopTicking);
  }

  const epochMs = createMemo(() => toEpochMs(local.value));
  const deltaSec = createMemo(() => Math.floor((now() - epochMs()) / 1000));

  const text = createMemo(() => {
    const relative = formatRelativeDuration(deltaSec(), local.mode ?? "ago");
    if (relative !== "") return relative;
    return ABSOLUTE_FORMATTER.format(new Date(epochMs()));
  });

  const staleness = createMemo(() => stalenessFor(deltaSec(), local.staleAfterSec, local.errorAfterSec));

  const classes = createMemo(() => {
    const cl = ["sui-relative-time", `sui-relative-time--${staleness()}`];
    if (local.class) cl.push(local.class);
    return cl.join(" ");
  });

  const title = createMemo(() => new Date(epochMs()).toISOString());

  return (
    <span class={classes()} title={title()} {...others}>
      {local.prefix}
      {text()}
    </span>
  );
};
