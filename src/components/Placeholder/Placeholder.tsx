// Placeholder — a themed "fill me in" box for section/tile SKELETONS during the
// sections-first build phase (COMMANDMENTS #16/#17), before real content lands.
// Composite (Depth 2, owns CSS) — composes CenteredStack (Layout) + TextSublabel.
//
// Two behavior axes let a skeleton show how pieces will ARRANGE before real
// components exist:
//   • width  — `fit` shrinkwraps to its label · `fill` expands to its container.
//   • lines  — `single` is a one-line chip/bar · `multi` is a taller block.
// Plus tile `size` presets (sm/md/lg min-height) for dashboard tiles.
//
// All of these are COMPILE-TIME config → use the curried variants (variants.ts:
// FitPlaceholder / FillPlaceholder / BlockPlaceholder + Small/Medium/Large).
// The raw props on the base are escape hatches only. Centering comes from the
// composed CenteredStack; the box owns only appearance + width/min-height
// (no flex/grid geometry) — layout purity.
import type { Component } from "solid-js";
import { CenteredStack } from "../Layout";
import { TextSublabel } from "../Text";
import "./Placeholder.css";

export type PlaceholderSize = "sm" | "md" | "lg";

export interface PlaceholderProps {
  /** What content will eventually fill this area. */
  label: string;
  /** Tile min-height preset (fills width). Escape hatch — prefer Small/Medium/LargePlaceholder. */
  size?: PlaceholderSize;
  /** Shrinkwrap to the label's width (else fill the container). Escape hatch. */
  fit?: boolean;
  /** Allow a taller, wrapping block (else a single line). Escape hatch. */
  multiline?: boolean;
}

export const Placeholder: Component<PlaceholderProps> = (props) => {
  const cls = () => {
    const c = ["sui-placeholder"];
    if (props.size) {
      c.push("sui-placeholder--fill", `sui-placeholder--${props.size}`);
    } else {
      c.push(props.fit ? "sui-placeholder--fit" : "sui-placeholder--fill");
      c.push(
        props.multiline === false
          ? "sui-placeholder--line"
          : "sui-placeholder--block",
      );
    }
    return c.join(" ");
  };
  return (
    <CenteredStack class={cls()}>
      <TextSublabel>{props.label}</TextSublabel>
    </CenteredStack>
  );
};

/** Props a curried Placeholder variant still exposes (data only). */
export type PlaceholderDataProps = Pick<PlaceholderProps, "label">;

/** Bake the compile-time shape (size/fit/multiline) into a named variant. */
export function createPlaceholder(
  defaults: Omit<PlaceholderProps, "label">,
): Component<PlaceholderDataProps> {
  return (props) => <Placeholder {...defaults} label={props.label} />;
}
