// ============================================
// DragItem — Atomic (Depth 1)
// Owns CSS (DragItem.css), wraps @thisbeyond/solid-dnd draggable.
// Individual draggable item with drag overlay styling.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import { createDraggable } from "@thisbeyond/solid-dnd";
import "./DragItem.css";

export interface DragItemProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "itemId"> {
  /** Unique ID for this draggable item. Must be stable. */
  itemId: string | number;
  /** Disable dragging (e.g., on mobile). */
  disabled?: boolean;
}

export const DragItem: Component<DragItemProps> = (props) => {
  const [local, others] = splitProps(props, [
    "itemId",
    "disabled",
    "class",
    "children",
  ]);

  const draggable = createDraggable(local.itemId);

  const classes = () => {
    const classList = ["sui-drag-item"];
    if (draggable.isActiveDraggable) classList.push("sui-drag-item--dragging");
    if (local.disabled) classList.push("sui-drag-item--disabled");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div
      ref={draggable.ref}
      class={classes()}
      {...(local.disabled ? {} : draggable.dragActivators)}
      {...others}
    >
      {local.children}
    </div>
  );
};
