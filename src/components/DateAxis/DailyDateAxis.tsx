// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
import { type Component, type JSX, createMemo } from "solid-js";
import { DateAxis } from "./DateAxis";
import { dailyCells, isSameCalendarDay, type Cell } from "./cells";
import {
  dayCellContent,
  dayCellContext,
  type DayCellContext,
} from "./dayCellContent";

export interface DailyDateAxisProps {
  start: Date;
  end: Date;
  today?: Date;
  /** Highlighted day — translated to a cell index internally. */
  selected?: Date;
  cellWidth?: number;
  onDayClick?: (day: Date) => void;
  /** Per-day renderer. When omitted, `dayCellContent` is used. */
  renderDay?: (day: Date, ctx: DayCellContext) => JSX.Element;
}

/**
 * Day-cell curried variant of DateAxis. Restores the original ergonomics:
 * pass `start` / `end` + optional `selected: Date` and `onDayClick`, and get
 * a fully formed day-cell ribbon back. Forwards to the generic DateAxis
 * under the hood with `dailyCells(...)` and the default `dayCellContent`
 * renderer.
 */
export const DailyDateAxis: Component<DailyDateAxisProps> = (props) => {
  const cells = createMemo(() => dailyCells(props.start, props.end));
  const selectedIndex = createMemo(() => {
    if (props.selected === undefined) return undefined;
    const target = props.selected;
    const idx = cells().findIndex((c) => isSameCalendarDay(c.start, target));
    return idx >= 0 ? idx : undefined;
  });

  return (
    <DateAxis<Cell>
      cells={cells()}
      selected={selectedIndex()}
      today={props.today}
      cellWidth={props.cellWidth}
      onCellClick={
        props.onDayClick !== undefined
          ? (_idx, cell) => props.onDayClick!(cell.start)
          : undefined
      }
      renderCell={(cell, ctx) => {
        const dayCtx = dayCellContext(cell, ctx);
        if (props.renderDay) return props.renderDay(cell.start, dayCtx);
        return dayCellContent(cell, dayCtx);
      }}
    />
  );
};
