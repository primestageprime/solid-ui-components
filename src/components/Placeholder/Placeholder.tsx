// Placeholder — a themed "fill me in" box for section/tile SKELETONS during the
// sections-first build phase (COMMANDMENTS #16/#17), before real content lands.
// Composite (Depth 2, owns CSS) — composes CenteredStack (Layout) + TextSublabel.
//
// Two behavior axes let a skeleton show how pieces will ARRANGE before real
// components exist:
//   • width — `fit` shrinkwraps to its label · `fill` expands to its container.
//   • lines — `single` is a one-line chip/bar, a fixed height; `multi` is an
//     open BLOCK — and a block, by definition, has no natural height of its
//     own, so it always grows to fill remaining space in a flex column
//     (`flex:1; min-height:0`) instead of settling at a fixed min-height.
//     This is inherent to what "block" means, not a separate opt-in.
// Plus tile `size` presets (sm/md/lg FIXED min-height) for grid tiles, which
// deliberately do NOT grow — a dashboard tile has a size, a content block doesn't.
//
// All of these are COMPILE-TIME config → use the curried variants (variants.ts:
// FitPlaceholder / FillPlaceholder / BlockPlaceholder + Small/Medium/Large).
// The raw props on the base are escape hatches for SUI's OWN curried-variant
// factories only — never for call sites. There is no `class`/`style` prop; a
// call site that needs a shape this file doesn't have gets a new named variant
// here, not a way to override this one from outside. Centering comes from the
// composed CenteredStack; the box owns only appearance + width/min-height/flex
// (no grid geometry) — layout purity.
import type { Component } from "solid-js";
import { CenteredStack } from "../Layout";
import { TextSublabel } from "../Text";
import "./Placeholder.css";

export type PlaceholderSize = "sm" | "md" | "lg";

export interface PlaceholderProps {
  /** What content will eventually fill this area. */
  label: string;
  /** Tile min-height preset (fills width, fixed height — does not grow). Escape hatch — prefer Small/Medium/LargePlaceholder. */
  size?: PlaceholderSize;
  /** Shrinkwrap to the label's width (else fill the container). Escape hatch. */
  fit?: boolean;
  /** Allow a taller, wrapping block that grows to fill remaining space (else a fixed-height single line). Escape hatch. */
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
