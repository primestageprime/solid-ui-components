// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// TitledTimeRangeHeader — Atomic Primitive (Depth 1)
// Owns CSS (TitledTimeRangeHeader.css), no library Primitive imports.
// Title + optional badge + ISO date range + duration + optional asset
// chip + optional action slot, optionally wrapped in a link. The pure
// date-range formatter comes from `../DataDisplay/formatDateTimeRange`
// — sharing the rule with the sibling `DateTimeRange` Composite
// without forcing this Primitive to import a library component.
// ============================================
import { type Component, type JSX, splitProps, Show } from "solid-js";
import { formatDateTimeRange } from "../DataDisplay/formatDateTimeRange";
import "./TitledTimeRangeHeader.css";

// Omit the DOM `title` attribute (typed `string`) so our richer heading prop
// (string | JSX.Element) doesn't conflict with it — `title` is consumed into
// the heading content, never spread onto the div.
export interface TitledTimeRangeHeaderProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Heading content — a plain string, or rich JSX (e.g. an icon + name). */
  title: string | JSX.Element;
  start: string;
  end?: string | null;
  assetLabel?: string;
  /** Optional badge to display after the title (e.g., "ACTIVE", "3 ITEMS") */
  badge?: JSX.Element;
  /** Optional action element on the right side */
  action?: JSX.Element;
  /** Optional href to make the header content a link */
  href?: string;
}

/** Elapsed duration between two ISO timestamps as `Nh Mm` (or `Nd Nh`
 *  past 24h). Invalid inputs yield `NaNh NaNm` — validation is the
 *  caller's job. */
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

export const TitledTimeRangeHeader: Component<TitledTimeRangeHeaderProps> = (
  props,
) => {
  const [local, others] = splitProps(props, [
    "title",
    "start",
    "end",
    "assetLabel",
    "badge",
    "action",
    "href",
    "class",
  ]);

  const rootClass = () => {
    const classList = ["sui-titled-time-range-header"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const mainContent = () => (
    <>
      <h2 class="sui-titled-time-range-header__title">{local.title}</h2>
      <Show when={local.badge}>
        <span class="sui-titled-time-range-header__badge">{local.badge}</span>
      </Show>
      <span class="sui-titled-time-range-header__separator">·</span>
      <span class="sui-titled-time-range-header__timestamp">
        {formatDateTimeRange(local.start, local.end)}
      </span>
      <span class="sui-titled-time-range-header__duration">
        ({formatElapsed(local.start, local.end)})
      </span>
      <Show when={local.assetLabel}>
        <span class="sui-titled-time-range-header__asset">
          {local.assetLabel}
        </span>
      </Show>
    </>
  );

  return (
    <div class={rootClass()} {...others}>
      <Show
        when={local.href}
        fallback={
          <div class="sui-titled-time-range-header__main">{mainContent()}</div>
        }
      >
        <a
          href={local.href}
          class="sui-titled-time-range-header__main sui-titled-time-range-header__link"
        >
          {mainContent()}
        </a>
      </Show>
      <Show when={local.action}>
        <div class="sui-titled-time-range-header__action">{local.action}</div>
      </Show>
    </div>
  );
};
