// ============================================
// EntityCard — the unified sidebar/list card (Composite, Depth 2, owns CSS)
// ============================================
//
// A region-slot card: SUI owns the layout, grid, selection affordance, and the
// hover-remove control; the CLIENT fills each named region with its own content
// (a domain identifier, a status badge or indicator dots, a timing string, a
// progress bar…). This is the SUI/client boundary Peter described — "reference
// slots by region name; the client maps its local data into them." Because a
// region can hold arbitrary domain content, the card carries no typed value
// renderers of its own; it is pure layout.
//
// A fixed 3-column grid, so a 2-field card and a 6-field card read the same:
//
//   ┌─────────────────────────────────────────────┐
//   │ identifier                          status   │  top-left / top-right
//   │ detail                                       │  middle (optional)
//   │ timing          progress          counts     │  bottom: left / center / right
//   └─────────────────────────────────────────────┘
//
// Every region is optional except `identifier`; unused rows collapse. Selection
// uses the standard accent affordance (3px left border + accent wash) baked
// here so call sites never hand-roll it. `onRemove` is a hover-revealed ✕
// overlay — it never occupies the status region.
import { Show, type JSX } from "solid-js";
import "./EntityCard.css";

export interface EntityCardProps {
  /** Top-left — name / asset / abbreviated range. Required. */
  identifier: JSX.Element | string;
  /** Top-right — status badge / indicator dots / colored label. Empty if absent. */
  status?: JSX.Element | string;
  /** Middle — optional detail line (e.g. asset). */
  detail?: JSX.Element | string;
  /** Bottom-left — timing (date or abbreviated range). */
  timing?: JSX.Element | string;
  /** Bottom-center — optional progress (bar / % / sparkline). */
  progress?: JSX.Element;
  /** Bottom-right — optional terse count. */
  counts?: JSX.Element | string;
  selected?: boolean;
  onClick?: () => void;
  /** Optional hover-revealed remove control (✕). */
  onRemove?: () => void;
  class?: string;
}

export function EntityCard(props: EntityCardProps): JSX.Element {
  const hasBottom = () =>
    props.timing !== undefined ||
    props.progress !== undefined ||
    props.counts !== undefined;
  return (
    // Conditionally interactive: `role`/`tabIndex`/`aria-pressed`/keydown are
    // wired together or not at all, so whenever `aria-pressed` is present the
    // element genuinely IS `role="button"` and Enter/Space activate it (see the
    // keyboard test). Biome evaluates each attribute independently and cannot
    // see that correlation, hence the two suppressions below.
    //
    // This deliberately stays a <div role="button"> rather than a real
    // <button>: the card hosts the `onRemove` ✕ button, and nesting a button
    // inside a button is invalid HTML that browsers reparent — which would
    // break the remove control outright.
    // biome-ignore lint/a11y/noStaticElementInteractions: see above — the click handler ships together with role="button", tabIndex and an Enter/Space keydown handler; the div is interactive exactly when the handlers exist.
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: see above — `aria-pressed` is only ever emitted on the same condition that emits role="button", where it is a supported attribute.
    <div
      class={`sui-entity-card${props.class ? ` ${props.class}` : ""}`}
      classList={{ "sui-entity-card--selected": !!props.selected }}
      role={props.onClick ? "button" : undefined}
      tabIndex={props.onClick ? 0 : undefined}
      aria-pressed={props.onClick ? !!props.selected : undefined}
      onClick={() => props.onClick?.()}
      onKeyDown={(e) => {
        if (props.onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          props.onClick();
        }
      }}
    >
      <div class="sui-entity-card__id">{props.identifier}</div>
      <Show when={props.status !== undefined && props.status !== ""}>
        <div class="sui-entity-card__status">{props.status}</div>
      </Show>
      <Show when={props.detail !== undefined && props.detail !== ""}>
        <div class="sui-entity-card__detail">{props.detail}</div>
      </Show>
      <Show when={hasBottom()}>
        <div class="sui-entity-card__bottom">
          <div class="sui-entity-card__timing">{props.timing}</div>
          <div class="sui-entity-card__progress">{props.progress}</div>
          <div class="sui-entity-card__counts">{props.counts}</div>
        </div>
      </Show>
      <Show when={props.onRemove}>
        <button
          type="button"
          class="sui-entity-card__remove"
          title="Remove"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            props.onRemove?.();
          }}
        >
          ✕
        </button>
      </Show>
    </div>
  );
}
