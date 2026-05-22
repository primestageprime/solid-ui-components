// ============================================
// VesselCallHeader — Atomic Primitive (Depth 1)
// Owns CSS (VesselCallHeader.css), no library Primitive imports.
// Title + optional badge + ISO date range + duration + optional asset
// chip + optional action slot, optionally wrapped in a link. The pure
// date-range formatter comes from `../DataDisplay/formatDateTimeRange`
// — sharing the rule with the sibling `DateTimeRange` Composite
// without forcing this Primitive to import a library component.
//
// NOTE: the component name encodes a maritime domain concept ("vessel
// call"); the shape is generic (named-thing + time range + duration +
// badge + action row). Flagged for rename when the next library-wide
// naming pass batches the domain-bound names together.
// ============================================
import { Component, JSX, splitProps, Show } from "solid-js";
import { formatDateTimeRange } from "../DataDisplay/formatDateTimeRange";
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

/** Calculate elapsed duration between two ISO timestamps as `Nh Mm`
 *  (or `Nd Mh` past 24h). Returns an empty string when the inputs are
 *  invalid; the caller wraps the result in parentheses regardless. */
function formatElapsed(startIso: string, endIso?: string | null): string {
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

  const rootClass = () => {
    const classList = ["sui-vessel-call-header"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const mainContent = () => (
    <>
      <h2 class="sui-vessel-call-header__title">{local.vesselName}</h2>
      <Show when={local.badge}>
        <span class="sui-vessel-call-header__badge">{local.badge}</span>
      </Show>
      <span class="sui-vessel-call-header__separator">·</span>
      <span class="sui-vessel-call-header__timestamp">
        {formatDateTimeRange(local.connectedAt, local.disconnectedAt)}
      </span>
      <span class="sui-vessel-call-header__duration">
        ({formatElapsed(local.connectedAt, local.disconnectedAt)})
      </span>
      <Show when={local.assetId}>
        <span class="sui-vessel-call-header__asset">{local.assetId}</span>
      </Show>
    </>
  );

  return (
    <div class={rootClass()} {...others}>
      <Show
        when={local.href}
        fallback={<div class="sui-vessel-call-header__main">{mainContent()}</div>}
      >
        <a
          href={local.href}
          class="sui-vessel-call-header__main sui-vessel-call-header__link"
        >
          {mainContent()}
        </a>
      </Show>
      <Show when={local.action}>
        <div class="sui-vessel-call-header__action">{local.action}</div>
      </Show>
    </div>
  );
};
