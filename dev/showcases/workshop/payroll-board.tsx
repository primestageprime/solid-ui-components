import { Component, createSignal } from "solid-js";
import { CollapsibleSection } from "../../../src/components/Section";
import { SectionTitle } from "../../../src/components/Text";
import { DirtyComboSection } from "./payroll-board/DirtyComboSection";
import { EventsSection } from "./payroll-board/events-section";
import { ChangesSection } from "./payroll-board/changes-section";
import { SlopeSection } from "./payroll-board/slope-section";
import { ChartSection } from "./payroll-board/chart-section";

export const meta = { label: "Payroll Board" };

// Peter's standing rule: every approved section moves into the collapsed
// "Approved" fold at the bottom; work in progress stays above it.
const PayrollBoardBench: Component = () => {
  const [approvedOpen, setApprovedOpen] = createSignal(false);
  return (
    <div class="component-section component-section--full">
      <SectionTitle>Payroll Board</SectionTitle>
      <DirtyComboSection />
      {/* build here */}
      <CollapsibleSection
        title="Approved"
        collapsed={!approvedOpen()}
        onToggleCollapse={() => setApprovedOpen(!approvedOpen())}
      >
        <SlopeSection />
        <ChangesSection />
        <EventsSection />
        <ChartSection />
      </CollapsibleSection>
    </div>
  );
};

export default PayrollBoardBench;
