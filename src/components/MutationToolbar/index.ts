// Barrel — the PUBLIC surface, re-exported from src/index.ts.
//
// No curried variant, deliberately: the default words are already the
// neutral ones, and a screen with its own vocabulary curries once with
// `createMutationToolbar({ labels })`. Every exported type is qualified with
// the component's name, because `src/index.ts` is `export *` over every barrel
// and an ambiguous name resolves to nothing.
export {
  DEFAULT_MUTATION_TOOLBAR_LABELS,
  MutationToolbar,
  createMutationToolbar,
} from "./MutationToolbar";
export type {
  MutationToolbarChange,
  MutationToolbarDataProps,
  MutationToolbarLabels,
  MutationToolbarOverrides,
  MutationToolbarProps,
} from "./MutationToolbar";
