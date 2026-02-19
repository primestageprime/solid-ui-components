// ============================================
// Page — Atomic (Depth 1)
// Owns CSS (Page.css), no component imports.
// Page container with scanline and grid overlays.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import "./Page.css";

export interface PageProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Optional scan lines overlay effect */
  scanLines?: boolean;
  /** Optional grid background pattern */
  gridPattern?: boolean;
}

export const Page: Component<PageProps> = (props) => {
  const [local, others] = splitProps(props, [
    "scanLines",
    "gridPattern",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["sui-page"];
    if (local.scanLines) classList.push("sui-page--scanlines");
    if (local.gridPattern) classList.push("sui-page--grid");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      <div class="sui-page__content">
        {local.children}
      </div>
    </div>
  );
};
