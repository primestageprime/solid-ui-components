// Bench: Report Filter Bar (workshop:report-filter-bar)
//
// SKELETON ONLY — a bare page to talk over, not a design. Nothing here is
// decided: the dimensions below come from a consumer app's
// interconnected-report-filtering design ("Date, Order type, Region, Sales
// rep, Product line, Brand, Item" — AND across dimensions, OR within one),
// and every box is a Placeholder marking a slot we have not chosen a
// component for yet.
import { type Component, For } from "solid-js";
import {
  MutedBody,
  NoteText,
  SectionTitle,
  SubsectionTitle,
  TextSublabel,
} from "../../../src/components/Text";
import { CardSurface, CompactSurface } from "../../../src/components/Surface";
import {
  ContentStack,
  TightStack,
  WrappedClusterRow,
} from "../../../src/components/Layout";
import {
  BlockPlaceholder,
  FitPlaceholder,
  MediumPlaceholder,
} from "../../../src/components/Placeholder";

/** The dimensions the report-filtering design names. Order is a guess. */
const DIMENSIONS = [
  "Order type",
  "Region",
  "Sales rep",
  "Product line",
  "Brand",
  "Item",
];

/** Whatever the user has already narrowed to — shown as its own row today. */
const ACTIVE_FILTERS = [
  "Order type: Stock, Custom",
  "Region: Midwest",
  "Sales rep: Amy",
];

const OPEN_QUESTIONS = [
  "One row or two? The design has both a picker per dimension AND a chip list of what is active — do those share a row, or does the chip row appear only once something is selected?",
  "Does each dimension open a dropdown/combobox, or is the whole thing one omni-search that resolves to `dimension: member`?",
  "Date: the design recommends DROPPING the Date chip because the scrub timeline already owns time. Confirm — and if it stays, does it look like the other dimensions or sit apart?",
  "Where does 'clear all' live, and is there a saved-view / preset concept in v1?",
  "What does a dimension with 400 members do — typeahead, grouped list, or 'top N + search'?",
  "Does the bar stick to the top of the report while the tables scroll?",
  "Does a scope count ('1,204 of 38,900 lines') belong in the bar, or down with the results?",
];

export const meta = { label: "Report Filter Bar" };

const ReportFilterBarBench: Component = () => (
  <div class="component-section component-section--full">
    <SectionTitle>Report Filter Bar</SectionTitle>
    <MutedBody>
      Bare page — a skeleton for the report filter bar, not a design. The
      regions below mark WHERE things go so we can argue about the shape before
      anything gets built. Stub dimensions come from the
      interconnected-report-filtering design; every box is a Placeholder.
    </MutedBody>

    <ContentStack>
      <SubsectionTitle>Region 1 — the bar itself</SubsectionTitle>
      <CardSurface>
        <TightStack>
          <TextSublabel>dimension pickers (component TBD)</TextSublabel>
          <WrappedClusterRow>
            <For each={DIMENSIONS}>{(d) => <FitPlaceholder label={d} />}</For>
          </WrappedClusterRow>
          <TextSublabel>active filters (chips? removable? TBD)</TextSublabel>
          <WrappedClusterRow>
            <For each={ACTIVE_FILTERS}>
              {(f) => <FitPlaceholder label={f} />}
            </For>
          </WrappedClusterRow>
        </TightStack>
      </CardSurface>

      <SubsectionTitle>Region 2 — what the bar drives</SubsectionTitle>
      <CompactSurface>
        <TightStack>
          <TextSublabel>
            KPI row, scrub chart and tables all re-aggregate off the same
            filtered fact — unbuilt, placeholders for now
          </TextSublabel>
          <MediumPlaceholder label="KPI row reacts here" />
          <BlockPlaceholder label="report tables react here" />
        </TightStack>
      </CompactSurface>

      <SubsectionTitle>Open questions</SubsectionTitle>
      <TightStack>
        <For each={OPEN_QUESTIONS}>{(q) => <NoteText>{q}</NoteText>}</For>
      </TightStack>
    </ContentStack>
  </div>
);

export default ReportFilterBarBench;
