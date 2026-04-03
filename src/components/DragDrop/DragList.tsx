// ============================================
// DragList — Composite (Depth 2)
// Owns CSS (DragList.css), imports DragItem.
// Sortable + droppable list wrapping @thisbeyond/solid-dnd.
// ============================================
import { For, JSX, splitProps, Show } from "solid-js";
import { createDroppable } from "@thisbeyond/solid-dnd";
import "./DragList.css";

export interface DragListItem {
  id: string | number;
}

export interface DragListProps<T extends DragListItem> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Unique ID for this drop zone. */
  listId: string;
  /** Items to render as draggable. */
  items: T[];
  /** Render function for each item. Item is already wrapped in DragItem. */
  renderItem: (item: T) => JSX.Element;
  /** Disable all drag interactions (e.g., on mobile). */
  disabled?: boolean;
  /** Placeholder shown when the list is empty. */
  emptyPlaceholder?: JSX.Element;
}

export function DragList<T extends DragListItem>(props: DragListProps<T>) {
  const [local, others] = splitProps(props, [
    "listId",
    "items",
    "renderItem",
    "disabled",
    "emptyPlaceholder",
    "class",
  ]);

  const droppable = createDroppable(local.listId);

  const classes = () => {
    const classList = ["sui-drag-list"];
    if (droppable.isActiveDroppable) classList.push("sui-drag-list--active");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div ref={droppable.ref} class={classes()} {...others}>
      <Show
        when={local.items.length > 0}
        fallback={local.emptyPlaceholder}
      >
        <For each={local.items}>
          {(item) => local.renderItem(item)}
        </For>
      </Show>
    </div>
  );
}
