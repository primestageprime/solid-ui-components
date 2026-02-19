// ============================================
// StackedProgressBar — Atomic (Depth 1)
// Owns CSS (StackedProgressBar.css), no component imports.
// Multi-segment progress bar with horizontal/vertical orientation.
// ============================================
import { Component, JSX, splitProps, For, Show } from "solid-js";
import "./StackedProgressBar.css";

export interface StackedSegment {
  percentage: number;
  color: string;
}

export interface StackedProgressBarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  segments: StackedSegment[];
  direction?: "horizontal" | "vertical";
  label?: JSX.Element;
  background?: string;
}

export const StackedProgressBar: Component<StackedProgressBarProps> = (props) => {
  const [local, others] = splitProps(props, [
    "segments",
    "direction",
    "label",
    "background",
    "class",
    "style",
  ]);

  const isVertical = () => local.direction === "vertical";

  const classes = () => {
    const list = ["stacked-progress-bar"];
    if (isVertical()) list.push("stacked-progress-bar--vertical");
    if (local.class) list.push(local.class);
    return list.join(" ");
  };

  // Track cumulative offset for stacking
  const segmentsWithOffset = () => {
    let offset = 0;
    return local.segments
      .filter((s) => s.percentage > 0)
      .map((s) => {
        const seg = { ...s, offset };
        offset += s.percentage;
        return seg;
      });
  };

  return (
    <div
      class={classes()}
      style={{
        ...(typeof local.style === "object" ? local.style : {}),
        ...(local.background ? { background: local.background } : {}),
      }}
      {...others}
    >
      <For each={segmentsWithOffset()}>
        {(seg) => (
          <div
            class="stacked-progress-bar__segment"
            style={{
              [isVertical() ? "bottom" : "left"]: `${seg.offset}%`,
              [isVertical() ? "height" : "width"]: `${seg.percentage}%`,
              background: seg.color,
            }}
          />
        )}
      </For>
      <Show when={local.label}>
        <span class="stacked-progress-bar__label">{local.label}</span>
      </Show>
    </div>
  );
};
