// SectionedList — a dense list in sections for a narrow side pane. Both
// curried variants, sharing one selection, at a side-rail width and at half
// of it. Invented names only.
import { type Component, createSignal } from "solid-js";
import {
  CompactSectionedList,
  SectionedList,
  type SectionedListSection,
} from "../../src/components/SectionedList";
import {
  MutedBody,
  SectionTitle,
  SubsectionTitle,
} from "../../src/components/Text";

const SECTIONS: readonly SectionedListSection[] = [
  {
    id: "new",
    label: "New this import",
    items: [
      { id: "acme", label: "Acme Lumber Supply" },
      {
        id: "birch",
        label: "Birchwood Freight and Storage Company of the Upper Valley",
      },
    ],
  },
  {
    id: "rec",
    label: "Recurring · confirm the cadence",
    items: [
      {
        id: "cobalt",
        label: "Cobalt Telecom",
        status: { tone: "success", label: "done" },
      },
      {
        id: "delta",
        label: "Delta Water Utility",
        status: { tone: "warning", label: "forced" },
      },
      {
        id: "kestrel",
        label: "Kestrel Holdings",
        status: { tone: "success", label: "done" },
      },
      {
        id: "fable",
        label: "Fable Payroll Services",
        status: { tone: "neutral", label: "stopped" },
      },
    ],
  },
  {
    id: "once",
    label: "One-time · ignore or repeat",
    collapsible: true,
    defaultOpen: true,
    items: [
      { id: "garnet", label: "Garnet Office Furniture" },
      { id: "harbor", label: "Harbor Event Rentals" },
    ],
  },
  {
    id: "fits",
    label: "Fits already",
    collapsible: true,
    items: [
      {
        id: "iris",
        label: "Iris Cleaning Co",
        muted: true,
        status: { tone: "success", label: "done" },
      },
      {
        id: "juniper",
        label: "Juniper Software",
        muted: true,
        status: { tone: "success", label: "done" },
      },
    ],
  },
];

export const SectionedListShowcase: Component = () => {
  const [selected, setSelected] = createSignal<string | null>("cobalt");
  return (
    <div class="component-section component-section--full">
      <div class="example-group">
        <SectionTitle>SectionedList</SectionTitle>
        <MutedBody>
          A dense list in sections. A collapsible section has its chevron at the
          right end of its bar. Click a row to select it; Tab reaches the list
          once, and the arrow keys move between rows. Selected:{" "}
          {selected() ?? "none"}.
        </MutedBody>
        <div class="sectioned-list-demo-row">
          <div class="sectioned-list-demo">
            <SubsectionTitle>SectionedList, 340px</SubsectionTitle>
            <SectionedList
              aria-label="Groups"
              sections={SECTIONS}
              selectedId={selected()}
              onSelect={setSelected}
            />
          </div>
          <div class="sectioned-list-demo sectioned-list-demo--narrow">
            <SubsectionTitle>Compact, 170px</SubsectionTitle>
            <CompactSectionedList
              aria-label="Groups, compact"
              sections={SECTIONS}
              selectedId={selected()}
              onSelect={setSelected}
            />
          </div>
          <div class="sectioned-list-demo">
            <SubsectionTitle>Empty</SubsectionTitle>
            <SectionedList sections={[]} emptyMessage="No groups yet" />
          </div>
        </div>
      </div>
    </div>
  );
};
