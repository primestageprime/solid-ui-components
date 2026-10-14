// ============================================
// TreeTable — Composite (Depth 2)
// No CSS. Composes BaseTable, IndentRail, ClusterRow, DisclosureButton,
// ReservedDisclosureButton, Icon and SmallCheckbox.
//
// A table whose parent rows expand to show the smaller rows they are made of.
// The caller passes a tree (`data` + `childrenOf`); TreeTable flattens the
// visible part into BaseTable rows. The first column carries the hierarchy:
// NestedList's indent and guide rail (via IndentRail), a disclosure chevron
// on a parent, and an optional checkbox. Every other column renders exactly
// as it would in BaseTable, on the parent row too — a parent shows its own
// aggregate values, not a spanning summary (ruled 2026-10-14).
//
// State. `expanded` is controlled only. The checkbox selection is controlled
// too, and holds LEAF ids: a parent's box is derived from its leaves (all →
// checked, some → indeterminate), and checking a parent checks every leaf
// under it. The sort is owned here: BaseTable runs in its controlled mode and
// TreeTable sorts SIBLINGS inside each parent, so a child never leaves its
// parent. Parents sort by their own `sortValue`, i.e. their aggregates.
//
// A11y: a plain table, with the disclosure on a real <button aria-expanded>.
// Not role="treegrid" — nothing here provides its arrow-key contract (the
// same reasoning as NestedList's list-not-tree note in COMPONENTS.md).
// ============================================
import { type JSX, createMemo, createSignal } from "solid-js";
import { DisclosureButton, ReservedDisclosureButton } from "../Button";
import { SmallCheckbox } from "../Checkbox";
import { Icon } from "../Icon";
import { ClusterRow, IndentRail } from "../Layout";
import { BaseTable } from "../Table/BaseTable";
import {
  type BaseTableProps,
  type TableColumn,
  type TableRow,
  type TableSort,
  getCellValue,
} from "../Table/types";
import { find, map } from "../../fn";
import { type FlatTreeRow, flattenTree } from "./flattenTree";
import {
  type CheckState,
  type TreeShape,
  checkState,
  leafIds,
  leafIdsOf,
  setChecked,
} from "./treeSelection";

/** Controlled checkbox selection: the set of checked LEAF ids. */
export interface TreeTableSelection {
  readonly selected: ReadonlySet<string>;
  readonly onChange: (next: ReadonlySet<string>) => void;
}

export interface TreeTableProps<T extends TableRow>
  extends Pick<
    BaseTableProps<FlatTreeRow<T>>,
    | "maxHeight"
    | "fill"
    | "stickyHeader"
    | "striped"
    | "hoverable"
    | "compact"
    | "fixedLayout"
    | "fit"
    | "emptyMessage"
    | "class"
  > {
  /** The root rows. */
  data: readonly T[];
  /**
   * Columns over the ORIGINAL row type. The first column is the tree column:
   * its cell gains the indent, the chevron and (with `selection`) the
   * checkbox. `sortable` + `sortValue` sort siblings within each parent.
   */
  columns: TableColumn<T>[];
  /** A row's children; `undefined` or `[]` makes it a leaf. */
  childrenOf: (row: T) => readonly T[] | undefined;
  /** Stable id per row, unique across the whole tree. */
  getRowId: (row: T) => string;
  /** Accessible name of a row, for "Expand <name>" and "Select <name>". */
  getRowLabel: (row: T) => string;
  /** Ids of the open parents. Controlled only. */
  expanded: ReadonlySet<string>;
  /** Called with a parent's id when its chevron or its row is clicked. */
  onToggle: (id: string) => void;
  /** Turns on the checkbox column. Omit for a table with no checkboxes. */
  selection?: TreeTableSelection;
}

/** Nulls last; strings by `localeCompare`; everything else numerically. */
const compareValues = (a: unknown, b: unknown): number => {
  if (a == null) return b == null ? 0 : 1;
  if (b == null) return -1;
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
  return Number(a) - Number(b);
};

const sortValueOf = <T,>(column: TableColumn<T>, row: T): unknown =>
  column.sortValue
    ? column.sortValue(row)
    : typeof column.accessor === "function"
      ? undefined
      : row[column.accessor];

export function TreeTable<T extends TableRow>(props: TreeTableProps<T>) {
  const shape: TreeShape<T> = {
    childrenOf: (row) => props.childrenOf(row),
    getRowId: (row) => props.getRowId(row),
  };

  const [sort, setSort] = createSignal<TableSort | null>(null);

  const compare = createMemo(() => {
    const s = sort();
    const column = s
      ? find((c: TableColumn<T>) => c.id === s.columnId, props.columns)
      : undefined;
    if (!s || !column) return undefined;
    const sign = s.direction === "asc" ? 1 : -1;
    return (a: T, b: T): number => {
      const va = sortValueOf(column, a);
      const vb = sortValueOf(column, b);
      // Nulls stay last in both directions, as in BaseTable.
      if (va == null || vb == null) return compareValues(va, vb);
      return sign * compareValues(va, vb);
    };
  });

  const rows = createMemo(() =>
    flattenTree(props.data, {
      ...shape,
      expanded: props.expanded,
      compare: compare(),
    }),
  );

  // Reads `props.selection` inside the reactive state, never a captured copy:
  // the caller hands a new selection object each time the set changes.
  const box = (leaves: () => readonly string[], label: string): JSX.Element => {
    const selected = (): ReadonlySet<string> =>
      props.selection?.selected ?? new Set<string>();
    const state = (): CheckState => checkState(leaves(), selected());
    return (
      <SmallCheckbox
        aria-label={label}
        checked={state() === "checked"}
        indeterminate={state() === "indeterminate"}
        // A row click expands and collapses; a click on the box must not.
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={(on) =>
          props.selection?.onChange(setChecked(leaves(), on, selected()))
        }
      />
    );
  };

  const treeCell = (
    flat: FlatTreeRow<T>,
    content: JSX.Element,
  ): JSX.Element => {
    const label = props.getRowLabel(flat.row);
    return (
      <IndentRail level={flat.depth + 1}>
        <ClusterRow>
          {flat.hasChildren ? (
            <DisclosureButton
              aria-expanded={flat.expanded}
              aria-label={`${flat.expanded ? "Collapse" : "Expand"} ${label}`}
              onClick={(e) => {
                // The row click toggles too; one click is one toggle.
                e.stopPropagation();
                props.onToggle(flat.id);
              }}
            >
              <Icon
                name={flat.expanded ? "chevron-down" : "chevron-right"}
                size="xs"
              />
            </DisclosureButton>
          ) : (
            // A reserved slot: hidden, but it keeps the labels in line.
            <ReservedDisclosureButton tabindex={-1}>
              <Icon name="chevron-right" size="xs" />
            </ReservedDisclosureButton>
          )}
          {props.selection
            ? box(() => leafIds(flat.row, shape), `Select ${label}`)
            : null}
          {content}
        </ClusterRow>
      </IndentRail>
    );
  };

  const columns = createMemo((): TableColumn<FlatTreeRow<T>>[] =>
    map(
      (column: TableColumn<T>, index: number): TableColumn<FlatTreeRow<T>> => {
        const cell = (flat: FlatTreeRow<T>): JSX.Element =>
          getCellValue(flat.row, column);
        const isTree = index === 0;
        return {
          id: column.id,
          header:
            isTree && props.selection ? (
              <ClusterRow>
                {box(() => leafIdsOf(props.data, shape), "Select all")}
                {column.header}
              </ClusterRow>
            ) : (
              column.header
            ),
          accessor: isTree ? (flat) => treeCell(flat, cell(flat)) : cell,
          width: column.width,
          minWidth: column.minWidth,
          contained: column.contained,
          align: column.align,
          ellipsis: column.ellipsis,
          sortable: column.sortable,
          group: column.group,
        };
      },
      props.columns,
    ),
  );

  return (
    <BaseTable
      data={rows()}
      columns={columns()}
      maxHeight={props.maxHeight}
      fill={props.fill}
      stickyHeader={props.stickyHeader}
      striped={props.striped}
      hoverable={props.hoverable}
      compact={props.compact}
      fixedLayout={props.fixedLayout}
      fit={props.fit}
      emptyMessage={props.emptyMessage}
      class={props.class}
      sort={sort()}
      onSortChange={setSort}
      onRowClick={(flat) => {
        if (flat.hasChildren) props.onToggle(flat.id);
      }}
    />
  );
}
