// The first cell of a Tree Table row: the NestedList indent rail, then a
// disclosure chevron (or a reserved slot on a leaf, so labels line up), then
// the label. The chevron is a real <button aria-expanded>, which is the
// disclosure pattern; the <tr> itself carries no tree role.
import type { Component, JSX } from "solid-js";
import {
  GlyphSlotGhostButton,
  ReservedGlyphSlotButton,
} from "../../../../src/components/Button";
import { Icon } from "../../../../src/components/Icon";
import { ClusterRow } from "../../../../src/components/Layout";
import { NESTED_LIST_MAX_INDENT_STEPS } from "../../../../src/components/Layout/NestedList";
import type { FlatTreeRow } from "./flatten";
import "./tree-cell.css";

export interface TreeCellProps {
  readonly flat: FlatTreeRow<unknown>;
  /** Accessible name of the row, for "Expand <name>" / "Collapse <name>". */
  readonly name: string;
  readonly onToggle: (id: string) => void;
  readonly children: JSX.Element;
}

// Bench shortcut: borrow NestedList's own rail classes so the list and the
// table draw the same 12px step and 1px guide rail. A promoted TreeTable needs
// a public indent part instead of reaching into NestedList's class names.
const indentClass = (depth: number): string =>
  `sui-nested-list__row sui-nested-list__row--indent-${Math.min(depth, NESTED_LIST_MAX_INDENT_STEPS)}`;

export const TreeCell: Component<TreeCellProps> = (props) => (
  <div class={indentClass(props.flat.depth)}>
    <ClusterRow>
      {props.flat.hasChildren ? (
        <GlyphSlotGhostButton
          class="tree-cell__toggle"
          aria-expanded={props.flat.expanded}
          aria-label={`${props.flat.expanded ? "Collapse" : "Expand"} ${props.name}`}
          onClick={(e) => {
            // The row click toggles too; stop here so one click is one toggle.
            e.stopPropagation();
            props.onToggle(props.flat.id);
          }}
        >
          <Icon
            name={props.flat.expanded ? "chevron-down" : "chevron-right"}
            size="xs"
          />
        </GlyphSlotGhostButton>
      ) : (
        <ReservedGlyphSlotButton
          class="tree-cell__toggle"
          tabindex={-1}
          aria-hidden="true"
        >
          <Icon name="chevron-right" size="xs" />
        </ReservedGlyphSlotButton>
      )}
      {props.children}
    </ClusterRow>
  </div>
);
