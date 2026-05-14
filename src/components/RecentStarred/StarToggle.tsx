import { Component } from "solid-js";
import type { RecentStarredItem, RecentStarredStore } from "./store";
import "./RecentStarred.css";

/**
 * Star toggle button — a 5-point star that fills when the item is in
 * the store's `starred` list. Click flips the state via
 * `store.toggleStar`. Style via `--sui-star-*` CSS vars.
 *
 * `item` must include `id` and `label`; pass any extra `meta` the
 * consuming app needs at click-time (e.g. parent ids for direct
 * navigation).
 *
 * @example
 *   <StarToggle store={caseStore} item={{ id, label: `R${rnum}`, meta: { tenant_id } }} />
 */
export interface StarToggleProps {
  store: RecentStarredStore;
  item: RecentStarredItem;
  /** Accessible label that picks up the current state. Defaults to
   * "Starred"/"Not starred" — override with something domain-specific
   * if the surrounding context isn't clear. */
  ariaLabel?: (isStarred: boolean) => string;
  /** Override the rendered title (browser tooltip). */
  title?: string;
}

export const StarToggle: Component<StarToggleProps> = (props) => {
  const isOn = () => props.store.isStarred(props.item.id);
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    props.store.toggleStar(props.item);
  };
  return (
    <button
      type="button"
      class="sui-star-toggle"
      data-starred={isOn() ? "true" : "false"}
      aria-pressed={isOn()}
      aria-label={props.ariaLabel?.(isOn()) ?? (isOn() ? "Starred" : "Not starred")}
      title={props.title}
      onClick={onClick}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M10 1.6l2.6 5.3 5.9.8-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.8z"
          fill={isOn() ? "currentColor" : "none"}
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  );
};
