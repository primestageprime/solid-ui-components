// ============================================
// FormulaCaption — Composite (Depth 2). Composes Text (SteadyMonoMeta,
// ReservedMonoMeta); owns no CSS.
//
// A one-line caption that shows its work — `× $125 = $1,000` under an hours
// figure — built from Text atoms, so it reads like every other meta line. The
// stock DISPLAY for a pluggable caption slot (`GroupedMeasureAxis.caption`):
// the consumer adapts the slot's data to `operand`/`factor` in one line and
// passes the result in. With nothing to say it keeps its line, blank.
//
// Formatting is decided once, in the factory; the call site passes numbers.
// ============================================
import { type Component, Show, mergeProps } from "solid-js";
import { ReservedMonoMeta, SteadyMonoMeta } from "../Text";
import { type FormulaFormat, formulaText } from "./formula";

export interface FormulaCaptionProps extends Partial<FormulaFormat> {
  /** The figure the caption sits under. */
  readonly operand: number | null;
  /** What it is multiplied by. */
  readonly factor: number | null;
}

export type FormulaCaptionOverrides = Pick<
  FormulaCaptionProps,
  "operator" | "formatFactor" | "formatResult"
>;
export type FormulaCaptionDataProps = Omit<
  FormulaCaptionProps,
  keyof FormulaCaptionOverrides
>;

const NBSP = " ";

export const FormulaCaption: Component<FormulaCaptionProps> = (raw) => {
  const props = mergeProps({ operator: "×" }, raw);
  const text = () => formulaText(props.operand, props.factor, props);
  return (
    <Show when={text()} fallback={<ReservedMonoMeta>{NBSP}</ReservedMonoMeta>}>
      {(t) => <SteadyMonoMeta>{t()}</SteadyMonoMeta>}
    </Show>
  );
};

/**
 * @example
 *   const Cost = createFormulaCaption({ formatFactor: dollars, formatResult: dollars });
 *   const axes = [{ label: "Prep", caption: (p) => <Cost operand={p.value} factor={125} /> }];
 */
export function createFormulaCaption(
  defaults: Partial<FormulaCaptionOverrides>,
): Component<FormulaCaptionDataProps> {
  return (props) => <FormulaCaption {...mergeProps(defaults, props)} />;
}
