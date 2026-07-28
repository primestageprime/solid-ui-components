import { type Component, For } from "solid-js";
import {
  ContentStack,
  WrapRow,
  GrowBox,
  CardSurface,
  MetricCard,
  SlotFillBar,
  SectionTitle,
  TextBody,
} from "../../../../src";
import { SmStatusBadge } from "../../../../src/components/Badge";
import type { StatusBadgeVariant } from "../../../../src/components/Badge";
import "./transfer.css";

// Scenario 2 — sanitized Acumatica → warehouse EXTRACTION job, mid-run.
// Built by a background agent from pure SUI components. Reads like an ETL
// dashboard: some tables done, some in flight, one still queued. The point is
// the magnitude range — dozens of rows (Company) up to millions (GLTran) —
// so rows are ordered large→small and counts are grouped with commas.

type XferStatus = "done" | "doing" | "todo";

interface XferTable {
  name: string;
  rows: number;
  status: XferStatus;
  pct: number;
}

// Deterministic stub data, largest table first.
const TABLES: XferTable[] = [
  { name: "GLTran", rows: 4_820_193, status: "doing", pct: 62 },
  { name: "INTran", rows: 2_140_880, status: "doing", pct: 38 },
  { name: "ARTran", rows: 1_505_220, status: "todo", pct: 0 },
  { name: "SOLine", rows: 360_512, status: "done", pct: 100 },
  { name: "POLine", rows: 314_297, status: "done", pct: 100 },
  { name: "Customer", rows: 128_450, status: "done", pct: 100 },
  { name: "InventoryItem", rows: 87_640, status: "done", pct: 100 },
  { name: "Vendor", rows: 9_240, status: "done", pct: 100 },
  { name: "Branch", rows: 18, status: "done", pct: 100 },
  { name: "Company", rows: 3, status: "done", pct: 100 },
];

const rowFormat = new Intl.NumberFormat("en-US");

const BADGE: Record<XferStatus, { variant: StatusBadgeVariant; label: string }> = {
  done: { variant: "compliant", label: "done" },
  doing: { variant: "info", label: "extracting" },
  todo: { variant: "pending", label: "queued" },
};

const TableRow: Component<{ table: XferTable }> = (props) => (
  <div class="xfer-row">
    <span class="xfer-row__name">{props.table.name}</span>
    <span class="xfer-row__rows">{rowFormat.format(props.table.rows)}</span>
    <span class="xfer-row__badge">
      <SmStatusBadge variant={BADGE[props.table.status].variant}>
        {BADGE[props.table.status].label}
      </SmStatusBadge>
    </span>
    <span class="xfer-row__bar">
      <SlotFillBar
        slots={100}
        done={props.table.pct}
        active={
          props.table.status === "doing"
            ? { index: props.table.pct, phase: "doing" }
            : null
        }
        height={16}
        maxWidth={null}
        label={`${props.table.name} — ${props.table.pct}% extracted`}
      />
    </span>
    <span class="xfer-row__pct">{props.table.pct}%</span>
  </div>
);

export const DataTransferScenario: Component = () => (
  <ContentStack>
    <SectionTitle>Data Transfer — Acumatica extraction</SectionTitle>
    <TextBody>
      A live pull of the Acumatica ERP into the warehouse. Some tables are done,
      some in flight, one still queued.
    </TextBody>

    <WrapRow>
      <GrowBox>
        <MetricCard label="Tables" value="7 / 10" />
      </GrowBox>
      <GrowBox>
        <MetricCard label="Total Rows" value="9.5M" />
      </GrowBox>
      <GrowBox>
        <MetricCard label="Extracted" value="61%" color="success" />
      </GrowBox>
      <GrowBox>
        <MetricCard label="Throughput" value="37.3K" units="rows/min" />
      </GrowBox>
    </WrapRow>

    <CardSurface>
      <div class="xfer-board">
        <div class="xfer-row xfer-row--head">
          <span class="xfer-row__name">Table</span>
          <span class="xfer-row__rows">Rows</span>
          <span class="xfer-row__badge">Status</span>
          <span class="xfer-row__bar">Progress</span>
          <span class="xfer-row__pct">%</span>
        </div>
        <For each={TABLES}>{(table) => <TableRow table={table} />}</For>
      </div>
    </CardSurface>
  </ContentStack>
);
