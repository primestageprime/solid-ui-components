// ============================================
// Panel — Atomic (Depth 1)
// Owns CSS (Panel.css), no component imports.
// Container panel with title, corner brackets, glow.
// Merged from HUDPanel + generic Panel.
// ============================================
import { Component, JSX, splitProps, Show, mergeProps } from "solid-js";
import type { ColorVariant, CornerStyle } from "../../types";
import "./Panel.css";

export interface PanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title?: string;
  /** Corner decoration style */
  corners?: CornerStyle;
  /** Accent color variant */
  variant?: ColorVariant;
  /** Size variant (replaces old "padding" prop) */
  size?: "none" | "sm" | "md" | "lg";
  /** Glow intensity */
  glow?: "none" | "subtle" | "medium" | "strong";
  /** Show edge accents */
  edgeAccents?: boolean;
}

export const Panel: Component<PanelProps> = (props) => {
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
    const classList = ["sui-panel"];
    if (local.corners) classList.push(`sui-panel--corners-${local.corners}`);
    if (local.variant) classList.push(`sui-panel--${local.variant}`);
    if (local.size) classList.push(`sui-panel--${local.size}`);
    if (local.glow && local.glow !== "none") classList.push(`sui-panel--glow-${local.glow}`);
    if (local.edgeAccents) classList.push("sui-panel--edge-accents");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      {/* Corner bracket decorations */}
      <Show when={local.corners === "bracket"}>
        <span class="sui-panel__corner-bl" />
        <span class="sui-panel__corner-br" />
      </Show>

      <Show when={local.title}>
        <div class="sui-panel__header">
          <h3 class="sui-panel__title">{local.title}</h3>
        </div>
      </Show>
      {local.children}
    </div>
  );
};

/** Props that are visual overrides — locked at variant-definition time. */
export type PanelOverrides = Pick<PanelProps, "corners" | "variant" | "size" | "glow" | "edgeAccents">;

/** Props that remain available to consumers of a curried Panel variant. */
export type PanelDataProps = Omit<PanelProps, keyof PanelOverrides>;

export function createPanel(defaults: Partial<Omit<PanelProps, "children">>): Component<PanelDataProps> {
  return (props) => <Panel {...mergeProps(defaults, props)} />;
}
