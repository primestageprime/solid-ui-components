// ============================================
// HUDSection — Atomic (Depth 1)
// Owns CSS (HUD.css), no component imports.
// Collapsible section with title, subtitle, corner decorations.
// ============================================
import { Component, JSX, splitProps, Show } from "solid-js";
import { HUDSectionProps } from "./types";
import "./HUD.css";

export const HUDSection: Component<HUDSectionProps> = (props) => {
  const [local, others] = splitProps(props, [
    "title",
    "subtitle",
    "corners",
    "variant",
    "showHeader",
    "headerAction",
    "collapsible",
    "collapsed",
    "onToggleCollapse",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["hud-section"];
    if (local.corners) classList.push(`hud-section--corners-${local.corners}`);
    if (local.collapsed) classList.push("hud-section--collapsed");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const headerClasses = () => {
    const classList = ["hud-section__header"];
    if (local.variant) classList.push(`hud-section__header--${local.variant}`);
    return classList.join(" ");
  };

  const showHeader = () => local.showHeader !== false && (local.title || local.headerAction);

  return (
    <section class={classes()} {...others}>
      <Show when={showHeader()}>
        <div class={headerClasses()}>
          <div class="hud-section__title-group">
            <Show when={local.title}>
              <h2 class="hud-section__title">{local.title}</h2>
            </Show>
            <Show when={local.subtitle}>
              <p class="hud-section__subtitle">{local.subtitle}</p>
            </Show>
          </div>
          <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
            {local.headerAction}
            <Show when={local.collapsible}>
              <button
                class="hud-section__collapse-btn"
                onClick={local.onToggleCollapse}
              >
                {local.collapsed ? "+" : "−"}
              </button>
            </Show>
          </div>
        </div>
      </Show>
      <div class="hud-section__content">
        {local.children}
      </div>
    </section>
  );
};
