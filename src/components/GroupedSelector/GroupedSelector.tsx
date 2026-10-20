// GroupedSelector (Depth 2, composes Section + CountChip + ScrollColumn). Renders a
// Tags: shows:list, shows:count, does:select, does:collapse, data:grouped, role:rail
// kit's grouped() list as a rail: one collapsible group per entry (title and count chip always
// shown, collapsed or empty), items drawn by a render prop, the selected item marked and kept in
// view as j and k walk it. Pass `kit` and everything is wired; the explicit props serve a list
// that is not a kit's. No app nouns: the group titles come from the kit's `groups.title`.
//
// `variant="flush"` (2026-10-20, the tasklist sketch): the groups are compact flush rows — the
// title left, a boxed count right, one hairline between rows, no +/- glyph (the header row
// itself toggles) — and the selected item carries an accent bar that the group header shares.
// The default variant (CollapsibleSection headers, padded items) is unchanged.
import { createEffect, For, type JSX, Show } from "solid-js";
import { map, some, sum } from "../../fn";
import { CountChip } from "../Badge/CountChip";
import { ScrollColumn } from "../Layout";
import { CollapsibleSection } from "../Section";
import { HintText } from "../Text";
import "./GroupedSelector.css";

/** How the rail is drawn: `default` (sectioned, padded) or `flush` (compact rows, hairlines, accent bar). */
export type GroupedSelectorVariant = "default" | "flush";

/** What a selector needs of an item. */
export type GroupedItem = { id: string };

/** One group as `defineListDetail`'s `kit.grouped()` returns it (any list with this shape works). */
export type SelectorGroup<T extends GroupedItem, G extends string = string> = {
  id: G;
  title: string;
  count: number;
  collapsed: boolean;
  items: T[];
};

/** The slice of a defineListDetail kit the selector reads and drives. */
export type GroupedSelectorKit<T extends GroupedItem, G extends string> = {
  grouped: () => SelectorGroup<T, G>[];
  state: { view: { selectedId: string | null } };
  actions: {
    select: (id: string | null) => void;
    toggleGroup: (id: G) => void;
  };
};

export interface GroupedSelectorProps<T extends GroupedItem, G extends string> {
  /** A defineListDetail kit: supplies groups, selection and collapse. */
  kit?: GroupedSelectorKit<T, G>;
  /** Groups to draw (default `kit.grouped()`). */
  groups?: SelectorGroup<T, G>[];
  /** The selected item id (default `kit.state.view.selectedId`). */
  selectedId?: string | null;
  /** Called with an item id on click or Enter (default `kit.actions.select`). */
  onSelect?: (id: string) => void;
  /** Called with a group id when its header is toggled (default `kit.actions.toggleGroup`). */
  onToggleGroup?: (id: G) => void;
  /** Draws one item, usually a card; `selected` is true for the selected one. */
  renderItem: (item: T, ctx: { selected: boolean; group: SelectorGroup<T, G> }) => JSX.Element;
  /** Shown inside an expanded group with no items. Default "Nothing here". */
  groupEmptyLabel?: string;
  /** Shown in place of the rail when no group has any item (a search that matches nothing). */
  emptyLabel?: string;
  /** `flush` draws compact group rows with hairlines and an accent bar on the selection. Default `default`. */
  variant?: GroupedSelectorVariant;
}

export function GroupedSelector<T extends GroupedItem, G extends string>(
  props: GroupedSelectorProps<T, G>,
) {
  const groups = (): SelectorGroup<T, G>[] => props.groups ?? props.kit?.grouped() ?? [];
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
    <ScrollColumn class={props.variant === "flush" ? "sui-grouped-selector__scroll sui-grouped-selector__scroll--flush" : "sui-grouped-selector__scroll"}>
      <div
        ref={root}
        class={props.variant === "flush" ? "sui-grouped-selector sui-grouped-selector--flush" : "sui-grouped-selector"}
        role="listbox"
      >
        <Show
          when={total() > 0 || !props.emptyLabel}
          fallback={<HintText>{props.emptyLabel}</HintText>}
        >
          <For each={groups()}>
            {(group) => {
              const items = (
                <Show
                  when={group.items.length > 0}
                  fallback={
                    <div class="sui-grouped-selector__empty">
                      <HintText>{props.groupEmptyLabel ?? "Nothing here"}</HintText>
                    </div>
                  }
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
              );
              const holdsSelection = () => some((i: T) => i.id === selectedId(), group.items);
              return (
                <Show
                  when={props.variant === "flush"}
                  fallback={
                    <CollapsibleSection
                      title={group.title}
                      collapsed={group.collapsed}
                      onToggleCollapse={() => toggle(group.id)}
                      headerAction={<CountChip count={group.count} label="" aria-label={`${group.count} in ${group.title}`} />}
                    >
                      {items}
                    </CollapsibleSection>
                  }
                >
                  <section
                    class="sui-grouped-selector__group"
                    data-group-id={group.id}
                    data-holds-selection={holdsSelection() ? "true" : undefined}
                  >
                    <button
                      type="button"
                      class="sui-grouped-selector__header"
                      aria-expanded={!group.collapsed}
                      onClick={() => toggle(group.id)}
                    >
                      <span class="sui-grouped-selector__title">{group.title}</span>
                      <CountChip count={group.count} label="" aria-label={`${group.count} in ${group.title}`} />
                    </button>
                    <Show when={!group.collapsed}>{items}</Show>
                  </section>
                </Show>
              );
            }}
          </For>
        </Show>
      </div>
    </ScrollColumn>
  );
}
