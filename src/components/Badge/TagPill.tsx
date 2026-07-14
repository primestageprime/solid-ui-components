// ============================================
// TagPill — Composed (Depth 2)
// Owns CSS (TagPill.css) as a deliberate Depth-2 exception (pill chrome is
// intrinsic). Composes DigitRoller for one case: a PURELY NUMERIC plain
// label rolls odometer-style when its value changes (numeric counts roll
// by default — Peter, 2026-07-14). Non-numeric labels render as before.
// The roll requires the pill instance to SURVIVE the change — list callers
// use <Index>/stable keys, not <For> over rebuilt objects.
// Placement: lives in src/components/Badge/ as a sibling of CountChip (a separate
// pill primitive, NOT a StatusBadge variant — different data model), to keep
// pill/lozenge indicators in one family.
//
// A pill tag. A plain label renders as a single lozenge; a label containing a
// ":" (or the explicit `{ key, value }` form) renders as a SPLIT lozenge — a
// bold namespace segment, a hairline divider, then the value segment, both
// sides sharing the same colours (strong type is the only differentiator).
// `active` tints the pill with the accent background (e.g. it matched the
// active filter) — a data flag, not a style knob.
//
// Relationship to the Badge family: TagPill is the free-text, filter-oriented
// sibling of StatusBadge (compliance-variant status) and CountChip (a count +
// label). Where those encode a fixed enum / a number, TagPill carries an
// arbitrary label or namespace:value pair and its `active` marks a filter hit.
//
// NO curried variant — intentional, and by rule: every prop is data
// (`tag` / `key` / `value` / `active`), nothing presentational to freeze. Same
// data-only exemption as SortableList.
// ============================================
import { Component, Show } from "solid-js";
import { DigitRoller } from "../DataDisplay/DigitRoller";
import "./TagPill.css";

const isNumericLabel = (s: string) => /^\d+$/.test(s);

/** Free label — a ":" splits it into namespace:value. */
export interface TagPillLabel {
  label: string;
  /** Highlighted (e.g. matched the active filter). Data-driven, not a style knob. */
  active?: boolean;
}

/** Explicit namespace:value — always renders as the split lozenge. */
export interface TagPillKeyValue {
  key: string;
  value: string;
  active?: boolean;
}

export type TagPillData = TagPillLabel | TagPillKeyValue;

export interface TagPillProps {
  tag: TagPillData;
}

const isKeyValue = (tag: TagPillData): tag is TagPillKeyValue =>
  (tag as TagPillKeyValue).key !== undefined;

export const TagPill: Component<TagPillProps> = (props) => {
  // Normalise both shapes to { ns, val, active }. A plain label with a ":"
  // splits at the first colon; the explicit { key, value } form is always split.
  const parts = () => {
    const tag = props.tag;
    if (isKeyValue(tag)) {
      return { ns: tag.key, val: tag.value, active: tag.active, split: true, label: `${tag.key}:${tag.value}` };
    }
    const at = tag.label.indexOf(":");
    if (at > 0) {
      return {
        ns: tag.label.slice(0, at),
        val: tag.label.slice(at + 1),
        active: tag.active,
        split: true,
        label: tag.label,
      };
    }
    return { ns: "", val: tag.label, active: tag.active, split: false, label: tag.label };
  };

  return (
    <Show
      when={parts().split}
      fallback={
        <span
          class="sui-tag-pill"
          classList={{ "sui-tag-pill--active": parts().active }}
        >
          <Show when={isNumericLabel(parts().label)} fallback={parts().label}>
            <DigitRoller value={parts().label} />
          </Show>
        </span>
      }
    >
      <span
        class="sui-tag-pill sui-tag-pill--split"
        classList={{ "sui-tag-pill--active": parts().active }}
      >
        <span class="sui-tag-pill__ns">{parts().ns}</span>
        <span class="sui-tag-pill__val">{parts().val}</span>
      </span>
    </Show>
  );
};
