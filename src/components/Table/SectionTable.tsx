// ============================================
// SectionTable — Depth 2 (zero CSS: composes TableSectionHeader + BaseTable)
// ============================================
// A table BOUND to its own section header (title + record count) as one unit.
// The header and table share a single stretch container, so the header spans the
// table's width and the record count aligns with the table's right edge — they
// are one thing, not a header that happens to sit above a table.
//
// The count is derived from the table's CURRENT `data` against `total` (the
// unfiltered size): "24 records" when `data.length === total`, "N of 24 records"
// when a filtered subset is passed. Crucially this unit owns NO filter UI — the
// filter is a SEPARATE, disconnected concern that may live anywhere (e.g. a
// dashboard-level control) and simply hands this component its already-filtered
// rows + the unfiltered total. Filter mechanism and table display stay decoupled.
import { splitProps } from "solid-js";
import { BaseTable } from "./BaseTable";
import { TableSectionHeader } from "./TableSectionHeader";
import { createStack } from "../Layout/Stack";
import type { BaseTableProps, TableRow } from "./types";

// Tight stretch column: gap:xs keeps the header close to the table, and no
// `align` override means the default `align-items: stretch` — so the header row
// spans the table's width and the record count lands at the table's right edge.
// (SmallTightStack is dense but `align:start`, which would shrink the header to
// its content and pull the count in beside the title. Its font-size:0.8rem is a
// no-op here — the header's CaptionLabel/MutedBody and the table cells all set
// their own sizes — so nothing about the type scale is lost by not using it.)
const BoundStack = createStack({ gap: "xs" });

export interface SectionTableProps<T> extends BaseTableProps<T> {
  /** Section title shown in the bound header above the table. */
  title: string;
  /**
   * Unfiltered total behind `data`. When greater than `data.length` the header
   * count reads "N of TOTAL records"; otherwise just "N records". Omit for a
   * plain "N records" that always tracks the rows shown.
   */
  total?: number;
  /** Noun for the count (default "record"); pluralized with a trailing "s". */
  countNoun?: string;
}

export function SectionTable<T extends TableRow>(props: SectionTableProps<T>) {
  const [local, tableProps] = splitProps(props, ["title", "total", "countNoun"]);
  return (
    <BoundStack>
      <TableSectionHeader
        title={local.title}
        count={props.data.length}
        total={local.total}
        countNoun={local.countNoun}
      />
      <BaseTable {...tableProps} />
    </BoundStack>
  );
}
