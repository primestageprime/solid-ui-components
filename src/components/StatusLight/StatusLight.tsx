// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// StatusLight — Atomic (Depth 1)
// Owns CSS (StatusLight.css), no component imports.
// Small colored indicator dot, optionally pulsing for liveness/keepalive.
// Factory: createStatusLight().
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import "./StatusLight.css";

export type StatusLightVariant =
  | "success" // green — alive / healthy
  | "warning" // amber — degraded / aging
  | "danger" //  red   — dead / failed
  | "info" //    blue  — informational
  | "idle"; //   gray  — inactive / off

export type StatusLightSize = "sm" | "md" | "lg";

export interface StatusLightProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusLightVariant;
  size?: StatusLightSize;
  /** Animate as a slow keepalive pulse. Use when the source is reporting fresh heartbeats. */
  pulse?: boolean;
  /** Optional inline label rendered to the right of the dot. */
  label?: string;
}

export const StatusLight: Component<StatusLightProps> = (props) => {
  const [local, others] = splitProps(props, [
    "variant",
    "size",
    "pulse",
    "label",
    "class",
    "children",
  ]);

  const variant = () => local.variant ?? "idle";
  const size = () => local.size ?? "md";

  const wrapperClass = () => {
    const cls = ["sui-status-light"];
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  };

  const dotClass = () => {
    const cls = [
      "sui-status-light__dot",
      `sui-status-light__dot--${variant()}`,
      `sui-status-light__dot--${size()}`,
    ];
    if (local.pulse) cls.push("sui-status-light__dot--pulse");
    return cls.join(" ");
  };

  const content = () => local.children ?? local.label;

  return (
    <span class={wrapperClass()} {...others}>
      <span class={dotClass()} aria-hidden="true" />
      {content() ? (
        <span class="sui-status-light__label">{content()}</span>
      ) : null}
    </span>
  );
};

/** Props that are visual overrides — locked at variant-definition time. */
export type StatusLightOverrides = Pick<StatusLightProps, "size">;

/** Props that remain available to consumers of a curried StatusLight variant.
 *
 * `variant` and `pulse` stay public because they typically reflect runtime
 * state (e.g. derived from a connection's health on each render) rather than
 * a fixed visual choice. Curry only `size` (and any inline styling) at
 * variant-definition time.
 */
export type StatusLightDataProps = Omit<
  StatusLightProps,
  keyof StatusLightOverrides
>;

export function createStatusLight(
  defaults: Partial<Omit<StatusLightProps, "children">>,
): Component<StatusLightDataProps> {
  return (props) => <StatusLight {...mergeProps(defaults, props)} />;
}
