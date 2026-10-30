// ============================================
// TieableRankList — Composite (Depth 3)
// Tags: shows:list, shows:card, shows:button, does:drag, does:reorder, does:toggle, does:hotkey, data:list, data:grouped, role:container
// Composes `SortableList` (Depth 2, bare chrome) + `CompactSurface` +
// `LabeledDivider` + `ClusterRow` / `CenteredWrapRow` / `GrowBox` /
// `TightStack` (Layout) + `SmallPrimaryButton` / `SmallGhostButton`. Owns zero
// CSS and zero inline style.
//
// A RANKING THAT ALLOWS "THESE ARE EQUAL TO ME". Items in one tier JOIN into
// one card (Peter, 2026-10-29: "when you set something equal, they should
// visually join into one"): a single surface, one rank badge for the tier, and
// a hairline divider between the tied items carrying the ≠ untie control. An
// untied item is a card of one. Between two cards, in the gap, sits = to join
// them. Each item may end with a caller-supplied action (a veto, a remove).
//
// THE MODEL is `order` + `ties` (one flag per gap, see `tieGroups.ts`), and
// the pure ops — toTiers, fromTiers, ranksOf, toggleTie, tieAll, splitAll,
// retie, moveBy, moveTier — are exported so a store applies them headlessly.
//
// MOVING. Drag a card to move its whole tier. To move ONE item out of a tier,
// untie it (≠) and drag it, or use the keyboard. KEYBOARD: each rank badge is
// a button; Alt+ArrowUp / Alt+ArrowDown moves the tier one place and focus
// follows. The = and ≠ controls are ordinary buttons with `aria-pressed`.
// ============================================
import { type JSX, For, Show, mergeProps } from "solid-js";
import { SmallGhostButton, SmallPrimaryButton } from "../Button";
import { LabeledDivider } from "../LabeledDivider";
import { CenteredWrapRow, ClusterRow, GrowBox, TightStack } from "../Layout";
import { SortableList } from "../SortableList";
import { CompactSurface } from "../Surface";
import { join, map } from "../../fn";
import { indexOfId } from "./indexOfId";
import {
  type TieFlags,
  fromTiers,
  moveTier,
  toTiers,
  toggleTie,
} from "./tieGroups";

export interface TieableRankListProps<T> {
  /** Items best-first. */
  readonly items: readonly T[];
  readonly getId: (item: T) => string;
  /** One flag per gap: ties[i] ties items[i] with items[i + 1]. */
  readonly ties: TieFlags;
  /** The new order (ids) and ties after a drag, a keyboard move or a tie toggle. */
  readonly onChange: (order: string[], ties: boolean[]) => void;
  /** Item content, left of the action. */
  readonly renderItem: (item: T) => JSX.Element;
  /** Optional trailing control per item (e.g. a veto button). */
  readonly renderAction?: (item: T) => JSX.Element;
  /** Short name of an item for the rank and tie buttons' labels. Defaults to its id. */
  readonly itemLabel?: (item: T) => string;
  /** Accessible name of the list. Default "Ranking". */
  readonly label?: string;
}

const TIER_KEY = "\u0000";

export function TieableRankList<T>(
  props: TieableRankListProps<T>,
): JSX.Element {
  const ids = () => {
    const out: string[] = [];
    for (const item of props.items) out.push(props.getId(item));
    return out;
  };
  const byId = () => {
    const m = new Map<string, T>();
    for (const item of props.items) m.set(props.getId(item), item);
    return m;
  };
  const tiers = () => toTiers(ids(), props.ties);
  const tierKey = (tier: readonly string[]) => join(TIER_KEY, tier);
  const tierKeys = () => map(tierKey, tiers());
  const name = (id: string) => {
    const item = byId().get(id);
    return item === undefined ? id : (props.itemLabel?.(item) ?? id);
  };
  const tierName = (tier: readonly string[]) => join(" = ", map(name, tier));
  let root: HTMLDivElement | undefined;

  const move = (tier: readonly string[], delta: -1 | 1) => {
    const t = indexOfId(tierKeys(), tierKey(tier));
    const next = moveTier(ids(), props.ties, t, delta);
    props.onChange(next.order, next.ties);
    queueMicrotask(() =>
      root
        ?.querySelector<HTMLButtonElement>(
          `[data-rank-id="${CSS.escape(tier[0])}"]`,
        )
        ?.focus(),
    );
  };
  const onRankKey = (e: KeyboardEvent, tier: readonly string[]) => {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    move(tier, e.key === "ArrowUp" ? -1 : 1);
  };
  const toggleAt = (id: string) =>
    props.onChange(ids(), toggleTie(props.ties, indexOfId(ids(), id)));

  return (
    <TightStack ref={root}>
      <SortableList
        label={props.label ?? "Ranking"}
        rowChrome="bare"
        items={tiers()}
        getId={tierKey}
        onReorder={(keys) => {
          const lookup = new Map<string, readonly string[]>();
          for (const t of tiers()) lookup.set(tierKey(t), t);
          const next = fromTiers(map((k: string) => lookup.get(k) ?? [], keys));
          props.onChange(next.order, next.ties);
        }}
        renderItem={(tier) => {
          const t = () => indexOfId(tierKeys(), tierKey(tier));
          const nextTier = () => tiers()[t() + 1];
          return (
            <TightStack>
              <CompactSurface>
                <ClusterRow>
                  <SmallPrimaryButton
                    data-rank-id={tier[0]}
                    aria-label={`Rank ${t() + 1}: ${tierName(tier)}. Alt+Up or Alt+Down moves it.`}
                    aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                    onKeyDown={(e) => onRankKey(e, tier)}
                  >
                    {t() + 1}
                  </SmallPrimaryButton>
                  <GrowBox>
                    <TightStack>
                      <For each={tier}>
                        {(id, i) => (
                          <>
                            <Show when={i() > 0}>
                              <LabeledDivider
                                aria-label={`${name(tier[i() - 1])} tied with ${name(id)}`}
                                label={
                                  <SmallGhostButton
                                    aria-pressed={true}
                                    aria-label={`Untie ${name(tier[i() - 1])} from ${name(id)}`}
                                    onClick={() => toggleAt(tier[i() - 1])}
                                  >
                                    ≠
                                  </SmallGhostButton>
                                }
                              />
                            </Show>
                            <ClusterRow>
                              <GrowBox>
                                {props.renderItem(byId().get(id) as T)}
                              </GrowBox>
                              <Show when={props.renderAction}>
                                {(render) => render()(byId().get(id) as T)}
                              </Show>
                            </ClusterRow>
                          </>
                        )}
                      </For>
                    </TightStack>
                  </GrowBox>
                </ClusterRow>
              </CompactSurface>
              <Show when={nextTier()}>
                {(nt) => (
                  <CenteredWrapRow>
                    <SmallGhostButton
                      aria-pressed={false}
                      aria-label={`Tie ${name(tier[tier.length - 1])} with ${name(nt()[0])}`}
                      onClick={() => toggleAt(tier[tier.length - 1])}
                    >
                      =
                    </SmallGhostButton>
                  </CenteredWrapRow>
                )}
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
