// ============================================
// formula — the pure core of `FormulaCaption`: `× $125 = $1,000`.
//
// A caption that SHOWS ITS WORK: the factor applied to the operand and what it
// came to. The operand is not repeated — it is the figure the caption sits
// under. No Solid, no DOM.
// ============================================

export interface FormulaFormat {
  /** The sign between the operand and the factor. The result is always operand × factor. */
  readonly operator: string;
  readonly formatFactor?: (n: number) => string;
  readonly formatResult?: (n: number) => string;
}

/** `× $125 = $1,000`, or `null` when there is nothing to say. */
export const formulaText = (
  operand: number | null,
  factor: number | null,
  f: FormulaFormat,
): string | null =>
  operand === null || factor === null
    ? null
    : `${f.operator} ${(f.formatFactor ?? String)(factor)} = ${(f.formatResult ?? String)(operand * factor)}`;
