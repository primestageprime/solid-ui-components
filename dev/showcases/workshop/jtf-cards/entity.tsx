// JTF Card Catalog — the universal list/sidebar card (now typed SlotCard templates).
//
// jtf-ui had ONE hand-rolled list-card layout (src/components/ui/EntityCard.tsx,
// raw `.entity-card` CSS grid) reused across many reachable call sites. As of
// the 2026-07-23 card-family migration it is GONE from those sites: each live
// call site now renders a typed SUI `SlotCard` template (name / string / date /
// count / dots / status / range — the card analogue of FieldTable's typed
// columns). No new component was needed; the only domain content is the
// vessel-type icon, passed into the typed `name` slot.
//
// This bench renders the ACTUAL templates each site adopted, so the catalog
// shows the migrated card, not the retired mock.
//
// Design rule (2026-07-23): cards are as SHORT as they can be while still
// reading. The user is a domain expert, so data slots carry no labels — asset,
// date, duration read positionally. Two lines max (one for the selector).
//
// The real sites pass a jtf-local <VesselTypeIcon> into `name.icon`; here a
// `⛴` glyph stands in (VesselTypeIcon is jtf-domain, not in this repo) so the
// slot reads the same.
import {
  TitleAssetDate,
  TitleMetaCount,
  TitleDotsMeta,
  RangeCountStatus,
} from "../../../../src";
import { CardBench, CardCase } from "./case";
import type { CardEntry } from "./shared";
import "./catalog.css";

const EntityCardShowcase = () => (
  <CardBench>
    <CardCase
      title="metric-explorer / timesleuth — vessel-call picker → TitleAssetDate"
      routes={["/metric-explorer", "/tools/timesleuth"]}
      why="A left-rail picker for choosing which vessel call to chart. Two lines: type + name, then asset · date — no labels, a domain expert reads them positionally. The analysis happens in the main pane, so there's no status or count."
    >
      <TitleAssetDate
        active
        values={{
          name: { text: "MSC Bellissima", icon: "⛴" },
          string: "xbox3-2",
          date: "2025-12-01",
        }}
      />
    </CardCase>

    <CardCase
      title="qaqcTriage/CallList — the triage queue → TitleMetaCount"
      routes={["components/qaqcTriage/CallList.tsx", "/tools/asset-triage/:id"]}
      why="Triage clears calls that have violations, so the right slot is the violation count (3 ⚠) — the one number that decides whether this call needs work. The page is already scoped to one asset, so date · duration on the left is all the identity needed."
    >
      <TitleMetaCount
        values={{
          name: { text: "Aframax Horizon", icon: "⛴" },
          string: "2025-11-28 · 24.0h",
          count: { n: 3, glyph: "⚠" },
        }}
      />
    </CardCase>

    <CardCase
      title="FortnightReportBody — compliance summary → TitleDotsMeta"
      routes={["components/fortnight/FortnightReportBody.tsx", "/reports/fortnight/:id"]}
      why="A per-pollutant compliance roll-up, so the status slot is a pair of NOx/ROG pass-fail dots — red/green tells the reviewer the outcome without opening the call. The bottom line packs the identity three-across: asset · date · duration."
    >
      <TitleDotsMeta
        values={{
          name: { text: "Pacific Trader", icon: "⛴" },
          dots: [
            { label: "NOx", tone: "danger" },
            { label: "ROG", tone: "success" },
          ],
          string: "xbox5-1",
          date: "2025-12-01",
          duration: "24.0 h",
        }}
      />
    </CardCase>

    <CardCase
      title="reports/fortnight/[id] — report selector → RangeCountStatus"
      routes={["/reports/fortnight/:id (SidebarSelector rail)"]}
      why="The entity is a fortnight window, not a vessel call — so it collapses to a single line: the date range, a ship-icon call count (the size of the report), and a publish-state badge. No per-call timing."
    >
      <RangeCountStatus
        values={{
          range: "Nov 15 – Dec 01",
          count: { n: 12, glyph: "⛴" },
          status: { tone: "success", label: "PUBLISHED" },
        }}
      />
    </CardCase>
  </CardBench>
);

export const ENTRIES: CardEntry[] = [
  {
    route: "ui/EntityCard",
    name: "EntityCard (universal list card)",
    status: "sui",
    note: "Migrated (2026-07-23 card-family): the raw `.entity-card` grid is retired — all four live call sites now render typed SUI SlotCard templates. picker → TitleAssetDate, triage → TitleMetaCount, compliance → TitleDotsMeta, selector → RangeCountStatus. No new component needed; the vessel-type icon is the only domain content, passed into the typed `name` slot.",
    component: EntityCardShowcase,
  },
];
