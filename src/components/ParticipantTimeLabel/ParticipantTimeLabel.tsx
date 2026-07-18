// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ParticipantTimeLabel — Atomic Primitive (Depth 1)
// Owns CSS (ParticipantTimeLabel.css). Renders
// the relative-time caption shown beside a
// participant name in a message-group header.
//
// Factory: createParticipantTimeLabel().
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import "./ParticipantTimeLabel.css";
import { pipe, filter, join } from "../../fn";

export interface ParticipantTimeLabelProps
  extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Tooltip text — typically the full absolute timestamp. */
  title?: string;
  children?: JSX.Element;
}

const clsx = (...parts: (string | false | undefined)[]): string =>
  pipe(
    parts,
    filter((p): p is string => Boolean(p)),
    join(" "),
  );

export const ParticipantTimeLabel: Component<ParticipantTimeLabelProps> = (
  props,
) => {
  const [local, others] = splitProps(props, ["title", "class", "children"]);

  return (
    <span
      class={clsx("sui-participant-time-label", local.class)}
      title={local.title}
      {...others}
    >
      {local.children}
    </span>
  );
};

/** No visual overrides today — kept for future-symmetry with other Primitives. */
export type ParticipantTimeLabelOverrides = Record<string, never>;

/** All props remain available to consumers of a curried variant. */
export type ParticipantTimeLabelDataProps = ParticipantTimeLabelProps;

export function createParticipantTimeLabel(
  defaults: Partial<Omit<ParticipantTimeLabelProps, "children">>,
): Component<ParticipantTimeLabelDataProps> {
  return (props) => <ParticipantTimeLabel {...mergeProps(defaults, props)} />;
}
