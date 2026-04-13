// ============================================
// PopoverMenu — Composite (Depth 2)
// Imports: Button, Icon, List, ListItem.
// Trigger button with positioned action menu.
// ============================================
import { Component, For, Show, JSX, createSignal, onCleanup, mergeProps } from "solid-js";
import { GhostButton, SmallGhostButton } from "../Button";
import { Icon } from "../Icon";
import type { IconName } from "../Icon";
import { List, ListItem } from "../List";
import "./PopoverMenu.css";

export interface PopoverMenuItem {
  id: string;
  label: string;
  icon?: IconName;
}

export interface PopoverMenuProps {
  /** Content rendered inside the trigger button */
  trigger: JSX.Element;
  /** Menu items */
  items: PopoverMenuItem[];
  /** Called when an item is selected */
  onSelect: (id: string) => void;
  /** Menu alignment relative to trigger */
  align?: "left" | "right";
  /** Trigger button size */
  size?: "sm" | "md";
}

export const PopoverMenu: Component<PopoverMenuProps> = (props) => {
  const merged = mergeProps({ align: "right" as const, size: "md" as const }, props);
  const [open, setOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setOpen(false);
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  };

  const setupListeners = () => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
  };

  const teardownListeners = () => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleKeydown);
  };

  onCleanup(teardownListeners);

  const toggle = () => {
    const next = !open();
    setOpen(next);
    if (next) setupListeners();
    else teardownListeners();
  };

  const select = (id: string) => {
    merged.onSelect(id);
    setOpen(false);
    teardownListeners();
  };

  const TriggerButton = merged.size === "sm" ? SmallGhostButton : GhostButton;

  const containerClass = () => {
    const classes = ["sui-popover-menu"];
    classes.push(`sui-popover-menu--align-${merged.align}`);
    if (open()) classes.push("sui-popover-menu--open");
    return classes.join(" ");
  };

  return (
    <div class={containerClass()} ref={containerRef}>
      <TriggerButton onClick={toggle}>
        <span class="sui-popover-menu__trigger">
          {merged.trigger}
          <span class="sui-popover-menu__caret">
            <Icon name="chevron-down" size="xs" />
          </span>
        </span>
      </TriggerButton>

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
export const RightPopoverMenu: Component<Omit<PopoverMenuProps, "align" | "size">> = (props) =>
  PopoverMenu(mergeProps({ align: "right" as const, size: "sm" as const }, props));
