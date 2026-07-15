// ============================================
// ChartHeader — Composed (Depth 2)
// Owns zero CSS. The standard chart title strip: mono title in accent
// on the left, muted meta readout on the right, spread across the top
// of a chart. Born from CompletionTimeline's header (the last inline-
// style cluster in src); the anatomy is the expected top edge of every
// chart page. All styling lives in component-local curried variants
// (set once here, never at call sites) — the call site passes data:
//
//   <ChartHeader title="Completion Timeline" meta={`${n} in window`} />
// ============================================
import type { Component, JSX } from "solid-js";
import { createRow } from "../Layout/Row";
import { createText } from "../Text/Text";

const HeaderRow = createRow({
  align: "center",
  justify: "between",
  style: { padding: "0 8px 4px" },
});

const mono = { "font-family": "var(--sui-font-mono)", "font-size": "11px" };

const HeaderTitle = createText({
  variant: "sublabel",
  style: { ...mono, color: "var(--sui-accent)", "font-weight": "600" },
});

const HeaderMeta = createText({
  variant: "sublabel",
  style: mono,
});

export interface ChartHeaderProps {
  /** Chart name, rendered mono/accent on the left. */
  title: JSX.Element;
  /** Trailing readout (counts, window, units), muted on the right. */
  meta?: JSX.Element;
}

export const ChartHeader: Component<ChartHeaderProps> = (props) => (
  <HeaderRow>
    <HeaderTitle>{props.title}</HeaderTitle>
    <HeaderMeta>{props.meta}</HeaderMeta>
  </HeaderRow>
);
