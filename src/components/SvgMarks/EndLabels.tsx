// ============================================
// EndLabels — Primitive (Depth 1). SVG mark; composes no library components.
// Owns SvgMarks.css (the label faces).
//
// A LEAD label at the left of the box it is handed and a TRAIL label at its
// right, on the box's vertical middle — `#3 … $33.8k` on a bar. When both do
// not fit, the trail goes first; when even the lead does not fit, nothing is
// drawn (`fitEndLabels`). The face is monospace, so the fit is a character
// count times `glyph`. Colour is data, so a label reads on any fill.
// ============================================
import { type Component, Show, mergeProps } from "solid-js";
import { type SvgBox, fitEndLabels } from "./geometry";
import "./SvgMarks.css";

export interface EndLabelsProps {
  readonly box: SvgBox;
  readonly lead?: string | null;
  readonly trail?: string | null;
  /** Text paint. */
  readonly color: string;
  /** Width of one character at the label size. Default 7 (11.5px monospace). */
  readonly glyph?: number;
}

export type EndLabelsOverrides = Pick<EndLabelsProps, "glyph">;
export type EndLabelsDataProps = Omit<EndLabelsProps, keyof EndLabelsOverrides>;

export const EndLabels: Component<EndLabelsProps> = (raw) => {
  const props = mergeProps({ glyph: 7 }, raw);
  const fit = () =>
    fitEndLabels(
      props.box,
      props.lead ?? null,
      props.trail ?? null,
      props.glyph,
    );
  return (
    <g class="sui-end-labels">
      <Show when={fit().lead}>
        {(t) => (
          <text
            class="sui-end-labels__text sui-end-labels__text--lead"
            x={t().x}
            y={t().y}
            fill={props.color}
          >
            {t().text}
          </text>
        )}
      </Show>
      <Show when={fit().trail}>
        {(t) => (
          <text
            class="sui-end-labels__text sui-end-labels__text--trail"
            x={t().x}
            y={t().y}
            fill={props.color}
          >
            {t().text}
          </text>
        )}
      </Show>
    </g>
  );
};

export function createEndLabels(
  defaults: Partial<EndLabelsOverrides>,
): Component<EndLabelsDataProps> {
  return (props) => <EndLabels {...mergeProps(defaults, props)} />;
}
