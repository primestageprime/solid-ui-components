// JTF Card Catalog — the universal list/sidebar card (EntityCard).
//
// jtf-ui has ONE list-card layout (src/components/ui/EntityCard.tsx) reused
// across many reachable call sites with different slot data. It's still raw
// (hand-rolled `.entity-card` CSS grid), so it's the migration worklist:
// rebuilt here from Surface + Layout so the fixed-slot geometry is visible.
//
// Design rule (2026-07-23): cards are as SHORT as they can be while still
// reading. The user is a domain expert, so data slots carry no labels — asset,
// date, duration read positionally. Two lines max (one for the selector).
//
// Each configuration is a LIVE, reachable call site (reachability audit
// 2026-07-23); the dead VesselSidebar sparkline+remove variant was dropped.
import { type JSX, Show } from "solid-js";
import {
  InteractiveCard,
  TightStack,
  SpreadRow,
  ClusterRow,
  TightClusterRow,
  StretchRow,
  TextTitle,
  TextBody,
  TextSublabel,
  Icon,
} from "../../../../src";
import { SmStatusBadge } from "../../../../src/components/Badge";
import { CardBench, CardCase } from "./case";
import type { CardEntry } from "./shared";
import "./catalog.css";

// A vessel identifier: outline type glyph + ellipsized name. VesselTypeIcon is
// jtf-local; here a monospace type tag stands in so the slot reads the same.
function VesselName(props: { type?: string; name: string }): JSX.Element {
  return (
    <TightClusterRow>
      <TextSublabel title={props.type}>{`⛴`}</TextSublabel>
      <TextTitle>{props.name}</TextTitle>
    </TightClusterRow>
  );
}

// The compact EntityCard: an identifier row (with optional top-right status) and
// an optional bottom row of up to three space-between slots (left / center /
// right). No labels — the domain expert reads the data positionally.
function EntityCard(props: {
  identifier: JSX.Element | string;
  status?: JSX.Element | string;
  left?: JSX.Element | string;
  center?: JSX.Element | string;
  right?: JSX.Element | string;
  selected?: boolean;
}): JSX.Element {
  const hasBottom = () =>
    props.left !== undefined || props.center !== undefined || props.right !== undefined;
  return (
    <InteractiveCard active={props.selected}>
      <TightStack>
        <SpreadRow>
          <div>{props.identifier}</div>
          <Show when={props.status !== undefined && props.status !== ""}>
            <div>{props.status}</div>
          </Show>
        </SpreadRow>
        <Show when={hasBottom()}>
          <SpreadRow>
            <TextSublabel>{props.left}</TextSublabel>
            <TextSublabel>{props.center}</TextSublabel>
            <TextSublabel>{props.right}</TextSublabel>
          </SpreadRow>
        </Show>
      </TightStack>
    </InteractiveCard>
  );
}

// NOx/ROG compliance marks — the FortnightReportBody status slot.
// Pass reads as a green checkmark, fail as a red X.
function ComplianceMark(props: { pass: boolean }): JSX.Element {
  return (
    <Icon
      name={props.pass ? "check" : "close"}
      size="sm"
      class={props.pass ? "jtf-compliance-mark--pass" : "jtf-compliance-mark--fail"}
    />
  );
}

function ComplianceDots(props: { nox: boolean; rog: boolean }): JSX.Element {
  return (
    <StretchRow>
      <ClusterRow>
        <TextSublabel>NOx</TextSublabel>
        <ComplianceMark pass={props.nox} />
      </ClusterRow>
      <ClusterRow>
        <TextSublabel>ROG</TextSublabel>
        <ComplianceMark pass={props.rog} />
      </ClusterRow>
    </StretchRow>
  );
}

// Ship-icon + call count — the fortnight selector's compact "size" glyph.
function ShipCount(props: { n: number }): JSX.Element {
  return (
    <TightClusterRow>
      <TextSublabel>{`⛴`}</TextSublabel>
      <TextBody>{props.n}</TextBody>
    </TightClusterRow>
  );
}

const EntityCardShowcase = () => (
  <CardBench>
    <CardCase
      title="metric-explorer / timesleuth — vessel-call picker"
      routes={["/metric-explorer", "/tools/timesleuth"]}
      why="A left-rail picker for choosing which vessel call to chart. Two lines: type + name, then asset · date — no labels, a domain expert reads them positionally. The analysis happens in the main pane, so there's no status or count."
    >
      <EntityCard
        identifier={<VesselName type="Container Ship" name="MSC Bellissima" />}
        left="xbox3-2"
        right="2025-12-01"
        selected
      />
    </CardCase>

    <CardCase
      title="qaqcTriage/CallList — the triage queue"
      routes={["components/qaqcTriage/CallList.tsx", "/tools/asset-triage/:id"]}
      why="Triage clears calls that have violations, so the right slot is the violation count (3 ⚠) — the one number that decides whether this call needs work. The page is already scoped to one asset, so date · duration on the left is all the identity needed."
    >
      <EntityCard
        identifier={<VesselName type="Tanker" name="Aframax Horizon" />}
        left="2025-11-28 · 24.0h"
        right="3 ⚠"
      />
    </CardCase>

    <CardCase
      title="FortnightReportBody — compliance summary"
      routes={["components/fortnight/FortnightReportBody.tsx", "/reports/fortnight/:id"]}
      why="A per-pollutant compliance roll-up, so the status slot is a pair of NOx/ROG pass-fail dots — red/green tells the reviewer the outcome without opening the call. The bottom line packs the identity three-across: asset · date · duration."
    >
      <EntityCard
        identifier={<VesselName type="Bulk Carrier" name="Pacific Trader" />}
        status={<ComplianceDots nox={false} rog={true} />}
        left="xbox5-1"
        center="2025-12-01"
        right="24.0h"
      />
    </CardCase>

    <CardCase
      title="reports/fortnight/[id] — report selector"
      routes={["/reports/fortnight/:id (SidebarSelector rail)"]}
      why="The entity is a fortnight window, not a vessel call — so it collapses to a single line: the date range, a ship-icon call count (the size of the report), and a publish-state badge. No per-call timing."
    >
      <EntityCard
        identifier={<TextTitle>Nov 15 – Dec 01</TextTitle>}
        status={
          <ClusterRow>
            <ShipCount n={12} />
            <SmStatusBadge variant="compliant">PUBLISHED</SmStatusBadge>
          </ClusterRow>
        }
      />
    </CardCase>
  </CardBench>
);

export const ENTRIES: CardEntry[] = [
  {
    route: "ui/EntityCard",
    name: "EntityCard (universal list card)",
    status: "raw",
    note: "One fixed-slot grid card reused at many live call sites — kept as short as it can read (2 lines, 1 for the selector), no data labels for the domain expert. Shown inside a fixed-width sidebar frame with each reachable call site's routes, slots, and rationale. Still hand-rolled `.entity-card` CSS — rebuilt here from Surface + Layout.",
    component: EntityCardShowcase,
  },
];
