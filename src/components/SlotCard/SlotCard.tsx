// ============================================
// SlotCard — generic typed-slot card family (Composite, Depth 2, owns CSS)
// ============================================
//
// SUI owns layout / style / theme / responsiveness; the client owns runtime
// data. A card is a fixed, NAMED layout template whose slots are TYPED (name /
// status / count / date / …). Each slot type maps to a themed display component
// — the card analogue of the `fields.*` column types that drive FieldTable.
// This is the counterpart to EntityCard's *region* slots: use SlotCard when the
// slot content is a generic typed value SUI can render; use EntityCard when the
// content is domain-rendered (icons, composite identifiers).
//
// Responsive: each card reacts to its OWN width via container queries. Every
// slot carries a PRIORITY (1 = always, 2 = mid, 3 = low); low-priority slots
// drop first as the card narrows. The primary slot (name/text/range) never
// drops — it ellipsises. So one card is dense in a wide pane, minimal in a
// narrow rail.
//
// `createSlotCard` is the SUI-internal factory. It is NOT exported — the ONLY
// public surface is the curried templates at the bottom, so there is no escape
// hatch for minting unlisted layouts.
import { type JSX, For, Show } from "solid-js";
import { InteractiveCard, CompactSurface } from "../Surface/variants";
import {
  SpreadRow,
  FlexRow,
  TightStack,
  TightClusterRow,
  StretchRow,
  ClusterRow,
} from "../Layout/variants";
import {
  TextBody,
  TextSublabel,
  CaptionLabel,
  DangerSublabel,
} from "../Text/variants";
import { SmallGhostButton } from "../Button/variants";
import { Icon } from "../Icon/Icon";
import { NumberWithUnits } from "../DataDisplay/NumberWithUnits";
import { Dot } from "../Dot/Dot";
import { SmStatusBadge } from "../Badge/variants";
import { EllipsisText } from "../DataDisplay/EllipsisText";
import { pipe, flatMap, filter, length } from "../../fn";
import "./SlotCard.css";

/** Flattening a row's groups needs a name for the identity step. */
const identity = <T,>(value: T): T => value;

export type AccentTone = "info" | "success" | "warning" | "danger";

// The typed slot vocabulary and the shape of the data each slot carries. SUI
// renders the display component; the client provides the value.
export interface SlotValues {
  /** Primary label. `icon` is a leading adornment — a glyph string, or a small
   *  domain element (e.g. a typed icon SVG) the client supplies. */
  name?: { text: string; icon?: string | JSX.Element };
  string?: string;
  status?: { tone: AccentTone; label: string };
  count?: { n: number | string; glyph?: string };
  date?: string;
  range?: string;
  duration?: string;
  relTime?: string;
  /** A group of labeled indicator dots (e.g. per-metric compliance). `neutral`
   *  is the muted no-data tone. */
  dots?: Array<{ label: string; tone: AccentTone | "neutral" }>;
  text?: string;
  value?: { value: number | string; units?: string };
  label?: string;
  icon?: { name: string; tone?: AccentTone };
  /** Failure reason — a danger-toned line under the card's main rows. Present
   *  only when the thing the card describes actually failed. */
  error?: string;
}
export type SlotName = keyof SlotValues;

const TONE: Record<AccentTone, string> = {
  info: "var(--sui-info, #48c)",
  success: "var(--sui-success, #3a3)",
  warning: "var(--sui-warning, #d98)",
  danger: "var(--sui-danger, #d33)",
};

// Dot colors extend the semantic tones with a muted no-data state.
const DOT_COLOR: Record<AccentTone | "neutral", string> = {
  ...TONE,
  neutral: "var(--sui-text-muted, #667)",
};

// AccentTone is the generic data tone; StatusBadge speaks compliance variants.
const BADGE_VARIANT: Record<AccentTone, "compliant" | "violation" | "warning" | "info"> = {
  info: "info",
  success: "compliant",
  warning: "warning",
  danger: "violation",
};

// Typed slot → themed display component. SUI's domain.
const SLOT_RENDERERS: { [K in SlotName]: (v: NonNullable<SlotValues[K]>) => JSX.Element } = {
  name: (v) => (
    <TightClusterRow>
      <Show when={v.icon}>
        <span class="sui-slot-card__icon">{v.icon}</span>
      </Show>
      <span class="sui-slot-card__ell sui-slot-card__strong">
        <EllipsisText tooltip={v.text} />
      </span>
    </TightClusterRow>
  ),
  string: (v) => <TextSublabel>{v}</TextSublabel>,
  status: (v) => <SmStatusBadge variant={BADGE_VARIANT[v.tone]}>{v.label}</SmStatusBadge>,
  count: (v) => (
    <TightClusterRow>
      <TextBody>{v.n}</TextBody>
      <Show when={v.glyph}>
        <TextSublabel>{v.glyph}</TextSublabel>
      </Show>
    </TightClusterRow>
  ),
  date: (v) => <TextSublabel>{v}</TextSublabel>,
  range: (v) => (
    <span class="sui-slot-card__ell sui-slot-card__strong">
      <EllipsisText tooltip={v} />
    </span>
  ),
  duration: (v) => <TextSublabel>{v}</TextSublabel>,
  relTime: (v) => <TextSublabel>{v}</TextSublabel>,
  dots: (v) => (
    <StretchRow>
      <For each={v}>
        {(d) => (
          <ClusterRow>
            <TextSublabel>{d.label}</TextSublabel>
            <Dot color={DOT_COLOR[d.tone]} />
          </ClusterRow>
        )}
      </For>
    </StretchRow>
  ),
  text: (v) => <TextBody>{v}</TextBody>,
  value: (v) => <NumberWithUnits value={v.value} units={v.units ?? ""} />,
  label: (v) => <CaptionLabel>{v}</CaptionLabel>,
  icon: (v) => (
    <span class={toneClass("sui-slot-card__slot-icon", v.tone)}>
      <Icon name={v.name as never} size="sm" />
    </span>
  ),
  error: (v) => <DangerSublabel>{v}</DangerSublabel>,
};

// Tone → BEM modifier class (paints via a token in SlotCard.css). Keeps the
// per-tone color out of inline styles while staying data-driven.
const toneClass = (base: string, tone?: AccentTone): string =>
  tone ? `${base} ${base}--${tone}` : base;

// Default drop-priority by slot type. 1 = never drops (primary), 2 = mid,
// 3 = first to go. Overridable per slot in a template config.
const DEFAULT_PRIO: Record<SlotName, 1 | 2 | 3> = {
  // `error` never drops — a failure reason is the whole point of the card it
  // appears on.
  name: 1, range: 1, label: 1, text: 1, error: 1,
  status: 2, count: 2, dots: 2, value: 2, icon: 2,
  string: 3, date: 3, duration: 3, relTime: 3,
};

// A slot is either a bare name (default priority) or a name + explicit priority.
type SlotSpec = SlotName | { slot: SlotName; prio: 1 | 2 | 3 };
type Group = SlotSpec[];
type Row = Group[];

const specName = (s: SlotSpec): SlotName => (typeof s === "string" ? s : s.slot);
const specPrio = (s: SlotSpec): number => (typeof s === "string" ? DEFAULT_PRIO[s] : s.prio);

interface SlotCardConfig {
  rows: Row[];
  density?: "comfortable" | "compact";
  accent?: boolean;
  corner?: boolean;
  removable?: boolean;
  /** Template offers a trailing action button (SUI picks the button; the
   *  client supplies label + handler). */
  action?: boolean;
  /** Upper bound on card width — the primary slot caps here and ellipsises.
   *  Default 40ch (~40 characters). A list card should never stretch to fill a
   *  wide pane. */
  maxWidth?: string;
}

export interface SlotCardProps {
  values: SlotValues;
  active?: boolean;
  onSelect?: () => void;
  accent?: AccentTone;
  corner?: JSX.Element | string;
  onRemove?: () => void;
  /** Trailing action on templates configured with `action` — e.g. Cancel on a
   *  queued job. Typed rather than a JSX slot so SUI keeps owning the button
   *  variant; the click is isolated from the whole-card onSelect. */
  action?: { label: string; onClick: () => void };
  /** Override the card's baked max-width (in px) for a specific host (e.g. a
   *  wider or narrower rail). A layout dimension, not a visual variant. */
  maxWidth?: number;
}

// SUI-INTERNAL. Not exported — only the curried templates below.
function createSlotCard(config: SlotCardConfig) {
  return (props: SlotCardProps): JSX.Element => {
    const Surface = config.density === "compact" ? CompactSurface : InteractiveCard;

    // A card with overlays reserves top room for them (see SlotCard.css).
    const bodyClass = `sui-slot-card__body${
      config.corner || config.removable ? " sui-slot-card__body--overlaid" : ""
    }`;

    const rows = (
      <TightStack>
        <For each={config.rows}>
          {(row) => {
            const multi = row.length > 1;
            // A row whose every slot is absent renders nothing at all — an
            // empty row would still take the stack's gap. This is what lets a
            // template carry a conditional row (e.g. `error`) without the
            // no-failure card growing a blank line.
            const hasValue = (spec: SlotSpec): boolean =>
              props.values[specName(spec)] !== undefined;
            const filled = () =>
              pipe(row, flatMap(identity), filter(hasValue), length) > 0;
            const groups = (
              <For each={row}>
                {(group, gi) => (
                  <div class={gi() === 0 ? "sui-slot-card__lead" : "sui-slot-card__trail"}>
                    <TightClusterRow>
                      <For each={group}>
                        {(spec) => {
                          const slot = specName(spec);
                          const val = props.values[slot];
                          return (
                            <Show when={val !== undefined}>
                              <span data-prio={specPrio(spec)} class={slot === "name" ? "sui-slot-card__name" : undefined}>
                                {(SLOT_RENDERERS[slot] as (x: unknown) => JSX.Element)(val)}
                              </span>
                            </Show>
                          );
                        }}
                      </For>
                    </TightClusterRow>
                  </div>
                )}
              </For>
            );
            return (
              <Show when={filled()}>
                {multi ? <SpreadRow>{groups}</SpreadRow> : <FlexRow>{groups}</FlexRow>}
              </Show>
            );
          }}
        </For>
        {/* Trailing action row — only on templates that offer one, and only
            while the host wires it (e.g. Cancel on a queued job, gone once the
            job starts). The click never reaches the card's onSelect. */}
        <Show when={config.action ? props.action : undefined}>
          {(action) => (
            <ClusterRow>
              <SmallGhostButton
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  action().onClick();
                }}
              >
                {action().label}
              </SmallGhostButton>
            </ClusterRow>
          )}
        </Show>
      </TightStack>
    );

    const card = (
      <Surface class="sui-slot-card" active={props.active} onClick={props.onSelect}>
        <div class={bodyClass}>
          <Show when={config.corner && props.corner !== undefined}>
            <div class="sui-slot-card__corner">{props.corner}</div>
          </Show>
          {/* A real <button>, not a styled span: the remove control must be
              reachable and activatable by keyboard independently of the card's
              own onSelect. SlotCard.css already carries a `:focus-visible`
              rule for it, which a span could never satisfy. */}
          <Show when={config.removable && props.onRemove}>
            <button
              type="button"
              class="sui-slot-card__remove"
              title="Remove"
              aria-label="Remove"
              onClick={(e) => { e.stopPropagation(); props.onRemove?.(); }}
            >
              ✕
            </button>
          </Show>
          {rows}
        </div>
      </Surface>
    );

    const withAccent = (
      <Show when={config.accent && props.accent} fallback={card}>
        <div class={toneClass("sui-slot-card__accent", props.accent)}>{card}</div>
      </Show>
    );

    // Clamp width: never below 200px (below that a card can't carry its slots
    // legibly, enforced in CSS), never past the max-width cap (primary slot
    // ellipsises there). A host may override the cap in px via `maxWidth`;
    // otherwise the template's baked cap (default 40ch) applies. The shell is
    // the container-query context (no padding → true card width).
    const maxWidth = (): string =>
      props.maxWidth !== undefined
        ? `${props.maxWidth}px`
        : (config.maxWidth ?? "40ch");
    return (
      <div class="sui-slot-card__shell" style={{ "max-width": maxWidth() }}>
        {withAccent}
      </div>
    );
  };
}

// ===========================================================================
// The curried layout templates — the ONLY public surface.
// ===========================================================================

// Single-line (header row only)
export const TitleStatus = createSlotCard({ rows: [[["name"], ["status"]]] });
export const TitleCount = createSlotCard({ rows: [[["name"], ["count"]]] });
export const RangeCountStatus = createSlotCard({ rows: [[["range"], ["count", "status"]]] });
export const DenseStatusRow = createSlotCard({
  rows: [[["icon", "name"], ["status", "duration", "relTime"]]],
  accent: true,
});
// DenseStatusNote — DenseStatusRow plus a failure line. The error row is
// absent entirely when there's no error, so a succeeded card is byte-identical
// to DenseStatusRow. For history lists where a failed entry must carry its
// reason (job queues, import runs).
export const DenseStatusNote = createSlotCard({
  rows: [[["icon", "name"], ["status", "duration", "relTime"]], [["error"]]],
  accent: true,
});
export const ChipNote = createSlotCard({ rows: [[["status", "text"]]], accent: true });
export const IdStatusRange = createSlotCard({ rows: [[["string", "status", "range"]]] });
// SingleLine — minimal carrier; still composes the modifiers (accent + selectable).
export const SingleLine = createSlotCard({ rows: [[["text"]]], accent: true });

// Two-line (header + secondary)
export const TitleMeta3 = createSlotCard({
  rows: [[["name"], ["status"]], [["string"], ["date"], ["duration"]]],
});
export const TitleAssetDate = createSlotCard({ rows: [[["name"]], [["string"], ["date"]]] });
export const TitleProgress = createSlotCard({
  rows: [[["name"], ["status"]], [["text"], ["relTime"]]],
  accent: true,
});
// TitleAssetProgress — TitleProgress with a sub-identifier beside the name and
// a conditional trailing action. The running/queued card of a work queue: what
// it is, what state it's in, how far along, and the one thing you can do to it.
export const TitleAssetProgress = createSlotCard({
  rows: [[["name", "string"], ["status"]], [["text"], ["relTime"]]],
  accent: true,
  action: true,
});
// TitleDotsMeta — name + a group of indicator dots (e.g. per-metric compliance),
// over a meta row of sub-id / date / duration. The meta row is the card's
// second line (prio 2), so it persists in a narrow list column rather than
// collapsing to a single line; it only sheds below the ~180px floor.
export const TitleDotsMeta = createSlotCard({
  rows: [
    [["name"], ["dots"]],
    [
      [{ slot: "string", prio: 2 }],
      [{ slot: "date", prio: 2 }],
      [{ slot: "duration", prio: 2 }],
    ],
  ],
});
// TitleMetaCount — name, then a meta line with a leading string (e.g. date ·
// duration) and a trailing count (e.g. a violation tally). The count drops
// first as the card narrows.
export const TitleMetaCount = createSlotCard({
  rows: [[["name"]], [["string"], ["count"]]],
});

// Overlay + tile
export const PickCard = createSlotCard({ rows: [[["text"]]], corner: true, removable: true });
// StatTile — value stays (prio 1) so a tile never collapses to just its label.
export const StatTile = createSlotCard({ rows: [[["label"]], [[{ slot: "value", prio: 1 }]]] });
