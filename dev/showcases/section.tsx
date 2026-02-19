import { Component } from "solid-js";
import { Section } from "../../src/components/Section";
import { CollapsibleSection, DecoratedSection, BorderedSection } from "../../src/components/Section";
import { Button } from "../../src/components/Button";
import { Stack } from "../../src/components/Layout";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const SectionShowcase: Component<Depth2Props> = (props) => {
  return (
    <div class="component-section">
      <h2>Section — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (Section.css), no component imports. Section with header/subtitle/action, decorated corners.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <Section
            title="Overview"
            subtitle="Summary of key metrics"
            headerAction={<Button size="sm">Export</Button>}
          >
            <p style={{ margin: "0", color: "var(--jtf-text-secondary)", "font-size": "0.875rem" }}>
              Section content goes here.
            </p>
          </Section>

          <h3 style={{ "margin-top": "24px" }}>Curried Variants</h3>
          <Stack gap="md">
            <div>
              <CollapsibleSection title="CollapsibleSection" subtitle="Click header to collapse">
                <p style={{ margin: "0", color: "var(--jtf-text-secondary)", "font-size": "0.875rem" }}>
                  Bordered section with collapse support, default expanded.
                </p>
              </CollapsibleSection>
              <div class="text-meta">CollapsibleSection — variant: "bordered", collapsible, defaultExpanded</div>
            </div>
            <div>
              <DecoratedSection title="DecoratedSection">
                <p style={{ margin: "0", color: "var(--jtf-text-secondary)", "font-size": "0.875rem" }}>
                  Decorated section with corner brackets, fills parent.
                </p>
              </DecoratedSection>
              <div class="text-meta">DecoratedSection — variant: "decorated", fill</div>
            </div>
            <div>
              <BorderedSection title="BorderedSection">
                <p style={{ margin: "0", color: "var(--jtf-text-secondary)", "font-size": "0.875rem" }}>
                  Simple bordered container.
                </p>
              </BorderedSection>
              <div class="text-meta">BorderedSection — variant: "bordered"</div>
            </div>
          </Stack>
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("text")}
          >
            <div class="depth2-atom__label">Title</div>
            <h2 style={{ margin: "0", "font-size": "1.125rem", "font-weight": "600" }}>Overview</h2>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("text")}
          >
            <div class="depth2-atom__label">Sublabel</div>
            <p style={{ margin: "0", "font-size": "0.75rem", color: "var(--jtf-text-muted)" }}>Summary of key metrics</p>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("button")}
          >
            <div class="depth2-atom__label">Button</div>
            <Button size="sm">Export</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
