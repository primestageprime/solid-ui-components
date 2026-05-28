// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// StickyGroupHeader + SectionLabel — Atomic (Depth 1)
// Owns CSS (StickyGroupHeader.css), no component imports.
// StickyGroupHeader: a section divider that pins to the top of its scrolling
// ancestor (e.g. a long sidebar list grouped by status). Use to keep the
// group label visible as the user scrolls past its rows.
// SectionLabel: an uppercased, dimmed label used as section-divider typography.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import "./StickyGroupHeader.css";

export interface StickyGroupHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Vertical offset (px) from the scroll container's top. Default 0. */
  offset?: number;
}

export const StickyGroupHeader: Component<StickyGroupHeaderProps> = (props) => {
  const [local, others] = splitProps(props, ["offset", "class", "style", "children"]);
  const baseStyle = () => ({
    top: `${local.offset ?? 0}px`,
  });
  return (
    <div
      class={`sui-sticky-group-header${local.class ? " " + local.class : ""}`}
      style={
        typeof local.style === "string"
          ? local.style
          : { ...baseStyle(), ...local.style }
      }
      {...others}
    >
      {local.children}
    </div>
  );
};

export interface SectionLabelProps extends JSX.HTMLAttributes<HTMLSpanElement> {}

export const SectionLabel: Component<SectionLabelProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <span class={`sui-section-label${local.class ? " " + local.class : ""}`} {...others}>
      {local.children}
    </span>
  );
};
