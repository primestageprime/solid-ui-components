// ============================================
// PopoverMenu — Composite (Depth 2)
// Imports: Button, Icon, List, ListItem.
// Trigger button with positioned action menu.
// ============================================
import { Component, For, Show, JSX, createSignal, onCleanup, mergeProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { GhostButton, SmallGhostButton } from "../Button";
import { Icon } from "../Icon";
import type { IconName } from "../Icon";
import { List, ListItem } from "../List";
import "./PopoverMenu.css";

export interface PopoverMenuItem<Id extends string = string> {
  id: Id;
  label: string;
  icon?: IconName;
}

export interface PopoverMenuProps<Id extends string = string> {
  /** Content rendered inside the trigger button */
  trigger: JSX.Element;
  /** Menu items (at least one required) */
  items: [PopoverMenuItem<Id>, ...PopoverMenuItem<Id>[]];
  /** Called when an item is selected */
  onSelect: (id: Id) => void;
  /** Menu alignment relative to trigger */
  align?: "left" | "right";
  /** Trigger button size */
  size?: "sm" | "md";
}

export const PopoverMenu = <Id extends string = string>(props: PopoverMenuProps<Id>) => {
  const merged = mergeProps({ align: "right" as const, size: "md" as const }, props);
  const [open, setOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      close();
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  const setupListeners = () => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
  };

  const teardownListeners = () => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleKeydown);
  };

  const close = () => {
    setOpen(false);
    teardownListeners();
  };

  onCleanup(teardownListeners);

  const toggle = () => {
    if (open()) {
      close();
    } else {
      setOpen(true);
      setupListeners();
    }
  };

  const select = (id: Id) => {
    try {
      merged.onSelect(id);
    } finally {
      close();
    }
  };

  const containerClass = () => {
    const classes = ["sui-popover-menu"];
    classes.push(`sui-popover-menu--align-${merged.align}`);
    if (open()) classes.push("sui-popover-menu--open");
    return classes.join(" ");
  };

  return (
    <div class={containerClass()} ref={containerRef}>
      <Dynamic component={merged.size === "sm" ? SmallGhostButton : GhostButton} onClick={toggle}>
        <span class="sui-popover-menu__trigger">
          {merged.trigger}
          <span class="sui-popover-menu__caret">
            <Icon name="chevron-down" size="xs" />
          </span>
        </span>
      </Dynamic>

      <Show when={open()}>
        <div class="sui-popover-menu__panel">
          <List variant="menu" compact>
            <For each={merged.items}>
              {(item) => (
                <ListItem interactive onClick={() => select(item.id)}>
                  <Show when={item.icon}>
                    <Icon name={item.icon!} size="sm" />
                  </Show>
                  {item.label}
                </ListItem>
              )}
            </For>
          </List>
        </div>
      </Show>
    </div>
  );
};

/** Right-aligned, small trigger — common header use case. */
export const RightPopoverMenu = <Id extends string = string>(
  props: Omit<PopoverMenuProps<Id>, "align" | "size">,
) => {
  const merged = mergeProps({ align: "right" as const, size: "sm" as const }, props);
  return <PopoverMenu {...merged} />;
};
