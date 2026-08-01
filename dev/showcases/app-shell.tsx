import type { Component } from "solid-js";
import {
  AppShell,
  AppHeader,
  AppMain,
  createAppHeader,
  PaneRow,
  GrowColumn,
  ScrollYBox,
} from "../../src/components/Layout";
import { Row } from "../../src/components/Layout/Row";
import { Stack } from "../../src/components/Layout/Stack";
import { CountChip } from "../../src/components/Badge";
import { StickyGroupHeader, SectionLabel } from "../../src/components/Section";
import {
  TextLabel,
  TextSublabel,
  TextBody,
  MutedBody,
} from "../../src/components/Text";
import { Button } from "../../src/components/Button/Button";
import { Icon } from "../../src/components/Icon";
import { CollapsiblePanel } from "../../src/components/CollapsiblePanel";
import "./app-shell.css";

// Compact inline header — this showcase demonstrates the inline + sm
// combination, which no shipped variant bakes. Factory-curried at module top.
const CompactInlineAppHeader = createAppHeader({ inline: true, size: "sm" });

const FAKE_GROUPS = [
  { tag: "AwaitingHuman", count: 3 },
  { tag: "AwaitingReview", count: 1 },
  { tag: "InProgress", count: 4 },
  { tag: "Drafted", count: 8 },
  { tag: "Closed", count: 17 },
];

const ASSET_ROWS = [
  "MV Northern Star",
  "SS Pacific Dawn",
  "MT Coral Sea",
  "MV Aurora",
  "MV Baltic Trader",
  "MSC Bellissima",
];

const CONTEXT_ROWS = [
  "Engine #3 · aux",
  "Pacific/Auckland",
  "Alarm id 1234",
  "Threshold 70 kW",
  "Last review 2026-07-21",
];

export const AppShellShowcase: Component = () => (
  <div class="component-section">
    <h2>AppShell + AppHeader + AppMain — Layout primitives</h2>
    <p class="text-meta">
      Standard full-page app frame: vertical column at <code>100vh</code>,
      non-shrinking header on top, flexing main below. Drop in the
      <code> AppShell </code> at the route root and stop hand-rolling
      <code> display: flex; flex-direction: column; height: 100vh </code>.
    </p>

    <div class="example-group">
      <h3>Live preview (200px tall window)</h3>
      <div class="app-shell-demo__frame">
        <AppShell class="app-shell-demo__fill">
          <AppHeader>
            <strong>dside</strong>
            <Row gap="sm">
              <span class="text-meta">Plan</span>
              <span class="text-meta">Focus</span>
              <span class="text-meta">Review</span>
            </Row>
            <Button variant="icon-only" aria-label="Sign out" title="Sign out">
              <Icon name="log-out" />
            </Button>
          </AppHeader>
          <CompactInlineAppHeader>
            <Row gap="xs" wrap>
              <CountChip count={3} label="awaiting human" />
              <CountChip count={1} label="awaiting review" />
              <CountChip count={4} label="in progress" />
              <CountChip count={0} label="blocked" />
            </Row>
            <span class="text-meta">· 8 active</span>
          </CompactInlineAppHeader>
          <AppMain class="app-shell-demo__main">
            <Stack gap="xs">
              {FAKE_GROUPS.map((g) => (
                <div>
                  <StickyGroupHeader>
                    <SectionLabel>{g.tag}</SectionLabel>
                    <MutedBody>· {g.count}</MutedBody>
                  </StickyGroupHeader>
                  <Stack gap="xs" class="app-shell-demo__row-pad">
                    {Array.from({ length: g.count }).map((_, i) => (
                      <Row gap="sm">
                        <TextLabel>
                          {g.tag.toLowerCase()} item #{i + 1}
                        </TextLabel>
                        <TextSublabel>placeholder</TextSublabel>
                      </Row>
                    ))}
                  </Stack>
                </div>
              ))}
            </Stack>
          </AppMain>
        </AppShell>
      </div>
    </div>

    <div class="example-group">
      <h3>CollapsiblePanel — the side panels inside the frame</h3>
      <p class="text-meta">
        A side panel that collapses to a 24px strip with its label turned on
        end, and expands again when the strip is clicked. It is shown here in
        the only place it makes sense: the body of an AppShell, flanking the
        work area, which is the layout it was extracted from (dside's design
        view). The panel brings no width of its own — the caller sizes it, and
        the strip is a fixed 24px, so collapsing genuinely returns the space to
        the centre column rather than hiding content in place. Collapse the
        left panel, reload the page, and it stays collapsed:{" "}
        <code>persistKey</code> mirrors the boolean to localStorage. The right
        panel starts collapsed via <code>defaultCollapsed</code> and persists
        nothing, so it reopens on every visit.
      </p>
      <div class="app-shell-demo__frame">
        <AppShell class="app-shell-demo__fill">
          <AppHeader>
            <strong>Alarm Lab</strong>
            <MutedBody>Aux engine derate · MV Northern Star</MutedBody>
          </AppHeader>
          <AppMain>
            <PaneRow>
              <CollapsiblePanel
                side="left"
                label="Assets"
                persistKey="sui-gallery-collapsible-left"
                class="collapsible-demo__panel"
              >
                <ScrollYBox class="collapsible-demo__body">
                  <Stack gap="xs">
                    {ASSET_ROWS.map((asset) => (
                      <Row gap="sm">
                        <TextLabel>{asset}</TextLabel>
                      </Row>
                    ))}
                  </Stack>
                </ScrollYBox>
              </CollapsiblePanel>
              <GrowColumn class="collapsible-demo__center">
                <SectionLabel>Explanation</SectionLabel>
                <TextBody>
                  The work area keeps whatever width the panels aren't using.
                  Collapse either side and this column takes the space back.
                </TextBody>
                <MutedBody>
                  Neither panel knows about the other, and neither knows about
                  this column — they are siblings in a row, not a layout
                  component with slots.
                </MutedBody>
              </GrowColumn>
              <CollapsiblePanel
                side="right"
                label="Context"
                defaultCollapsed
                class="collapsible-demo__panel"
              >
                <ScrollYBox class="collapsible-demo__body">
                  <Stack gap="xs">
                    {CONTEXT_ROWS.map((row) => (
                      <Row gap="sm">
                        <TextSublabel>{row}</TextSublabel>
                      </Row>
                    ))}
                  </Stack>
                </ScrollYBox>
              </CollapsiblePanel>
            </PaneRow>
          </AppMain>
        </AppShell>
      </div>
    </div>
  </div>
);
