// JTF Card Catalog — qaqc-triage cards.
// The canned-explanation picker card (SlotCard's PickCard — corner number badge
// + hover delete) and the recurring empty/loading-state card.
import { For } from "solid-js";
import {
  CardSurface,
  PickCard,
  TightStack,
  NarrowStack,
  MutedBody,
} from "../../../../src";
import { CardBench, CardCase } from "./case";
import type { CardEntry } from "./shared";

const noop = () => undefined;

const CannedShowcase = () => (
  <CardBench>
    <CardCase
      title="Canned Explanation picker"
      width="320px"
      routes={["components/qaqcTriage/CannedExplanations.tsx", "/tools/asset-triage/:id"]}
      why="A grid of reusable explanations the reviewer clicks to apply to a call. Numbered corner badge (1–9) doubles as a keyboard shortcut; a hover-revealed delete × removes a canned entry. The whole card is the click target — SlotCard's PickCard template, which owns exactly this overlay pair."
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
          {(text, i) => (
            <PickCard
              values={{ text }}
              corner={i() + 1}
              onSelect={noop}
              onRemove={noop}
            />
          )}
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
    status: "sui",
    note: "SlotCard `PickCard` — click-to-pick body text with a numbered corner badge (1–9) and a hover-revealed remove ✕. Replaces the raw `.canned-card` rules that still live in jtf-ui's global app.css.",
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
