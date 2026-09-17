// ============================================
// MutationSliders wording — private module, no Solid, no DOM.
//
// Every WORD the dial says that is not one of the consumer's own numbers lives
// here, so the component can be read for domain leakage in one file rather
// than by grepping a thousand lines of JSX.
//
// The component is generic: entities with a prior amount, a future amount, an
// allowed range and a presence. It therefore cannot know whether removing one
// is called "terminate", "cancel", "retire" or "delete" — so the three words
// that DO carry the consumer's meaning are props with neutral defaults, and
// the domain vocabulary lives at the call site where it belongs.
// ============================================

/**
 * The three words the dial says on the consumer's behalf.
 *
 * Every field is optional and falls back to a neutral default. A consumer
 * whose entities are people supplies "Terminate"/"Reinstate"/"new hire"; one
 * whose entities are line items supplies "Delete"/"Undelete"/"added".
 */
export interface MutationSliderLabels {
  /**
   * The footer action on a PRESENT entity — the verb that takes it out of the
   * new scenario. Used as the button's accessible name, with the entity's own
   * label after it: `Remove Adlai`. Default `"Remove"`.
   */
  readonly remove?: string;
  /**
   * The footer action on a REMOVED entity — the verb that puts it back.
   * Default `"Restore"`.
   */
  readonly restore?: string;
  /**
   * The readout under an entity that has no prior amount, printed where
   * `was <prior>` would otherwise go. Default `"New"`.
   */
  readonly new?: string;
}

/** Every field present — what the component actually reads. */
export type ResolvedLabels = Required<MutationSliderLabels>;

/**
 * The neutral defaults.
 *
 * "Remove", not "Terminate": the entity is leaving the new scenario, and
 * whether that is a dismissal, a cancellation or a deletion is the consumer's
 * word, not this component's.
 */
export const DEFAULT_LABELS: ResolvedLabels = {
  remove: "Remove",
  restore: "Restore",
  new: "New",
};

/** Fill the gaps in a caller's partial `labels` from the defaults. */
export const resolveLabels = (
  labels: MutationSliderLabels | undefined,
): ResolvedLabels => ({ ...DEFAULT_LABELS, ...labels });
