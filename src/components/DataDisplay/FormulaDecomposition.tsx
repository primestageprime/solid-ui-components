// ============================================
// FormulaDecomposition — Depth 3 (zero CSS)
// Composes ResultDisplay (Depth 3) + DTable (Depth 2)
// + MathFormula (Atomic) + StatusBadge (Atomic)
// + Layout/Text curried variants.
// ============================================
import { Component, For, JSX } from "solid-js";
import { FormulaProvider, MathFormula, FormulaVarRow, useFormulaHighlight } from "../MathFormula/MathFormula";
import { ResultDisplay } from "./ResultDisplay";
import { NumberWithUnits } from "./NumberWithUnits";
import { DTable, DT, DD } from "../DataList/DataList";
import { StatusBadge } from "../Badge/StatusBadge";
import { NarrowStack } from "../Layout/variants";
import { Surface } from "../Surface/Surface";

// ============================================
// Types
// ============================================

export interface VarDef {
  /** Matches \var{id}{...} in LaTeX */
  id: string;
  /** Display name in givens table */
  label: string;
  /** e.g. "m", "kg" */
  units?: string;
  /** Decimal places, default 2 */
  precision?: number;
}

export interface FormulaConfig {
  /** Display label, e.g. "Hypotenuse" */
  label: string;
  /** Result units, e.g. "m", "J" */
  resultUnits: string;
  /** Ordered variable definitions */
  vars: VarDef[];
  /** Compliance threshold */
  threshold: number;
  /** Comparison operator (default "lte" = compliant when value <= threshold) */
  comparison?: "lt" | "lte" | "gt" | "gte";
  /** Decimal places for result, default 4 */
  resultPrecision?: number;
  /** Compute the result from variable values */
  compute: (v: Record<string, number>) => number;
  /** Generate LaTeX string; must include \var{result}{resultStr} for result highlighting */
  latex: (resultStr: string) => string;
}

// ============================================
// Helpers
// ============================================

interface FormulaValuesProps {
  values: Record<string, number>;
}

function computeResult(config: FormulaConfig, values: Record<string, number>): string {
  const precision = config.resultPrecision ?? 4;
  return config.compute(values).toFixed(precision);
}

function isCompliant(config: FormulaConfig, resultValue: number): boolean {
  const cmp = config.comparison ?? "lte";
  switch (cmp) {
    case "lt": return resultValue < config.threshold;
    case "lte": return resultValue <= config.threshold;
    case "gt": return resultValue > config.threshold;
    case "gte": return resultValue >= config.threshold;
  }
}

// ============================================
// createFormulaResult
// ============================================

export function createFormulaResult(config: FormulaConfig): Component<FormulaValuesProps> {
  return (props) => {
    const ctx = useFormulaHighlight();
    const resultStr = () => computeResult(config, props.values);
    const compliant = () => isCompliant(config, parseFloat(resultStr()));
    const isHighlighted = () => ctx?.hoveredVar() === "result";

    return (
      <ResultDisplay
        label={config.label}
        sublabel={`Threshold: ${config.threshold} ${config.resultUnits}`}
        value={resultStr()}
        units={config.resultUnits}
        valueColor={compliant() ? undefined : "#ff0040"}
        badge={
          <StatusBadge variant={compliant() ? "compliant" : "violation"}>
            {compliant() ? "COMPLIANT" : "VIOLATION"}
          </StatusBadge>
        }
        class={`formula-result ${isHighlighted() ? "formula-result--highlight" : ""}`}
        onMouseEnter={() => ctx?.setHoveredVar("result")}
        onMouseLeave={() => ctx?.setHoveredVar(null)}
      />
    );
  };
}

// ============================================
// createGivens
// ============================================

export function createGivens(config: FormulaConfig): Component<FormulaValuesProps> {
  return (props) => {
    return (
      <DTable>
        <For each={config.vars}>
          {(v) => {
            const precision = v.precision ?? 2;
            return (
              <FormulaVarRow varId={v.id}>
                <DT>{v.label}</DT>
                <DD highlight>
                  {v.units ? (
                    <NumberWithUnits value={props.values[v.id]} units={v.units} precision={precision} />
                  ) : (
                    props.values[v.id]?.toFixed(precision) ?? "\u2014"
                  )}
                </DD>
              </FormulaVarRow>
            );
          }}
        </For>
      </DTable>
    );
  };
}

// ============================================
// createFormula
// ============================================

export function createFormula(config: FormulaConfig): Component<FormulaValuesProps> {
  return (props) => {
    const resultStr = () => computeResult(config, props.values);
    const latex = () => config.latex(resultStr());
    return <MathFormula latex={latex()} />;
  };
}

// ============================================
// createFormulaPanel
// ============================================

interface FormulaPanelBundle {
  Result: Component<FormulaValuesProps>;
  Givens: Component<FormulaValuesProps>;
  Formula: Component<FormulaValuesProps>;
  Panel: Component<FormulaValuesProps & { class?: string; style?: JSX.CSSProperties }>;
}

export function createFormulaPanel(config: FormulaConfig): FormulaPanelBundle {
  const Result = createFormulaResult(config);
  const Givens = createGivens(config);
  const Formula = createFormula(config);

  const Panel: Component<FormulaValuesProps & { class?: string; style?: JSX.CSSProperties }> = (props) => {
    return (
      <FormulaProvider>
        <Surface padding="md" radius="md" class={props.class} style={props.style}>
          <NarrowStack>
            <Result values={props.values} />
            <Givens values={props.values} />
            <Formula values={props.values} />
          </NarrowStack>
        </Surface>
      </FormulaProvider>
    );
  };

  return { Result, Givens, Formula, Panel };
}
