// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Panel — Atomic (Depth 1)
// Owns CSS (Panel.css), no component imports.
// Container panel with title, corner brackets, glow.
// Merged from HUDPanel + generic Panel.
// ============================================
import {
  type Component,
  type JSX,
  splitProps,
  Show,
  mergeProps,
} from "solid-js";
import type { ColorVariant, CornerStyle } from "../../types";
import { ClipColumn, ClusterRow, ScrollFillColumn } from "../Layout/variants";
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
    if (local.glow && local.glow !== "none")
      classList.push(`sui-panel--glow-${local.glow}`);
    if (local.edgeAccents) classList.push("sui-panel--edge-accents");
    if (local.fill) classList.push("sui-panel--fill");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  // Layout is composed from the Layout family (layout-purity): the frame is a
  // ClipColumn (flex column that clips decorative bleed / clip-path notch — the
  // old `.sui-panel` display:flex + overflow:clip), the header is a ClusterRow
  // (align:center, gap:sm — the old flex header), and the content is a
  // ScrollFillColumn (flex:1;min-height:0;overflow:auto — the scroll owner that
  // stays bounded inside a height-bounded frame). The `sui-panel--fill` class
  // (emitted when `fill`) supplies the non-geometry height:100%;min-height:0 so
  // the frame grows to its flex parent and the content takes the leftover space.
  // The sui-panel* classes ride along as theming/structure hooks.
  return (
    <ClipColumn class={classes()} {...others}>
      {/* Corner bracket decorations */}
      <Show when={local.corners === "bracket"}>
        <span class="sui-panel__corner-bl" />
        <span class="sui-panel__corner-br" />
      </Show>

      <Show when={local.title}>
        <ClusterRow class="sui-panel__header">
          <h3 class="sui-panel__title">{local.title}</h3>
        </ClusterRow>
      </Show>
      {/* Children ALWAYS live in an inner content region — the scroll owner, so
          a height-bounded panel scrolls inside the frame and the bottom brackets
          stay pinned to the visible panel edge instead of riding the scroll
          content. */}
      <ScrollFillColumn class="sui-panel__content">
        {local.children}
      </ScrollFillColumn>
    </ClipColumn>
  );
};

/** Props that are visual overrides — locked at variant-definition time. */
export type PanelOverrides = Pick<
  PanelProps,
  "corners" | "variant" | "size" | "glow" | "edgeAccents"
>;

/** Props that remain available to consumers of a curried Panel variant. */
export type PanelDataProps = Omit<PanelProps, keyof PanelOverrides>;

export function createPanel(
  defaults: Partial<Omit<PanelProps, "children">>,
): Component<PanelDataProps> {
  return (props) => <Panel {...mergeProps(defaults, props)} />;
}
