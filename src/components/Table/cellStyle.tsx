/* Table cell renderers — shared infrastructure.
 *
 * The base CellRendererProps type, style options, and the two styling HOCs
 * (withCellStyle, withValueColor) shared by every cell renderer module. */
import type { Component, JSX } from "solid-js";

// ============================================
// Cell Renderer Types
// ============================================

export interface CellRendererProps<T = unknown> {
  value: T;
  row?: unknown;
}

// ============================================
// Styled Cell Factory
// ============================================

/** Style options for curried cell renderers */
export interface CellStyleOptions {
  fontSize?: string;
  color?: string;
  fontWeight?: string | number;
  textAlign?: "left" | "center" | "right";
  className?: string;
}

/**
 * Factory to create a styled version of any cell renderer.
 * Preserves SolidJS reactivity - props flow through to the base component.
 *
 * @example
 * // Define styled variants once
 * const SmallDate = withCellStyle(DateCell, { fontSize: "0.75rem" });
 * const AccentFloat = withCellStyle(FloatCell, { color: "#00d4ff", textAlign: "right" });
 *
 * // Use in tables - updating the definition updates all usages
 * <SmallDate value={row.created_at} />
 * <AccentFloat value={row.amount} />
 */
export function withCellStyle<P extends CellRendererProps<unknown>>(
  BaseCell: Component<P>,
  styleOptions: CellStyleOptions,
): Component<P> {
  return (props: P) => {
    const style: JSX.CSSProperties = {
      "font-size": styleOptions.fontSize,
      color: styleOptions.color,
      "font-weight": styleOptions.fontWeight,
      "text-align": styleOptions.textAlign,
    };

    return (
      <span style={style} class={styleOptions.className}>
        <BaseCell {...props} />
      </span>
    );
  };
}

/**
 * Factory to create a cell with dynamic coloring based on value.
 * The color function receives the value and returns a color string (or undefined for default).
 *
 * @example
 * // Color based on threshold
 * const NoxCell = withValueColor(FloatCell, (v) => v > 2.8 ? "#ff6b6b" : undefined, { textAlign: "right" });
 *
 * // Color based on ranges
 * const ScoreCell = withValueColor(IntCell, (v) => {
 *   if (v >= 90) return "#00ff88";  // green
 *   if (v >= 70) return "#ffaa00";  // yellow
 *   return "#ff6b6b";               // red
 * });
 */
export function withValueColor<V, P extends CellRendererProps<V>>(
  BaseCell: Component<P>,
  colorFn: (value: V) => string | undefined,
  baseStyles?: Omit<CellStyleOptions, "color">,
): Component<P> {
  return (props: P) => {
    const color = () => colorFn(props.value);
    const style = (): JSX.CSSProperties => ({
      "font-size": baseStyles?.fontSize,
      color: color(),
      "font-weight": baseStyles?.fontWeight,
      "text-align": baseStyles?.textAlign,
    });

    return (
      <span style={style()} class={baseStyles?.className}>
        <BaseCell {...props} />
      </span>
    );
  };
}
