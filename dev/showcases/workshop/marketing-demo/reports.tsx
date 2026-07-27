import { type Component, type JSX, For } from "solid-js";
import {
  ContentStack,
  WrapRow,
  SectionTitle,
  SubsectionTitle,
  TextBody,
  TextSublabel,
  MutedBody,
  SmStatusBadge,
  MetricCard,
  RingChart,
  TrendSparkline,
  trendOf,
  Chart,
  Grid,
  XAxis,
  YAxis,
  AreaSeries,
  LineSeries,
  FieldTable,
  fields,
} from "../../../../src";
import "./reports.css";

// ── Deterministic data (seeded PRNG; no Math.random / Date.now at load) ──────
const makeRand = (seed: number) => {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
};

interface Pt {
  t: number;
  v: number;
}

// Accumulated Order Value — a monotonically rising cumulative curve from $0
// (year 2016, index 0) to ~$1,200M (2026, index 10). Annual increments grow
// year over year for an accelerating shape; a seeded jitter keeps it organic.
const accumulatedOrderValue: Pt[] = (() => {
  const rand = makeRand(1337);
  const pts: Pt[] = [{ t: 0, v: 0 }];
  let acc = 0;
  for (let i = 1; i <= 10; i++) {
    acc += (60 + i * 14) * (0.7 + rand() * 0.6);
    pts.push({ t: i, v: acc });
  }
  const scale = 1200 / pts[pts.length - 1].v;
  return pts.map((p) => ({ t: p.t, v: p.v * scale }));
})();

// 30-day order-value trend for the KPI sparkline.
const trend30: number[] = (() => {
  const rand = makeRand(4242);
  const out: number[] = [];
  let v = 9;
  for (let i = 0; i < 30; i++) {
    v = Math.max(2, v + (rand() - 0.42) * 3);
    out.push(v);
  }
  return out;
})();

// ── Sanitized BI rows (generic; money stored as integer cents per SUI) ───────
interface CustomerRow {
  rank: number;
  customer: string;
  orders: number;
  orderValueCents: number;
}
const topCustomers: CustomerRow[] = [
  { rank: 1, customer: "Northgate Manufacturing", orders: 3, orderValueCents: 3712400 },
  { rank: 2, customer: "Cedar Valley Metals", orders: 2, orderValueCents: 3145800 },
  { rank: 3, customer: "Atlas Fabrication", orders: 3, orderValueCents: 2988100 },
  { rank: 4, customer: "Guardian Industrial", orders: 2, orderValueCents: 2640500 },
  { rank: 5, customer: "Summit Components", orders: 1, orderValueCents: 2415900 },
  { rank: 6, customer: "Riverside Assembly", orders: 2, orderValueCents: 2107300 },
  { rank: 7, customer: "Pioneer Tooling", orders: 1, orderValueCents: 1893600 },
  { rank: 8, customer: "Delta Precision", orders: 2, orderValueCents: 1654200 },
  { rank: 9, customer: "Harbor Logistics", orders: 1, orderValueCents: 1420700 },
  { rank: 10, customer: "Vertex Systems", orders: 1, orderValueCents: 1218900 },
];

interface BrandRow {
  rank: number;
  brand: string;
  lines: number;
  orderValueCents: number;
}
const byBrand: BrandRow[] = [
  { rank: 1, brand: "Unbranded", lines: 175, orderValueCents: 17229557 },
  { rank: 2, brand: "Estic", lines: 10, orderValueCents: 3824583 },
  { rank: 3, brand: "Detect-It", lines: 12, orderValueCents: 3250000 },
  { rank: 4, brand: "Cleco", lines: 35, orderValueCents: 2389166 },
  { rank: 5, brand: "ProGlove", lines: 10, orderValueCents: 2145247 },
  { rank: 6, brand: "C-Tek", lines: 6, orderValueCents: 1304753 },
];

interface RepRow {
  rank: number;
  rep: string;
  orders: number;
  orderValueCents: number;
}
const byRep: RepRow[] = [
  { rank: 1, rep: "Alan Whitfield", orders: 10, orderValueCents: 4218400 },
  { rank: 2, rep: "Priya Raman", orders: 8, orderValueCents: 3644900 },
  { rank: 3, rep: "Marcus Deloff", orders: 7, orderValueCents: 3102750 },
  { rank: 4, rep: "Helena Ortiz", orders: 5, orderValueCents: 2470300 },
  { rank: 5, rep: "Trevor Nash", orders: 4, orderValueCents: 1988100 },
  { rank: 6, rep: "Dana Kowalski", orders: 2, orderValueCents: 1405600 },
];

interface RegionRow {
  rank: number;
  region: string;
  orders: number;
  orderValueCents: number;
}
const byRegion: RegionRow[] = [
  { rank: 1, region: "RHINO", orders: 126, orderValueCents: 20357185 },
  { rank: 2, region: "TTH", orders: 29, orderValueCents: 10085690 },
  { rank: 3, region: "LIVONIA", orders: 6, orderValueCents: 6342794 },
  { rank: 4, region: "LEVEL 10", orders: 2, orderValueCents: 894113 },
];

// ── Field registries (columns resolved once, per table) ──────────────────────
const custRegistry = {
  rank: fields.intCol<CustomerRow>("rank", { header: "#" }),
  customer: fields.name25Col<CustomerRow>("customer"),
  orders: fields.intCol<CustomerRow>("orders"),
  orderValueCents: fields.moneyCol<CustomerRow>("orderValueCents"),
};

const brandRegistry = {
  rank: fields.intCol<BrandRow>("rank", { header: "#" }),
  brand: fields.name15Col<BrandRow>("brand"),
  lines: fields.intCol<BrandRow>("lines"),
  orderValueCents: fields.moneyCol<BrandRow>("orderValueCents"),
};

const repRegistry = {
  rank: fields.intCol<RepRow>("rank", { header: "#" }),
  rep: fields.name25Col<RepRow>("rep"),
  orders: fields.intCol<RepRow>("orders"),
  orderValueCents: fields.moneyCol<RepRow>("orderValueCents"),
};

const regionRegistry = {
  rank: fields.intCol<RegionRow>("rank", { header: "#" }),
  region: fields.name15Col<RegionRow>("region"),
  orders: fields.intCol<RegionRow>("orders"),
  orderValueCents: fields.moneyCol<RegionRow>("orderValueCents"),
};

const FILTERS = [
  "Date",
  "Order type",
  "Region",
  "Sales rep",
  "Product category",
  "Customer",
  "Order status",
];

const TableBlock: Component<{ title: string; children: JSX.Element }> = (
  props,
) => (
  <div class="rpt-table-block">
    <SubsectionTitle>{props.title}</SubsectionTitle>
    {props.children}
  </div>
);

// Scenario 3 — producing BI reports from a consolidated data warehouse.
// Built by a background agent from pure SUI components.
export const BiReportsScenario: Component = () => (
  <ContentStack>
    <SectionTitle>Daily Sales Orders Snapshot</SectionTitle>
    <TextBody>
      A daily pulse on demand — booking activity and pipeline velocity from the
      consolidated warehouse, broken down by region, brand, and rep.
    </TextBody>

    {/* Filter chips — static/decorative pills. */}
    <WrapRow class="rpt-filter-band">
      <For each={FILTERS}>
        {(f) => <SmStatusBadge variant="info">{f}</SmStatusBadge>}
      </For>
    </WrapRow>

    {/* Accumulated Order Value — cumulative area chart. */}
    <ContentStack>
      <SubsectionTitle>Accumulated Order Value</SubsectionTitle>
      <TextSublabel>Cumulative booked order value, 2016 – 2026</TextSublabel>
      <div class="rpt-chart-card">
        <Chart
          width={880}
          height={320}
          xDomain={[0, 10]}
          yDomain={[0, 1200]}
          margin={{ top: 16, right: 24, bottom: 32, left: 56 }}
        >
          <Grid />
          <YAxis tickCount={6} tickFormat={(v) => `$${v}M`} />
          <XAxis
            tickCount={6}
            tickFormat={(v) => `${2016 + Math.round(v)}`}
          />
          <AreaSeries
            data={accumulatedOrderValue}
            x={(d) => d.t}
            y={(d) => d.v}
            fill="var(--sui-accent, #3b82f6)"
            fillOpacity={0.18}
          />
          <LineSeries
            data={accumulatedOrderValue}
            x={(d) => d.t}
            y={(d) => d.v}
            stroke="var(--sui-accent, #3b82f6)"
            strokeWidth={2}
          />
        </Chart>
      </div>
    </ContentStack>

    {/* KPI band. */}
    <div class="rpt-kpi-band">
      <div class="rpt-kpi-tile rpt-kpi-tile--metric">
        <MetricCard label="Total Order Value" value="$376,797.82" />
      </div>
      <div class="rpt-kpi-tile rpt-kpi-tile--metric">
        <MetricCard label="# Orders" value="163" />
      </div>
      <div class="rpt-kpi-tile">
        <TextSublabel>vs. 30-day average</TextSublabel>
        <div class="rpt-ring-slot">
          <RingChart
            segments={[{ value: 58, color: "var(--sui-accent, #3b82f6)" }]}
            total={100}
            label="58%"
            sublabel="of avg"
            size={96}
          />
        </div>
      </div>
      <div class="rpt-kpi-tile">
        <TextSublabel>30-day order value trend</TextSublabel>
        <TrendSparkline
          values={trend30}
          trend={trendOf(trend30[0], trend30[trend30.length - 1])}
          width={200}
          height={44}
        />
        <MutedBody>Daily booked value, last 30 days</MutedBody>
      </div>
    </div>

    {/* BI data tables. */}
    <div class="rpt-tables-grid">
      <TableBlock title="Top 10 Customers">
        <FieldTable
          data={topCustomers}
          fields={["rank", "customer", "orders", "orderValueCents"]}
          registry={custRegistry}
          maxRows={6}
        />
      </TableBlock>

      <TableBlock title="By Brand">
        <FieldTable
          data={byBrand}
          fields={["rank", "brand", "lines", "orderValueCents"]}
          registry={brandRegistry}
          maxRows={6}
        />
      </TableBlock>

      <TableBlock title="By Rep">
        <FieldTable
          data={byRep}
          fields={["rank", "rep", "orders", "orderValueCents"]}
          registry={repRegistry}
          maxRows={6}
        />
      </TableBlock>

      <TableBlock title="By Region">
        <FieldTable
          data={byRegion}
          fields={["rank", "region", "orders", "orderValueCents"]}
          registry={regionRegistry}
          maxRows={6}
        />
      </TableBlock>
    </div>
  </ContentStack>
);
