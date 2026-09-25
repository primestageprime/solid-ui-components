import { Component, createSignal } from "solid-js";
import { CollapsibleSection } from "../../../src/components/Section";
import { SectionTitle } from "../../../src/components/Text";
import { DirtyComboSection } from "./payroll-board/DirtyComboSection";
import { EventsSection } from "./payroll-board/events-section";

export const meta = { label: "Payroll Board" };

// Peter's standing rule: every approved section moves into the collapsed
// "Approved" fold at the bottom; work in progress stays above it.
// This worktree (feat/combo-parity) carries only the sections that compile
// against its branch; the slope/changes/chart sections live on the main
// checkout's uncommitted work.
const PayrollBoardBench: Component = () => {
  const [approvedOpen, setApprovedOpen] = createSignal(false);
  return (
    <div class="component-section component-section--full">
      <SectionTitle>Payroll Board</SectionTitle>
      {/* build here — DirtyComboBox is UN-approved again (Peter, 2026-09-24) */}
      <DirtyComboSection />
      <CollapsibleSection
        title="Approved"
        collapsed={!approvedOpen()}
        onToggleCollapse={() => setApprovedOpen(!approvedOpen())}
      >
        <EventsSection />
      </CollapsibleSection>
    </div>
  );
};

export default PayrollBoardBench;
