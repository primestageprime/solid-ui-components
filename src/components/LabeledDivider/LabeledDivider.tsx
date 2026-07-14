// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// LabeledDivider — Atomic Primitive (Depth 1)
// Owns CSS (LabeledDivider.css). Renders a
// horizontal rule with a centered text label —
// lines on either side via ::before/::after.
// Factory: createLabeledDivider().
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import { ClusterRow, GrowBox } from "../Layout/variants";
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
  const [local, others] = splitProps(props, ["label", "class", "aria-label"]);

  return (
    // The row + flanking rule lines are composed from Layout: ClusterRow lays
    // out the center-aligned row (8px gap), and two GrowBox rule lines fill the
    // space on either side of the label (replacing the former ::before/::after
    // flex:1 pseudo-elements per Peter ruling 1).
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: decorative titled divider — aria-label gives AT a name when `label` is non-text JSX; role="separator" is rejected because Biome treats every separator as an adjustable window-splitter (forcing focus + aria-valuenow), which this non-interactive divider is not.
    <ClusterRow
      class={clsx("sui-labeled-divider", local.class)}
      aria-label={local["aria-label"] ?? labelAsString(local.label)}
      {...others}
    >
      <GrowBox class="sui-labeled-divider__rule" aria-hidden="true" />
      <span class="sui-labeled-divider__label">{local.label}</span>
      <GrowBox class="sui-labeled-divider__rule" aria-hidden="true" />
    </ClusterRow>
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
