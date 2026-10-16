// ============================================
// Bare-accessor warning — Depth 0 (no imports).
//
// Canon (Peter, 2026-10-16): a table column always goes through a value
// renderer; a date never wraps. The health metric `bareAccessorColumns`
// catches `accessor: "key"` statically in this repo, but a CONSUMER's table
// is outside that walk. This is the runtime half: when a bare keyed accessor
// paints a string that looks like an ISO date or time, BaseTable warns once
// per column in dev mode, naming the helper to use. Dead-codes out of a
// production bundle behind `import.meta.env.DEV` at the call site.
// ============================================

/** `2026-01-15`, `2026-01-15 08:00`, `2026-01-15T08:00:00`, with optional
 *  seconds, fraction and zone — the shapes a bare accessor would paint raw. */
export const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** True for a string a date or dateTime column helper should be rendering. */
export const looksLikeIsoDateTime = (value: unknown): value is string =>
  typeof value === "string" && ISO_DATE_TIME.test(value);

/** Column ids already reported, so a re-render cannot spam the console. */
const warned = new Set<string>();

/** Forget every reported column (tests). */
export const resetBareAccessorWarnings = (): void => {
  warned.clear();
};

/**
 * Warn once that column `columnId` paints an ISO date/time through a bare
 * keyed accessor. Returns true when a warning was emitted (tests).
 */
export function warnBareDateAccessor(
  columnId: string,
  value: unknown,
): boolean {
  if (!looksLikeIsoDateTime(value)) return false;
  if (warned.has(columnId)) return false;
  warned.add(columnId);
  console.warn(
    `[SUI BaseTable] column "${columnId}" paints "${value}" through a bare ` +
      `accessor. Dates never wrap and always go through a value renderer: use ` +
      `dateTimeCol("${columnId}", header, { data, precision: "minute" }) or ` +
      `dateCol(...) from solid-ui-components so the column is sized to its data.`,
  );
  return true;
}
