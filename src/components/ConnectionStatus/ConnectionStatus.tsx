// ============================================
// ConnectionStatus — Composed (Depth 3)
// Composes LiveHeartbeatTrace (Depth 2) + StatusLight (Depth 1) +
// Text variants (Depth 1) + Stack layout (Depth 1).
// Stacked indicator: label on top, sparkline beneath.
// Reassuring when healthy: no time-since text, just the trace.
// ============================================
import { Component, Show } from "solid-js";
import { LiveHeartbeatTrace } from "../LiveHeartbeatTrace";
import { StatusLight, StatusLightVariant } from "../StatusLight";
import { Stack } from "../Layout";
import { TextLabel } from "../Text";
import "./ConnectionStatus.css";

export interface ConnectionStatusProps {
  /** Service / source name (e.g. "peter-laptop"). */
  name: string;
  /** Timestamp of last heartbeat. null/undefined → never seen (off). */
  lastHeartbeatAt: number | Date | null | undefined;
  /** Milliseconds before stale heartbeat → disconnected. */
  timeoutMs: number;
  /** Optional explicit error timestamp. If set & >= lastHeartbeatAt → error. */
  errorAt?: number | Date | null;
  /** Show the rectangular sparkline trace. Default true. false → just dot. */
  showSparkline?: boolean;
  /** Sparkline pixel width. Default 96. */
  sparklineWidth?: number;
  /** Sparkline pixel height. Default 14. */
  sparklineHeight?: number;
  /** Tick rate for sparkline samples. Default 1000ms. */
  tickMs?: number;
}

const toMs = (t: number | Date | null | undefined): number | null => {
  if (t == null) return null;
  return t instanceof Date ? t.getTime() : t;
};

const stateToLight = (
  lastHeartbeatAt: number | Date | null | undefined,
  timeoutMs: number,
  errorAt: number | Date | null | undefined,
): StatusLightVariant => {
  const last = toMs(lastHeartbeatAt);
  const err = toMs(errorAt ?? null);
  if (err != null && (last == null || err >= last)) return "danger";
  if (last == null) return "idle";
  return Date.now() - last >= timeoutMs ? "idle" : "success";
};

export const ConnectionStatus: Component<ConnectionStatusProps> = (props) => {
  const showSpark = () => props.showSparkline ?? true;
  const tickMs = () => props.tickMs ?? 1000;

  return (
    <Stack class="sui-connection-status" gap="xs" align="start">
      <TextLabel class="sui-connection-status__name">{props.name}</TextLabel>

      <Show
        when={showSpark()}
        fallback={
          <StatusLight
            size="sm"
            pulse={
              stateToLight(props.lastHeartbeatAt, props.timeoutMs, props.errorAt) === "success"
            }
            variant={stateToLight(props.lastHeartbeatAt, props.timeoutMs, props.errorAt)}
          />
        }
      >
        <LiveHeartbeatTrace
          lastHeartbeatAt={props.lastHeartbeatAt}
          timeoutMs={props.timeoutMs}
          errorAt={props.errorAt}
          tickMs={tickMs()}
          width={props.sparklineWidth ?? 96}
          height={props.sparklineHeight ?? 14}
        />
      </Show>
    </Stack>
  );
};
