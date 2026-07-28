// Workshop bench — Slot Cards (generic slotted-card prototype, 2026-07-23).
//
// Each template is shown responsively: the SAME card at increasing widths, so
// the priority-based slot dropping is visible (low-priority slots fall away as
// the card narrows; the primary slot ellipsises). TitleStatus additionally
// shows the name min-width + ellipsis across three name lengths.
import { type Component, type JSX, For } from "solid-js";
import { SectionTitle, SubsectionTitle, TextBody, TextSublabel } from "../../../src/components/Text";
import { PageStack, TightStack, ContentStack, WrapRow } from "../../../src/components/Layout";
// SlotCard is now a promoted SUI component — the bench consumes the curried
// templates from the barrel, so this doubles as its gallery showcase.
import {
  TitleStatus,
  TitleCount,
  RangeCountStatus,
  DenseStatusRow,
  DenseStatusNote,
  ChipNote,
  IdStatusRange,
  SingleLine,
  TitleMeta3,
  TitleAssetDate,
  TitleProgress,
  TitleAssetProgress,
  PickCard,
  StatTile,
  type SlotCardProps,
  type SlotValues,
} from "../../../src";
import "./slot-cards.css";

interface TemplateSpec {
  name: string;
  Card: (p: SlotCardProps) => JSX.Element;
  signature: string;
  props: Omit<SlotCardProps, "values">;
  values: SlotValues;
}

const noop = () => undefined;

// Widths start at the 200px minimum: at the floor priority-3 slots drop
// (name + status/count only); past ~260px everything shows.
const WIDTHS = [200, 280, 380];

const TEMPLATES: TemplateSpec[] = [
  { name: "TitleStatus", Card: TitleStatus, signature: "[name·1] · [status·2]", props: { active: true, onSelect: noop },
    values: { name: { text: "MSC Bellissima", icon: "⛴" }, status: { tone: "info", label: "complete" } } },
  { name: "TitleCount", Card: TitleCount, signature: "[name·1] · [count·2]", props: {},
    values: { name: { text: "Aframax Horizon", icon: "⛴" }, count: { n: 3, glyph: "⚠" } } },
  { name: "RangeCountStatus", Card: RangeCountStatus, signature: "[range·1] · [count·2][status·2]", props: {},
    values: { range: "Nov 15 – Dec 01", count: { n: 12, glyph: "⛴" }, status: { tone: "success", label: "PUBLISHED" } } },
  { name: "DenseStatusRow", Card: DenseStatusRow, signature: "[icon·2][name·1] · [status·2][duration·3][relTime·3] + accent", props: { accent: "success" },
    values: { icon: { name: "check", tone: "success" }, name: { text: "Pacific Trader" }, status: { tone: "success", label: "completed" }, duration: "2m 5s", relTime: "4h ago" } },
  { name: "DenseStatusNote", Card: DenseStatusNote, signature: "DenseStatusRow + [error·1] row (dropped when absent)", props: { accent: "danger" },
    values: { icon: { name: "error", tone: "danger" }, name: { text: "Nordic Star" }, status: { tone: "danger", label: "failed" }, duration: "0m 12s", relTime: "6h ago", error: "Upstream timeout fetching FTIR series (asset xbox5-1)" } },
  { name: "ChipNote", Card: ChipNote, signature: "[status·2][text·1] + accent", props: { accent: "danger" },
    values: { status: { tone: "danger", label: "BLOCKED" }, text: "Flow below 2 scfm for 40+ min — probable blockage." } },
  { name: "IdStatusRange", Card: IdStatusRange, signature: "[string·3][status·2][range·1]", props: {},
    values: { string: "xbox3-2", status: { tone: "info", label: "Berth 402" }, range: "2025-12-01 08:14 → 2025-12-02 08:14" } },
  { name: "SingleLine", Card: SingleLine, signature: "[text·1] + accent + selectable", props: { accent: "warning", active: true, onSelect: noop },
    values: { text: "14:05 → 14:32 · 27m · worst 142 ppm" } },
  { name: "TitleMeta3", Card: TitleMeta3, signature: "[name·1][status·2] / [string·3][date·3][duration·3]", props: {},
    values: { name: { text: "Pacific Trader", icon: "⛴" }, status: { tone: "danger", label: "NOx" }, string: "xbox5-1", date: "2025-12-01", duration: "24.0h" } },
  { name: "TitleAssetDate", Card: TitleAssetDate, signature: "[name·1] / [string·3][date·3]", props: { active: true, onSelect: noop },
    values: { name: { text: "MSC Bellissima", icon: "⛴" }, string: "xbox3-2", date: "2025-12-01" } },
  { name: "TitleProgress", Card: TitleProgress, signature: "[name·1][status·2] / [text·1][relTime·3] + accent", props: { accent: "info" },
    values: { name: { text: "MSC Bellissima", icon: "⛴" }, status: { tone: "info", label: "in_progress" }, text: "Caching minute metrics… 640 / 1440", relTime: "3m ago" } },
  { name: "TitleAssetProgress", Card: TitleAssetProgress, signature: "[name·1][string·3][status·2] / [text·1][relTime·3] + accent + action", props: { accent: "warning", action: { label: "Cancel", onClick: noop } },
    values: { name: { text: "Aframax Horizon", icon: "⛴" }, string: "xbox1-1", status: { tone: "warning", label: "queued" }, text: "Waiting for a worker", relTime: "Requested 5m ago" } },
  { name: "PickCard", Card: PickCard, signature: "[cornerBadge] [text·1] [remove]", props: { corner: "1", onRemove: noop },
    values: { text: "Instrument fault during control period — data excluded per SOP-14." } },
  { name: "StatTile", Card: StatTile, signature: "[label·1] / [value·1] (tile)", props: {},
    values: { label: "DB Coverage", value: { value: 92, units: "%" } } },
];

// One template, rendered at each width so the slot-drop progression is visible.
function ResponsiveStrip(props: { spec: TemplateSpec }): ReturnType<Component> {
  return (
    <ContentStack>
      <SubsectionTitle>{props.spec.name}</SubsectionTitle>
      <TextSublabel>{props.spec.signature}</TextSublabel>
      <WrapRow>
        <For each={WIDTHS}>
          {(w) => (
            <TightStack>
              <TextSublabel>{`${w}px`}</TextSublabel>
              <div class={`slot-strip-w${w}`}>
                <props.spec.Card values={props.spec.values} {...props.spec.props} maxWidth={w} />
              </div>
            </TightStack>
          )}
        </For>
      </WrapRow>
    </ContentStack>
  );
}

const NAME_255 =
  "MSC Bellissima Grande Container Vessel of the Mediterranean Shipping Company registered in Panama carrying refrigerated and dry cargo across the transpacific route calling at Long Beach Oakland and Seattle before returning to Yokohama and Busan on schedule.";

// The card caps at its max-width and the name ellipsises there. Default is
// ~40ch; wider caps (in px) reveal more of the name. Width labelled per example.
const MAX_WIDTHS = [320, 480, 640, 960];

const TitleStatusMaxWidthDemo: Component = () => (
  <ContentStack>
    <SubsectionTitle>TitleStatus — card max-width (name caps ~40 chars by default)</SubsectionTitle>
    <TextSublabel>Same long name; the card stops growing at its max-width and the name ellipsises. Wider caps show more of the name.</TextSublabel>
    <WrapRow>
      <For each={MAX_WIDTHS}>
        {(mw) => (
          <TightStack>
            <TextSublabel>{`${mw}px`}</TextSublabel>
            <TitleStatus
              maxWidth={mw}
              values={{ name: { text: NAME_255, icon: "⛴" }, status: { tone: "info", label: "complete" } } as SlotValues}
            />
          </TightStack>
        )}
      </For>
    </WrapRow>
  </ContentStack>
);

const SlotCardsBench: Component = () => (
  <div class="component-section component-section--full">
    <SectionTitle>Slot Cards — responsive layout templates</SectionTitle>
    <TextBody>
      Each card reacts to its own width (container queries). Slots carry a priority — low-priority slots drop as the card narrows; the primary slot ellipsises. The three widths sit side by side when there's room and wrap to their own lines when there isn't.
    </TextBody>
    <PageStack>
      <TitleStatusMaxWidthDemo />
      <For each={TEMPLATES}>{(spec) => <ResponsiveStrip spec={spec} />}</For>
    </PageStack>
  </div>
);

export const meta = { label: "Slot Cards (prototype)" };

export default SlotCardsBench;
