import { Component } from "solid-js";
import { Text } from "../../src/components/Text";
import {
  TextValue, TextLabel, TextTitle, TextBody, TextUnits, TextSublabel,
  NowrapBody, MutedBody, AccentBody,
  InfoTitle, WarningTitle, SuccessTitle, DangerTitle,
} from "../../src/components/Text";
import { Stack } from "../../src/components/Layout";

export const TextShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Text — Primitive (Depth 0)</h2>
      <p class="text-meta">Owns CSS (Text.css). Polymorphic text element with variant/color. Factory: createText().</p>

      <div class="example-group">
        <h3>Base Component</h3>
        <Stack gap="md">
          <div>
            <Text variant="value">92.4</Text>
            <div class="text-meta">value: 1.5rem / 600 / --text-primary</div>
          </div>
          <div>
            <Text variant="label">Performance Score</Text>
            <div class="text-meta">label: 1rem / 600 / --text-primary</div>
          </div>
          <div>
            <Text variant="title">Section Title</Text>
            <div class="text-meta">title: 0.875rem / 600 / --text-primary</div>
          </div>
          <div>
            <Text variant="body">A description providing additional context and details.</Text>
            <div class="text-meta">body: 0.875rem / normal / --text-secondary</div>
          </div>
          <div>
            <Text variant="units">pts</Text>
            <div class="text-meta">units: 0.9rem / normal / --text-secondary</div>
          </div>
          <div>
            <Text variant="sublabel">Target: 85 pts</Text>
            <div class="text-meta">sublabel: 0.75rem / normal / --text-muted</div>
          </div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Semantic Elements (as prop)</h3>
        <Stack gap="sm">
          <Text variant="label" as="h2">As h2</Text>
          <Text variant="body" as="p">As paragraph</Text>
          <Text variant="sublabel" as="div">As div</Text>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Curried Variants</h3>
        <Stack gap="md">
          <div>
            <TextValue>92.4</TextValue>
            <div class="text-meta">TextValue — variant: "value"</div>
          </div>
          <div>
            <TextLabel>Performance Score</TextLabel>
            <div class="text-meta">TextLabel — variant: "label"</div>
          </div>
          <div>
            <TextTitle>Section Title</TextTitle>
            <div class="text-meta">TextTitle — variant: "title"</div>
          </div>
          <div>
            <TextBody>A description providing additional context.</TextBody>
            <div class="text-meta">TextBody — variant: "body"</div>
          </div>
          <div>
            <TextUnits>pts</TextUnits>
            <div class="text-meta">TextUnits — variant: "units"</div>
          </div>
          <div>
            <TextSublabel>Target: 85 pts</TextSublabel>
            <div class="text-meta">TextSublabel — variant: "sublabel"</div>
          </div>
          <div>
            <NowrapBody>2026-02-13 08:30 — 14:15</NowrapBody>
            <div class="text-meta">NowrapBody — body + as: "span" + white-space: nowrap</div>
          </div>
          <div>
            <MutedBody>Dimmed secondary content</MutedBody>
            <div class="text-meta">MutedBody — body + color: --text-muted</div>
          </div>
          <div>
            <AccentBody>Highlighted accent content</AccentBody>
            <div class="text-meta">AccentBody — body + color: --hud-accent</div>
          </div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Status-Colored Titles</h3>
        <Stack gap="sm">
          <div>
            <InfoTitle>Info Title</InfoTitle>
            <div class="text-meta">InfoTitle — title + #00d4ff</div>
          </div>
          <div>
            <WarningTitle>Warning Title</WarningTitle>
            <div class="text-meta">WarningTitle — title + #ffcc00</div>
          </div>
          <div>
            <SuccessTitle>Success Title</SuccessTitle>
            <div class="text-meta">SuccessTitle — title + #00ff88</div>
          </div>
          <div>
            <DangerTitle>Danger Title</DangerTitle>
            <div class="text-meta">DangerTitle — title + #ff0040</div>
          </div>
        </Stack>
      </div>
    </div>
  );
};
