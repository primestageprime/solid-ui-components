// ============================================
// GroupedMutationSliders wording — private module, no Solid, no DOM.
//
// The same disposition as `MutationSliders/labels.ts` and
// `PairedMutationSliders/labels.ts`, and a SEPARATE module rather than an
// import of either: both are private to their own folders (their barrels say
// so), and reaching across for three strings would publish a coupling none of
// the three components wants. The vocabularies are free to diverge — a grouped
// entity's verbs are the consumer's, exactly as a paired one's are.
//
// Every WORD this component says that is not one of the consumer's own numbers
// lives here, so the component can be read for domain leakage in one file. The
// GROUP CAPTIONS are not here, deliberately: they are the consumer's nouns and
// arrive on `axes`, beside the measures they caption.
// ============================================

/**
 * The three words a grouped column says on the consumer's behalf.
 *
 * Every field is optional and falls back to a neutral default. A consumer whose
 * entities are products supplies "Discontinue"/"Relaunch"/"new product"; one
 * whose entities are people supplies "Terminate"/"Rehire"/"new hire".
 */
export interface GroupedMutationSliderLabels {
  /**
   * The footer action on a PRESENT entity — the verb that takes it out of the
   * new scenario. Used as the button's accessible name, with the entity's own
   * label after it: `Remove Starter`. Default `"Remove"`.
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
export type ResolvedGroupedLabels = Required<GroupedMutationSliderLabels>;

/**
 * The neutral defaults.
 *
 * "Remove", not "Discontinue": the entity is leaving the new scenario, and
 * whether that is a cancellation, a deletion or a termination is the consumer's
 * word, not this component's.
 */
export const DEFAULT_GROUPED_LABELS: ResolvedGroupedLabels = {
  remove: "Remove",
  restore: "Restore",
  new: "New",
};

/** Fill the gaps in a caller's partial `labels` from the defaults. */
export const resolveGroupedLabels = (
  labels: GroupedMutationSliderLabels | undefined,
): ResolvedGroupedLabels => ({ ...DEFAULT_GROUPED_LABELS, ...labels });
