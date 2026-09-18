// ============================================
// PairedMutationSliders wording — private module, no Solid, no DOM.
//
// The same disposition as `MutationSliders/labels.ts`, and a SEPARATE module
// rather than an import of it: that one is private to its own folder (its
// barrel says so), and reaching across for three strings would publish a
// coupling neither component wants. The two vocabularies are free to diverge —
// a paired entity's verbs are the consumer's, exactly as a single one's are.
//
// Every WORD this component says that is not one of the consumer's own numbers
// lives here, so the component can be read for domain leakage in one file.
// ============================================

/**
 * The three words a paired column says on the consumer's behalf.
 *
 * Every field is optional and falls back to a neutral default. A consumer
 * whose entities are services supplies "Drop"/"Reinstate"/"new"; one whose
 * entities are people supplies "Terminate"/"Rehire"/"new hire".
 */
export interface PairedMutationSliderLabels {
  /**
   * The footer action on a PRESENT entity — the verb that takes it out of the
   * new scenario. Used as the button's accessible name, with the entity's own
   * label after it: `Remove Design`. Default `"Remove"`.
   */
  readonly remove?: string;
  /**
   * The footer action on a REMOVED entity — the verb that puts it back.
   * Default `"Restore"`.
   */
  readonly restore?: string;
  /**
   * The readout under a measure that has no prior amount, printed where the
   * axis label would otherwise go. Default `"New"`.
   */
  readonly new?: string;
}

/** Every field present — what the component actually reads. */
export type ResolvedPairedLabels = Required<PairedMutationSliderLabels>;

/**
 * The neutral defaults.
 *
 * "Remove", not "Drop": the entity is leaving the new scenario, and whether
 * that is a cancellation, a deletion or a termination is the consumer's word,
 * not this component's.
 */
export const DEFAULT_PAIRED_LABELS: ResolvedPairedLabels = {
  remove: "Remove",
  restore: "Restore",
  new: "New",
};

/** Fill the gaps in a caller's partial `labels` from the defaults. */
export const resolvePairedLabels = (
  labels: PairedMutationSliderLabels | undefined,
): ResolvedPairedLabels => ({ ...DEFAULT_PAIRED_LABELS, ...labels });
