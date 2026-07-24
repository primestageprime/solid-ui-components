// JTF Card Catalog — qaqc-triage cards.
// The canned-explanation picker card (raw `.canned-card` with a corner number
// badge + hover delete) and the recurring empty/loading-state card.
import { For } from "solid-js";
import {
  CardSurface,
  InteractiveCard,
  TightStack,
  NarrowStack,
  MutedBody,
  TextBody,
} from "../../../../src";
import { CardBench, CardCase } from "./case";
import type { CardEntry } from "./shared";
import "./catalog.css";

// Canned explanation: bordered rounded card, numbered badge in the top-left
// notch (1–9), hover-revealed delete × top-right, click-to-pick body text.
function CannedCard(props: { n: number; text: string }) {
  return (
    <div class="jtf-canned-card">
      <InteractiveCard>
        <div class="jtf-canned-card__badge">{props.n}</div>
        <span class="jtf-canned-card__delete" title="Delete">
          ×
        </span>
        <TextBody>{props.text}</TextBody>
      </InteractiveCard>
    </div>
  );
}

const CannedShowcase = () => (
  <CardBench>
    <CardCase
      title="Canned Explanation picker"
      width="320px"
      routes={["components/qaqcTriage/CannedExplanations.tsx", "/tools/asset-triage/:id"]}
      why="A grid of reusable explanations the reviewer clicks to apply to a call. Numbered corner badge (1–9) doubles as a keyboard shortcut; a hover-revealed delete × removes a canned entry. The whole card is the click target."
    >
      <NarrowStack>
        <For
          each={[
            "Instrument fault during control period — data excluded per SOP-14.",
            "Aux engine power log applied; recalculated below threshold.",
            "Vessel at anchor, no shore power — not subject to control.",
            "FTIR calibration drift; corrected with QA reference gas.",
          ]}
        >
          {(text, i) => <CannedCard n={i() + 1} text={text} />}
        </For>
      </NarrowStack>
    </CardCase>
  </CardBench>
);

const EmptyStateShowcase = () => (
  <CardBench>
    <CardCase
      title="Empty / loading-state card"
      width="300px"
      routes={["components/qaqcTriage/CallList.tsx", "/reports/qaqc-checks", "/tools/asset-triage/:id"]}
      why="The recurring placeholder for a list with no rows yet: a plain CardSurface with one muted line. Same shape for empty vs loading — only the text changes."
    >
      <TightStack>
        <CardSurface>
          <MutedBody>No recent calls.</MutedBody>
        </CardSurface>
        <CardSurface>
          <MutedBody>No pending calls.</MutedBody>
        </CardSurface>
        <CardSurface>
          <MutedBody>Loading calls…</MutedBody>
        </CardSurface>
      </TightStack>
    </CardCase>
  </CardBench>
);

export const ENTRIES: CardEntry[] = [
  {
    route: "qaqcTriage/CannedExplanations",
    name: "Canned Explanation card",
    status: "raw",
    note: "Bordered pick card with a numbered corner badge (1–9) and a hover-revealed delete ×, click-to-pick body text. Raw `.canned-card` CSS — badge/delete ride on call-site geometry here.",
    component: CannedShowcase,
  },
  {
    route: "qaqcTriage/CallList",
    name: "Empty / loading-state card",
    status: "sui",
    note: "Plain CardSurface with a single muted line — the recurring empty/loading state across CallList, CallFilterList, qaqc-checks, asset-triage. Already SUI.",
    component: EmptyStateShowcase,
  },
];
