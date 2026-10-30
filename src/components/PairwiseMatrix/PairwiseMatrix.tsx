// ============================================
// PairwiseMatrix — Composite (Depth 3)
// Tags: shows:grid, shows:table, shows:number, shows:status, does:view, data:matrix, role:panel
// Composes `ValueMatrix` (Depth 2). Owns zero CSS and zero inline style: the
// win/loss treatment is ValueMatrix's tone vocabulary.
//
// A HEAD-TO-HEAD TABLE: every candidate against every other. Rows carry
// "n name" (clipped), columns only the number key n (an <abbr> titled with the name),
// and the table scrolls inside its own ScrollXBox, so it fits a phone. The cell at
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
import { findIndex } from "../../fn";
import { ScrollXBox } from "../Layout";
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

/** Row names are clipped to this many characters (full name in the title) so
 *  the label column leaves room for five number-keyed columns inside a card at 390px. */
const ROW_NAME_MAX = 6;
const clip = (s: string) =>
  s.length > ROW_NAME_MAX ? `${s.substring(0, ROW_NAME_MAX).trimEnd()}…` : s;

const TONE = {
  win: "success",
  loss: "muted",
  tie: "default",
} as const satisfies Record<string, Tone>;

export const PairwiseMatrix: Component<
  PairwiseMatrixProps & PairwiseMatrixOverrides
> = (props) => {
  const name = (id: string) => props.label?.(id) ?? id;
  const key = (id: string) =>
    findIndex((c: string) => c === id, props.candidates) + 1;
  return (
    // PHONE WIDTH: columns are headed by a number key (row "1 Pirane…" is
    // column 1), so five candidates fit 390px; and the table sits in its own
    // horizontal scroll box, so even long names never push the page sideways.
    <ScrollXBox>
      <ValueMatrix<string, string>
        rows={[...props.candidates]}
        cols={[...props.candidates]}
        rowLabel={(id) => (
          <span title={name(id)}>
            {key(id)} {clip(name(id))}
          </span>
        )}
        colLabel={(id) => <abbr title={name(id)}>{key(id)}</abbr>}
        rowAxisLabel={props.cornerLabel ?? "vs"}
        value={(a, b) => (a === b ? null : (props.pairwise[a]?.[b] ?? 0))}
        format={(v, a, b) => `${v}–${props.pairwise[b]?.[a] ?? 0}`}
        tone={(_v, a, b) => {
          const o = pairwiseOutcome(props.pairwise, a, b);
          return o === null ? "default" : TONE[o];
        }}
      />
    </ScrollXBox>
  );
};

/** Props that remain available to consumers of a curried PairwiseMatrix variant. */
export type PairwiseMatrixDataProps = PairwiseMatrixProps;

export function createPairwiseMatrix(
  defaults: PairwiseMatrixOverrides = {},
): Component<PairwiseMatrixDataProps> {
  return (props) => <PairwiseMatrix {...mergeProps(defaults, props)} />;
}
