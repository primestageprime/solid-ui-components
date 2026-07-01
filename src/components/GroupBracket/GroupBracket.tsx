// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// GroupBracket — Atomic (Depth 0)
// Owns CSS (GroupBracket.css), no component imports.
// Thin right-edge bracket cue marking which list rows belong to the
// same contiguous run of a group. Stack N members → one unbroken
// `]`-shape. Optional badge on run leaders.
// ============================================
import { type Component, type JSX, Show, splitProps } from "solid-js";
import "./GroupBracket.css";

/**
 * Position of a single row inside its group's contiguous run.
 *
 *   - `none`           — row is not part of any group; renders an empty
 *                        gutter (geometry stays stable across cluster
 *                        boundaries).
 *   - `interior`       — middle of a multi-row run; spine only.
 *   - `leader`         — first row of a multi-row run; spine + top stub
 *                        + badge.
 *   - `tail`           — last row of a multi-row run; spine + bottom
 *                        stub.
 *   - `leader-tail`    — sole row of a single-row run; spine + both
 *                        stubs + badge.
 */
export type GroupBracketPosition =
  | "none"
  | "interior"
  | "leader"
  | "tail"
  | "leader-tail";

export interface GroupBracketProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "color"> {
  position: GroupBracketPosition;
  /**
   * Stroke + badge border colour. Sets `--sui-group-bracket-color`.
   * If omitted, the bracket falls back to the inherited text colour.
   */
  color?: string;
  /**
   * Badge fill colour. Sets `--sui-group-bracket-badge-fill`. Usually
   * a translucent version of `color` — the component composites the
   * fill on top of an opaque base, so the spine doesn't read through.
   */
  badgeFill?: string;
  /**
   * Badge content (typically `×N`). Only rendered when `position` is
   * `leader` or `leader-tail`. Omit for groups that don't display a
   * count.
   */
  badge?: JSX.Element;
}

const showTopStub = (p: GroupBracketPosition): boolean =>
  p === "leader" || p === "leader-tail";

const showBottomStub = (p: GroupBracketPosition): boolean =>
  p === "tail" || p === "leader-tail";

const showBadge = (p: GroupBracketPosition): boolean =>
  p === "leader" || p === "leader-tail";

const inGroup = (p: GroupBracketPosition): boolean => p !== "none";

export const GroupBracket: Component<GroupBracketProps> = (props) => {
  const [local, others] = splitProps(props, [
    "position",
    "color",
    "badgeFill",
    "badge",
    "class",
    "style",
  ]);

  const cls = (): string => {
    const classes = ["sui-group-bracket"];
    if (local.class) classes.push(local.class);
    return classes.join(" ");
  };

  // CSS-variable channel for caller colours. Keeps every other style
  // in the stylesheet — the only inline payload is the per-instance
  // colour pair, which the type system can't express as a class.
  const inlineStyle = (): JSX.CSSProperties => {
    const result: Record<string, string> = {};
    if (local.color !== undefined) {
      result["--sui-group-bracket-color"] = local.color;
    }
    if (local.badgeFill !== undefined) {
      result["--sui-group-bracket-badge-fill"] = local.badgeFill;
    }
    return {
      ...result,
      ...((local.style as JSX.CSSProperties | undefined) ?? {}),
    } as JSX.CSSProperties;
  };

  return (
    <div
      class={cls()}
      style={inlineStyle()}
      aria-hidden={!showBadge(local.position)}
      {...others}
    >
      <Show when={inGroup(local.position)}>
        <div class="sui-group-bracket__spine" />
        <Show when={showTopStub(local.position)}>
          <div class="sui-group-bracket__stub sui-group-bracket__stub--top" />
        </Show>
        <Show when={showBottomStub(local.position)}>
          <div class="sui-group-bracket__stub sui-group-bracket__stub--bottom" />
        </Show>
        <Show when={showBadge(local.position) && local.badge !== undefined}>
          <span class="sui-group-bracket__badge">{local.badge}</span>
        </Show>
      </Show>
    </div>
  );
};
