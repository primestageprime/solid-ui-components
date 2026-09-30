import { Component, createSignal } from "solid-js";
import {
  CollapsibleSection,
  SectionTitle,
  SpacedStack,
  ViewportColumn,
} from "../../../src";
import { BiweeklyReferenceSection } from "./projection-forms/biweekly-reference-section";
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
          <MonthlyFixedSection />
          <BiweeklyReferenceSection />
          <CollapsibleSection
            title="Approved"
            collapsed={!approvedOpen()}
            onToggleCollapse={() => setApprovedOpen(!approvedOpen())}
          >
            {null}
          </CollapsibleSection>
        </SpacedStack>
      </ViewportColumn>
    </div>
  );
};

export default ProjectionFormsBench;
