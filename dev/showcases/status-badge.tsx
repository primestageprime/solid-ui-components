import type { Component } from "solid-js";
import { StatusBadge } from "../../src/components/Badge/StatusBadge";
import {
  ClusterRow,
  NarrowStack,
  WrappedClusterRow,
} from "../../src/components/Layout";
import { TextUnits, TextValue } from "../../src/components/Text";

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
            <span
              style={{
                "font-size": "1.5rem",
                "font-weight": "600",
                color: "var(--sui-danger)",
              }}
            >
              4.821
            </span>
            <TextUnits>g/kWh</TextUnits>
            <StatusBadge variant="violation">VIOLATION</StatusBadge>
          </ClusterRow>
        </NarrowStack>
      </div>
    </div>
  );
};
