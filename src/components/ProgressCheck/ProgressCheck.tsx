// ============================================
// ProgressCheck — Atomic (Depth 1)
// Owns CSS (ProgressCheck.css), imports Icon types.
// Three-state progress indicator: empty, partial, complete.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import type { IconSize } from "../Icon/Icon";
import "./ProgressCheck.css";

export interface ProgressCheckProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** 0 to 1. 0 = empty checkbox, 0<x<1 = partial fill, 1 = green check. */
  progress: number;
  size?: IconSize;
}

export const ProgressCheck: Component<ProgressCheckProps> = (props) => {
  const [local, others] = splitProps(props, ["progress", "size", "class"]);

  const classes = () => {
    const cl = ["sui-progress-check"];
    cl.push(`sui-progress-check--${local.size || "sm"}`);
    if (local.class) cl.push(local.class);
    return cl.join(" ");
  };

  const svgContent = () => {
    const p = local.progress;
    if (p <= 0) {
      // Empty checkbox — rounded square outline
      return `<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.4"/>`;
    }
    if (p >= 1) {
      // Complete — green circle with check
      return `<circle cx="8" cy="8" r="7" fill="var(--sui-color-success, #00c853)"/>
              <path d="M5 8L7 10.5L11 5.5" stroke="var(--sui-bg-primary, #1a1a2e)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    }
    // Partial — square with rising fill
    const fillHeight = Math.round(p * 12);
    const fillY = 14 - fillHeight;
    return `<defs><clipPath id="pc-clip"><rect x="2" y="2" width="12" height="12" rx="2"/></clipPath></defs>
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.4"/>
            <rect x="2" y="${fillY}" width="12" height="${fillHeight}" clip-path="url(#pc-clip)" fill="var(--sui-color-warning, #ffab00)" opacity="0.6"/>`;
  };

  return (
    <span
      class={classes()}
      role="img"
      aria-label={`${Math.round(local.progress * 100)}% complete`}
      innerHTML={`<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">${svgContent()}</svg>`}
      {...others}
    />
  );
};
