// The cascade of splits at the top of the bench: each choice decides which
// options the next split offers. Pure; the bench renders it with SegmentedInput
// and a headless test prints path -> emitted JSON.
//
//   Revenue | Expense
//     -> Fixed | Variable
//       -> revenue + fixed:    Subscription | License | Retainer
//       -> revenue + variable: Hourly | Banded amount
//       -> expense:            (no forms yet)
//
// Hourly sits under Variable because its bill varies with the hours worked;
// thorcasting's Hourly builder reads hourly_service lines. Peter's cascade named
// only the fixed branch, so the placement is a proposal.
import type { Option } from "./projection-forms.fixtures";

export type SideId = "revenue" | "expense";
export type AmountId = "fixed" | "variable";
export type LeafId = "subscription" | "license" | "retainer" | "hourly" | "banded";

export interface CascadeState {
  side: SideId;
  amount: AmountId;
  leaf: LeafId | null;
}

export const AMOUNT_OPTIONS: Option[] = [
  { id: "fixed", label: "Fixed" },
  { id: "variable", label: "Variable" },
];

const LEAVES: Record<string, Option[]> = {
  "revenue/fixed": [
    { id: "subscription", label: "Subscription" },
    { id: "license", label: "License" },
    { id: "retainer", label: "Retainer" },
  ],
  "revenue/variable": [
    { id: "hourly", label: "Hourly" },
    { id: "banded", label: "Banded amount" },
  ],
};

/** The leaves the split below `side` and `amount` offers. */
export const leafOptions = (side: SideId, amount: AmountId): Option[] =>
  LEAVES[`${side}/${amount}`] ?? [];

/** Why a leaf has no form, or null when it is built. */
export const NOT_BUILT: Record<LeafId, string | null> = {
  subscription:
    "Subscription is not built on this bench yet. thorcasting has a Subscription form (a customer population with churn) beside the License seat plan.",
  license: null,
  retainer:
    "Retainer is not built on this bench yet. thorcasting has no retainer type today: a retainer is a Monthly fixed line in the Support category.",
  hourly: null,
  banded:
    "Banded amount is not built on this bench yet (thorcasting's Weekly variable and Monthly variable forms: a min, a typical and a max).",
};

export const NO_EXPENSE_FORMS = "Expense forms are not built yet.";

/** Make a state consistent: a leaf that the splits above do not offer is
 *  replaced by the first one they do (or null). */
export const settle = (state: CascadeState): CascadeState => {
  const offered = leafOptions(state.side, state.amount);
  const kept = offered.some((o) => o.id === state.leaf);
  return { ...state, leaf: kept ? state.leaf : ((offered[0]?.id as LeafId | undefined) ?? null) };
};

export const pathOf = (state: CascadeState): string =>
  [state.side, state.amount, state.leaf ?? "-"].join(" > ");
