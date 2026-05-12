// ============================================
// Legend — Atomic (Depth 1)
// Owns CSS (Legend.css), no component imports.
//
// A row (or column) of color-swatch + label pairs. Data-driven: the caller
// supplies any { color, label } list and we render it. Use to explain which
// color represents which thing in a chart, heatmap, dot-chart, or any other
// color-encoded visualisation. The component is domain-agnostic — alarm
// statuses, chart series, category tiers, severity buckets, etc.
//
// The `color` prop on each item is the only place a caller-supplied value
// is applied via inline style (on the swatch element's background-color).
// All layout/spacing/typography is owned by the stylesheet.
// ============================================
import { Component, For, JSX, mergeProps, splitProps } from "solid-js";
import "./Legend.css";

export interface LegendItem {
  /** CSS color string applied to the swatch (any valid CSS color). */
  color: string;
  /** Human-readable label rendered next to the swatch. */
  label: string;
}

export interface LegendProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "class"> {
  /** Items to render. Order is preserved. */
  items: LegendItem[];
  /** Layout direction. Default `"horizontal"` (wraps on overflow). */
  orientation?: "horizontal" | "vertical";
  /**
   * Swatch edge length. Numbers are treated as px. Default comes from CSS
   * (`--sui-legend-swatch-size`, 12px) so leave this unset for the common
   * case.
   */
  swatchSize?: number | string;
  /** Optional class appended to the wrapper for caller-side overrides. */
  class?: string;
}

const toSizeValue = (size: number | string): string =>
  typeof size === "number" ? `${size}px` : size;

export const Legend: Component<LegendProps> = (rawProps) => {
  const props = mergeProps(
    { orientation: "horizontal" as const },
    rawProps,
  );
  const [local, others] = splitProps(props, [
    "items",
    "orientation",
    "swatchSize",
    "class",
    "style",
  ]);

  const wrapperClass = (): string =>
    ["sui-legend", `sui-legend--${local.orientation}`, local.class]
      .filter(Boolean)
      .join(" ");

  const wrapperStyle = (): JSX.CSSProperties | string | undefined => {
    if (local.swatchSize === undefined) return local.style;
    const sizeVar: JSX.CSSProperties = {
      "--sui-legend-swatch-size": toSizeValue(local.swatchSize),
    };
    if (typeof local.style === "string") {
      return `--sui-legend-swatch-size:${toSizeValue(local.swatchSize)};${local.style}`;
    }
    return { ...sizeVar, ...local.style };
  };

  return (
    <div
      class={wrapperClass()}
      style={wrapperStyle()}
      role="list"
      {...others}
    >
      <For each={local.items}>
        {(item) => (
          <div class="sui-legend__item" role="listitem">
            <span
              class="sui-legend__swatch"
              style={{ "background-color": item.color }}
              aria-hidden="true"
            />
            <span class="sui-legend__label">{item.label}</span>
          </div>
        )}
      </For>
    </div>
  );
};
