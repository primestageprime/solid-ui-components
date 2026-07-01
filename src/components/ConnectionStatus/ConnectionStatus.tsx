// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ConnectionStatus — Composed (Depth 3)
// Pure Composite: owns zero CSS, composes only curried variants
// (and one lower-depth Composite, LiveHeartbeatTrace).
//   - SmallTightStack (Layout curried variant) — outer column
//   - NowrapLabel    (Text curried variant)   — service name
//   - SmallStatusLight (StatusLight curried variant) — compact fallback dot
//   - LiveHeartbeatTrace (Depth 2)            — sparkline
// Stacked indicator: label on top, sparkline beneath.
// Reassuring when healthy: no time-since text, just the trace.
// ============================================
import { type Component, Show } from "solid-js";
import { LiveHeartbeatTrace } from "../LiveHeartbeatTrace";
import type { StatusLightVariant } from "../StatusLight/StatusLight";
import { SmallStatusLight } from "../StatusLight/variants";
import { SmallTightStack } from "../Layout/variants";
import { NowrapLabel } from "../Text/variants";

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
    <SmallTightStack>
      <NowrapLabel>{props.name}</NowrapLabel>

      <Show
        when={showSpark()}
        fallback={
          <SmallStatusLight
            pulse={
              stateToLight(
                props.lastHeartbeatAt,
                props.timeoutMs,
                props.errorAt,
              ) === "success"
            }
            variant={stateToLight(
              props.lastHeartbeatAt,
              props.timeoutMs,
              props.errorAt,
            )}
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
    </SmallTightStack>
  );
};
