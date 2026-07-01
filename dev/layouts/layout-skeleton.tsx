// "Cashflow Console — Layout" — a STRUCTURAL, layout-first reference for the
// saved-layouts gallery. It reproduces the cashflow console's *structure* and
// its responsive rules as labeled colored region panes — NO real chart, NO
// data, NO behaviors. Every box is a SUI component: Panel variants carry the
// region color + title, ProportionalStack carries the observation:items ratio
// and the fixed footer (weight 0), ThreePanelLayout frames the rails, and
// useMediaQuery flips each region to its mobile form (hamburger header, swipe
// paginator with dots, sparkline, tabbed items, bottom-sheet detail, FAB add).
//
// The descriptive label + the "rule badge" annotation for each region live
// inside its Panel as Text. There are no raw inline-styled colored divs — the
// color of a region is a Panel `variant`, never a hand-rolled background.
import { type Component, Show, createSignal } from "solid-js";
import {ProportionalStack, ProportionalItem, SidebarPanel, SpreadRow, ClusterRow} from "../../src/components/Layout";
import { Stack } from "../../src/components/Layout/Stack";
import { Row } from "../../src/components/Layout/Row";
import { Box } from "../../src/components/Layout/Box";
import { ThreePanelLayout } from "../../src/components/ThreePanelLayout";
import { Panel } from "../../src/components/Panel/Panel";
import { Text } from "../../src/components/Text/Text";
import { Tabs } from "../../src/components/Tabs";
import { Dot } from "../../src/components/Dot";
import { HeartbeatSparkline } from "../../src/components/HeartbeatSparkline";
import { useMediaQuery } from "../../src/hooks";

// ── Breakpoints: detail rail collapses to a bottom sheet < 1024px; everything
//    else collapses to its mobile form < 768px.
const MOBILE = "(max-width: 768px)";
const DETAIL_INLINE = "(min-width: 1024px)";

const ACTIVE_DOT = "var(--sui-accent, #6aa3ff)";
const IDLE_DOT = "var(--sui-border, rgba(255,255,255,0.35))";

/**
 * Descriptive copy for a region, rendered inside its Panel: a sentence of
 * intent plus a monospace-styled "rule badge" annotating its sizing /
 * responsive contract. Pure presentational helper — no state.
 */
const RegionBody: Component<{ note: string; rule: string }> = (props) => (
  <Stack gap="xs">
    <Text variant="body">{props.note}</Text>
    <Text variant="sublabel">{props.rule}</Text>
  </Stack>
);

// ── Header ────────────────────────────────────────────────────────
// Desktop/tablet: logo · links · account. Mobile: logo + hamburger.
const DesktopHeader: Component = () => (
  <SpreadRow>
    <Text variant="title">Logo</Text>
    <ClusterRow>
      <Text variant="label">Links</Text>
    </ClusterRow>
    <Text variant="label">Account</Text>
  </SpreadRow>
);

const MobileHeader: Component = () => (
  <SpreadRow>
    <Text variant="title">Logo</Text>
    <Text variant="label">☰</Text>
  </SpreadRow>
);

// ── Scenarios ─────────────────────────────────────────────────────
// Desktop/tablet: a left rail listing scenarios with a "Save scenario"
// affordance. Mobile: a 1-line swipe paginator with position dots.
const ScenariosRail: Component = () => (
  <SidebarPanel width={200}>
    <Panel variant="primary" title="Scenarios" fill>
      <Stack gap="sm">
        <RegionBody
          note="List of scenarios. Selecting one re-scopes the items list and the projection."
          rule="→ swipe paginator < 768px"
        />
        <Panel variant="success" size="sm" title="Save scenario" />
      </Stack>
    </Panel>
  </SidebarPanel>
);

const ScenarioPaginator: Component = () => (
  <Panel variant="primary" size="sm">
    <Row gap="sm" align="center" justify="center">
      <Text variant="label">‹</Text>
      <Text variant="label">Baseline</Text>
      <Text variant="label">›</Text>
      <Dot color={ACTIVE_DOT} />
      <Dot color={IDLE_DOT} />
      <Dot color={IDLE_DOT} />
    </Row>
  </Panel>
);

// ── Observation ───────────────────────────────────────────────────
// Desktop/tablet: the "cashflow projection" region, bounded 1:2 against
// Items, carrying a min/max + ratio rule badge. Mobile: a compact sparkline.
const ObservationRegion: Component = () => (
  <Panel variant="default" title="Observation — cashflow projection" fill>
    <RegionBody
      note="Chart of projected cashflow over time, driven by the active scenario's items."
      rule="min 200 / max 400px · ratio 1 : 2 with Items · → sparkline < 768px"
    />
  </Panel>
);

const ObservationSparkline: Component = () => (
  <Panel variant="default" title="Observation · sparkline">
    <Stack gap="xs">
      <HeartbeatSparkline
        state="connected"
        samples={[0.2, 0.35, 0.3, 0.55, 0.45, 0.7, 0.6, 0.85, 0.72, 0.9]}
        width={320}
        height={36}
      />
      <Text variant="sublabel">mobile · compact projection</Text>
    </Stack>
  </Panel>
);

// ── Items ─────────────────────────────────────────────────────────
// Desktop/tablet: a two-column Revenue (green) / Expenses (red) table.
// Mobile: tabbed — Revenue OR Expenses, one at a time.
const ItemsTwoColumn: Component = () => (
  <ProportionalStack direction="row" gap="sm">
    <ProportionalItem weight={1}>
      <Panel variant="success" title="Revenue" fill>
        <Text variant="body">List of revenue items.</Text>
      </Panel>
    </ProportionalItem>
    <ProportionalItem weight={1}>
      <Panel variant="danger" title="Expenses" fill>
        <Text variant="body">List of expense items.</Text>
      </Panel>
    </ProportionalItem>
  </ProportionalStack>
);

const ItemsTabbed: Component = () => {
  const [tab, setTab] = createSignal("revenue");
  return (
    <Stack gap="sm">
      <Tabs
        tabs={[
          { id: "revenue", label: "Revenue" },
          { id: "expense", label: "Expenses" },
        ]}
        activeTab={tab()}
        onTabChange={setTab}
        variant="boxed"
      />
      <Panel variant={tab() === "revenue" ? "success" : "danger"} size="sm">
        <Text variant="body">
          Active tab — list of {tab() === "revenue" ? "revenue" : "expense"} items.
        </Text>
      </Panel>
    </Stack>
  );
};

const ItemsRegion: Component<{ mobile: boolean; showDetailSheet: boolean }> = (props) => (
  <Panel variant="default" title="Items" fill style={{ position: "relative", overflow: "hidden" }}>
    <Stack gap="sm">
      <Text variant="sublabel">
        {props.mobile ? "→ tabbed Revenue / Expenses < 768px" : "ratio 2 : 1 with Observation"}
      </Text>
      <Show when={props.mobile} fallback={<ItemsTwoColumn />}>
        <ItemsTabbed />
      </Show>
    </Stack>
    {/* Detail as a bottom sheet, bounded to the items area so it never covers
        the observation/sparkline (< 1024px). */}
    <Show when={props.showDetailSheet}>
      <Box
        style={{
          position: "absolute",
          left: "0",
          right: "0",
          bottom: "0",
          height: "58%",
        }}
      >
        <Panel variant="primary" title="Detail · slides up over items" fill>
          <RegionBody
            note="Tapping an item slides this panel up over the items area; dismiss to return to the list."
            rule="bounded to items · never covers the observation"
          />
        </Panel>
      </Box>
    </Show>
  </Panel>
);

// ── Add item footer ───────────────────────────────────────────────
// Desktop/tablet: a fixed-height footer (weight 0) anchored to the bottom.
// Mobile: a floating "+" FAB (lower right) replaces the footer.
const AddItemFooter: Component = () => (
  <Panel variant="warning" size="sm" title="Add item">
    <Text variant="sublabel">fixed height · anchored to page bottom</Text>
  </Panel>
);

const AddItemFab: Component = () => (
  <Box
    style={{
      position: "absolute",
      right: "16px",
      bottom: "16px",
      width: "56px",
      height: "56px",
    }}
  >
    <Panel variant="warning" fill style={{ "border-radius": "50%" }}>
      <Text variant="title">+</Text>
    </Panel>
  </Box>
);

// ── Center column — observation over items, fixed footer at the bottom ──
const DesktopCenter: Component<{ detailInline: boolean }> = (props) => (
  <ProportionalStack direction="column" gap="sm">
    <ProportionalItem weight={1}>
      <ObservationRegion />
    </ProportionalItem>
    <ProportionalItem weight={2}>
      <ItemsRegion mobile={false} showDetailSheet={!props.detailInline} />
    </ProportionalItem>
    <ProportionalItem weight={0}>
      <AddItemFooter />
    </ProportionalItem>
  </ProportionalStack>
);

const MobileCenter: Component = () => (
  <Box grow style={{ position: "relative", height: "100%" }}>
    <ProportionalStack direction="column" gap="sm">
      <ProportionalItem weight={0}>
        <ScenarioPaginator />
      </ProportionalItem>
      <ProportionalItem weight={0}>
        <ObservationSparkline />
      </ProportionalItem>
      <ProportionalItem weight={1}>
        {/* Detail rides as a bottom sheet over items on mobile. */}
        <ItemsRegion mobile showDetailSheet />
      </ProportionalItem>
    </ProportionalStack>
    <AddItemFab />
  </Box>
);

/**
 * Structural cashflow-console layout. Renders the desktop/tablet three-pane
 * frame above 768px and the mobile single-column form below it, with the
 * detail region inline (right rail) only at ≥ 1024px.
 */
export const StructuralLayout: Component = () => {
  const mobile = useMediaQuery(MOBILE);
  const detailInline = useMediaQuery(DETAIL_INLINE);

  return (
    <Show
      when={!mobile()}
      fallback={
        <ThreePanelLayout height="100%" topBar={<MobileHeader />} centerPanel={<MobileCenter />} />
      }
    >
      <ThreePanelLayout
        height="100%"
        leftPanelWidth="200px"
        rightPanelWidth="280px"
        topBar={<DesktopHeader />}
        leftPanel={<ScenariosRail />}
        centerPanel={<DesktopCenter detailInline={detailInline()} />}
        rightPanel={
          <Show when={detailInline()}>
            <Panel variant="primary" title="Detail" fill>
              <RegionBody
                note="Detail about the selected item."
                rule="→ bottom sheet over items < 1024px"
              />
            </Panel>
          </Show>
        }
      />
    </Show>
  );
};
