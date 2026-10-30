// ============================================
// PairwiseMatrix — Composite (Depth 3)
// Tags: shows:grid, shows:table, shows:number, shows:status, does:view, data:matrix, role:panel
// Composes `ValueMatrix` (Depth 2). Owns zero CSS and zero inline style: the
// win/loss treatment is ValueMatrix's tone vocabulary.
//
// A HEAD-TO-HEAD TABLE: every candidate against every other. The cell at
// (row a, column b) reads "a–b", how many preferred a over b against how many
// preferred b over a, toned success where the row candidate wins that pair and
// muted where it loses. The diagonal is blank. Reading across a row shows one
// candidate's record; a row of all wins is the Condorcet winner.
//
// The tally is data (`pairwise[a][b]`); `pairwiseMatrix` builds it from
// tiered ballots and `pairwiseOutcome` reads one pair, both pure and exported
// so a server or a test can compute what the table shows.
// ============================================
import { type Component, mergeProps } from "solid-js";
import type { Tone } from "../../types";
import { ValueMatrix } from "../ValueMatrix";
import { type PairwiseTally, pairwiseOutcome } from "./pairwise";

export interface PairwiseMatrixProps {
  /** Candidate ids, in display order (rows and columns). */
  readonly candidates: readonly string[];
  /** pairwise[a][b] = voters who preferred a over b. */
  readonly pairwise: PairwiseTally;
  /** Short display name per id (keep it narrow: it heads a column). Defaults to the id. */
  readonly label?: (id: string) => string;
}

/** Visual overrides: the corner heading over the row axis. */
export interface PairwiseMatrixOverrides {
  readonly cornerLabel?: string;
}

const TONE = {
  win: "success",
  loss: "muted",
  tie: "default",
} as const satisfies Record<string, Tone>;

export const PairwiseMatrix: Component<
  PairwiseMatrixProps & PairwiseMatrixOverrides
> = (props) => {
  const name = (id: string) => props.label?.(id) ?? id;
  return (
    <ValueMatrix<string, string>
      rows={[...props.candidates]}
      cols={[...props.candidates]}
      rowLabel={name}
      colLabel={name}
      rowAxisLabel={props.cornerLabel ?? "vs"}
      value={(a, b) => (a === b ? null : (props.pairwise[a]?.[b] ?? 0))}
      format={(v, a, b) => `${v}–${props.pairwise[b]?.[a] ?? 0}`}
      tone={(_v, a, b) => {
        const o = pairwiseOutcome(props.pairwise, a, b);
        return o === null ? "default" : TONE[o];
      }}
    />
  );
};

/** Props that remain available to consumers of a curried PairwiseMatrix variant. */
export type PairwiseMatrixDataProps = PairwiseMatrixProps;

export function createPairwiseMatrix(
  defaults: PairwiseMatrixOverrides = {},
): Component<PairwiseMatrixDataProps> {
  return (props) => <PairwiseMatrix {...mergeProps(defaults, props)} />;
}
