// ============================================
// BusyOverlay — Composite (Depth 2)
// Owns CSS (BusyOverlay.css). Composes Icon + CenteredStack.
//
// The "this region is working on it" state for a region that already has
// content worth keeping on screen — an image being transformed, a chart
// being refetched, a panel mid-save. It anchors to its nearest positioned
// ancestor (the sibling pattern to InlineChartErrorOverlay, which does the
// same for a failure) and dims what's underneath rather than replacing it,
// so the thing you were looking at is still the thing you're looking at.
//
// Not a replacement for a progress bar: use this when there is no honest
// percentage to report (a single opaque round trip), and AsyncProgress or
// StackedProgressBar when there is.
// ============================================
import { type JSX, Show, splitProps } from "solid-js";
import { CenteredStack } from "../Layout/variants";
import { Icon } from "../Icon/Icon";
import "./BusyOverlay.css";

export interface BusyOverlayProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Short statement of what's happening — "Cropping", "Saving". Optional:
   *  a spinner alone is enough when the surrounding UI already says. */
  label?: string;
}

export function BusyOverlay(props: BusyOverlayProps) {
  const [local, others] = splitProps(props, ["label", "class"]);

  const classes = () => {
    const cls = ["sui-busy-overlay"];
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  };

  return (
    <CenteredStack
      class={classes()}
      // Announced politely rather than assertively: work starting is worth
      // saying, but not worth interrupting whatever a screen reader is
      // already in the middle of.
      role="status"
      aria-live="polite"
      aria-busy="true"
      {...others}
    >
      {/* `spinner` is the one icon name that animates itself — see Icon.tsx. */}
      <Icon name="spinner" size="xl" />
      <Show when={local.label}>
        <div class="sui-busy-overlay__label">{local.label}</div>
      </Show>
    </CenteredStack>
  );
}
