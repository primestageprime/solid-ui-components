import { Component, createSignal } from "solid-js";
import {
  CollapsibleSection,
  SectionTitle,
  SpacedStack,
  ViewportColumn,
} from "../../../src";
import { BiweeklyReferenceSection } from "./projection-forms/biweekly-reference-section";
import { CascadeSection } from "./projection-forms/cascade-section";
import { CatalogSection, ExceptionsSection, GallerySection } from "./projection-forms/strips-sections";
import { MonthlyFixedSection } from "./projection-forms/monthly-fixed-section";

export const meta = { label: "Projection Forms" };

// One section per thorcasting projection form — the goal is the PATTERN for
// composing SUI form elements. Static data only (projection-forms.fixtures.ts).
// Approved sections move into the collapsed fold at the bottom.
const ProjectionFormsBench: Component = () => {
  const [approvedOpen, setApprovedOpen] = createSignal(false);
  return (
    <div class="component-section component-section--full projection-forms-demo">
      <ViewportColumn>
        <SectionTitle>Projection Forms</SectionTitle>
        <SpacedStack>
          <CatalogSection />
          <GallerySection />
          <ExceptionsSection />
          <CollapsibleSection
            title="Previous: cascade"
            collapsed={!approvedOpen()}
            onToggleCollapse={() => setApprovedOpen(!approvedOpen())}
          >
            <SpacedStack>
              <CascadeSection />
              <MonthlyFixedSection />
              <BiweeklyReferenceSection />
            </SpacedStack>
          </CollapsibleSection>
        </SpacedStack>
      </ViewportColumn>
    </div>
  );
};

export default ProjectionFormsBench;
