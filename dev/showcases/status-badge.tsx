import { type Component, For } from "solid-js";
import { Dynamic } from "solid-js/web";
import { StatusBadge } from "../../src/components/Badge/StatusBadge";
import {
  SmStatusBadge,
  CompliantBadge,
  ViolationBadge,
  WarningBadge,
  PendingBadge,
  InfoBadge,
} from "../../src/components/Badge/variants";
import { BaselineDot } from "../../src/components/Badge/BaselineDot";
import { ScenarioDot } from "../../src/components/Badge/ScenarioDot";
import { ScenarioGlyph } from "../../src/components/Badge/ScenarioGlyph";
import { TextBody, TextSublabel } from "../../src/components/Text";
import {
  ClusterRow,
  NarrowStack,
  WrappedClusterRow,
} from "../../src/components/Layout";
import { TextUnits, TextValue } from "../../src/components/Text";

// The tone-locked curried badges: pick the badge by NAME, never by a variant
// prop. Each renders its own name so the tone mapping is legible at a glance.
const TONE_BADGES: Array<[string, Component<{ label?: string }>]> = [
  ["CompliantBadge", CompliantBadge],
  ["ViolationBadge", ViolationBadge],
  ["WarningBadge", WarningBadge],
  ["PendingBadge", PendingBadge],
  ["InfoBadge", InfoBadge],
];

// Scenario identity: colour AND shape, so the series stays distinguishable in
// a monochrome or colourblind theme.
const SCENARIOS: Array<{ name: string; color: string; shape: "circle" | "square" | "pentagon" | "diamond" }> = [
  { name: "Baseline", color: "var(--sui-accent)", shape: "circle" },
  { name: "Aggressive", color: "var(--sui-warning)", shape: "square" },
  { name: "Conservative", color: "var(--sui-success)", shape: "pentagon" },
  { name: "Downside", color: "var(--sui-danger)", shape: "diamond" },
];

export const StatusBadgeShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>StatusBadge — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (StatusBadge.css), no component imports. Compliance-themed
        status badge with 5 variants.
      </p>

      <div class="example-group">
        <h3>Variants</h3>
        <div class="example-row">
          <StatusBadge variant="compliant">Compliant</StatusBadge>
          <StatusBadge variant="violation">Violation</StatusBadge>
          <StatusBadge variant="warning">Needs Power Log</StatusBadge>
          <StatusBadge variant="pending">Pending</StatusBadge>
          <StatusBadge variant="info">Info</StatusBadge>
        </div>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <WrappedClusterRow>
          <StatusBadge variant="compliant" size="sm">
            Small
          </StatusBadge>
          <StatusBadge variant="compliant">Default</StatusBadge>
        </WrappedClusterRow>
      </div>

      <div class="example-group">
        <h3>With label prop</h3>
        <div class="example-row">
          <StatusBadge variant="compliant" label="COMPLIANT" />
          <StatusBadge variant="violation" label="VIOLATION" />
        </div>
      </div>

      <div class="example-group">
        <h3>In Context</h3>
        <NarrowStack>
          <ClusterRow>
            <TextValue>2.314</TextValue>
            <TextUnits>g/kWh</TextUnits>
            <StatusBadge variant="compliant">COMPLIANT</StatusBadge>
          </ClusterRow>
          <ClusterRow>
            <span class="status-badge-demo__violation-value">4.821</span>
            <TextUnits>g/kWh</TextUnits>
            <StatusBadge variant="violation">VIOLATION</StatusBadge>
          </ClusterRow>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Tone-Locked Curried Badges</h3>
        <div class="text-meta">
          The preferred call-site form — the tone is in the name, so a badge
          can't be given the wrong one by a stray prop.
        </div>
        <WrappedClusterRow>
          <For each={TONE_BADGES}>
            {([name, Badge]) => <Dynamic component={Badge} label={name} />}
          </For>
        </WrappedClusterRow>
        <div class="text-meta">
          SmStatusBadge is the same badge at the dense size used inside cards
          and table rows:
        </div>
        <ClusterRow>
          <SmStatusBadge variant="compliant">compliant</SmStatusBadge>
          <SmStatusBadge variant="violation">violation</SmStatusBadge>
          <SmStatusBadge variant="warning">warning</SmStatusBadge>
          <SmStatusBadge variant="info">in_progress</SmStatusBadge>
        </ClusterRow>
      </div>

      <div class="example-group">
        <h3>Dots and Scenario Glyphs</h3>
        <NarrowStack>
          <ClusterRow>
            <BaselineDot />
            <TextBody>BaselineDot — the muted "this is the baseline" marker</TextBody>
          </ClusterRow>
          <TextSublabel>
            ScenarioDot (filled = selected) and ScenarioGlyph (colour + shape,
            so scenarios stay apart without colour):
          </TextSublabel>
          <For each={SCENARIOS}>
            {(sc, i) => (
              <ClusterRow>
                <ScenarioDot color={sc.color} filled={i() === 0} />
                <ScenarioGlyph color={sc.color} shape={sc.shape} filled={i() === 0} />
                <TextBody>{sc.name}</TextBody>
              </ClusterRow>
            )}
          </For>
        </NarrowStack>
      </div>
    </div>
  );
};