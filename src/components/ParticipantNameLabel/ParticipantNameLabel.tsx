// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ParticipantNameLabel — Atomic Primitive (Depth 1)
// Owns CSS (ParticipantNameLabel.css). Renders
// the author-name pill shown above a message
// group. Typography (weight, size, nowrap) is
// fixed in CSS; per-participant `color` is a
// Data Prop and applied via inline style on
// the rendered span — the allowed location for
// data-driven inline style inside a Primitive.
//
// Factory: createParticipantNameLabel().
// ============================================
import {
  type Component,
  type JSX,
  mergeProps,
  splitProps,
} from "solid-js";
import "./ParticipantNameLabel.css";

export interface ParticipantNameLabelProps
  extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Per-participant accent color. CSS color string. */
  color?: string;
  children?: JSX.Element;
}

const clsx = (...parts: (string | false | undefined)[]): string =>
  parts.filter((p): p is string => Boolean(p)).join(" ");

export const ParticipantNameLabel: Component<ParticipantNameLabelProps> = (
  props,
) => {
  const [local, others] = splitProps(props, [
    "color",
    "class",
    "style",
    "children",
  ]);

  const rootClass = (): string =>
    clsx("sui-participant-name-label", local.class);

  const mergedStyle = (): JSX.CSSProperties | undefined => {
    const base =
      typeof local.style === "object" && local.style
        ? (local.style as JSX.CSSProperties)
        : undefined;
    if (!local.color) return base;
    return { ...(base ?? {}), color: local.color };
  };

  return (
    <span class={rootClass()} style={mergedStyle()} {...others}>
      {local.children}
    </span>
  );
};

/** No visual overrides today — kept for future-symmetry with other Primitives. */
export type ParticipantNameLabelOverrides = Record<string, never>;

/** All props remain available to consumers of a curried variant. */
export type ParticipantNameLabelDataProps = ParticipantNameLabelProps;

export function createParticipantNameLabel(
  defaults: Partial<Omit<ParticipantNameLabelProps, "children">>,
): Component<ParticipantNameLabelDataProps> {
  return (props) => <ParticipantNameLabel {...mergeProps(defaults, props)} />;
}
