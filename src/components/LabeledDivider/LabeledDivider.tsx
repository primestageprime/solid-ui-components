// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// LabeledDivider — Atomic Primitive (Depth 1)
// Owns CSS (LabeledDivider.css). Renders a
// horizontal rule with a centered text label —
// lines on either side via ::before/::after.
// Factory: createLabeledDivider().
// ============================================
import { Component, JSX, mergeProps, splitProps } from "solid-js";
import "./LabeledDivider.css";

export interface LabeledDividerProps
  extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Centered label between the two rule segments. */
  label?: JSX.Element;
  /** ARIA label for the outer divider — defaults to the string form of `label`. */
  "aria-label"?: string;
}

const clsx = (...parts: (string | false | undefined)[]): string =>
  parts.filter((p): p is string => Boolean(p)).join(" ");

const labelAsString = (label: JSX.Element | undefined): string | undefined =>
  typeof label === "string" ? label : undefined;

export const LabeledDivider: Component<LabeledDividerProps> = (props) => {
  const [local, others] = splitProps(props, [
    "label",
    "class",
    "aria-label",
  ]);

  return (
    <div
      class={clsx("sui-labeled-divider", local.class)}
      aria-label={local["aria-label"] ?? labelAsString(local.label)}
      {...others}
    >
      <span class="sui-labeled-divider__label">{local.label}</span>
    </div>
  );
};

/** No visual overrides today — kept for future-symmetry with other Primitives. */
export type LabeledDividerOverrides = Record<string, never>;

/** All props remain available to consumers of a curried variant. */
export type LabeledDividerDataProps = LabeledDividerProps;

export function createLabeledDivider(
  defaults: Partial<Omit<LabeledDividerProps, "children">>,
): Component<LabeledDividerDataProps> {
  return (props) => <LabeledDivider {...mergeProps(defaults, props)} />;
}
