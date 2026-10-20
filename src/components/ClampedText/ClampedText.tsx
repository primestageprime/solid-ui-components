// ============================================
// ClampedText — Atomic (Depth 1)
// Tags: shows:text, does:truncate, data:text, role:inline
// Owns ClampedText.css; no component imports.
// A block of body text whose height follows its content between a minimum and
// a maximum number of lines. Short text holds the minimum; longer text grows to
// the maximum; past that the text scrolls inside the block instead of pushing
// the layout. Line counts ride two CSS variables read in `lh` units, so the box
// is exactly N lines at whatever type size is in force.
//   <ClampedText>{task.notes}</ClampedText>
// `lines` is a design decision, so it is locked in a curried variant:
// `ClampedText` is 1 to 6 lines; `createClampedText({ lines })` makes another.
// The pure core `clampLines` cleans a range and prints without a DOM.
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import "./ClampedText.css";

export interface ClampedTextLines {
  /** Lines the block always holds, even when empty. At least 1. */
  min: number;
  /** Lines the block grows to before it scrolls. At least `min`. */
  max: number;
}

export interface ClampedTextProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The line range. Locked by the curried variants. Default 1 to 6. */
  lines?: ClampedTextLines;
}

export const DEFAULT_CLAMP_LINES: ClampedTextLines = { min: 1, max: 6 };

/**
 * A usable line range from whatever was asked for: whole numbers, `min` at
 * least 1, `max` at least `min`. A missing or non-finite bound takes the default.
 */
export function clampLines(lines?: Partial<ClampedTextLines>): ClampedTextLines {
  const whole = (n: number | undefined, fallback: number) =>
    typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : fallback;
  const min = Math.max(1, whole(lines?.min, DEFAULT_CLAMP_LINES.min));
  const max = Math.max(min, whole(lines?.max, DEFAULT_CLAMP_LINES.max));
  return { min, max };
}

export const ClampedText: Component<ClampedTextProps> = (props) => {
  const [local, others] = splitProps(props, ["children", "class", "lines", "style"]);
  const classes = () =>
    local.class ? `sui-clamped-text ${local.class}` : "sui-clamped-text";
  // The two line counts are data, not presentation: they reach the CSS as variables.
  const vars = (): JSX.CSSProperties => {
    const { min, max } = clampLines(local.lines);
    return { "--sui-clamped-min": String(min), "--sui-clamped-max": String(max) };
  };
  const style = () =>
    typeof local.style === "object" ? { ...vars(), ...local.style } : vars();
  return (
    <div class={classes()} style={style()} {...others}>
      {local.children}
    </div>
  );
};

/** Presentational knobs — locked at variant-definition time. */
export type ClampedTextOverrides = Pick<ClampedTextProps, "lines">;

/** Props that remain available to consumers of a curried ClampedText variant. */
export type ClampedTextDataProps = Omit<ClampedTextProps, keyof ClampedTextOverrides>;

export function createClampedText(
  defaults: Partial<Omit<ClampedTextProps, "children">>,
): Component<ClampedTextDataProps> {
  return (props) => <ClampedText {...mergeProps(defaults, props)} />;
}
