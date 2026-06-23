// ============================================
// BaselineDot — Atomic (Depth 1)
// Owns CSS (BaselineDot.css), no component imports.
// A tiny solid dot that marks a "baseline" selection — e.g. the scenario the
// chart draws as its blue running-balance line. Colour matches --sui-primary
// so it reads as the same series the chart line uses.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import "./BaselineDot.css";

export interface BaselineDotProps extends JSX.HTMLAttributes<HTMLSpanElement> {}

export const BaselineDot: Component<BaselineDotProps> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      class={`baseline-dot${local.class ? " " + local.class : ""}`}
      {...others}
    />
  );
};
