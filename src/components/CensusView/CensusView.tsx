// CensusView — Composite (Depth 3). Zero CSS except CensusView.css structural
// exception: the two-column grid + sticky detail rail geometry.
import { type Component, For, Show, createSignal } from "solid-js";
import { QuickFilter } from "../QuickFilter";
import { BaseTable } from "../Table/BaseTable";
import type { TableColumn } from "../Table/types";
import { GapCell } from "../Table/GapCell";
import { InfoPanel } from "../Panel/variants";
import { StatusBadge } from "../Badge/StatusBadge";
import type { StatusBadgeVariant } from "../Badge/StatusBadge";
import { NumberWithUnits } from "../DataDisplay/NumberWithUnits";
import { CountChip } from "../Badge/CountChip";
import "./CensusView.css";

import {
  CENSUS_BUCKETS,
  bucketOf,
  type CensusBucketId,
  type CensusTable,
  type CensusViewProps,
  type NormStatus,
} from "./censusModel";

/** Map NormStatus → StatusBadge variant. */
function normStatusVariant(s: NormStatus): StatusBadgeVariant {
  if (s === "done") return "compliant";
  if (s === "error" || s === "noaccess") return "violation";
  if (s === "partial" || s === "short" || s === "overfetch") return "warning";
  if (s === "todo" || s === "pending" || s === "doing") return "pending";
  return "info";
}

/** Build per-bucket column definitions. Columns are the same for all buckets. */
function buildColumns(
  onSelect: (t: CensusTable) => void,
): TableColumn<CensusTable>[] {
  return [
    {
      id: "entity",
      header: "Entity",
      accessor: (row) => (
        <span title={row.entity}>
          {row.entity}
          {row.subtitle && (
            <span class="text-meta" style={{ "font-size": "0.85em", display: "block" }}>
              {row.subtitle}
            </span>
          )}
        </span>
      ),
      width: "160px",
    },
    {
      id: "fields",
      header: "Fields",
      align: "right",
      accessor: (row) =>
        row.fieldCount != null ? String(row.fieldCount) : "—",
    },
    {
      id: "source",
      header: "Source rows",
      align: "right",
      accessor: (row) =>
        row.sourceRows != null
          ? (row.approx ? "~" : "") + row.sourceRows.toLocaleString()
          : "—",
    },
    {
      id: "local",
      header: "Local rows",
      align: "right",
      accessor: (row) =>
        row.localRows != null ? row.localRows.toLocaleString() : "—",
    },
    {
      id: "gap",
      header: "Gap",
      align: "right",
      accessor: (row) => (
        <GapCell
          remaining={Math.max(0, (row.sourceRows ?? 0) - (row.localRows ?? 0))}
          total={row.sourceRows ?? 0}
        />
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => (
        <StatusBadge
          variant={normStatusVariant(row.status)}
          label={row.status}
          title={row.rawStatus ?? undefined}
        />
      ),
    },
  ];
}

/** Group a list of tables into ordered, non-empty buckets. */
function groupIntoBuckets(
  list: readonly CensusTable[],
): { id: CensusBucketId; label: string; hint: string; tables: CensusTable[] }[] {
  const by = new Map<CensusBucketId, CensusTable[]>();
  for (const t of list) {
    const b = bucketOf(t);
    if (!by.has(b)) by.set(b, []);
    by.get(b)!.push(t);
  }
  return CENSUS_BUCKETS.filter((b) => by.has(b.id)).map((b) => ({
    ...b,
    tables: by.get(b.id)!,
  }));
}

import type { CensusColumn } from "./censusModel";

/** Columns for the schema sub-table inside the detail panel. */
const schemaColumns: TableColumn<CensusColumn>[] = [
  { id: "name", header: "Name", accessor: "name" },
  { id: "type", header: "Type", accessor: "type" },
];

/** Detail panel content for the selected table. */
const DetailContent: Component<{
  t: CensusTable;
  actions?: (t: CensusTable) => import("solid-js").JSX.Element | null;
}> = (props) => {
  const t = () => props.t;
  const fbt = () => t().fieldCountByType ?? {};
  const cols = () => t().columns ?? [];

  return (
    <>
      {/* Subtitle / version / status */}
      <Show when={t().subtitle || t().version}>
        <div class="text-meta" style={{ "margin-bottom": "var(--sui-space-2, 8px)" }}>
          <Show when={t().subtitle}>{t().subtitle} · </Show>
          <Show when={t().version}>v{t().version}</Show>
        </div>
      </Show>

      {/* Row counts */}
      <div style={{ display: "flex", gap: "var(--sui-space-3, 12px)", "flex-wrap": "wrap", "margin-bottom": "var(--sui-space-3, 12px)" }}>
        <div>
          <div class="text-meta" style={{ "font-size": "var(--sui-font-size-xs, 11px)" }}>SOURCE</div>
          <NumberWithUnits value={t().sourceRows} units="rows" />
        </div>
        <div>
          <div class="text-meta" style={{ "font-size": "var(--sui-font-size-xs, 11px)" }}>LOCAL</div>
          <NumberWithUnits value={t().localRows} units="rows" />
        </div>
        <Show when={t().fieldCount != null}>
          <div>
            <div class="text-meta" style={{ "font-size": "var(--sui-font-size-xs, 11px)" }}>COLS</div>
            <NumberWithUnits value={t().fieldCount} units="fields" />
          </div>
        </Show>
      </div>

      {/* Status badge */}
      <div style={{ "margin-bottom": "var(--sui-space-2, 8px)" }}>
        <StatusBadge variant={normStatusVariant(t().status)} label={t().status} />
        <Show when={t().keyLabel}>
          {" "}
          <StatusBadge variant="info" label={t().keyLabel!} title={t().keyTitle ?? undefined} />
        </Show>
      </div>

      {/* Error reason */}
      <Show when={(t().status === "error" || t().status === "noaccess") && t().error}>
        <div style={{ "margin-bottom": "var(--sui-space-2, 8px)", color: "var(--sui-color-danger, #ff5577)" }}>
          {t().error}
        </div>
      </Show>

      {/* Note */}
      <Show when={t().note && t().status !== "error"}>
        <div class="text-meta" style={{ "margin-bottom": "var(--sui-space-2, 8px)" }}>{t().note}</div>
      </Show>

      {/* Field-type chips */}
      <Show when={Object.values(fbt()).some((v) => v > 0)}>
        <div style={{ display: "flex", gap: "var(--sui-space-1, 4px)", "flex-wrap": "wrap", "margin-bottom": "var(--sui-space-2, 8px)" }}>
          <For each={Object.entries(fbt())}>
            {([k, v]) => (
              <Show when={v > 0}>
                <CountChip count={v} label={k} />
              </Show>
            )}
          </For>
        </div>
      </Show>

      {/* Arbitrary extra detail (from rhinotools adapter) */}
      <Show when={t().detail}>{t().detail}</Show>

      {/* Schema list */}
      <Show when={cols().length > 0}>
        <div style={{ "margin-bottom": "var(--sui-space-2, 8px)" }}>
          <div class="text-meta" style={{ "font-size": "var(--sui-font-size-xs, 11px)", "margin-bottom": "var(--sui-space-1, 4px)" }}>
            SCHEMA ({cols().length})
          </div>
          <BaseTable
            data={cols()}
            compact
            columns={schemaColumns}
          />
        </div>
      </Show>

      {/* Source-specific actions */}
      <Show when={props.actions}>{props.actions?.(t())}</Show>
    </>
  );
};

export const CensusView: Component<CensusViewProps> = (props) => {
  const [localSel, setLocalSel] = createSignal<string | null>(null);
  const selKey = () =>
    props.selectedKey !== undefined ? props.selectedKey : localSel();
  const select = (t: CensusTable | null) => {
    setLocalSel(t?.key ?? null);
    props.onSelect?.(t);
  };
  const selected = () =>
    props.tables.find((t) => t.key === selKey()) ?? null;

  return (
    <div class="sui-census-view">
      <QuickFilter
        items={props.tables}
        extract={(t) => `${t.entity} ${t.subtitle ?? ""}`}
        placeholder="Filter tables by name…"
      >
        {(filtered) => (
          <div class="sui-census-view__buckets">
            <For each={groupIntoBuckets(filtered)}>
              {(b) => (
                <section>
                  <div class="sui-census-view__bucket-header">
                    <span class="sui-census-view__bucket-label">{b.label}</span>
                    <Show when={b.hint}>
                      <span class="sui-census-view__bucket-hint">{b.hint}</span>
                    </Show>
                  </div>
                  <BaseTable
                    stickyHeader
                    compact
                    hoverable
                    data={b.tables}
                    columns={buildColumns(select)}
                    onRowClick={(t) => select(t)}
                    getRowClass={(t) =>
                      t.key === selKey() ? "hud-table__row--selected" : ""
                    }
                  />
                </section>
              )}
            </For>
          </div>
        )}
      </QuickFilter>

      <Show when={selected()}>
        {(t) => (
          <div class="sui-census-view__detail">
            <InfoPanel title={t().entity}>
              <DetailContent t={t()} actions={props.actions} />
            </InfoPanel>
          </div>
        )}
      </Show>
    </div>
  );
};
