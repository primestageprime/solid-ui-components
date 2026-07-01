import type { Component } from "solid-js";
import { AppShell, AppHeader, AppMain } from "../../src/components/Layout";
import { Row } from "../../src/components/Layout/Row";
import { Stack } from "../../src/components/Layout/Stack";
import { CountChip } from "../../src/components/Badge";
import { StickyGroupHeader, SectionLabel } from "../../src/components/Section";
import { TextLabel, TextSublabel, MutedBody } from "../../src/components/Text";
import { Button } from "../../src/components/Button/Button";
import { Icon } from "../../src/components/Icon";

const FAKE_GROUPS = [
  { tag: "AwaitingHuman", count: 3 },
  { tag: "AwaitingReview", count: 1 },
  { tag: "InProgress", count: 4 },
  { tag: "Drafted", count: 8 },
  { tag: "Closed", count: 17 },
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
      <div
        style={{
          height: "320px",
          border: "1px solid var(--sui-border)",
          "border-radius": "4px",
          overflow: "hidden",
        }}
      >
        <AppShell style={{ height: "100%" }}>
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
          <AppHeader inline size="sm">
            <Row gap="xs" wrap>
              <CountChip count={3} label="awaiting human" />
              <CountChip count={1} label="awaiting review" />
              <CountChip count={4} label="in progress" />
              <CountChip count={0} label="blocked" />
            </Row>
            <span class="text-meta">· 8 active</span>
          </AppHeader>
          <AppMain style={{ "overflow-y": "auto" }}>
            <Stack gap="xs">
              {FAKE_GROUPS.map((g) => (
                <div>
                  <StickyGroupHeader>
                    <SectionLabel>{g.tag}</SectionLabel>
                    <MutedBody>· {g.count}</MutedBody>
                  </StickyGroupHeader>
                  <Stack gap="xs" style={{ padding: "4px 12px" }}>
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
  </div>
);
