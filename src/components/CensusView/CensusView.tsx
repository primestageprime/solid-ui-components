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
import {
  ActionSlot,
  BaselineClusterRow,
  NarrowStack,
  TagRow,
  TightStack,
  TopClusterRow,
  WrappedClusterRow,
} from "../Layout/variants";
import { DangerBody, MonoMeta } from "../Text/variants";
import "./CensusView.css";

import {
  CENSUS_BUCKETS,
  bucketOf,
  type CensusBucketId,
  type CensusColumn,
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
            <MonoMeta class="sui-census__entity-subtitle">
              {row.subtitle}
            </MonoMeta>
          )}
        </span>
      ),
      // No fixed width: the flexible column. Absorbs remaining space under
      // fixedLayout and ellipsizes long entity names.
      ellipsis: true,
    },
    {
      id: "fields",
      header: "Fields",
      align: "right",
      width: "52px",
      accessor: (row) =>
        row.fieldCount != null ? String(row.fieldCount) : "—",
    },
    {
      id: "source",
      header: "Source #",
      align: "right",
      width: "88px",
      accessor: (row) =>
        row.sourceRows != null
          ? (row.approx ? "~" : "") + row.sourceRows.toLocaleString()
          : "—",
    },
    {
      id: "local",
      header: "Local #",
      align: "right",
      width: "88px",
      accessor: (row) =>
        row.localRows != null ? row.localRows.toLocaleString() : "—",
    },
    {
      id: "gap",
      header: "Gap",
      align: "right",
      width: "72px",
      accessor: (row) => (
        <GapCell
          inline
          remaining={Math.max(0, (row.sourceRows ?? 0) - (row.localRows ?? 0))}
          total={row.sourceRows ?? 0}
        />
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "92px",
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
    <NarrowStack>
      {/* Subtitle / version / status */}
      <Show when={t().subtitle || t().version}>
        <MonoMeta>
          <Show when={t().subtitle}>{t().subtitle} · </Show>
          <Show when={t().version}>v{t().version}</Show>
        </MonoMeta>
      </Show>

      {/* Row counts */}
      <WrappedClusterRow>
        <TightStack>
          <MonoMeta>SOURCE</MonoMeta>
          <NumberWithUnits value={t().sourceRows} units="rows" />
        </TightStack>
        <TightStack>
          <MonoMeta>LOCAL</MonoMeta>
          <NumberWithUnits value={t().localRows} units="rows" />
        </TightStack>
        <Show when={t().fieldCount != null}>
          <TightStack>
            <MonoMeta>COLS</MonoMeta>
            <NumberWithUnits value={t().fieldCount} units="fields" />
          </TightStack>
        </Show>
      </WrappedClusterRow>

      {/* Status badge */}
      <div>
        <StatusBadge variant={normStatusVariant(t().status)} label={t().status} />
        <Show when={t().keyLabel}>
          {" "}
          <StatusBadge variant="info" label={t().keyLabel!} title={t().keyTitle ?? undefined} />
        </Show>
      </div>

      {/* Error reason */}
      <Show when={(t().status === "error" || t().status === "noaccess") && t().error}>
        <DangerBody>{t().error}</DangerBody>
      </Show>

      {/* Note */}
      <Show when={t().note && t().status !== "error"}>
        <MonoMeta>{t().note}</MonoMeta>
      </Show>

      {/* Field-type chips */}
      <Show when={Object.values(fbt()).some((v) => v > 0)}>
        <TagRow>
          <For each={Object.entries(fbt())}>
            {([k, v]) => (
              <Show when={v > 0}>
                <CountChip count={v} label={k} />
              </Show>
            )}
          </For>
        </TagRow>
      </Show>

      {/* Arbitrary extra detail (from rhinotools adapter) */}
      <Show when={t().detail}>{t().detail}</Show>

      {/* Schema list */}
      <Show when={cols().length > 0}>
        <TightStack>
          <MonoMeta>SCHEMA ({cols().length})</MonoMeta>
          <BaseTable
            data={cols()}
            compact
            columns={schemaColumns}
          />
        </TightStack>
      </Show>

      {/* Source-specific actions */}
      <Show when={props.actions}>{props.actions?.(t())}</Show>
    </NarrowStack>
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
    <TopClusterRow class="sui-census-view">
      <QuickFilter
        items={props.tables}
        extract={(t) => `${t.entity} ${t.subtitle ?? ""}`}
        placeholder="Filter tables by name…"
      >
        {(filtered) => (
          <div
            class="sui-census-view__buckets"
            classList={{ "sui-census-view__buckets--grid": !!props.bucketMinWidth }}
            style={
              props.bucketMinWidth
                ? { "--sui-census-bucket-min": props.bucketMinWidth }
                : undefined
            }
          >
            <For each={groupIntoBuckets(filtered)}>
              {(b) => (
                <section>
                  <BaselineClusterRow class="sui-census-view__bucket-header">
                    <strong>{b.label}</strong>
                    <Show when={b.hint}>
                      <MonoMeta>{b.hint}</MonoMeta>
                    </Show>
                  </BaselineClusterRow>
                  <BaseTable
                    stickyHeader
                    compact
                    hoverable
                    fixedLayout
                    maxHeight={props.tableMaxHeight}
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
          <ActionSlot class="sui-census-view__detail">
            <InfoPanel title={t().entity}>
              <DetailContent t={t()} actions={props.actions} />
            </InfoPanel>
          </ActionSlot>
        )}
      </Show>
    </TopClusterRow>
  );
};
