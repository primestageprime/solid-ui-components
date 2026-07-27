// BucketQueue — "what gets selected next" after a transfer.
//
// The component's working assumption is a TRIAGE loop: one bucket is the queue
// you work, and each item leaves it for a terminal bucket. When the item you
// were looking at leaves, keeping it selected strands you on a row you just
// finished — so the selection advances to the next item still waiting in the
// SOURCE bucket, and CLEARS when that bucket is emptied.
//
// Pure: the caller supplies the source bucket's ordering before the move and
// its membership after, and gets back what should happen to the selection.

export interface AdvanceInput {
  /** The currently selected key, if any. */
  selectedKey: string | undefined;
  /** The SOURCE bucket's item keys, in order, as they were BEFORE the move. */
  before: readonly string[];
  /** The SOURCE bucket's item keys AFTER the move. Membership, not order —
   *  the successor is chosen from `before`'s ordering, which is the order the
   *  user was reading. Anything that left in this batch, or was dropped from
   *  `items` outright, is simply absent, so a multi-item move can never advance
   *  onto a row that also departed. */
  after: ReadonlySet<string>;
}

/**
 * What should happen to the selection. Three OUTCOMES, not one nullable key:
 * "the queue drained, select nothing" and "this move is none of your business"
 * are different answers, and a caller that has to distinguish them from a bare
 * `string | null` would be re-deriving the logic this function exists to own.
 */
export type Advance =
  /** Nothing relevant moved — leave the selection exactly where it is. */
  | { readonly kind: "keep" }
  /** Advance the selection to this key. */
  | { readonly kind: "select"; readonly key: string }
  /** The bucket being worked is now empty. Nothing is left to select, so the
   *  consumer should clear its selection and show its own "queue empty" state. */
  | { readonly kind: "clear" };

const KEEP: Advance = { kind: "keep" };

/**
 * Decide what a transfer does to the selection.
 *
 * `keep` covers every case where the user's row was untouched: no selection, a
 * selection that lived in a different bucket, and a selection that did not
 * actually move. `clear` is returned only when the selected item left and took
 * the last row of its bucket with it.
 */
export const advanceSelection = ({
  selectedKey,
  before,
  after,
}: AdvanceInput): Advance => {
  if (selectedKey == null) return KEEP;
  const idx = before.indexOf(selectedKey);
  // Not in this bucket, or still in it — either way the user's row did not
  // leave the queue they are working, so nothing should move.
  if (idx < 0 || after.has(selectedKey)) return KEEP;
  // Forward first: the next item still waiting is the one the user would have
  // reached next anyway.
  const forward = before.slice(idx + 1).find((key) => after.has(key));
  if (forward != null) return { kind: "select", key: forward };
  // The processed item was at the tail, so fall BACK to the nearest survivor
  // above it rather than jumping to the top of the queue.
  const backward = before.slice(0, idx).reverse().find((key) => after.has(key));
  return backward != null ? { kind: "select", key: backward } : { kind: "clear" };
};
