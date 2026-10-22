// The public prop types of MutationSliders. Types only — the component is in
// MutationSliders.tsx, which re-exports these names unchanged.
import type { Component, JSX } from "solid-js";
import type { Domain, Entity } from "../MarkedSlider/geometry";
import type { SliderGroup } from "./groups";
import type { MutationSliderLabels } from "./labels";
import type { ReadoutMode } from "./readouts";

export interface MutationSlidersProps {
  /** One dial per entity, drawn in the order given — that order is the reading order. */
  entities: readonly Entity[];
  /**
   * The shared `[min, max]` the TRACK runs, in the consumer's own units. Every
   * dial in the row uses it, which is what makes two dials comparable.
   *
   * OPTIONAL. Left out, it is DERIVED from the entities — the lowest range
   * floor to the highest range ceiling — so the ranges fill the dial's full
   * height instead of huddling in part of it. That is nearly always what you
   * want: a caller-chosen domain is usually too generous at one end, and the
   * entities already state the interesting range.
   *
   * Pass one only to hold the track STILL: a scale that must not move as
   * entities come and go, or two rows that have to be read against each other.
   */
  domain?: Domain;
  /**
   * Called when a drag or a thumb-moving key changes one entity's future
   * amount. The value is already clamped into that entity's allowed range —
   * this never emits a figure the range does not permit.
   */
  onChange: (id: string, value: number) => void;
  /**
   * Called ONCE when a gesture COMMITS — the pointer is released, or an arrow
   * key has finished its step. The value is clamped into the range, exactly as
   * `onChange` is.
   *
   * `onChange` fires on every intermediate unit of a drag, which is what a
   * readout wants and what anything EXPENSIVE does not: a consumer that keys
   * derived state by the amount would rebuild it hundreds of times across one
   * drag, at amounts the reader never chose. Take this one for persistence,
   * derived state, or anything that recomputes.
   */
  onChangeEnd?: (id: string, value: number) => void;
  /**
   * Round every emitted amount onto a grid of this size — `1000` to land an
   * amount on whole thousands (Peter, 2026-09-16: "Do have the ... amount snap
   * to whole $k numbers").
   *
   * OPTIONAL, and omitted the drag stays continuous to the finest unit the
   * domain can express. This is NOT the `step` prop I declined earlier: that
   * one would have set how far a KEY moves, which is a property of the scale
   * and is derived. This sets which values EXIST, which is a property of the
   * consumer's domain — some quantities come in round units even though the
   * arithmetic does not care.
   *
   * The allowed range still wins at the edges: a ceiling that is not a
   * multiple of `snap` is emitted exactly as it stands rather than rounded
   * past itself. It also raises the arrow-key step when it is coarser, so the
   * keyboard cannot land between the rungs a drag is confined to.
   */
  snap?: number;
  /**
   * The words the dial says on the consumer's behalf — the two footer actions
   * and the readout for an entity with no prior amount.
   *
   * OPTIONAL, defaulting to `"Remove"` / `"Restore"` / `"New"`. This component
   * knows nothing about what its entities ARE, so it cannot know whether
   * taking one out is called terminating, cancelling or deleting. Supply the
   * consumer's own verbs here and the domain vocabulary stays at the call
   * site, where it belongs.
   */
  labels?: MutationSliderLabels;
  /**
   * Called when the ⊗ under a dial is pressed. Omitted, no ⊗ is drawn at all
   * and a removed entity still reads as removed by its struck-through name.
   */
  onRemove?: (id: string) => void;
  /**
   * Called when the ↺ under a REMOVED entity is pressed. Omitted, no ↺ is
   * drawn and a removed entity has no way back — which is the right shape for
   * a consumer whose scenarios are append-only.
   *
   * What "restore" MEANS is the consumer's: this component holds no memory of
   * what the entity was worth before it was removed, and inventing one would
   * put a second, stale copy of the truth inside the widget. The obvious
   * reading is `value = old` — put it back on the amount it came in at — and
   * the range floor for something that never had an `old` at all.
   */
  onRestore?: (id: string) => void;
  /**
   * Turns each present dial's footer into a split pair, Reset | Delete,
   * instead of the single ⊗ (Peter, 2026-09-24). Omitted, the footer is
   * exactly what it always was.
   *
   * RESET IS A MOVE, not a setter (Peter, 2026-09-24): a dial with a prior
   * amount goes back to it through `onChange` / `onChangeEnd`, exactly as a
   * drag would — so a LINKED group follows it to that level, and any member
   * that cannot stand there (outside its range, or removed) drops out of the
   * selection through `onSelectionChange` (links.ts, `resetLinked`). This
   * callback is called only for a dial with NO prior amount — a new entity —
   * whose reset means whatever the consumer says it means.
   *
   * Neither Reset nor Delete confirms here — a consumer that wants a confirm
   * on Delete wraps `onRemove` in its own dialog.
   */
  onReset?: (id: string) => void;
  /**
   * Which entities are SELECTED, by id. Controlled when supplied.
   *
   * Omitted, the component keeps the selection itself — a consumer who only
   * wants the pinning behaviour should not have to hold state to get it. Pass
   * it when the selection means something ELSEWHERE too: a board that
   * highlights the same entities on a chart beside the dials needs to be the
   * one holding the list.
   */
  selected?: readonly string[];
  /**
   * Called when a name is clicked, with the WHOLE new selection rather than
   * the id that changed — a caller storing a list should not have to
   * reimplement the toggle to keep up with it.
   */
  onSelectionChange?: (ids: readonly string[]) => void;
  /** Called by the `+` at the end of the row. Omitted, no `+` is drawn. */
  onAdd?: () => void;
  /**
   * Renders the amount under each dial, and the `aria-valuetext` a screen
   * reader announces. Default `String`.
   *
   * Without it Kobalte reads the value as a percentage of the domain's top,
   * which is wrong for any domain that does not start at zero — and wrong for
   * most units in every case.
   */
  format?: (value: number) => string;
  /**
   * Where each dial prints its figures (readouts.ts). Default `"stacked"`:
   * the future amount under the dial, `was <prior>` beneath it, the signed
   * delta beside the change line. `"beside"` puts the OLD amount beside the
   * prior arrowhead and the difference under the new amount as `+$5K (4%)`
   * (Peter's payroll board, 2026-09-24).
   *
   * Presentational, so a variant locks it — see `CompactCurrencyMutationSliders`.
   */
  readout?: ReadoutMode;
  /**
   * How the SELECTION groups dials (Peter, 2026-09-24). Either way, two or
   * more selected dials snap to the highest amount among them and then move
   * together; the modes differ in how they are reached and how they move:
   *
   *   • `"pin"` (default) — the original: click names to select, and a move
   *     carries every selected dial by the same DELTA, so a group a ceiling
   *     split keeps its shape.
   *   • `"link"` — a link button too (under each name, shown on hover or
   *     focus, and always on a selected dial), and a move sends every selected
   *     dial to the same AMOUNT, so a group a ceiling split collapses back to
   *     level on the next move inside it (links.ts, `applyLinkedMove`).
   *
   * Presentational/behavioural, so a variant locks it — see
   * `CompactCurrencyMutationSliders`. The selection itself stays
   * `selected` / `onSelectionChange` in both modes: one group, two triggers.
   */
  grouping?: "pin" | "link";
  /**
   * Makes the amount under each dial EDITABLE IN PLACE, rounding what is
   * typed to this power of ten: `2` → 0.01, `0` → whole units, `-3` → the
   * thousand (Peter, 2026-09-24). Omitted, the amount is static text.
   *
   * No min, max or step of its own: a typed figure lands inside the entity's
   * own RANGE — the same clamp a drag obeys — and `snap` is already the
   * step. It is rounded FIRST and clamped second (typed.ts), so rounding can
   * never carry a figure past the range. A commit moves the dial exactly as
   * one key press does, so a linked or pinned group follows it.
   */
  precision?: number;
  /**
   * What an ITEM of several dials is drawn inside — a subtle background
   * behind one person's two positions (Peter, 2026-09-24). Only runs of two
   * or more dials sharing an `item` are framed; the frame's children are the
   * run's dials in a row with the row's own gap, so the pitch — and the
   * paging arithmetic — is unchanged. Omitted, items still page as whole
   * units but draw no background.
   *
   * A component rather than a colour, so the look stays a variant's business:
   * the consumer curries the frame it wants.
   */
  itemFrame?: Component<{ children?: JSX.Element }>;
  /**
   * ROLE GROUPS (owner, thorcasting payroll builder, 2026-10-21): entities
   * read as one role — "Roofer × 3" — instead of by name. Omitted, the row is
   * exactly what it always was; an entity in no group is drawn as today.
   *
   * A group of two or more is COLLAPSED by default to ONE dial (groups.ts):
   * its value is the members' mean, its range the union of their ranges, its
   * prior arrow the mean of their old amounts. A move on it is a SHIFT: every
   * present member moves by the same delta through `onChange`, clamped into
   * its own range — one call per member per tick, in one `batch`, so the
   * consumer needs no fan-out code. Its Reset moves every changed member
   * back to its old amount (as a per-dial Reset does); it has no Delete. The
   * chevron beside the header shows each member's own dial beside it.
   *
   * A group of ONE shows that member's own dial, with the group label as the
   * header and the member's name under it. The group dial never joins the
   * selection; its members' own dials do, as before.
   */
  groups?: readonly SliderGroup[];
  /**
   * Which groups are OPEN, by group id. Controlled when supplied; omitted,
   * the row keeps it and every group starts collapsed.
   */
  expandedGroups?: ReadonlySet<string>;
  /** A group's chevron was pressed: `open` is the state it asks for. */
  onExpandedChange?: (groupId: string, open: boolean) => void;
}

/**
 * What a curried variant locks: the PRESENTATIONAL decisions.
 *
 * `format` is here for the same reason it is on `Slider` and `BandRail` — the
 * unit a row reads in is a static style decision of the surface it sits on,
 * not per-instance content. `labels` is the vocabulary, and `snap` is which
 * values the consumer's domain admits at all. All three are properties of the
 * CONSUMER'S WORLD rather than of a given row, which is exactly the set a
 * variant should carry.
 *
 * Everything else — the entities, the domain, the selection and every
 * callback — is DATA, and stays at the call site.
 */
export type MutationSlidersOverrides = Pick<
  MutationSlidersProps,
  | "format"
  | "labels"
  | "snap"
  | "readout"
  | "grouping"
  | "precision"
  | "itemFrame"
>;

/** What a curried variant exposes: everything except the curried overrides. */
export type MutationSlidersDataProps = Omit<
  MutationSlidersProps,
  keyof MutationSlidersOverrides
>;
