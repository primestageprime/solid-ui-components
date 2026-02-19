// ============================================
// HUDPage — Atomic (Depth 1)
// Owns CSS (HUD.css), no component imports.
// Page container with scanline and grid overlays.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import { HUDPageProps } from "./types";
import "./HUD.css";

export const HUDPage: Component<HUDPageProps> = (props) => {
  const [local, others] = splitProps(props, [
    "scanLines",
    "gridPattern",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["hud-page"];
    if (local.scanLines) classList.push("hud-page--scanlines");
    if (local.gridPattern) classList.push("hud-page--grid");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      <div class="hud-page__content">
        {local.children}
      </div>
    </div>
  );
};
