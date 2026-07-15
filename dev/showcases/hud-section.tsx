import type { Component } from "solid-js";
import { Section } from "../../src/components/Section/Section";
import { Button } from "../../src/components/Button/Button";
import { TextBody, TextLabel, TextSublabel } from "../../src/components/Text";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const AccentSectionShowcase: Component<Depth2Props> = (props) => {
  return (
    <div class="component-section">
      <h2>Section — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (HUD.css), no component imports. Collapsible section with
        title, subtitle, corners.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <Section
            title="System Status"
            subtitle="Real-time monitoring"
            headerAction={
              <Button variant="primary" size="sm">
                Refresh
              </Button>
            }
          >
            <TextBody>HUD section content goes here.</TextBody>
          </Section>
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("text")}
          >
            <div class="depth2-atom__label">Title</div>
            <TextLabel>System Status</TextLabel>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("text")}
          >
            <div class="depth2-atom__label">Sublabel</div>
            <TextSublabel>Real-time monitoring</TextSublabel>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("button")}
          >
            <div class="depth2-atom__label">Button</div>
            <Button variant="primary" size="sm">
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
