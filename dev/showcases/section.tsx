import type { Component } from "solid-js";
import { Section } from "../../src/components/Section/Section";
import {
  CollapsibleSection,
  DecoratedSection,
  BorderedSection,
} from "../../src/components/Section";
import { Button } from "../../src/components/Button/Button";
import { Stack } from "../../src/components/Layout/Stack";
import { TextBody, TextSublabel } from "../../src/components/Text";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const SectionShowcase: Component<Depth2Props> = (props) => {
  return (
    <div class="component-section">
      <h2>Section — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (Section.css), no component imports. Section with
        header/subtitle/action, decorated corners.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <Section
            title="Overview"
            subtitle="Summary of key metrics"
            headerAction={<Button size="sm">Export</Button>}
          >
            <TextBody>Section content goes here.</TextBody>
          </Section>

          <h3 class="showcase-heading-gap">Curried Variants</h3>
          <Stack gap="sm">
            <div>
              <CollapsibleSection
                title="CollapsibleSection"
                subtitle="Click header to collapse"
              >
                <TextBody>
                  Bordered section with collapse support, default expanded.
                </TextBody>
              </CollapsibleSection>
              <div class="text-meta">
                CollapsibleSection — variant: "bordered", collapsible,
                defaultExpanded
              </div>
            </div>
            <div>
              <DecoratedSection title="DecoratedSection">
                <TextBody>
                  Decorated section with corner brackets, fills parent.
                </TextBody>
              </DecoratedSection>
              <div class="text-meta">
                DecoratedSection — variant: "decorated", fill
              </div>
            </div>
            <div>
              <BorderedSection title="BorderedSection">
                <TextBody>Simple bordered container.</TextBody>
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
            <h2 class="section-demo__atom-title">Overview</h2>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("text")}
          >
            <div class="depth2-atom__label">Sublabel</div>
            <TextSublabel>Summary of key metrics</TextSublabel>
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
