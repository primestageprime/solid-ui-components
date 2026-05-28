// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ResultPanel — Composite (Depth 2, zero CSS).
// Composes ResultDisplay (Atomic Primitive, Depth 1) +
// FormulaProvider (from MathFormula, Atomic) + NarrowStack
// (Layout Curried Variant).
// ============================================
import { JSX, splitProps, Show } from "solid-js";
import { FormulaProvider } from "../MathFormula/MathFormula";
import { ResultDisplay } from "./ResultDisplay";
import { NarrowStack } from "../Layout/variants";

export interface ResultPanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Panel heading (e.g., "NOx Result", "ROG Result") */
  label: string;
  /** Right-aligned sublabel (e.g., "Limit: 2.8 g/kWh") */
  sublabel?: string;
  /** The result value to display */
  value: string | number | JSX.Element;
  /** Units label (e.g., "g/kWh") */
  units?: string;
  /** Color for the value text */
  valueColor?: string;
  /** Badge or link element shown after the value */
  badge?: JSX.Element;
  /** Variables table and/or formula content */
  children?: JSX.Element;
  /** Wraps content in FormulaProvider for interactive formula highlighting (default: true) */
  formulaProvider?: boolean;
}

export function ResultPanel(props: ResultPanelProps) {
  const [local, others] = splitProps(props, [
    "label",
    "sublabel",
    "value",
    "units",
    "valueColor",
    "badge",
    "children",
    "formulaProvider",
    "class",
  ]);

  const useFormulaProvider = () => local.formulaProvider !== false;

  const content = () => (
    <NarrowStack class={local.class} {...others}>
      <ResultDisplay
        label={local.label}
        sublabel={local.sublabel}
        value={local.value}
        units={local.units}
        valueColor={local.valueColor}
        badge={local.badge}
      />
      {local.children}
    </NarrowStack>
  );

  return (
    <Show when={useFormulaProvider()} fallback={content()}>
      <FormulaProvider>
        {content()}
      </FormulaProvider>
    </Show>
  );
}
