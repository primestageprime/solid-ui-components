// ============================================
// LabelStrip — Composite (Depth 2, zero CSS)
// Composes NameInput. The name of a line: one input, one string. A consumer
// writes that same string wherever its shape keeps a label.
// Factory: createLabelStrip({ label }) for the caption.
// ============================================
import { type Component, mergeProps } from "solid-js";
import { NameInput } from "../Inputs";

export interface LabelStripProps {
  /** The name. */
  value: string;
  onChange: (value: string) => void;
  /** The caption over the input (default "Label"). */
  label?: string;
}

export type LabelStripOverrides = Pick<LabelStripProps, "label">;
export type LabelStripDataProps = Omit<LabelStripProps, keyof LabelStripOverrides>;

const LabelStripBase: Component<LabelStripProps> = (props) => (
  <NameInput
    label={props.label ?? "Label"}
    value={props.value}
    onInput={(e) => props.onChange(e.currentTarget.value)}
  />
);

export function createLabelStrip(
  defaults: LabelStripOverrides,
): Component<LabelStripDataProps> {
  return (props) => <LabelStripBase {...mergeProps(defaults, props)} />;
}
