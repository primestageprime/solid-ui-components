// ============================================
// TieableRankList — Composite (Depth 3)
// Tags: shows:list, shows:button, does:drag, does:reorder, does:toggle, does:hotkey, data:list, data:grouped, role:container
// Composes `SortableList` (Depth 2) + `ClusterRow` / `CenteredWrapRow` /
// `GrowBox` (Layout) + `SmallPrimaryButton` / `SmallGhostButton`. Owns zero
// CSS and zero inline style.
//
// A RANKING THAT ALLOWS "THESE ARE EQUAL TO ME". Drag rows into order; between
// every pair of neighbours sits a tie toggle (= / ≠) that groups them, and a
// run of ties is an N-way tie that shares one rank. Each row leads with its
// rank and may end with a caller-supplied action (a veto, a remove).
//
// THE MODEL is `order` + `ties` (one flag per gap, see `tieGroups.ts`), and
// the pure ops — toTiers, ranksOf, toggleTie, tieAll, splitAll, retie, moveBy
// — are exported so a store applies them headlessly (a "tie all" button, a
// server tally). On a drag the ties are re-derived by `retie`: neighbours stay
// tied only if they were in the same tier before, so a tie travels with its
// items and an item dropped between two tied items splits them.
//
// KEYBOARD: each rank is a
// button; Alt+ArrowUp / Alt+ArrowDown on it moves that row one place, and
// focus follows the row. The tie toggles are ordinary buttons with
// `aria-pressed`.
// ============================================
import { type JSX, Show, mergeProps } from "solid-js";
import { indexOfId } from "./indexOfId";
import { CenteredWrapRow, ClusterRow, GrowBox, TightStack } from "../Layout";
import { SmallGhostButton, SmallPrimaryButton } from "../Button";
import { SortableList } from "../SortableList";
import { type TieFlags, moveBy, ranksOf, retie, toggleTie } from "./tieGroups";

export interface TieableRankListProps<T> {
  /** Items best-first. */
  readonly items: readonly T[];
  readonly getId: (item: T) => string;
  /** One flag per gap: ties[i] ties items[i] with items[i + 1]. */
  readonly ties: TieFlags;
  /** The new order (ids) and ties after a drag, a keyboard move or a tie toggle. */
  readonly onChange: (order: string[], ties: boolean[]) => void;
  /** Row content between the rank and the action. */
  readonly renderItem: (item: T) => JSX.Element;
  /** Optional trailing control per row (e.g. a veto button). */
  readonly renderAction?: (item: T) => JSX.Element;
  /** Short name of an item for the rank and tie buttons' labels. Defaults to its id. */
  readonly itemLabel?: (item: T) => string;
  /** Accessible name of the list. Default "Ranking". */
  readonly label?: string;
}

export function TieableRankList<T>(
  props: TieableRankListProps<T>,
): JSX.Element {
  const ids = () => {
    const out: string[] = [];
    for (const item of props.items) out.push(props.getId(item));
    return out;
  };
  const ranks = () => ranksOf(ids(), props.ties);
  const name = (item: T) => props.itemLabel?.(item) ?? props.getId(item);
  let root: HTMLDivElement | undefined;

  const move = (item: T, delta: -1 | 1) => {
    const id = props.getId(item);
    const next = moveBy(ids(), props.ties, indexOfId(ids(), id), delta);
    props.onChange(next.order, next.ties);
    queueMicrotask(() =>
      root
        ?.querySelector<HTMLButtonElement>(`[data-rank-id="${CSS.escape(id)}"]`)
        ?.focus(),
    );
  };
  const onRankKey = (e: KeyboardEvent, item: T) => {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    move(item, e.key === "ArrowUp" ? -1 : 1);
  };

  return (
    <TightStack ref={root}>
      <SortableList
        label={props.label ?? "Ranking"}
        items={[...props.items]}
        getId={props.getId}
        onReorder={(next) =>
          props.onChange(next, retie(ids(), props.ties, next))
        }
        renderItem={(item) => {
          const i = () => indexOfId(ids(), props.getId(item));
          const neighbour = () => props.items[i() + 1];
          const tied = () => props.ties[i()] ?? false;
          return (
            <TightStack>
              <ClusterRow>
                <SmallPrimaryButton
                  data-rank-id={props.getId(item)}
                  aria-label={`Rank ${ranks()[props.getId(item)]}: ${name(item)}. Alt+Up or Alt+Down moves it.`}
                  aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                  onKeyDown={(e) => onRankKey(e, item)}
                >
                  {ranks()[props.getId(item)]}
                </SmallPrimaryButton>
                <GrowBox>{props.renderItem(item)}</GrowBox>
                <Show when={props.renderAction}>
                  {(render) => render()(item)}
                </Show>
              </ClusterRow>
              <Show when={neighbour() !== undefined}>
                <CenteredWrapRow>
                  <SmallGhostButton
                    aria-pressed={tied()}
                    aria-label={
                      tied()
                        ? `Untie ${name(item)} from ${name(neighbour() as T)}`
                        : `Tie ${name(item)} with ${name(neighbour() as T)}`
                    }
                    onClick={() =>
                      props.onChange(ids(), toggleTie(props.ties, i()))
                    }
                  >
                    {tied() ? "≠ untie" : "="}
                  </SmallGhostButton>
                </CenteredWrapRow>
              </Show>
            </TightStack>
          );
        }}
      />
    </TightStack>
  );
}

/** Visual overrides — none today; one look. */
export type TieableRankListOverrides = Record<string, never>;

/** Props that remain available to consumers of a curried TieableRankList variant. */
export type TieableRankListDataProps<T> = TieableRankListProps<T>;

export function createTieableRankList(
  defaults: Partial<TieableRankListOverrides> = {},
): <T>(props: TieableRankListDataProps<T>) => JSX.Element {
  return (props) => <TieableRankList {...mergeProps(defaults, props)} />;
}
