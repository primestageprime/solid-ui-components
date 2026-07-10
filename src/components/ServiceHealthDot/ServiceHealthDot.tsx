// ============================================
// ServiceHealthDot — Composite (Depth 2).
// 6px heartbeat dot + name label + hover sparkline popover for app-shell navbars.
//
// NO curried variant — data-only by design. All props are data or behavioral:
// `name`, `ageMs`, `staleThresholdMs`, `samples`. No presentational knobs
// to freeze. (Same rationale as SortableList, DnDHierarchySortBar.)
//
// NO internal clock — pure render of caller-supplied `ageMs` + `samples`.
// The 1 Hz tick loop and history accumulation live in the CALLER (showcase
// or app). This keeps the component testable without timers and aligns with
// the no-clock rule used by HeartbeatSparkline.
//
// CSS exception: owns ServiceHealthDot.css for structural geometry (dot size,
// popover positioning, flex layout, opacity transition, pulse animation
// mechanics). Colors ride tokens: --sui-success / --sui-danger / --sui-text-muted.
// ============================================

import { type Component, createSignal, Show } from "solid-js";
import { HeartbeatSparkline } from "../HeartbeatSparkline/HeartbeatSparkline";
import "./ServiceHealthDot.css";

export interface ServiceHealthDotProps {
  /** Service display name shown next to the dot and in the popover header. */
  name: string;
  /** Ms since last heartbeat; null/undefined = never seen (dead). */
  ageMs: number | null | undefined;
  /** Staleness horizon; alive iff ageMs < staleThresholdMs. Default 15_000. */
  staleThresholdMs?: number;
  /** 0..1 fraction-of-timeout samples for the hover sparkline (oldest first). */
  samples: number[];
}

export const ServiceHealthDot: Component<ServiceHealthDotProps> = (props) => {
  const [hovered, setHovered] = createSignal(false);

  const threshold = () => props.staleThresholdMs ?? 15_000;

  const isAlive = () =>
    props.ageMs != null && props.ageMs < threshold();

  // Opacity: decays 1 → 0.15 as ageMs approaches threshold; dead = 1 (full red).
  // Upper clamp guards against negative ageMs from caller clock skew.
  const dotOpacity = () => {
    if (!isAlive()) return 1;
    const pct = (props.ageMs as number) / threshold();
    return Math.min(1, Math.max(0.15, 1 - pct * 0.85));
  };

  const ageLabel = () => {
    if (!isAlive()) return "dead";
    return `${((props.ageMs as number) / 1000).toFixed(1)}s ago`;
  };

  const rootClass = () =>
    `sui-service-health-dot sui-service-health-dot--${isAlive() ? "alive" : "dead"}`;

  return (
    <span
      class={rootClass()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        class="sui-service-health-dot__dot"
        style={{ opacity: dotOpacity() }}
      />
      {/* Name label intentionally fades in lockstep with the dot. */}
      <span
        class="sui-service-health-dot__name"
        style={{ opacity: dotOpacity() }}
      >
        {props.name}
      </span>

      <Show when={hovered()}>
        <div class="sui-service-health-dot__popover">
          <div class="sui-service-health-dot__popover-header">
            {props.name} — {ageLabel()}
          </div>
          <HeartbeatSparkline
            state={isAlive() ? "connected" : "error"}
            samples={props.samples}
            width={120}
            height={24}
            pulse={isAlive()}
          />
          <div class="sui-service-health-dot__popover-footer">
            <span>{Math.round(threshold() / 1000)}s ago</span>
            <span>now</span>
          </div>
        </div>
      </Show>
    </span>
  );
};
