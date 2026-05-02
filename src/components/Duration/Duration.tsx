import { Show } from "solid-js";

export interface DurationProps {
  /** Duration in milliseconds */
  ms: number | null | undefined;
  /** If true, always show full format even for short durations */
  verbose?: boolean;
}

/**
 * Displays a duration in human-readable format.
 * - < 1s: "123ms"
 * - 1s-60s: "12.3s"
 * - 1m-60m: "4m 8s"
 * - > 60m: "2h 13m"
 */
export function Duration(props: DurationProps) {
  const formatted = () => {
    const ms = props.ms;
    if (ms == null) return "--";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 10000 && !props.verbose) return `${(ms / 1000).toFixed(1)}s`;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return <span>{formatted()}</span>;
}

// Back-compat default export — drop in next major.
export default Duration;
