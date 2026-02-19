// ============================================
// HUDList + HUDListItem — Atomic (Depth 1)
// Owns CSS (HUD.css), no component imports.
// Status/menu list with dividers, icons, status dots.
// ============================================
import { Component, splitProps, Show, JSX } from "solid-js";
import { HUDListProps, HUDListItemProps } from "./types";
import "./HUD.css";

export const HUDList: Component<HUDListProps> = (props) => {
  const [local, others] = splitProps(props, [
    "variant",
    "dividers",
    "compact",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["hud-list"];
    if (local.variant) classList.push(`hud-list--${local.variant}`);
    if (local.dividers) classList.push("hud-list--dividers");
    if (local.compact) classList.push("hud-list--compact");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <ul class={classes()} {...others}>
      {local.children}
    </ul>
  );
};

export const HUDListItem: Component<HUDListItemProps> = (props) => {
  const [local, others] = splitProps(props, [
    "status",
    "icon",
    "secondary",
    "interactive",
    "selected",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["hud-list-item"];
    if (local.status) classList.push(`hud-list-item--status-${local.status}`);
    if (local.interactive) classList.push("hud-list-item--interactive");
    if (local.selected) classList.push("hud-list-item--selected");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <li class={classes()} {...others}>
      <Show when={local.status}>
        <span class="hud-list-item__status" />
      </Show>
      <Show when={local.icon}>
        <span class="hud-list-item__icon">{local.icon}</span>
      </Show>
      <div class="hud-list-item__content">
        <p class="hud-list-item__text">{local.children}</p>
        <Show when={local.secondary}>
          <p class="hud-list-item__secondary">{local.secondary}</p>
        </Show>
      </div>
    </li>
  );
};
