// TableSectionHeader — a composable header for a table/section: the title on the
// left and a record count (or custom meta) pushed to the RIGHT on the SAME line
// (space-between, baseline-aligned). Pairs a section title with its row count
// above a table without stacking two separate lines.
//
// Composes Layout + Text primitives only (BaselineSpreadRow / CaptionLabel /
// MutedBody) — no own CSS.
import { Show } from "solid-js";
import type { JSX } from "solid-js";
import { BaselineSpreadRow } from "../Layout/variants";
import { CaptionLabel, MutedBody } from "../Text/variants";

export interface TableSectionHeaderProps {
  /** Section / table title (rendered as a CaptionLabel). */
  title: string;
  /** Record count, rendered right-aligned as "N records". Omit to show none. */
  count?: number;
  /** Noun for the count (default "record"); pluralized with a trailing "s". */
  countNoun?: string;
  /** Custom right-side content. When set, it replaces the count. */
  meta?: JSX.Element;
}

export function TableSectionHeader(props: TableSectionHeaderProps) {
  return (
    <BaselineSpreadRow>
      <CaptionLabel>{props.title}</CaptionLabel>
      <Show
        when={props.meta != null}
        fallback={
          <Show when={props.count != null}>
            <MutedBody>
              {props.count} {props.countNoun ?? "record"}
              {props.count === 1 ? "" : "s"}
            </MutedBody>
          </Show>
        }
      >
        {props.meta}
      </Show>
    </BaselineSpreadRow>
  );
}
