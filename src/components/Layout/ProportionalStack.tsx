// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ProportionalStack — Primitive (Depth 0)
// Flex container whose children declare a `weight`. When all children fit
// at their natural size, each shrink-wraps to content (no proportional
// stretching). When the children would overflow the container, they shrink
// proportionally to their weight, with each child scrolling internally if
// its share is too small for its content.
//
// Usage:
//   <ProportionalStack direction="column">
//     <ProportionalItem weight={1}>...</ProportionalItem>
//     <ProportionalItem weight={3}>...</ProportionalItem>
//     <ProportionalItem weight={2}>...</ProportionalItem>
//   </ProportionalStack>
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import "./Layout.css";

export interface ProportionalStackProps
  extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Lay children out vertically (column) or horizontally (row). Default `column`. */
  direction?: "column" | "row";
  /** Gap between items. Default `sm` (8px). */
  gap?: "xs" | "sm";
  /**
   * When the row's fixed-weight (weight={0}) items alone already exceed the
   * container — e.g. a toolbar of icon buttons growing over time, sitting
   * beside a weight>0 item whose own content has an unavoidable floor (a
   * single long unbreakable chip/word) — weight>0 items shrinking toward 0
   * still isn't enough, and the fixed items (which never shrink; that's
   * their contract) get clipped past the container edge instead of clamped.
   * `wrap` is the escape valve: once the row can't fit at min-content, it
   * wraps onto additional lines instead of clipping. Default false (a
   * direction="column" stack has no meaningful row-wrap equivalent, so this
   * only affects direction="row").
   */
  wrap?: boolean;
  /**
   * A `direction="row"` stack defaults to `height: auto` (see the CSS
   * comment) — right for a toolbar row sized to its own content among
   * column siblings, wrong for a row whose CONTENT should itself be
   * bounded by the remaining space (e.g. large images that need to scale
   * DOWN to fit rather than pushing the page taller). `fillHeight` opts a
   * row into `flex: 1 1 0; min-height: 0` instead — it then fills
   * whatever space its own flex-column parent has left over after its
   * other children, and its ProportionalItem children's `min-height: 0`
   * (already unconditional) lets THEIR content shrink to fit that
   * bounded height rather than overflow it. Ignored for `direction`
   * `"column"`, which is already `height: 100%` unconditionally.
   */
  fillHeight?: boolean;
}

export const ProportionalStack: Component<ProportionalStackProps> = (
  rawProps,
) => {
  const props = mergeProps(
    { direction: "column" as const, gap: "sm" as const, wrap: false, fillHeight: false },
    rawProps,
  );
  const [local, others] = splitProps(props, [
    "direction",
    "gap",
    "wrap",
    "fillHeight",
    "class",
    "children",
  ]);
  const classes = () => {
    const cls = [
      "proportional-stack",
      `proportional-stack--${local.direction}`,
      `proportional-stack--gap-${local.gap}`,
    ];
    if (local.wrap && local.direction === "row") cls.push("proportional-stack--wrap");
    if (local.fillHeight && local.direction === "row") cls.push("proportional-stack--fill-height");
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  };
  return (
    <div class={classes()} {...others}>
      {local.children}
    </div>
  );
};

export interface ProportionalItemProps
  extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Relative weight. The proportions of weights determine how items share the
   *  container when over-allocated. Default 1. */
  weight?: number;
  /** Allow internal scroll when this item's share is too small for its content. Default true. */
  scrollWhenSmall?: boolean;
  /** Caps how far this item grows, in character units (`ch`) — e.g. a name
   *  field that should stop competing for space once it reaches a readable
   *  length, handing any further leftover space to its siblings. Omit for
   *  no cap. Ignored when `weight` is 0 (already fixed to its content). */
  maxWidthCh?: number;
}

export const ProportionalItem: Component<ProportionalItemProps> = (
  rawProps,
) => {
  const props = mergeProps({ weight: 1, scrollWhenSmall: true }, rawProps);
  const [local, others] = splitProps(props, [
    "weight",
    "scrollWhenSmall",
    "maxWidthCh",
    "class",
    "style",
    "children",
  ]);
  const classes = () => {
    const cls = ["proportional-item"];
    if (local.scrollWhenSmall) cls.push("proportional-item--scroll");
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  };
  // `flex: <grow> 1 0` — grow proportional to weight, basis 0 so the weights
  // determine share regardless of content size. Each item then min-height: 0
  // + overflow: auto so its content scrolls if its share is too small. Caller
  // can pass `weight={0}` for header-style fixed-content items.
  const flex = () =>
    local.weight === 0 ? "0 0 auto" : `${local.weight} 1 0px`;
  const baseStyle: JSX.CSSProperties = { flex: flex() };
  if (local.maxWidthCh != null && local.weight !== 0) {
    baseStyle["max-width"] = `${local.maxWidthCh}ch`;
  }
  return (
    <div
      class={classes()}
      style={
        typeof local.style === "string"
          ? local.style
          : { ...baseStyle, ...local.style }
      }
      {...others}
    >
      {local.children}
    </div>
  );
};
