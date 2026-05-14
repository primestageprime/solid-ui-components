import { Component, For, Show, JSX } from "solid-js";
import type { RecentStarredItem, RecentStarredStore } from "./store";
import "./RecentStarred.css";

/**
 * Sidebar panel showing the store's starred and recent lists. Pure
 * renderer: no navigation, no persistence. The caller passes `onPick`,
 * which fires with the clicked item — typical wiring is to route to
 * the item using `item.meta` (parent ids, etc.) the consuming app
 * stored when it called `store.pushRecent`.
 *
 * Both sections render even when empty so the sidebar's vertical
 * layout doesn't jump as state changes. Empty-state copy is
 * configurable.
 *
 * @example
 *   <RecentStarredSidebar
 *     store={caseStore}
 *     onPick={(item) => navigateToCase(item.meta as ChainMeta)}
 *   />
 */
export interface RecentStarredSidebarProps {
  store: RecentStarredStore;
  /** Click handler — fires with the picked item. */
  onPick: (item: RecentStarredItem) => void;
  /** Header text for the starred section. Default "Starred". */
  starredTitle?: string;
  /** Header text for the recent section. Default "Recent". */
  recentTitle?: string;
  /** Empty-state copy when no starred items. */
  starredEmpty?: JSX.Element;
  /** Empty-state copy when no recent items. */
  recentEmpty?: JSX.Element;
  /** Render override for an item's label — receives the full item.
   * Useful when the app wants two-line cards or trailing badges. */
  renderItem?: (item: RecentStarredItem) => JSX.Element;
  /** Custom class on the outer container. */
  class?: string;
}

export const RecentStarredSidebar: Component<RecentStarredSidebarProps> = (props) => {
  const renderLabel = (item: RecentStarredItem) =>
    props.renderItem ? props.renderItem(item) : item.label;

  return (
    <div class={`sui-recent-starred${props.class ? " " + props.class : ""}`}>
      <section class="sui-recent-starred__section">
        <div class="sui-recent-starred__header">
          <span>{props.starredTitle ?? "Starred"}</span>
          <Show when={props.store.starred().length > 0}>
            <span>{props.store.starred().length}</span>
          </Show>
        </div>
        <Show
          when={props.store.starred().length > 0}
          fallback={
            <div class="sui-recent-starred__empty">
              {props.starredEmpty ?? "No starred items yet."}
            </div>
          }
        >
          <ul class="sui-recent-starred__list">
            <For each={props.store.starred()}>
              {(item) => (
                <li>
                  <button
                    class="sui-recent-starred__item"
                    title={item.label}
                    onClick={() => props.onPick(item)}
                  >
                    {renderLabel(item)}
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>

      <section class="sui-recent-starred__section">
        <div class="sui-recent-starred__header">
          <span>{props.recentTitle ?? "Recent"}</span>
          <Show when={props.store.recent().length > 0}>
            <span>{props.store.recent().length}</span>
          </Show>
        </div>
        <Show
          when={props.store.recent().length > 0}
          fallback={
            <div class="sui-recent-starred__empty">
              {props.recentEmpty ?? "Nothing visited yet."}
            </div>
          }
        >
          <ul class="sui-recent-starred__list">
            <For each={props.store.recent()}>
              {(item) => (
                <li>
                  <button
                    class="sui-recent-starred__item"
                    title={item.label}
                    onClick={() => props.onPick(item)}
                  >
                    {renderLabel(item)}
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>
    </div>
  );
};
