// ============================================
// DataList — Depth 3 (zero CSS)
// Composes Cell (curried) + Text (curried) +
// StatusBadge (Atomic). Semantic data table
// with DTable, DT, DD, DRow, Badge, Val, etc.
// ============================================
import { Component, JSX, ParentComponent } from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  CellTable,
  CellRow,
  KVTable,
  BorderRow,
  DataTerm,
  DataTermMuted,
  DataValue,
  DataValueHighlight,
  DataValueSuccess,
  DataValuePrimary,
  DataValueMuted,
  DataHeader,
  DataHeaderRight,
  DataHeaderCenter,
} from "../Cell";
import { InlineUnits } from "../Text/variants";
import { StatusBadge } from "../Badge/StatusBadge";

/** Data table wrapper - compact key-value display */
export const DTable: ParentComponent<{ class?: string }> = (props) => (
  <KVTable class={props.class}>{props.children}</KVTable>
);

/** Data table with thead support */
export const DTableWithHeader: ParentComponent<{ class?: string; header?: JSX.Element }> = (props) => (
  <CellTable header={props.header} class={props.class}>{props.children}</CellTable>
);

/** Header row */
export const DHeader: ParentComponent = (props) => (
  <BorderRow class="cell-row--header">{props.children}</BorderRow>
);

/** Header cell */
export interface DHProps {
  align?: "left" | "right" | "center";
  class?: string;
}

const dhVariants = {
  left: DataHeader,
  right: DataHeaderRight,
  center: DataHeaderCenter,
} as const;

export const DH: ParentComponent<DHProps> = (props) => {
  const Comp = () => dhVariants[props.align ?? "left"];
  return (
    <Dynamic component={Comp()} class={props.class}>
      {props.children}
    </Dynamic>
  );
};

/** Data row */
export interface DRowProps {
  border?: boolean;
  highlight?: boolean;
  class?: string;
}

export const DRow: ParentComponent<DRowProps> = (props) => (
  <CellRow border={props.border} highlight={props.highlight} class={props.class}>
    {props.children}
  </CellRow>
);

/** Description term (label cell) */
export interface DTProps {
  muted?: boolean;
  class?: string;
}

const dtVariants = {
  default: DataTerm,
  muted: DataTermMuted,
} as const;

export const DT: ParentComponent<DTProps> = (props) => {
  const variant = () => (props.muted ? "muted" : "default") as keyof typeof dtVariants;
  return (
    <Dynamic component={dtVariants[variant()]} class={props.class}>
      {props.children}
    </Dynamic>
  );
};

/** Description data (value cell) */
export interface DDProps {
  highlight?: boolean;
  success?: boolean;
  primary?: boolean;
  muted?: boolean;
  center?: boolean;
  class?: string;
}

const ddVariants = {
  highlight: DataValueHighlight,
  success: DataValueSuccess,
  primary: DataValuePrimary,
  muted: DataValueMuted,
  default: DataValue,
} as const;

export const DD: ParentComponent<DDProps> = (props) => {
  const variant = (): keyof typeof ddVariants => {
    if (props.highlight) return "highlight";
    if (props.success) return "success";
    if (props.primary) return "primary";
    if (props.muted) return "muted";
    return "default";
  };

  return (
    <Dynamic
      component={ddVariants[variant()]}
      align={props.center ? "center" : undefined}
      class={props.class}
    >
      {props.children}
    </Dynamic>
  );
};

/** Units suffix - muted text after value */
export const Units: ParentComponent = (props) => (
  <InlineUnits>{props.children}</InlineUnits>
);

/** Badge - small inline label (backwards-compat wrapper for StatusBadge) */
export interface BadgeProps {
  variant?: "default" | "high" | "success" | "warning" | "error";
  class?: string;
}

const badgeVariantMap: Record<string, "compliant" | "violation" | "warning" | "pending" | "info"> = {
  default: "info",
  high: "info",
  success: "compliant",
  warning: "warning",
  error: "violation",
};

export const Badge: ParentComponent<BadgeProps> = (props) => (
  <StatusBadge variant={badgeVariantMap[props.variant ?? "default"]} size="sm" class={props.class}>
    {props.children}
  </StatusBadge>
);

// ============================================
// Value Display Helpers
// ============================================

/** Display a numeric value with optional precision and fallback */
export interface ValProps {
  value: number | null | undefined;
  precision?: number;
  fallback?: string;
}

export const Val: Component<ValProps> = (props) => {
  const display = () => {
    if (props.value == null) return props.fallback ?? "—";
    const precision = props.precision ?? 2;
    return props.value.toFixed(precision);
  };
  return <>{display()}</>;
};

/** Display a numeric value with significant figures */
export interface SigFigProps {
  value: number | null | undefined;
  figures?: number;
  fallback?: string;
}

export const SigFig: Component<SigFigProps> = (props) => {
  const display = () => {
    if (props.value == null) return props.fallback ?? "—";
    const figures = props.figures ?? 4;
    return props.value.toPrecision(figures);
  };
  return <>{display()}</>;
};
