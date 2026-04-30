// ============================================
// StatusLight — Atomic (Depth 1)
// Owns CSS (StatusLight.css), no component imports.
// Small colored indicator dot, optionally pulsing for liveness/keepalive.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
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
      {content() ? <span class="sui-status-light__label">{content()}</span> : null}
    </span>
  );
};
