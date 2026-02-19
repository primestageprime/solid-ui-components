// ============================================
// VesselCallHeader — Depth 3
// Owns CSS (VesselCallHeader.css).
// Composes DateTimeRange (Depth 2).
// Vessel name + time range + duration + badge.
// ============================================
import { Component, JSX, splitProps, Show } from "solid-js";
import { DateTimeRange } from "../DataDisplay";
import "./VesselCallHeader.css";

export interface VesselCallHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {
  vesselName: string;
  connectedAt: string;
  disconnectedAt?: string | null;
  assetId?: string;
  /** Optional badge to display after the vessel name (e.g., "2 TRAINS") */
  badge?: JSX.Element;
  /** Optional action element on the right side */
  action?: JSX.Element;
  /** Optional href to make the header content a link */
  href?: string;
}

/** Calculate duration between two timestamps */
function formatDuration(startIso: string, endIso?: string | null): string {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  const diffMs = end.getTime() - start.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export const VesselCallHeader: Component<VesselCallHeaderProps> = (props) => {
  const [local, others] = splitProps(props, [
    "vesselName",
    "connectedAt",
    "disconnectedAt",
    "assetId",
    "badge",
    "action",
    "href",
    "class",
  ]);

  const classes = () => {
    const classList = ["jtf-vessel-call-header"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const mainContent = () => (
    <>
      <h2 class="jtf-vessel-call-header__title">{local.vesselName}</h2>
      <Show when={local.badge}>
        <span class="jtf-vessel-call-header__badge">{local.badge}</span>
      </Show>
      <span class="jtf-vessel-call-header__separator">·</span>
      <DateTimeRange
        class="jtf-vessel-call-header__timestamp"
        start={local.connectedAt}
        end={local.disconnectedAt}
      />
      <span class="jtf-vessel-call-header__duration">
        ({formatDuration(local.connectedAt, local.disconnectedAt)})
      </span>
      <Show when={local.assetId}>
        <span class="jtf-vessel-call-header__asset">
          {local.assetId}
        </span>
      </Show>
    </>
  );

  return (
    <div class={classes()} {...others}>
      <Show
        when={local.href}
        fallback={<div class="jtf-vessel-call-header__main">{mainContent()}</div>}
      >
        <a href={local.href} class="jtf-vessel-call-header__main jtf-vessel-call-header__link">
          {mainContent()}
        </a>
      </Show>
      <Show when={local.action}>
        <div class="jtf-vessel-call-header__action">{local.action}</div>
      </Show>
    </div>
  );
};
