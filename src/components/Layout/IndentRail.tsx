// ============================================
// IndentRail — Layout Primitive (Depth 1)
// Tags: shows:tree, shows:mark, does:view, data:tree, role:cell
// Shares NestedList.css, imports no component.
//
// NestedList's indent — one --sui-space-3 (12px) step per level and a 1px
// --sui-border guide rail at each ancestor position — around arbitrary
// content, with NO list semantics. For a hierarchy that lives where a
// role="listitem" cannot, such as the first cell of a TreeTable row, whose
// depth is already in the table's structure and its disclosure buttons.
//
// It applies NestedList's own row classes, so the list and the table draw one
// rail from one stylesheet: there is still one indent mechanism, not two (see
// the ConversationTree note in COMPONENTS.md). Same cap as NestedList: past
// NESTED_LIST_MAX_INDENT_STEPS the rail stops moving right and the row is
// marked capped.
//
// No Override Props: `level` is per-instance data, so this ships as a
// no-config shell like NestedListItem.
// ============================================
import { type Component, type JSX, createMemo, splitProps } from "solid-js";
import { assertModifierClass } from "../../internal/dom/assertModifierClass";
import { NESTED_LIST_MAX_INDENT_STEPS } from "./NestedList";
import "./NestedList.css";

export interface IndentRailProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * 1-based hierarchy level, as `NestedListItem`'s `level`: level 1 is a root
   * and draws no indent. Fractions floor; values below 1 clamp to 1.
   */
  level: number;
}

/** The NestedList indent and guide rail, without list semantics. */
export const IndentRail: Component<IndentRailProps> = (props) => {
  const [local, others] = splitProps(props, ["level", "class", "children"]);

  const depth = createMemo((): number =>
    Math.max(0, Math.floor(local.level) - 1),
  );
  const steps = createMemo((): number =>
    Math.min(depth(), NESTED_LIST_MAX_INDENT_STEPS),
  );

  const classes = createMemo((): string => {
    const indentClass = `sui-nested-list__row--indent-${steps()}`;
    assertModifierClass(
      "IndentRail",
      "level",
      String(local.level),
      indentClass,
    );
    const cls = ["sui-nested-list__row", indentClass];
    if (depth() > NESTED_LIST_MAX_INDENT_STEPS)
      cls.push("sui-nested-list__row--capped");
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  });

  return (
    <div class={classes()} {...others}>
      {local.children}
    </div>
  );
};
