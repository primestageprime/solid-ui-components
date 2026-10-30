// PairwiseMatrix — every candidate against every other. The showcase builds
// the tally from tiered ballots with the exported pure `pairwiseMatrix`, the
// way a store or a server would, and passes short column names.
import type { Component } from "solid-js";
import {
  PairwiseMatrix,
  pairwiseMatrix,
} from "../../src/components/PairwiseMatrix";
import { SectionTitle, MutedBody } from "../../src/components/Text";

const BOOKS = ["Piranesi", "Circe", "Klara and the Sun", "Babel", "Middlemarch"];
const BALLOTS = [
  [["Piranesi"], ["Circe", "Klara and the Sun"], ["Babel"], ["Middlemarch"]],
  [["Circe"], ["Middlemarch"], ["Piranesi"], ["Babel"], ["Klara and the Sun"]],
  [["Piranesi", "Babel"], ["Klara and the Sun"]],
  [["Klara and the Sun"], ["Piranesi"], ["Circe"]],
  [["Middlemarch"], ["Piranesi"], ["Babel"], ["Circe"], ["Klara and the Sun"]],
];

export const PairwiseMatrixShowcase: Component = () => (
  <div class="component-section component-section--full">
    <div class="example-group">
      <SectionTitle>PairwiseMatrix</SectionTitle>
      <MutedBody>
        Cell = voters who ranked the row above the column – the reverse. Green:
        the row wins that pair. A row of all wins is the Condorcet winner. Ties
        count for neither.
      </MutedBody>
      <div class="pairwise-matrix-demo">
        <PairwiseMatrix
          candidates={BOOKS}
          pairwise={pairwiseMatrix(BOOKS, BALLOTS)}
         
        />
      </div>
    </div>
  </div>
);
