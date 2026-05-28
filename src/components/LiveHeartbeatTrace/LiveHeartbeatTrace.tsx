// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// LiveHeartbeatTrace — Composed (Depth 2)
// Composes HeartbeatSparkline (Atomic). Owns the sample buffer + tick timer
// and derives connection state from the most recent heartbeat timestamp.
// ============================================
import { Component, createSignal, onCleanup, onMount, createEffect } from "solid-js";
import { HeartbeatSparkline, ConnectionState } from "../HeartbeatSparkline";

export interface LiveHeartbeatTraceProps {
  /** Timestamp of the last received heartbeat. null/undefined → treated as never seen. */
  lastHeartbeatAt: number | Date | null | undefined;
  /** Milliseconds before a stale heartbeat counts as disconnected (% reaches 100). */
  timeoutMs: number;
  /** Optional explicit error timestamp. If set and >= lastHeartbeatAt, state becomes "error". */
  errorAt?: number | Date | null;
  /** How often to push a new sample. Default 1000ms. */
  tickMs?: number;
  /** Sparkline window (samples). Default 60. */
  capacity?: number;
  /** Sparkline pixel width. Default 48. */
  width?: number;
  /** Sparkline pixel height. Default 12. */
  height?: number;
  /** Glow trailing edge while connected. Default true. */
  pulseWhenConnected?: boolean;
  /** Override derived state (rare — use for storybook/showcase). */
  forceState?: ConnectionState;
}

const toMs = (t: number | Date | null | undefined): number | null => {
  if (t == null) return null;
  return t instanceof Date ? t.getTime() : t;
};

export const LiveHeartbeatTrace: Component<LiveHeartbeatTraceProps> = (props) => {
  const capacity = () => props.capacity ?? 60;
  const tickMs = () => props.tickMs ?? 1000;

  const [samples, setSamples] = createSignal<number[]>([]);

  const computeSample = (): number => {
    const last = toMs(props.lastHeartbeatAt);
    if (last == null) return 1;
    const elapsed = Date.now() - last;
    const ratio = elapsed / props.timeoutMs;
    return ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
  };

  const pushSample = () => {
    setSamples((prev) => {
      const next = prev.length >= capacity() ? prev.slice(prev.length - capacity() + 1) : prev.slice();
      next.push(computeSample());
      return next;
    });
  };

  // Snap to 0 immediately when a fresh heartbeat lands.
  createEffect(() => {
    const last = toMs(props.lastHeartbeatAt);
    if (last == null) return;
    setSamples((prev) => {
      const next = prev.length >= capacity() ? prev.slice(prev.length - capacity() + 1) : prev.slice();
      next.push(computeSample());
      return next;
    });
  });

  onMount(() => {
    pushSample();
    const id = window.setInterval(pushSample, tickMs());
    onCleanup(() => window.clearInterval(id));
  });

  const derivedState = (): ConnectionState => {
    if (props.forceState) return props.forceState;
    const last = toMs(props.lastHeartbeatAt);
    const err = toMs(props.errorAt ?? null);
    if (err != null && (last == null || err >= last)) return "error";
    if (last == null) return "disconnected";
    return Date.now() - last >= props.timeoutMs ? "disconnected" : "connected";
  };

  return (
    <HeartbeatSparkline
      state={derivedState()}
      samples={samples()}
      capacity={capacity()}
      width={props.width}
      height={props.height}
      pulse={(props.pulseWhenConnected ?? true) && derivedState() === "connected"}
    />
  );
};
