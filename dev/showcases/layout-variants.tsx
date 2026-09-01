// Layout variants — every curried arrangement, rendered with placeholder
// children so the ARRANGEMENT is the only thing on screen.
//
// The library's rule is that a call site never writes flex/grid/gap CSS: it
// names the arrangement it wants. That only works if the names are legible, and
// a name is legible once you have seen what it does. This gallery is that
// reference — one frame per variant, each holding the same neutral children.
import { type Component, type JSX, For } from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  // rows
  StretchRow,
  TopSpreadRow,
  BaselineClusterRow,
  BaselineWrapRow,
  LooseWrapRow,
  IconClusterRow,
  GrowClusterRow,
  GrowCenterRow,
  GrowWrapRow,
  NoShrinkClusterRow,
  TightNoShrinkClusterRow,
  ChipCluster,
  PaneRow,
  // columns
  CenteredColumn,
  SmallTightStack,
  SpacedStack,
  ConversationStack,
  PaddedStack,
  GrowColumn,
  GrowStack,
  WrapItemStack,
  NoShrinkColumn,
  ClipColumn,
  ClipFillColumn,
  ClipFillColumnFlush,
  ScrollFillColumn,
  // boxes
  ClipBox,
  ClipFillBox,
  ScrollBox,
  ScrollXBox,
  ScrollYBox,
  ScrollFillBox,
  ScrollPanel,
  NoShrinkScrollBox,
  // grids
  CardGrid,
  LooseCardGrid,
  WideCardGrid,
  ChipGrid,
  LabelValueGrid,
  // app chrome
  CompactAppHeader,
  InlineAppHeader,
  AppNavLink,
} from "../../src/components/Layout";
import {
  FitPlaceholder,
  FillPlaceholder,
  BlockPlaceholder,
  SmallPlaceholder,
  MediumPlaceholder,
  LargePlaceholder,
  Placeholder,
} from "../../src/components/Placeholder";
import { ContentStack, ClusterRow } from "../../src/components/Layout";
import { SubsectionTitle, TextSublabel, TextBody } from "../../src/components/Text";
import "./layout-variants.css";

type Slot = Component<{ children?: JSX.Element; class?: string }>;

interface VariantSpec {
  name: string;
  /** What the arrangement is FOR — the sentence that makes the name usable. */
  note: string;
  Variant: Slot;
  /** Children shape. Defaults to three fit-width chips. */
  kind?: "chips" | "blocks" | "tall" | "wide" | "pairs";
  /** Demo inside a definite-height frame — only the clip/scroll families need
   *  one, and a plain stack looks broken in it. */
  bounded?: boolean;
}

const ROWS: VariantSpec[] = [
  { name: "StretchRow", note: "children stretch to equal height — a swimlane of cards", Variant: StretchRow, kind: "blocks" },
  { name: "TopSpreadRow", note: "title left, badge right, both pinned to the FIRST text line", Variant: TopSpreadRow },
  { name: "BaselineClusterRow", note: "a cluster sharing one text baseline — value + units", Variant: BaselineClusterRow },
  { name: "BaselineWrapRow", note: "the same, allowed to wrap on narrow widths", Variant: BaselineWrapRow },
  { name: "LooseWrapRow", note: "WrapRow at the sm (8px) step — align left UNSET so tiles sharing a line stretch to equal height", Variant: LooseWrapRow },
  { name: "IconClusterRow", note: "icon-only buttons spaced ~one glyph apart", Variant: IconClusterRow },
  { name: "GrowClusterRow", note: "a cluster that itself grows inside a toolbar row", Variant: GrowClusterRow },
  { name: "GrowCenterRow", note: "grows and centres its content — a meta cell", Variant: GrowCenterRow },
  { name: "GrowWrapRow", note: "grows, wraps — assignee chips that overflow to a second line", Variant: GrowWrapRow },
  { name: "NoShrinkClusterRow", note: "holds its intrinsic size beside a shrinking sibling", Variant: NoShrinkClusterRow },
  { name: "TightNoShrinkClusterRow", note: "the same at an xs gap — a dense meta cell", Variant: TightNoShrinkClusterRow },
  { name: "ChipCluster", note: "a wrapping chip group that refuses to shrink", Variant: ChipCluster },
  { name: "PaneRow", note: "the top-level split: a sidebar beside a filling pane", Variant: PaneRow, kind: "blocks" },
];

const COLUMNS: VariantSpec[] = [
  { name: "CenteredColumn", note: "children centred on the cross axis — a stat cell", Variant: CenteredColumn },
  { name: "SmallTightStack", note: "dense start-aligned column for indicator rows", Variant: SmallTightStack },
  { name: "SpacedStack", note: "a plain column at the md (12px) gap step, one rung up from NarrowStack", Variant: SpacedStack },
  { name: "ConversationStack", note: "capped reading width for a message tree", Variant: ConversationStack },
  { name: "PaddedStack", note: "a stack with its own inset", Variant: PaddedStack },
  { name: "GrowColumn", note: "takes its share of a row and may shrink past its content", Variant: GrowColumn },
  { name: "GrowStack", note: "the same with an sm gap between sections", Variant: GrowStack },
  { name: "NoShrinkColumn", note: "fixed data column beside a GrowColumn that absorbs the slack", Variant: NoShrinkColumn },
  { name: "WrapItemStack", note: "one item in a WrapRow at its NATURAL width — shrinks so an inner fit table scrolls, capped at the row; deliberately not flex:1, which would equalise wrap items", Variant: WrapItemStack },
  { name: "ClipColumn", note: "clips whatever overflows rather than scrolling", Variant: ClipColumn, kind: "tall", bounded: true },
  { name: "ClipFillColumn", note: "fills the height it is given, clips the rest", Variant: ClipFillColumn, kind: "tall", bounded: true },
  { name: "ClipFillColumnFlush", note: "the same with no gap between children", Variant: ClipFillColumnFlush, kind: "tall", bounded: true },
  { name: "ScrollFillColumn", note: "fills its height and scrolls its own overflow", Variant: ScrollFillColumn, kind: "tall", bounded: true },
];

const BOXES: VariantSpec[] = [
  { name: "ClipBox", note: "a plain box that clips overflow", Variant: ClipBox, kind: "tall", bounded: true },
  { name: "ClipFillBox", note: "grows into its parent and clips", Variant: ClipFillBox, kind: "tall", bounded: true },
  { name: "ScrollBox", note: "scrolls both axes", Variant: ScrollBox, kind: "tall", bounded: true },
  { name: "ScrollYBox", note: "scrolls vertically only", Variant: ScrollYBox, kind: "tall", bounded: true },
  { name: "ScrollXBox", note: "scrolls horizontally only — a wide table or timeline", Variant: ScrollXBox, kind: "wide", bounded: true },
  { name: "ScrollFillBox", note: "fills its share of a flex parent, then scrolls", Variant: ScrollFillBox, kind: "tall", bounded: true },
  { name: "ScrollPanel", note: "a bordered panel capped at 320px that scrolls inside", Variant: ScrollPanel, kind: "tall", bounded: true },
  { name: "NoShrinkScrollBox", note: "keeps its size in a flex parent and scrolls itself", Variant: NoShrinkScrollBox, kind: "tall", bounded: true },
];

const GRIDS: VariantSpec[] = [
  { name: "CardGrid", note: "dashboard tiles ≥280px, as many columns as fit", Variant: CardGrid, kind: "blocks" },
  { name: "LooseCardGrid", note: "the same at the sm (8px) gutter — for a KPI strip needing more air", Variant: LooseCardGrid, kind: "blocks" },
  { name: "WideCardGrid", note: "the same for wide cards (≥420px)", Variant: WideCardGrid, kind: "wide" },
  { name: "ChipGrid", note: "many small equal cells (≥150px) — a filter bar", Variant: ChipGrid, kind: "chips" },
  { name: "LabelValueGrid", note: "a label column sized to its content beside a value column", Variant: LabelValueGrid, kind: "pairs" },
];

const CHILDREN: Record<NonNullable<VariantSpec["kind"]>, () => JSX.Element> = {
  chips: () => (
    <>
      <FitPlaceholder label="one" />
      <FitPlaceholder label="two" />
      <FitPlaceholder label="three" />
    </>
  ),
  blocks: () => (
    <>
      <SmallPlaceholder label="tile" />
      <MediumPlaceholder label="taller tile" />
      <SmallPlaceholder label="tile" />
    </>
  ),
  tall: () => <BlockPlaceholder label="content taller than the frame" />,
  wide: () => (
    <div class="layout-demo-wide-content">
      <LargePlaceholder label="content wider than the frame" />
    </div>
  ),
  pairs: () => (
    <>
      <FitPlaceholder label="Vessel" />
      <FillPlaceholder label="MSC Bellissima" />
      <FitPlaceholder label="Asset" />
      <FillPlaceholder label="xbox3-2" />
    </>
  ),
};

const frameClass = (spec: VariantSpec): string =>
  spec.bounded ? "layout-demo-frame layout-demo-frame--tall" : "layout-demo-frame";

const VariantFrame: Component<{ spec: VariantSpec }> = (props) => (
  <ContentStack>
    <TextBody>{props.spec.name}</TextBody>
    <TextSublabel>{props.spec.note}</TextSublabel>
    <div class={frameClass(props.spec)}>
      <Dynamic component={props.spec.Variant}>
        {CHILDREN[props.spec.kind ?? "chips"]()}
      </Dynamic>
    </div>
  </ContentStack>
);

const Group: Component<{ title: string; specs: VariantSpec[] }> = (props) => (
  <ContentStack>
    <SubsectionTitle>{props.title}</SubsectionTitle>
    <For each={props.specs}>{(spec) => <VariantFrame spec={spec} />}</For>
  </ContentStack>
);

export const LayoutVariantsShowcase: Component = () => (
  <div class="component-section component-section--full">
    <h2>Layout Variants — Primitive (Depth 0)</h2>
    <p class="text-meta">
      Every curried arrangement, holding neutral placeholder children so the
      only thing on screen is the arrangement itself. A call site never writes
      flex/grid/gap CSS — it names one of these. Frames are sized by the
      gallery, not by the variants.
    </p>

    <Group title="Rows" specs={ROWS} />
    <Group title="Columns" specs={COLUMNS} />
    <Group title="Boxes — clipping and scrolling" specs={BOXES} />
    <Group title="Grids" specs={GRIDS} />

    <ContentStack>
      <SubsectionTitle>App chrome</SubsectionTitle>
      <TextSublabel>
        CompactAppHeader is the dense page-top bar; InlineAppHeader is the same
        header rendered inside the main pane rather than above it. AppNavLink is
        its nav item, with an active state.
      </TextSublabel>
      <div class="layout-demo-frame">
        <CompactAppHeader>
          <ClusterRow>
            <AppNavLink active>Vessel Calls</AppNavLink>
            <AppNavLink>Reports</AppNavLink>
            <AppNavLink>Tools</AppNavLink>
          </ClusterRow>
        </CompactAppHeader>
      </div>
      <div class="layout-demo-frame">
        <InlineAppHeader>
          <Placeholder label="inline header content" fit />
        </InlineAppHeader>
      </div>
    </ContentStack>
  </div>
);
