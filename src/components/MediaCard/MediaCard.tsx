// ============================================
// MediaCard — a thumbnail-led list card (Composite, Depth 2, owns CSS)
// ============================================
//
// A Card-family sibling of EntityCard, not a retrofit of it: EntityCard is
// deliberately "pure layout, no typed value renderers" (any region can hold
// arbitrary domain content), which is exactly why it has no real thumbnail
// region (an image needs a fixed-size frame the CSS owns, not a JSX
// blob-of-anything slot) and no real tags region (a list of TagPillData
// needs its own renderer, not a generic `detail` slot). MediaCard exists for
// the shape neither EntityCard nor ActionListItem covers: a fixed-size
// thumbnail on the left, a name/tags/timestamp column on the right.
//
//   ┌──────────┐  identifier                    │
//   │          │  [tag] [tag]              ✕    │
//   │ thumbnail│                                 │
//   │          │  timing                         │
//   └──────────┘                                 │
//
// Same selection affordance (3px left border + accent wash), same
// hover-revealed ✕ remove control, same conditionally-interactive
// div[role=button] pattern as EntityCard, so a list mixing both reads as one
// family. `tags` reuses TagPill/TagPillData directly (the same primitive
// ActionListItem uses) rather than inventing a second tag-pill renderer.
import { For, Show, type JSX } from "solid-js";
import { TagPill, type TagPillData } from "../Badge/TagPill";
import "./MediaCard.css";

export interface MediaCardProps {
  /** Left — fixed-size image slot. Required. */
  thumbnail: JSX.Element;
  /** Top — displayed name (a friendly name if the consumer has one, else the
   *  filename). Required. */
  identifier: JSX.Element | string;
  /** Underlying filename — rendered as a native title-attribute tooltip on
   *  the identifier region when set. Omit when identifier IS the filename
   *  (no redundant tooltip repeating what's already on screen). */
  filename?: string;
  /** Tag-pill row. Real TagPill[], not a generic slot — omit/empty to hide
   *  the row entirely. */
  tags?: TagPillData[];
  /** Bottom — timestamp. */
  timing?: JSX.Element | string;
  selected?: boolean;
  onClick?: () => void;
  /** Called when a tag pill is clicked. Stops propagation to onClick and
   *  never toggles selection. When absent, tags render inert (plain TagPill). */
  onTagClick?: (tag: TagPillData) => void;
  /** Optional hover-revealed remove control (✕). */
  onRemove?: () => void;
  class?: string;
}

export function MediaCard(props: MediaCardProps): JSX.Element {
  const hasTags = () => (props.tags?.length ?? 0) > 0;
  // biome-ignore lint/a11y/noStaticElementInteractions: click handler ships together with role="button", tabIndex and an Enter/Space keydown handler below — see EntityCard, same pattern.
  // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-pressed is only emitted on the same condition that emits role="button", where it is supported.
  return (
    <div
      class={`sui-media-card${props.class ? ` ${props.class}` : ""}`}
      classList={{ "sui-media-card--selected": !!props.selected }}
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
      <div class="sui-media-card__thumbnail">{props.thumbnail}</div>
      <div class="sui-media-card__body">
        <div class="sui-media-card__id" title={props.filename}>
          {props.identifier}
        </div>
        <Show when={hasTags()}>
          <div class="sui-media-card__tags">
            <For each={props.tags}>
              {(tag) => (
                <Show when={props.onTagClick} fallback={<TagPill tag={tag} />}>
                  <button
                    type="button"
                    class="sui-media-card__tag"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onTagClick!(tag);
                    }}
                  >
                    <TagPill tag={tag} />
                  </button>
                </Show>
              )}
            </For>
          </div>
        </Show>
        <Show when={props.timing !== undefined && props.timing !== ""}>
          <div class="sui-media-card__timing">{props.timing}</div>
        </Show>
      </div>
      <Show when={props.onRemove}>
        <button
          type="button"
          class="sui-media-card__remove"
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
