// listDetail — GroupedSelector (Depth 2, composes Section + CountChip + ScrollColumn). Renders a
// kit's grouped() list as a rail: one collapsible group per entry (title and count chip always
// shown, collapsed or empty), items drawn by a render prop, the selected item marked and kept in
// view as j and k walk it. Pass `kit` and everything is wired; the explicit props serve a list
// that is not a kit's. No app nouns: the group titles come from the kit's `groups.title`.
import { createEffect, For, type JSX, Show } from "solid-js";
import { map, sum } from "../fn";
import { CountChip } from "../components/Badge/CountChip";
import { ScrollColumn } from "../components/Layout";
import { CollapsibleSection } from "../components/Section";
import { HintText } from "../components/Text";
import type { EntityBase, Group } from "./listkit";
import "./listDetail.css";

/** The slice of a defineListDetail kit the selector reads and drives. */
export type GroupedSelectorKit<T extends EntityBase, G extends string> = {
  grouped: () => Group<T, G>[];
  state: { view: { selectedId: string | null } };
  actions: {
    select: (id: string | null) => void;
    toggleGroup: (id: G) => void;
  };
};

export interface GroupedSelectorProps<T extends EntityBase, G extends string> {
  /** A defineListDetail kit: supplies groups, selection and collapse. */
  kit?: GroupedSelectorKit<T, G>;
  /** Groups to draw (default `kit.grouped()`). */
  groups?: Group<T, G>[];
  /** The selected item id (default `kit.state.view.selectedId`). */
  selectedId?: string | null;
  /** Called with an item id on click or Enter (default `kit.actions.select`). */
  onSelect?: (id: string) => void;
  /** Called with a group id when its header is toggled (default `kit.actions.toggleGroup`). */
  onToggleGroup?: (id: G) => void;
  /** Draws one item, usually a card; `selected` is true for the selected one. */
  renderItem: (item: T, ctx: { selected: boolean; group: Group<T, G> }) => JSX.Element;
  /** Shown inside an expanded group with no items. Default "Nothing here". */
  groupEmptyLabel?: string;
  /** Shown in place of the rail when no group has any item (a search that matches nothing). */
  emptyLabel?: string;
}

export function GroupedSelector<T extends EntityBase, G extends string>(
  props: GroupedSelectorProps<T, G>,
) {
  const groups = (): Group<T, G>[] => props.groups ?? props.kit?.grouped() ?? [];
  const kitView = () => props.kit?.state.view;
  const selectedId = (): string | null =>
    props.selectedId !== undefined ? props.selectedId : (kitView()?.selectedId ?? null);
  const select = (id: string): void =>
    (props.onSelect ?? props.kit?.actions.select)?.(id);
  const toggle = (id: G): void =>
    (props.onToggleGroup ?? props.kit?.actions.toggleGroup)?.(id);
  const total = (): number => sum(map((g) => g.count, groups()));
  let root: HTMLDivElement | undefined;

  // j and k move the kit's selection; keep the selected item in view.
  createEffect(() => {
    const id = selectedId();
    if (id === null || !root) return;
    const el = root.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(id)}"]`);
    el?.scrollIntoView?.({ block: "nearest" });
  });

  return (
    <ScrollColumn>
      <div ref={root} class="sui-grouped-selector" role="listbox">
        <Show
          when={total() > 0 || !props.emptyLabel}
          fallback={<HintText>{props.emptyLabel}</HintText>}
        >
          <For each={groups()}>
            {(group) => (
              <CollapsibleSection
                title={group.title}
                collapsed={group.collapsed}
                onToggleCollapse={() => toggle(group.id)}
                headerAction={<CountChip count={group.count} label="" aria-label={`${group.count} in ${group.title}`} />}
              >
                <Show
                  when={group.items.length > 0}
                  fallback={<HintText>{props.groupEmptyLabel ?? "Nothing here"}</HintText>}
                >
                  <For each={group.items}>
                    {(item) => (
                      <div
                        class="sui-grouped-selector__item"
                        role="option"
                        tabIndex={-1}
                        data-item-id={item.id}
                        aria-selected={selectedId() === item.id}
                        onClick={() => select(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            select(item.id);
                          }
                        }}
                      >
                        {props.renderItem(item, {
                          selected: selectedId() === item.id,
                          group,
                        })}
                      </div>
                    )}
                  </For>
                </Show>
              </CollapsibleSection>
            )}
          </For>
        </Show>
      </div>
    </ScrollColumn>
  );
}
