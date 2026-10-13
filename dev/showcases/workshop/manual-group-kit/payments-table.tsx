// The payment rows on the right: uncovered first, then one expandable group
// per config with its member rows.
import { type Component, createMemo } from "solid-js";
import { SlotTrackSwatch } from "../../../../src/components/Chart";
import { ClusterRow, SpreadRow } from "../../../../src/components/Layout";
import { BaseTable, type TableColumn } from "../../../../src/components/Table";
import { MonoMeta, MonoValue, MutedBody, TextBody, TextValueDangerSm, TextValueSuccessSm, WarningBody } from "../../../../src/components/Text";
import { type Config, type Expected, type Payee, type Payment, dev, inBand, inWindow, money, signed, windowStart } from "./model";
import "./payments-table.css";

type Row =
  | { readonly kind: "section"; readonly label: string }
  | { readonly kind: "unc"; readonly row: Payment; readonly gone: boolean }
  | { readonly kind: "grp"; readonly key: string; readonly name: string; readonly count: number; readonly total: number; readonly open: boolean }
  | { readonly kind: "mem"; readonly row: Payment; readonly c: Config; readonly tagText: string | null; readonly devText: string | null; readonly devOut: boolean };

export interface PaymentsTableProps {
  readonly payee: Payee;
  readonly configs: readonly Config[];
  readonly uncovered: readonly Payment[];
  readonly exp: Expected;
  readonly gone: boolean;
  readonly groupGone: boolean;
  readonly expanded: Readonly<Record<string, boolean>>;
  readonly onToggle: (key: string) => void;
}

const groupName = (c: Config): string =>
  c.variable ? `Variable $0–${money(c.hi ?? 0)}` : `${c.label} ${c.qty ? `${c.qty} × ` : ""}${money(c.amt ?? 0)}${c.tol ? ` ±${Math.round(c.tol * 100)}%` : ""}`;

export const PaymentsTable: Component<PaymentsTableProps> = (props) => {
  const rows = createMemo<Row[]>(() => {
    const unc: Row[] = props.uncovered.length
      ? [
          { kind: "section", label: `${props.gone ? "DISCARDED" : "NOT COVERED BY ANY CONFIG"} · ${props.uncovered.length}` },
          ...[...props.uncovered].reverse().map((row): Row => ({ kind: "unc", row, gone: props.gone })),
        ]
      : [];
    const grps: Row[] = props.groupGone
      ? []
      : props.configs.flatMap((c): Row[] => {
          const key = `${props.payee.key}${c.id}`;
          const open = Boolean(props.expanded[key]);
          const head: Row = { kind: "grp", key, name: groupName(c), count: c.rows.length, total: c.rows.reduce((a, r) => a + r.c, 0), open };
          const mem: Row[] = open
            ? [...c.rows].reverse().map((row): Row => {
                const d = dev(c, row, props.exp);
                return {
                  kind: "mem",
                  row,
                  c,
                  tagText: !c.variable && !inWindow(c, row.d) ? (row.d < windowStart(c, row.d) ? "early" : "late") : null,
                  devText: d ? signed(d) : null,
                  devOut: !inBand(c, row, props.exp),
                };
              })
            : [];
          return [head, ...mem];
        });
    return [...unc, ...grps];
  });

  const columns: TableColumn<Row>[] = [
    {
      id: "date",
      header: "Date",
      accessor: (r) =>
        r.kind === "unc" ? <TextBody>{r.row.d}</TextBody>
        : r.kind === "mem" ? (
          <ClusterRow>
            <MutedBody>{r.row.d}</MutedBody>
            {r.tagText ? <WarningBody>{r.tagText}</WarningBody> : null}
          </ClusterRow>
        ) : "",
    },
    {
      id: "config",
      header: "Config",
      accessor: (r) =>
        r.kind === "unc" ? (r.gone ? <MutedBody>discarded</MutedBody> : <TextValueDangerSm>none</TextValueDangerSm>)
        : r.kind === "mem" ? (
          <ClusterRow>
            <MutedBody>{r.c.label}{r.c.halt ? " (halted)" : ""}</MutedBody>
            {r.devText ? (r.devOut ? <WarningBody>{r.devText}</WarningBody> : <MutedBody>{r.devText}</MutedBody>) : null}
          </ClusterRow>
        ) : "",
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      accessor: (r) =>
        r.kind === "unc" ? (r.gone ? <MutedBody>-{money(r.row.c)}</MutedBody> : <TextValueDangerSm>-{money(r.row.c)}</TextValueDangerSm>)
        : r.kind === "mem" ? <TextValueSuccessSm>-{money(r.row.c)}</TextValueSuccessSm>
        : r.kind === "grp" ? <MonoValue>-{money(r.total)}</MonoValue>
        : "",
    },
  ];

  return (
    <BaseTable
      data={rows()}
      columns={columns}
      compact
      hoverable
      class="manual-group-payments"
      getRowClass={(r) => `mg-row mg-row--${r.kind}${r.kind === "unc" && r.gone ? " mg-row--gone" : ""}`}
      onRowClick={(r) => {
        if (r.kind === "grp") props.onToggle(r.key);
      }}
      spanRow={(r) =>
        r.kind === "section"
          ? { fromColumnId: "date", content: <MutedBody>{r.label}</MutedBody> }
          : r.kind === "grp"
            ? {
                fromColumnId: "date",
                content: (
                  <SpreadRow>
                    <ClusterRow>
                      <SlotTrackSwatch />
                      <TextBody>{r.count} payments · {r.name}</TextBody>
                      <MutedBody>{r.open ? "▾" : "▸"}</MutedBody>
                    </ClusterRow>
                    <MonoMeta>-{money(r.total)}</MonoMeta>
                  </SpreadRow>
                ),
              }
            : null
      }
    />
  );
};
