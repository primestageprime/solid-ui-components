// ============================================
// HUDPanel — Atomic (Depth 1)
// Owns CSS (HUD.css), no component imports.
// Sci-fi panel with title, corner brackets, glow.
// ============================================
import { Component, JSX, splitProps, Show, mergeProps } from "solid-js";
import { HUDPanelProps } from "./types";
import "./HUD.css";

export const HUDPanel: Component<HUDPanelProps> = (props) => {
  const [local, others] = splitProps(props, [
    "title",
    "corners",
    "variant",
    "size",
    "glow",
    "edgeAccents",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["hud-panel"];
    if (local.corners) classList.push(`hud-panel--corners-${local.corners}`);
    if (local.variant) classList.push(`hud-panel--${local.variant}`);
    if (local.size) classList.push(`hud-panel--${local.size}`);
    if (local.glow && local.glow !== "none") classList.push(`hud-panel--glow-${local.glow}`);
    if (local.edgeAccents) classList.push("hud-panel--edge-accents");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      {/* Corner bracket decorations */}
      <Show when={local.corners === "bracket"}>
        <span class="hud-panel__corner-bl" />
        <span class="hud-panel__corner-br" />
      </Show>

      <Show when={local.title}>
        <div class="hud-panel__header">
          <h3 class="hud-panel__title">{local.title}</h3>
        </div>
      </Show>
      {local.children}
    </div>
  );
};

export function createHUDPanel(defaults: Partial<Omit<HUDPanelProps, "children">>): Component<HUDPanelProps> {
  return (props) => <HUDPanel {...mergeProps(defaults, props)} />;
}
