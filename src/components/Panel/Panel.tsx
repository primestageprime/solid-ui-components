// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Panel — Atomic (Depth 1)
// Owns CSS (Panel.css), no component imports.
// Container panel with title, corner brackets, glow.
// Merged from HUDPanel + generic Panel.
// ============================================
import { type Component, type JSX, splitProps, Show, mergeProps } from "solid-js";
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
  /**
   * Fill the parent's height and lay children out as a flex column, with the
   * content region growing to take the space left after the optional title.
   * Use when a panel sits in a flex/proportional slot and must hand its full
   * remaining height to a flexible child (e.g. a container-sized chart).
   */
  fill?: boolean;
}

export const Panel: Component<PanelProps> = (props) => {
  const [local, others] = splitProps(props, [
    "title",
    "corners",
    "variant",
    "size",
    "glow",
    "edgeAccents",
    "fill",
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
    if (local.fill) classList.push("sui-panel--fill");
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
      {/* Children ALWAYS live in an inner content region. The outer .sui-panel
          frame is non-scrolling (overflow:clip) and owns the corner brackets;
          .sui-panel__content is the scroll owner (overflow:auto), so a
          height-bounded panel scrolls inside the frame and the bottom brackets
          stay pinned to the visible panel edge instead of riding the scroll
          content. `fill` additionally makes this region grow (flex:1;min-height:0)
          so a flexible child (e.g. a container-sized chart) takes the height
          left after the title. */}
      <div class="sui-panel__content">{local.children}</div>
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
