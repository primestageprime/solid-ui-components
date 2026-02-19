import { FloatCell, IntCell, DateTimeCell, DateCell, StringCell } from "./CellRenderers";
import type { TableColumn } from "./types";

interface ColOpts<T, V> {
  field?: keyof T | ((row: T) => V);
  width?: string;
  sortable?: boolean;
}

function resolve<T, V>(id: string, field: keyof T | ((row: T) => V) | undefined, row: T): V {
  const accessor = field ?? (id as keyof T);
  return typeof accessor === "function" ? accessor(row) : (row[accessor] as V);
}

// ── Base helpers ──────────────────────────────────────────────

export function floatCol<T>(
  id: string,
  header: string,
  precision = 2,
  opts?: ColOpts<T, number | null>,
): TableColumn<T> {
  return {
    id,
    header,
    align: "right",
    width: opts?.width,
    sortable: opts?.sortable,
    accessor: (row) => <FloatCell value={resolve(id, opts?.field, row)} precision={precision} />,
  };
}

export function intCol<T>(
  id: string,
  header: string,
  opts?: ColOpts<T, number | null>,
): TableColumn<T> {
  return {
    id,
    header,
    align: "right",
    width: opts?.width,
    sortable: opts?.sortable,
    accessor: (row) => <IntCell value={resolve(id, opts?.field, row)} />,
  };
}

export function dateTimeCol<T>(
  id: string,
  header: string,
  opts?: ColOpts<T, string | null>,
): TableColumn<T> {
  return {
    id,
    header,
    width: opts?.width ?? "160px",
    sortable: opts?.sortable,
    accessor: (row) => <DateTimeCell value={resolve(id, opts?.field, row)} />,
  };
}

export function dateCol<T>(
  id: string,
  header: string,
  opts?: ColOpts<T, string | null>,
): TableColumn<T> {
  return {
    id,
    header,
    width: opts?.width,
    sortable: opts?.sortable,
    accessor: (row) => <DateCell value={resolve(id, opts?.field, row)} />,
  };
}

export function textCol<T>(
  id: string,
  header: string,
  opts?: ColOpts<T, string | null | undefined>,
): TableColumn<T> {
  return {
    id,
    header,
    width: opts?.width,
    sortable: opts?.sortable,
    accessor: (row) => <StringCell value={resolve(id, opts?.field, row)} />,
  };
}

// ── Curried factories — bake in defaults, return a simpler function ──

export function floatColWith(defaults: {
  width?: string;
  sortable?: boolean;
  precision?: number;
}) {
  return <T,>(
    id: string,
    header: string,
    precision?: number,
    opts?: ColOpts<T, number | null>,
  ): TableColumn<T> =>
    floatCol<T>(id, header, precision ?? defaults.precision ?? 2, {
      ...defaults,
      ...opts,
    });
}

export function intColWith(defaults: { width?: string; sortable?: boolean }) {
  return <T,>(
    id: string,
    header: string,
    opts?: ColOpts<T, number | null>,
  ): TableColumn<T> => intCol<T>(id, header, { ...defaults, ...opts });
}

export function dateTimeColWith(defaults: {
  width?: string;
  sortable?: boolean;
}) {
  return <T,>(
    id: string,
    header: string,
    opts?: ColOpts<T, string | null>,
  ): TableColumn<T> => dateTimeCol<T>(id, header, { ...defaults, ...opts });
}

export function textColWith(defaults: { width?: string; sortable?: boolean }) {
  return <T,>(
    id: string,
    header: string,
    opts?: ColOpts<T, string | null | undefined>,
  ): TableColumn<T> => textCol<T>(id, header, { ...defaults, ...opts });
}
