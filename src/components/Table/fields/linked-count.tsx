// Table field — linked count (Depth 1: composes intCol + withHref).
// An integer count that drills into a worklist: a POSITIVE count links via
// `href`; zero or null renders the plain cell, never a dead link. The gate is
// a count SEMANTIC — a zero count has no destination — which is why this is a
// factory and not a per-call-site ternary (scoped exception to the 2026-07-20
// combinator-first ruling; spec: docs/superpowers/specs/
// 2026-07-20-linked-count-col-design.md).
// Everything else — geometry, IntCell formatting, numeric sort, null-blank,
// tone — is intCol's, untouched.
import { intCol } from "./int";
import { withHref } from "./combinators";
import {
  readerOf,
  type FieldCol,
  type ToneFn,
  type ValueSource,
} from "./shared";

export interface LinkedCountColOpts<T> {
  /** Drill-down destination for a POSITIVE count — required: a linked count
   *  without a destination is just intCol. */
  href: (row: T) => string;
  /** Header label (default: humanized id). */
  header?: string;
  /** Column id — REQUIRED when the source is a derived function. */
  id?: string;
  /** Configure-time treatment: (value, row) → Tone. */
  tone?: ToneFn<T, number>;
}

/** A whole-number drill-down column: count > 0 links via `href`; zero/null
 *  takes withHref's plain-cell path. */
export const linkedCountCol = <T,>(
  source: ValueSource<T, number | null | undefined>,
  opts: LinkedCountColOpts<T>,
): FieldCol<T> => {
  const read = readerOf(source);
  const drillHref = (row: T): string | null => {
    const value = read(row);
    return value != null && value > 0 ? opts.href(row) : null;
  };
  return withHref(
    drillHref,
    intCol(source, { header: opts.header, id: opts.id, tone: opts.tone }),
  );
};
