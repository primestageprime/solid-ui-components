// ============================================
// InlineChartErrorOverlay — Atomic (Depth 1)
// Owns CSS (InlineChartErrorOverlay.css), no component imports.
// Overlay for chart areas with title and subtitle.
// ============================================
import { JSX, Show, splitProps } from "solid-js";
import "./InlineChartErrorOverlay.css";

export interface InlineChartErrorOverlayProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
}

export function InlineChartErrorOverlay(props: InlineChartErrorOverlayProps) {
  const [local, others] = splitProps(props, ["title", "subtitle", "class"]);

  const classes = () => {
    const cls = ["inline-chart-error-overlay"];
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      <div class="inline-chart-error-overlay__content">
        <div class="inline-chart-error-overlay__title">{local.title}</div>
        <Show when={local.subtitle}>
          <div class="inline-chart-error-overlay__subtitle">{local.subtitle}</div>
        </Show>
      </div>
    </div>
  );
}
