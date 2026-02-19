// ============================================
// Link — Atomic (Depth 1)
// Owns CSS (Link.css), no component imports.
// Minimal anchor wrapper with accent color.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import "./Link.css";

export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {}

export const Link: Component<LinkProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  const classes = () => {
    const classList = ["link"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <a class={classes()} {...others}>
      {local.children}
    </a>
  );
};

/**
 * NewTabLink — curried Link that always opens in a new tab.
 */
export const NewTabLink: Component<LinkProps> = (props) => {
  return <Link target="_blank" rel="noopener noreferrer" {...props} />;
};
