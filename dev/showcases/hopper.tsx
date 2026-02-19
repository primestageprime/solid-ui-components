import { createSignal, For, Component } from "solid-js";
import { StatusBadge } from "../../src/components/Badge";
import { DTable, DT, DD } from "../../src/components/DataList";
import { FormulaProvider, FormulaVarRow, MathFormula } from "../../src/components/MathFormula";
import { Button } from "../../src/components/Button";
import { NavLink } from "../../src/components/Navigation";
import { DigitRoller, MetricCard, NumberWithUnits, ResultDisplay, ResultPanel, StatsTable, createFormulaPanel, EngineDataSection } from "../../src/components/DataDisplay";
import { EmptyState, AlertBox } from "../../src/components/Feedback";
import { ThemedInput, ThemedTextarea } from "../../src/components/Inputs";
import { Icon, IconName, ICON_GROUPS } from "../../src/components/Icon";
import { Toggle } from "../../src/components/Toggle";
import { ProgressCard, ProgressStep } from "../../src/components/ProgressCard";
import { StackedProgressBar } from "../../src/components/Progress";
import { HeatmapMulti, HeatmapMultiRow } from "../../src/components/Heatmap";
import {
  BaseTable,
  TableColumn,
  QuickFilter,
  SelectableTable,
  createSelectionStore,
  IdCell,
  StringCell,
  StatusCell,
  DateCell,
  IntCell,
  FloatCell,
  MoneyCell,
  DurationCell,
  TagCell,
  GroupedTableDemo,
  DataTableContainer,
} from "../../src/components/Table";
import { Section, Panel, Divider } from "../../src/components/Section";
import {
  HUDPage,
  HUDSection,
  HUDPanel,
  HUDModal,
  HUDTabs,
  HUDButtonGroup,
  HUDButton,
  HUDToggle,
  HUDList,
  HUDListItem,
} from "../../src/components/HUD";
import { SidebarSelectorDemo } from "../../src/components/Selector";
import { VesselCard } from "../../src/components/Card";

// ── HUD ──────────────────────────────────────────────────────────────

const HUDShowcase: Component = () => {
  const [modalOpen, setModalOpen] = createSignal(false);
  const [activeHudTab, setActiveHudTab] = createSignal("overview");
  const [sectionCollapsed, setSectionCollapsed] = createSignal(false);
  const [toggles, setToggles] = createSignal({
    power: true,
    sensors: false,
    tracking: true,
    comms: false,
  });

  const hudTabs = [
    { id: "overview", label: "Overview" },
    { id: "systems", label: "Systems" },
    { id: "navigation", label: "Nav" },
    { id: "comms", label: "Comms" },
  ];

  return (
    <HUDPage gridPattern class="hud-showcase">
      <div style={{ padding: "24px" }}>
        <h2 style={{ color: "var(--hud-accent)", "margin-bottom": "24px", "text-transform": "uppercase", "letter-spacing": "0.1em" }}>
          HUD Component System
        </h2>
        <p style={{ color: "var(--hud-text-dim)", "margin-bottom": "32px" }}>
          Sci-fi inspired interface components with clipped corners, edge accents, and glowing effects.
        </p>

        <HUDSection title="Navigation Tabs" subtitle="Tab Variants" variant="primary">
          <div style={{ display: "flex", "flex-direction": "column", gap: "24px" }}>
            <div>
              <p style={{ color: "var(--hud-text-dim)", "font-size": "12px", "margin-bottom": "8px" }}>Default (Underline)</p>
              <HUDTabs tabs={hudTabs} activeTab={activeHudTab()} onTabChange={setActiveHudTab} />
            </div>
            <div>
              <p style={{ color: "var(--hud-text-dim)", "font-size": "12px", "margin-bottom": "8px" }}>Boxed</p>
              <HUDTabs tabs={hudTabs} activeTab={activeHudTab()} onTabChange={setActiveHudTab} variant="boxed" />
            </div>
            <div>
              <p style={{ color: "var(--hud-text-dim)", "font-size": "12px", "margin-bottom": "8px" }}>Pill</p>
              <HUDTabs tabs={hudTabs} activeTab={activeHudTab()} onTabChange={setActiveHudTab} variant="pill" />
            </div>
          </div>
        </HUDSection>

        <HUDSection title="Panel Variants" subtitle="Corner Styles & Glow Effects" variant="primary">
          <div style={{ display: "grid", "grid-template-columns": "repeat(3, 1fr)", gap: "16px" }}>
            <HUDPanel title="Clip Corners" corners="clip" glow="subtle">
              <p style={{ color: "var(--hud-text-dim)", "font-size": "13px", margin: 0 }}>
                Angled corners using clip-path for a tech aesthetic.
              </p>
            </HUDPanel>
            <HUDPanel title="Bracket Corners" corners="bracket" glow="medium">
              <p style={{ color: "var(--hud-text-dim)", "font-size": "13px", margin: 0 }}>
                L-shaped bracket decorations at each corner.
              </p>
            </HUDPanel>
            <HUDPanel title="Notch Corners" corners="notch" glow="strong">
              <p style={{ color: "var(--hud-text-dim)", "font-size": "13px", margin: 0 }}>
                Asymmetric notch cut-outs for visual interest.
              </p>
            </HUDPanel>
          </div>

          <div style={{ display: "grid", "grid-template-columns": "repeat(3, 1fr)", gap: "16px", "margin-top": "16px" }}>
            <HUDPanel title="Primary" variant="primary" corners="clip" size="sm">
              <span style={{ color: "var(--hud-accent)" }}>Accent color panel</span>
            </HUDPanel>
            <HUDPanel title="Danger" variant="danger" corners="clip" size="sm">
              <span style={{ color: "var(--hud-danger)" }}>Warning state</span>
            </HUDPanel>
            <HUDPanel title="Success" variant="success" corners="clip" size="sm">
              <span style={{ color: "var(--hud-success)" }}>Positive state</span>
            </HUDPanel>
          </div>
        </HUDSection>

        <HUDSection
          title="System Controls"
          subtitle="Toggle Variants"
          variant="primary"
          collapsible
          collapsed={sectionCollapsed()}
          onToggleCollapse={() => setSectionCollapsed(!sectionCollapsed())}
        >
          <div style={{ display: "grid", "grid-template-columns": "repeat(2, 1fr)", gap: "24px" }}>
            <HUDPanel corners="bracket">
              <p style={{ color: "var(--hud-text-dim)", "font-size": "11px", "text-transform": "uppercase", "margin-bottom": "16px" }}>Default Style</p>
              <div style={{ display: "flex", "flex-direction": "column", gap: "16px" }}>
                <HUDToggle
                  label="Primary Power"
                  checked={toggles().power}
                  onChange={(v) => setToggles({ ...toggles(), power: v })}
                />
                <HUDToggle
                  label="Sensor Array"
                  checked={toggles().sensors}
                  onChange={(v) => setToggles({ ...toggles(), sensors: v })}
                  color="warning"
                />
                <HUDToggle
                  label="Target Tracking"
                  checked={toggles().tracking}
                  onChange={(v) => setToggles({ ...toggles(), tracking: v })}
                  color="success"
                />
              </div>
            </HUDPanel>

            <HUDPanel corners="bracket">
              <p style={{ color: "var(--hud-text-dim)", "font-size": "11px", "text-transform": "uppercase", "margin-bottom": "16px" }}>Power Style</p>
              <div style={{ display: "flex", gap: "24px", "align-items": "center" }}>
                <HUDToggle variant="power" checked={toggles().power} onChange={(v) => setToggles({ ...toggles(), power: v })} />
                <HUDToggle variant="power" checked={toggles().sensors} onChange={(v) => setToggles({ ...toggles(), sensors: v })} color="warning" />
                <HUDToggle variant="power" checked={toggles().tracking} onChange={(v) => setToggles({ ...toggles(), tracking: v })} color="success" />
              </div>
            </HUDPanel>
          </div>
        </HUDSection>

        <HUDSection title="Action Controls" subtitle="Button Groups" variant="primary">
          <div style={{ display: "flex", "flex-direction": "column", gap: "24px" }}>
            <div>
              <p style={{ color: "var(--hud-text-dim)", "font-size": "11px", "text-transform": "uppercase", "margin-bottom": "8px" }}>Horizontal Group</p>
              <HUDButtonGroup>
                <HUDButton>Scan</HUDButton>
                <HUDButton>Analyze</HUDButton>
                <HUDButton>Deploy</HUDButton>
                <HUDButton variant="primary">Execute</HUDButton>
              </HUDButtonGroup>
            </div>

            <div>
              <p style={{ color: "var(--hud-text-dim)", "font-size": "11px", "text-transform": "uppercase", "margin-bottom": "8px" }}>Connected Buttons</p>
              <HUDButtonGroup gap="none">
                <HUDButton active>Day</HUDButton>
                <HUDButton>Week</HUDButton>
                <HUDButton>Month</HUDButton>
                <HUDButton>Year</HUDButton>
              </HUDButtonGroup>
            </div>
          </div>
        </HUDSection>

        <HUDSection title="Status Displays" subtitle="List Variants" variant="primary">
          <div style={{ display: "grid", "grid-template-columns": "repeat(2, 1fr)", gap: "16px" }}>
            <HUDPanel title="System Status" corners="clip">
              <HUDList variant="status" dividers>
                <HUDListItem status="active" secondary="Nominal">Primary Systems</HUDListItem>
                <HUDListItem status="success" secondary="100%">Shield Generator</HUDListItem>
                <HUDListItem status="warning" secondary="72%">Fuel Reserves</HUDListItem>
                <HUDListItem status="error" secondary="Offline">Communications</HUDListItem>
              </HUDList>
            </HUDPanel>

            <HUDPanel title="Navigation Menu" corners="clip">
              <HUDList variant="menu">
                <HUDListItem>Dashboard</HUDListItem>
                <HUDListItem>System Diagnostics</HUDListItem>
                <HUDListItem>Navigation</HUDListItem>
                <HUDListItem>Settings</HUDListItem>
              </HUDList>
            </HUDPanel>
          </div>
        </HUDSection>

        <HUDSection title="Modal Dialog" subtitle="Overlay Panel" variant="primary">
          <HUDButtonGroup>
            <HUDButton variant="primary" onClick={() => setModalOpen(true)}>
              Open Modal
            </HUDButton>
          </HUDButtonGroup>

          <HUDModal
            open={modalOpen()}
            onClose={() => setModalOpen(false)}
            title="System Alert"
            subtitle="Priority Level: High"
            size="md"
            corners="clip"
            footer={
              <>
                <HUDButton onClick={() => setModalOpen(false)}>Cancel</HUDButton>
                <HUDButton variant="primary" onClick={() => setModalOpen(false)}>Confirm</HUDButton>
              </>
            }
          >
            <p style={{ color: "var(--hud-text)", margin: "0 0 16px" }}>
              Incoming transmission detected from unknown source.
            </p>
            <HUDPanel corners="bracket" variant="warning" size="sm">
              <p style={{ color: "var(--hud-warning)", margin: 0, "font-size": "12px" }}>
                Warning: Unauthorized access attempt logged
              </p>
            </HUDPanel>
          </HUDModal>
        </HUDSection>
      </div>
    </HUDPage>
  );
};

// ── Badges ───────────────────────────────────────────────────────────

const HopperBadgesShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Badge Components</h2>

      <div class="example-group">
        <h3>StatusBadge — Variants</h3>
        <div class="example-row" style={{ gap: "12px" }}>
          <StatusBadge variant="compliant">Compliant</StatusBadge>
          <StatusBadge variant="violation">Violation</StatusBadge>
          <StatusBadge variant="warning">Needs Power Log</StatusBadge>
          <StatusBadge variant="pending">Pending</StatusBadge>
          <StatusBadge variant="info">Info</StatusBadge>
        </div>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <div class="example-row" style={{ "align-items": "center", gap: "12px" }}>
          <StatusBadge variant="compliant" size="sm">Small</StatusBadge>
          <StatusBadge variant="compliant">Default</StatusBadge>
        </div>
      </div>

      <div class="example-group">
        <h3>With label prop</h3>
        <div class="example-row" style={{ gap: "12px" }}>
          <StatusBadge variant="compliant" label="COMPLIANT" />
          <StatusBadge variant="violation" label="VIOLATION" />
        </div>
      </div>

      <div class="example-group">
        <h3>In Context</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Typical usage: inline with a result value.
        </p>
        <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
          <span style={{ "font-size": "1.5rem", "font-weight": "600", color: "var(--jtf-text-primary)" }}>
            2.314
          </span>
          <span style={{ color: "var(--jtf-text-secondary)", "font-size": "0.9rem" }}>g/kWh</span>
          <StatusBadge variant="compliant">COMPLIANT</StatusBadge>
        </div>
        <div style={{ display: "flex", "align-items": "center", gap: "12px", "margin-top": "12px" }}>
          <span style={{ "font-size": "1.5rem", "font-weight": "600", color: "#ff0040" }}>
            4.821
          </span>
          <span style={{ color: "var(--jtf-text-secondary)", "font-size": "0.9rem" }}>g/kWh</span>
          <StatusBadge variant="violation">VIOLATION</StatusBadge>
        </div>
      </div>

      <div class="example-group">
        <h3>NavLink</h3>
        <div style={{ display: "flex", gap: "4px", "border-bottom": "1px solid var(--jtf-border)", "padding-bottom": "2px" }}>
          <NavLink href="#" active>Vessel Calls</NavLink>
          <NavLink href="#">Violations</NavLink>
          <NavLink href="#" color="warning" badge={3}>Unresolved</NavLink>
          <NavLink href="#">Reports</NavLink>
        </div>
      </div>
    </div>
  );
};

// ── Feedback ─────────────────────────────────────────────────────────

const FeedbackShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Feedback Components</h2>

      <div class="example-group">
        <h3>EmptyState — Variants</h3>
        <div style={{ display: "flex", "flex-direction": "column", gap: "16px" }}>
          <div style={{ border: "1px dashed var(--jtf-border)", "border-radius": "8px" }}>
            <EmptyState message="No data available for this time period." />
          </div>
          <div style={{ border: "1px dashed var(--jtf-border)", "border-radius": "8px" }}>
            <EmptyState variant="muted" message="Select a vessel call to view details." />
          </div>
          <div style={{ border: "1px dashed var(--jtf-border)", "border-radius": "8px" }}>
            <EmptyState variant="accent" message="Loading vessel call data..." />
          </div>
        </div>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <div style={{ display: "flex", "flex-direction": "column", gap: "16px" }}>
          <div style={{ border: "1px dashed var(--jtf-border)", "border-radius": "8px" }}>
            <EmptyState size="sm" message="No rows." />
          </div>
          <div style={{ border: "1px dashed var(--jtf-border)", "border-radius": "8px" }}>
            <EmptyState message="Default size empty state." />
          </div>
          <div style={{ border: "1px dashed var(--jtf-border)", "border-radius": "8px" }}>
            <EmptyState size="lg" message="No vessel calls found matching your criteria." />
          </div>
        </div>
      </div>

      <div class="example-group">
        <h3>With Children</h3>
        <div style={{ border: "1px dashed var(--jtf-border)", "border-radius": "8px" }}>
          <EmptyState>
            <span style={{ color: "var(--jtf-text-muted)" }}>No hourly data. </span>
            <span style={{ color: "var(--hud-accent, #00d4ff)" }}>Run the cache pipeline to generate it.</span>
          </EmptyState>
        </div>
      </div>

      <div class="example-group">
        <h3>AlertBox — Variants</h3>
        <div style={{ display: "flex", "flex-direction": "column", gap: "12px" }}>
          <AlertBox variant="info" title="Information" description="This vessel call has been processed successfully." />
          <AlertBox variant="warning" title="Pending Approval" description="This non-compliant vessel call requires review and approval." />
          <AlertBox variant="success" title="Approved" description="Approved on 2026-01-15 14:30. This vessel call has been reviewed." />
          <AlertBox variant="danger" title="Error" description="Failed to submit approval. Please try again." />
        </div>
      </div>

      <div class="example-group">
        <h3>With Action Slot</h3>
        <AlertBox
          variant="warning"
          title="Pending Approval"
          description="This non-compliant vessel call requires review."
          action={<Button variant="primary" size="sm">Approve</Button>}
        />
      </div>

      <div class="example-group">
        <h3>With Custom Children</h3>
        <AlertBox variant="danger">
          <div style={{ color: "#ff0040", "font-size": "0.875rem" }}>
            Engine power data required. Using default engine power (1200 kW).
          </div>
        </AlertBox>
      </div>
    </div>
  );
};

// ── Data Display ─────────────────────────────────────────────────────

const Pythag = createFormulaPanel({
  label: "Hypotenuse",
  resultUnits: "units",
  vars: [
    { id: "a", label: "Side a", units: "units", precision: 1 },
    { id: "b", label: "Side b", units: "units", precision: 1 },
  ],
  threshold: 10,
  resultPrecision: 3,
  compute: (v) => Math.sqrt(v.a ** 2 + v.b ** 2),
  latex: (r) => `c = \\sqrt{\\var{a}{a}^2 + \\var{b}{b}^2} = \\var{result}{${r}}`,
});

const KineticEnergy = createFormulaPanel({
  label: "Kinetic Energy",
  resultUnits: "J",
  vars: [
    { id: "m", label: "Mass", units: "kg", precision: 1 },
    { id: "v", label: "Velocity", units: "m/s", precision: 1 },
  ],
  threshold: 1000,
  resultPrecision: 1,
  compute: (vals) => 0.5 * vals.m * vals.v ** 2,
  latex: (r) => `KE = \\frac{1}{2} \\var{m}{m} \\cdot \\var{v}{v}^2 = \\var{result}{${r}}`,
});

const FormulaPanelDemo: Component = () => {
  const [sideA, setSideA] = createSignal(3);
  const [sideB, setSideB] = createSignal(4);
  const [mass, setMass] = createSignal(100);
  const [velocity, setVelocity] = createSignal(5);

  return (
    <>
      <div class="example-group">
        <h3>createFormulaPanel — Curried Factories</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Declarative formula panels from a single config object. Hover variables for bidirectional highlighting.
          Drag sliders to see reactive updates and compliance badge changes.
        </p>
        <div style={{ display: "flex", gap: "20px", "flex-wrap": "wrap", "margin-bottom": "16px" }}>
          <div style={{ flex: "1", "min-width": "300px" }}>
            <div style={{ display: "flex", gap: "16px", "margin-bottom": "12px" }}>
              <label style={{ "font-size": "13px", color: "var(--jtf-text-secondary)" }}>
                a: {sideA()}
                <input type="range" min="1" max="15" step="0.5" value={sideA()} onInput={(e) => setSideA(parseFloat(e.currentTarget.value))} style={{ "margin-left": "8px" }} />
              </label>
              <label style={{ "font-size": "13px", color: "var(--jtf-text-secondary)" }}>
                b: {sideB()}
                <input type="range" min="1" max="15" step="0.5" value={sideB()} onInput={(e) => setSideB(parseFloat(e.currentTarget.value))} style={{ "margin-left": "8px" }} />
              </label>
            </div>
            <Pythag.Panel values={{ a: sideA(), b: sideB() }} />
          </div>

          <div style={{ flex: "1", "min-width": "300px" }}>
            <div style={{ display: "flex", gap: "16px", "margin-bottom": "12px" }}>
              <label style={{ "font-size": "13px", color: "var(--jtf-text-secondary)" }}>
                m: {mass()} kg
                <input type="range" min="10" max="200" step="5" value={mass()} onInput={(e) => setMass(parseFloat(e.currentTarget.value))} style={{ "margin-left": "8px" }} />
              </label>
              <label style={{ "font-size": "13px", color: "var(--jtf-text-secondary)" }}>
                v: {velocity()} m/s
                <input type="range" min="1" max="10" step="0.5" value={velocity()} onInput={(e) => setVelocity(parseFloat(e.currentTarget.value))} style={{ "margin-left": "8px" }} />
              </label>
            </div>
            <KineticEnergy.Panel values={{ m: mass(), v: velocity() }} />
          </div>
        </div>
      </div>

      <div class="example-group">
        <h3>createFormulaPanel — Individual Composition</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          The same config decomposed into individual components arranged in a custom layout.
        </p>
        <FormulaProvider>
          <div class="section-container" style={{ display: "grid", "grid-template-columns": "1fr 1fr", gap: "16px" }}>
            <div>
              <Pythag.Result values={{ a: sideA(), b: sideB() }} />
              <Pythag.Givens values={{ a: sideA(), b: sideB() }} />
            </div>
            <div style={{ display: "flex", "align-items": "center" }}>
              <Pythag.Formula values={{ a: sideA(), b: sideB() }} />
            </div>
          </div>
        </FormulaProvider>
      </div>
    </>
  );
};

const DataDisplayShowcase: Component = () => {
  const [rollerAnimating, setRollerAnimating] = createSignal(false);
  const [rollerValueA] = createSignal("3.412");
  const [rollerValueB] = createSignal("2.116");
  const [rollerCurrent, setRollerCurrent] = createSignal("3.412");
  const [rollerPrev, setRollerPrev] = createSignal<string | null>(null);

  const triggerRoll = () => {
    const next = rollerCurrent() === rollerValueA() ? rollerValueB() : rollerValueA();
    setRollerPrev(rollerCurrent());
    setRollerCurrent(next);
    setRollerAnimating(true);
  };

  return (
    <div class="component-section">
      <h2>Data Display Components</h2>

      <div class="example-group">
        <h3>DigitRoller — Animated Value Transition</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Vertical digit rolling animation for transitioning between numeric values.
          Used to animate NOx/ROG result changes after power log submission.
        </p>
        <div style={{ display: "flex", "align-items": "center", gap: "20px" }}>
          <span style={{
            "font-size": "1.5rem",
            "font-weight": "600",
            color: "var(--jtf-text-primary)",
            "font-variant-numeric": "tabular-nums",
          }}>
            <DigitRoller
              value={rollerCurrent()}
              previousValue={rollerPrev()}
              animate={rollerAnimating()}
              onAnimationEnd={() => setRollerAnimating(false)}
            />
          </span>
          <span style={{ color: "var(--jtf-text-secondary)", "font-size": "0.9rem" }}>g/kWh</span>
          <button class="demo-btn" onClick={triggerRoll}>
            Roll to {rollerCurrent() === rollerValueA() ? rollerValueB() : rollerValueA()}
          </button>
        </div>
        <div style={{ "margin-top": "16px", display: "flex", gap: "24px", "align-items": "center" }}>
          <div>
            <span style={{ "font-size": "11px", color: "var(--jtf-text-muted)", "text-transform": "uppercase" }}>Static (no animation)</span>
            <div style={{ "font-size": "1.5rem", "font-weight": "600", color: "var(--jtf-text-primary)" }}>
              <DigitRoller value="0.1250" />
            </div>
          </div>
          <div>
            <span style={{ "font-size": "11px", color: "var(--jtf-text-muted)", "text-transform": "uppercase" }}>Tabular digits</span>
            <div style={{ "font-size": "1.5rem", "font-weight": "600", color: "#00d4ff" }}>
              <DigitRoller value="42.00" />
            </div>
          </div>
        </div>
      </div>

      <div class="example-group">
        <h3>MetricCard — Basic</h3>
        <div style={{ display: "flex", "flex-wrap": "wrap", gap: "1rem" }}>
          <MetricCard label="Missing Metrics" value={3} color="warning" />
          <MetricCard label="Total Violations" value={7} color="danger" />
          <MetricCard label="Assets w/ Violations" value={0} color="success" />
        </div>
      </div>

      <div class="example-group">
        <h3>Color Variants</h3>
        <div style={{ display: "flex", "flex-wrap": "wrap", gap: "1rem" }}>
          <MetricCard label="Default" value={42} />
          <MetricCard label="Success" value={0} color="success" />
          <MetricCard label="Warning" value={3} color="warning" />
          <MetricCard label="Danger" value={12} color="danger" />
        </div>
      </div>

      <div class="example-group">
        <h3>With String Values</h3>
        <div style={{ display: "flex", "flex-wrap": "wrap", gap: "1rem" }}>
          <MetricCard label="NOx Average" value="3.81 g/kWh" />
          <MetricCard label="ROG Average" value="1.24 g/kWh" />
          <MetricCard label="Duration" value="48h 12m" />
        </div>
      </div>

      <div class="example-group">
        <h3>ResultDisplay — Value + Units + Badge</h3>
        <div style={{ display: "flex", "flex-direction": "column", gap: "16px" }}>
          <ResultDisplay
            label="NOx Result"
            sublabel="Limit: 2.8 g/kWh"
            value="2.314"
            units="g/kWh"
            badge={<StatusBadge variant="compliant">COMPLIANT</StatusBadge>}
          />
          <ResultDisplay
            label="ROG Result"
            sublabel="Limit: 0.14 g/kWh"
            value="0.287"
            units="g/kWh"
            valueColor="#ff0040"
            badge={<StatusBadge variant="violation">VIOLATION</StatusBadge>}
          />
          <ResultDisplay
            label="NOx Result"
            sublabel="Limit: 2.8 g/kWh"
            value="3.412"
            units="g/kWh"
            valueColor="#ffcc00"
            badge={<StatusBadge variant="warning">NEEDS POWER LOG</StatusBadge>}
          />
        </div>
      </div>

      <div class="example-group">
        <h3>StatsTable — Period Statistics</h3>
        <StatsTable
          caption="NOx Statistics by Control Period"
          columns={[
            { header: "Period", accessor: "period", align: "left" },
            { header: "Data Points", accessor: "count", align: "right" },
            { header: "Avg NOx (ppm)", accessor: (r: any) => <span style={{ color: r.noxColor, "font-weight": "600" }}>{r.avgNox}</span>, align: "right" },
            { header: "Avg NO (ppm)", accessor: "avgNO", align: "right" },
            { header: "Avg NO₂ (ppm)", accessor: "avgNO2", align: "right" },
          ]}
          rows={[
            { period: "Before Control", count: 142, avgNox: "18.34", noxColor: "#ff8800", avgNO: "12.81", avgNO2: "5.53" },
            { period: "During Control", count: 89, avgNox: "3.21", noxColor: "#00ff88", avgNO: "2.14", avgNO2: "1.07" },
            { period: "After Control", count: 56, avgNox: "16.92", noxColor: "#ff8800", avgNO: "11.44", avgNO2: "5.48" },
          ]}
          getRowClass={(row: any) => row.period === "During Control" ? "stats-table__row--highlight" : undefined}
        />
      </div>

      <div class="example-group">
        <h3>StatsTable — Row Variants</h3>
        <StatsTable
          columns={[
            { header: "Status", accessor: "status", align: "left" },
            { header: "Count", accessor: "count", align: "right" },
            { header: "Rate", accessor: "rate", align: "right" },
          ]}
          rows={[
            { status: "Normal", count: 214, rate: "82.3%" },
            { status: "Warning", count: 32, rate: "12.3%" },
            { status: "Critical", count: 14, rate: "5.4%" },
          ]}
          getRowClass={(_: any, i: number) => i === 1 ? "stats-table__row--warning" : i === 2 ? "stats-table__row--danger" : undefined}
        />
      </div>

      <div class="example-group">
        <h3>ResultPanel — Layout Shell with Formula</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Combines ResultDisplay header with a variables table and interactive formula.
          Hover a table row to highlight the corresponding formula variable.
        </p>
        <div style={{ display: "flex", gap: "20px", "flex-wrap": "wrap" }}>
          <ResultPanel
            label="NOx Result"
            sublabel="Limit: 2.8 g/kWh"
            value="2.314"
            units="g/kWh"
            badge={<StatusBadge variant="compliant">COMPLIANT</StatusBadge>}
            style={{ flex: "1", "min-width": "300px" }}
          >
            <DTable class="margin-bottom-12">
              <FormulaVarRow varId="ce"><DT>CE Level</DT><DD highlight><NumberWithUnits value={90} units="%" /></DD></FormulaVarRow>
              <FormulaVarRow varId="nox"><DT>NOx</DT><DD highlight><NumberWithUnits value={8.42} units="ppm" /></DD></FormulaVarRow>
              <FormulaVarRow varId="f2"><DT>MSO_F2</DT><DD><NumberWithUnits value={2841.3} units="scfm" precision={1} /></DD></FormulaVarRow>
              <FormulaVarRow varId="kw"><DT>Engine</DT><DD><NumberWithUnits value={1200} units="kW" precision={0} /></DD></FormulaVarRow>
              <FormulaVarRow varId="amps"><DT>Amps</DT><DD><NumberWithUnits value={350} units="A" /></DD></FormulaVarRow>
            </DTable>
            <MathFormula latex={"(1 - \\var{ce}{CE}) \\times 13.8 + \\frac{\\var{nox}{NOx} \\times \\var{f2}{F_2} \\times 2760}{836200 \\times \\var{kw}{kW}} + \\frac{0.1029 \\times \\var{amps}{A}}{\\var{kw}{kW}} = 2.314"} />
          </ResultPanel>

          <ResultPanel
            label="ROG Result"
            sublabel="Limit: 0.14 g/kWh"
            value="0.287"
            units="g/kWh"
            valueColor="#ff0040"
            badge={<StatusBadge variant="violation">VIOLATION</StatusBadge>}
            style={{ flex: "1", "min-width": "300px" }}
          >
            <DTable class="margin-bottom-12">
              <FormulaVarRow varId="ce"><DT>CE Level</DT><DD highlight><NumberWithUnits value={90} units="%" /></DD></FormulaVarRow>
              <FormulaVarRow varId="thc"><DT>FID THC</DT><DD><NumberWithUnits value={3.14} units="ppm" /></DD></FormulaVarRow>
              <FormulaVarRow varId="f2"><DT>MSO_F2</DT><DD><NumberWithUnits value={2841.3} units="scfm" precision={1} /></DD></FormulaVarRow>
              <FormulaVarRow varId="kw"><DT>Engine</DT><DD><NumberWithUnits value={1200} units="kW" precision={0} /></DD></FormulaVarRow>
              <FormulaVarRow varId="amps"><DT>Amps</DT><DD><NumberWithUnits value={350} units="A" /></DD></FormulaVarRow>
            </DTable>
            <MathFormula latex={"(1 - \\var{ce}{CE}) \\times 0.52 + \\frac{\\var{thc}{THC} \\times \\var{f2}{F_2} \\times 821.76}{836200 \\times \\var{kw}{kW}} + \\frac{0.0137 \\times \\var{amps}{A}}{\\var{kw}{kW}} = 0.287"} />
          </ResultPanel>
        </div>
      </div>

      <div class="example-group">
        <h3>ResultPanel — Without Formula</h3>
        <ResultPanel
          label="NOx Result"
          sublabel="Limit: 2.8 g/kWh"
          value="3.412"
          units="g/kWh"
          valueColor="#ffcc00"
          badge={<StatusBadge variant="warning">NEEDS POWER LOG</StatusBadge>}
          formulaProvider={false}
        >
          <DTable>
            <FormulaVarRow varId="ce"><DT>CE Level</DT><DD highlight><NumberWithUnits value={95} units="%" /></DD></FormulaVarRow>
            <FormulaVarRow varId="nox"><DT>NOx</DT><DD><NumberWithUnits value={12.7} units="ppm" /></DD></FormulaVarRow>
            <FormulaVarRow varId="kw"><DT>Engine</DT><DD><NumberWithUnits value={1200} units="kW" precision={0} /></DD></FormulaVarRow>
          </DTable>
        </ResultPanel>
      </div>

      <div class="example-group">
        <h3>EngineDataSection — With Warning</h3>
        <EngineDataSection
          showWarning={true}
          defaultKw={300}
          auxEngineHref="#"
        >
          <table style={{ width: "100%", "border-collapse": "collapse", "font-size": "0.75rem" }}>
            <thead>
              <tr style={{ "border-bottom": "1px solid rgba(0, 212, 255, 0.3)" }}>
                <th style={{ padding: "8px", "text-align": "left", color: "var(--text-muted)" }}>CE</th>
                <th style={{ padding: "8px", "text-align": "center", color: "var(--text-muted)" }}>Default (300 kW)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ padding: "8px" }}>90%</td><td style={{ padding: "8px", "text-align": "center", color: "#ff4444" }}>3.412</td></tr>
              <tr><td style={{ padding: "8px" }}>95%</td><td style={{ padding: "8px", "text-align": "center", color: "#00d4ff" }}>2.641</td></tr>
            </tbody>
          </table>
        </EngineDataSection>
      </div>

      <div class="example-group">
        <h3>EngineDataSection — Without Warning</h3>
        <EngineDataSection>
          <table style={{ width: "100%", "border-collapse": "collapse", "font-size": "0.75rem" }}>
            <thead>
              <tr style={{ "border-bottom": "1px solid rgba(0, 212, 255, 0.3)" }}>
                <th style={{ padding: "8px", "text-align": "left", color: "var(--text-muted)" }}>CE</th>
                <th style={{ padding: "8px", "text-align": "center", color: "var(--text-muted)" }}>Default (300 kW)</th>
                <th style={{ padding: "8px", "text-align": "center", color: "var(--text-muted)" }}>Aux (450 kW)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "8px" }}>90%</td>
                <td style={{ padding: "8px", "text-align": "center", color: "#ff4444" }}>3.412</td>
                <td style={{ padding: "8px", "text-align": "center", color: "#00d4ff", "font-weight": "700", "text-shadow": "0 0 8px currentColor" }}>2.274</td>
              </tr>
              <tr>
                <td style={{ padding: "8px" }}>95%</td>
                <td style={{ padding: "8px", "text-align": "center", color: "#00d4ff" }}>2.641</td>
                <td style={{ padding: "8px", "text-align": "center", color: "#00d4ff" }}>1.760</td>
              </tr>
            </tbody>
          </table>
        </EngineDataSection>
      </div>

      <FormulaPanelDemo />
    </div>
  );
};

// ── Inputs ───────────────────────────────────────────────────────────

const HopperInputsShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Input Components</h2>

      <div class="example-group">
        <h3>ThemedInput</h3>
        <div style={{ display: "flex", "flex-direction": "column", gap: "16px", "max-width": "400px" }}>
          <ThemedInput label="Vessel Name" placeholder="Enter vessel name..." />
          <ThemedInput label="Engine Power (kW)" placeholder="1200" type="number" />
          <ThemedInput placeholder="Without label..." />
        </div>
      </div>

      <div class="example-group">
        <h3>ThemedTextarea</h3>
        <div style={{ display: "flex", "flex-direction": "column", gap: "16px", "max-width": "500px" }}>
          <ThemedTextarea label="Note (optional)" placeholder="Add a note explaining the approval..." />
          <ThemedTextarea placeholder="Without label..." />
        </div>
      </div>
    </div>
  );
};

// ── Button ───────────────────────────────────────────────────────────

const HopperButtonShowcase: Component = () => {
  const [loading, setLoading] = createSignal(false);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div class="component-section">
      <h2>Button Component</h2>

      <div class="example-group">
        <h3>Variants</h3>
        <div class="example-row">
          <Button>Default</Button>
          <Button variant="primary">Primary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <div class="example-row" style={{ "align-items": "center" }}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>

      <div class="example-group">
        <h3>States</h3>
        <div class="example-row">
          <Button disabled>Disabled</Button>
          <Button loading={loading()} onClick={handleClick}>
            {loading() ? "Loading..." : "Click Me"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Icon ─────────────────────────────────────────────────────────────

const HopperIconShowcase: Component = () => {
  const groupLabels: Record<keyof typeof ICON_GROUPS, string> = {
    status: "Status",
    navigation: "Navigation",
    data: "Data & Charts",
    time: "Time",
    actions: "Actions",
    ui: "UI",
  };

  return (
    <div class="component-section">
      <h2>Icon Component</h2>

      <For each={Object.entries(ICON_GROUPS) as [keyof typeof ICON_GROUPS, readonly IconName[]][]}>
        {([groupKey, icons]) => (
          <div class="example-group">
            <h3>{groupLabels[groupKey]}</h3>
            <div class="example-row" style={{ gap: "16px", "flex-wrap": "wrap" }}>
              <For each={icons as IconName[]}>
                {(name) => (
                  <div class="icon-item">
                    <Icon name={name} size="lg" />
                    <span class="icon-label">{name}</span>
                  </div>
                )}
              </For>
            </div>
          </div>
        )}
      </For>

      <div class="example-group">
        <h3>Sizes</h3>
        <div class="example-row" style={{ "align-items": "center", gap: "16px" }}>
          <div class="icon-item"><Icon name="check" size="xs" /><span class="icon-label">xs</span></div>
          <div class="icon-item"><Icon name="check" size="sm" /><span class="icon-label">sm</span></div>
          <div class="icon-item"><Icon name="check" size="md" /><span class="icon-label">md</span></div>
          <div class="icon-item"><Icon name="check" size="lg" /><span class="icon-label">lg</span></div>
          <div class="icon-item"><Icon name="check" size="xl" /><span class="icon-label">xl</span></div>
        </div>
      </div>

      <div class="example-group">
        <h3>Spinner Animation</h3>
        <div class="example-row" style={{ "align-items": "center", gap: "16px" }}>
          <Icon name="spinner" size="sm" />
          <Icon name="spinner" size="md" />
          <Icon name="spinner" size="lg" />
          <Icon name="spinner" size="xl" />
        </div>
      </div>
    </div>
  );
};

// ── Toggle ───────────────────────────────────────────────────────────

const HopperToggleShowcase: Component = () => {
  const [enabled1, setEnabled1] = createSignal(false);
  const [enabled2, setEnabled2] = createSignal(true);
  const [enabled3, setEnabled3] = createSignal(false);

  return (
    <div class="component-section">
      <h2>Toggle Component</h2>

      <div class="example-group">
        <h3>Basic Toggle</h3>
        <div class="example-column">
          <Toggle checked={enabled1()} onChange={() => setEnabled1(!enabled1())} />
          <span style={{ color: "var(--jtf-text-secondary)" }}>
            State: {enabled1() ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      <div class="example-group">
        <h3>With Label</h3>
        <div class="example-column">
          <Toggle label="Enable notifications" checked={enabled2()} onChange={() => setEnabled2(!enabled2())} />
          <Toggle label="Dark mode" labelPosition="left" checked={enabled3()} onChange={() => setEnabled3(!enabled3())} />
        </div>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <div class="example-column">
          <Toggle size="sm" label="Small toggle" />
          <Toggle size="md" label="Medium toggle (default)" />
          <Toggle size="lg" label="Large toggle" />
        </div>
      </div>

      <div class="example-group">
        <h3>Disabled</h3>
        <div class="example-column">
          <Toggle label="Disabled (off)" disabled />
          <Toggle label="Disabled (on)" disabled checked />
        </div>
      </div>
    </div>
  );
};

// ── Progress ─────────────────────────────────────────────────────────

const ProgressShowcase: Component = () => {
  const [currentStep, setCurrentStep] = createSignal(2);

  const WORKFLOW_ICONS = {
    raw_telemetry: {
      outline: `<path d="M4 4h8M4 8h8M4 12h8M6 2v14M10 2v14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<path d="M5 2h2v4H3V4h2V2zm4 0h2v2h2v2H9V2zM3 7h4v2H3V7zm6 0h4v2H9V7zM3 10h4v4H5v-2H3v-2zm6 0h2v2h2v2H9v-4z" fill="currentColor"/>`,
    },
    minute_level: {
      outline: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 4v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.5 3v4.2l2.8 1.9-.5.8-3.3-2.2V4h1z" fill="currentColor"/>`,
    },
    hour_level: {
      outline: `<path d="M4 2h8v3l-2 3 2 3v3H4v-3l2-3-2-3V2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M4 1h8v4l-2.5 3L12 11v4H4v-4l2.5-3L4 5V1zm2 2v1.5L8 7l2-2.5V3H6zm0 10h4v-1.5L8 9l-2 2.5V13z" fill="currentColor"/>`,
    },
    statistics: {
      outline: `<path d="M2 12L5.5 8L8.5 10L14 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M14 2a2 2 0 00-1.9 2.6L9.2 9.2a2 2 0 00-1.4 0L6.1 7.5a2 2 0 10-3.2.9l3.5 5.2a2 2 0 001.4 0l6.3-9.5A2 2 0 1014 2z" fill="currentColor"/>`,
    },
    category: {
      outline: `<path d="M3 8l4 4 6-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M6.5 12.5l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z" fill="currentColor"/>`,
    },
  };

  const getWorkflowSteps = (): ProgressStep[] => [
    { id: "1", label: "Raw", status: currentStep() > 1 ? "completed" : currentStep() === 1 ? "active" : "pending", icon: WORKFLOW_ICONS.raw_telemetry },
    { id: "2", label: "Minute", status: currentStep() > 2 ? "completed" : currentStep() === 2 ? "active" : "pending", icon: WORKFLOW_ICONS.minute_level },
    { id: "3", label: "Hour", status: currentStep() > 3 ? "completed" : currentStep() === 3 ? "active" : "pending", icon: WORKFLOW_ICONS.hour_level },
    { id: "4", label: "Stats", status: currentStep() > 4 ? "completed" : currentStep() === 4 ? "active" : "pending", icon: WORKFLOW_ICONS.statistics },
    { id: "5", label: "Done", status: currentStep() > 5 ? "completed" : currentStep() === 5 ? "active" : "pending", icon: WORKFLOW_ICONS.category },
  ];

  return (
    <div class="component-section">
      <h2>ProgressCard Component</h2>

      <div class="example-group">
        <h3>Cache Workflow (Custom Icons)</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          5-stage caching workflow with custom icons per step.
        </p>
        <ProgressCard
          title="Pacific Voyager"
          subtitle="abc123"
          steps={getWorkflowSteps()}
          message={currentStep() > 5 ? "Caching complete" : `Processing stage ${currentStep()} of 5...`}
        />
        <div style={{ "margin-top": "12px", display: "flex", gap: "8px" }}>
          <button class="demo-btn" onClick={() => setCurrentStep(s => Math.max(1, s - 1))}>Previous</button>
          <button class="demo-btn" onClick={() => setCurrentStep(s => Math.min(6, s + 1))}>Next</button>
          <button class="demo-btn" onClick={() => setCurrentStep(1)}>Reset</button>
        </div>
      </div>

      <div class="example-group">
        <h3>Error State</h3>
        <ProgressCard
          title="Southern Cross"
          subtitle="jkl222"
          steps={[
            { id: "1", label: "Raw", status: "error", icon: WORKFLOW_ICONS.raw_telemetry },
            { id: "2", label: "Minute", status: "pending", icon: WORKFLOW_ICONS.minute_level },
            { id: "3", label: "Hour", status: "pending", icon: WORKFLOW_ICONS.hour_level },
            { id: "4", label: "Stats", status: "pending", icon: WORKFLOW_ICONS.statistics },
            { id: "5", label: "Done", status: "pending", icon: WORKFLOW_ICONS.category },
          ]}
          message="Connection timeout - retrying in 30s"
        />
      </div>

      <h2 style={{ "margin-top": "32px" }}>StackedProgressBar</h2>

      <div class="example-group">
        <h3>Horizontal (default)</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Stacked colored segments fill left-to-right. Used for per-metric error bars.
        </p>
        <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
          <StackedProgressBar
            segments={[
              { percentage: 30, color: "rgba(255, 204, 0, 0.6)" },
              { percentage: 20, color: "rgba(255, 0, 64, 0.7)" },
            ]}
            label={5}
            style={{ width: "120px", height: "20px", "font-size": "11px", "font-weight": "600", color: "var(--jtf-text-primary)" }}
          />
          <span style={{ color: "var(--jtf-text-muted)", "font-size": "12px" }}>30% partial + 20% missing</span>
        </div>
        <div style={{ display: "flex", gap: "8px", "align-items": "center", "margin-top": "8px" }}>
          <StackedProgressBar
            segments={[
              { percentage: 0, color: "rgba(255, 204, 0, 0.6)" },
              { percentage: 0, color: "rgba(255, 0, 64, 0.7)" },
            ]}
            label={0}
            style={{ width: "120px", height: "20px", "font-size": "11px", color: "var(--jtf-text-muted)" }}
          />
          <span style={{ color: "var(--jtf-text-muted)", "font-size": "12px" }}>Empty — no errors</span>
        </div>
      </div>

      <div class="example-group">
        <h3>Vertical</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Segments fill bottom-to-top. Used for total error count bars.
        </p>
        <div style={{ display: "flex", gap: "12px", "align-items": "flex-end" }}>
          <StackedProgressBar
            direction="vertical"
            segments={[
              { percentage: 25, color: "rgba(255, 204, 0, 0.6)" },
              { percentage: 40, color: "rgba(255, 0, 64, 0.7)" },
            ]}
            label={7}
            style={{ width: "24px", height: "80px", "font-size": "11px", "font-weight": "600", color: "var(--jtf-text-primary)" }}
          />
          <StackedProgressBar
            direction="vertical"
            segments={[
              { percentage: 50, color: "rgba(255, 204, 0, 0.6)" },
              { percentage: 10, color: "rgba(255, 0, 64, 0.7)" },
            ]}
            label={3}
            style={{ width: "24px", height: "80px", "font-size": "11px", "font-weight": "600", color: "var(--jtf-text-primary)" }}
          />
        </div>
      </div>
    </div>
  );
};

// ── Heatmap ──────────────────────────────────────────────────────────

const HeatmapShowcase: Component = () => {
  const categories = ["FTIR_I", "FTIR_O", "SCR", "FID", "DP", "MSI", "MSO"];

  const threeDayVesselCall = (): HeatmapMultiRow[] => {
    return [
      { id: "day1", label: "2024-01-15", cells: Array.from({ length: 24 }, (_, hour) => ({
        id: `Hour ${hour}:00`,
        categories: Object.fromEntries(categories.map(c => {
          if (hour < 15) return [c, "empty" as const];
          if (hour < 18 && (c === "FTIR_I" || c === "SCR")) return [c, "partial" as const];
          return [c, "full" as const];
        }))
      }))},
      { id: "day2", label: "2024-01-16", cells: Array.from({ length: 24 }, (_, hour) => ({
        id: `Hour ${hour}:00`,
        categories: Object.fromEntries(categories.map(c => {
          if (hour >= 13 && hour < 15 && c === "FID") return [c, "missing" as const];
          if (hour >= 12 && hour < 16 && c === "DP") return [c, "partial" as const];
          return [c, "full" as const];
        }))
      }))},
      { id: "day3", label: "2024-01-17", cells: Array.from({ length: 24 }, (_, hour) => ({
        id: `Hour ${hour}:00`,
        categories: Object.fromEntries(categories.map(c => {
          if (hour > 7) return [c, "empty" as const];
          if (hour >= 5 && (c === "MSI" || c === "MSO")) return [c, "partial" as const];
          return [c, "full" as const];
        }))
      }))},
    ];
  };

  const hourLabels = Array.from({ length: 24 }, (_, i) => String(i));

  const sparklineData = (): HeatmapMultiRow[] => {
    const days = threeDayVesselCall();
    const allCells = days.flatMap(day => day.cells)
      .filter(cell => !Object.values(cell.categories).every(s => s === "empty"));
    return [{ id: "vessel-call", label: "", cells: allCells }];
  };

  return (
    <div class="component-section">
      <h2>Heatmap Components</h2>

      <div class="example-group">
        <h3>Expanded Variant</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Three-day vessel call. Connection started Day 1 15:00, ended Day 3 07:00.
        </p>
        <HeatmapMulti
          rows={threeDayVesselCall()}
          categoryLabels={categories}
          columnLabels={hourLabels}
          variant="expanded"
          showLegend
        />
      </div>

      <div class="example-group">
        <h3>Sparkline Variant</h3>
        <HeatmapMulti
          rows={sparklineData()}
          categoryLabels={categories}
          variant="sparkline"
        />
      </div>
    </div>
  );
};

// ── Table ────────────────────────────────────────────────────────────

const TableShowcase: Component = () => {
  interface TableRow {
    id: string;
    name: string;
    status: string;
    progress: number;
    amount: number;
    duration: number;
    date: string;
    category: string;
  }

  const data: TableRow[] = [
    { id: "VES-001", name: "Pacific Voyager", status: "Active", progress: 85, amount: 12500.50, duration: 3600, date: "2024-01-15", category: "Cargo" },
    { id: "VES-002", name: "Atlantic Runner", status: "Pending", progress: 45, amount: 8750.25, duration: 7200, date: "2024-01-14", category: "Tanker" },
    { id: "VES-003", name: "Northern Star", status: "Complete", progress: 100, amount: 25000.00, duration: 86400, date: "2024-01-13", category: "Container" },
    { id: "VES-004", name: "Southern Cross", status: "Error", progress: 23, amount: 4200.75, duration: 1800, date: "2024-01-12", category: "Bulk" },
    { id: "VES-005", name: "Eastern Wind", status: "Active", progress: 67, amount: 18900.00, duration: 43200, date: "2024-01-11", category: "Cargo" },
    { id: "VES-006", name: "Western Horizon", status: "Pending", progress: 12, amount: 6300.50, duration: 5400, date: "2024-01-10", category: "Tanker" },
    { id: "VES-007", name: "Arctic Explorer", status: "Complete", progress: 100, amount: 31200.00, duration: 172800, date: "2024-01-09", category: "Research" },
    { id: "VES-008", name: "Tropical Dawn", status: "Active", progress: 91, amount: 14800.25, duration: 28800, date: "2024-01-08", category: "Container" },
  ];

  const cellRendererColumns: TableColumn<TableRow>[] = [
    { id: "id", header: "ID", accessor: (row) => <IdCell value={row.id} />, width: "100px" },
    { id: "name", header: "Vessel", accessor: (row) => <StringCell value={row.name} />, sortable: true },
    { id: "status", header: "Status", accessor: (row) => <StatusCell value={row.status} />, sortable: true },
    { id: "category", header: "Type", accessor: (row) => <TagCell value={row.category} variant="primary" /> },
    { id: "progress", header: "Progress", accessor: (row) => <IntCell value={row.progress} />, align: "right", sortable: true },
    { id: "amount", header: "Revenue", accessor: (row) => <MoneyCell value={row.amount} />, align: "right", sortable: true },
    { id: "duration", header: "Duration", accessor: (row) => <DurationCell value={row.duration} />, align: "right" },
    { id: "date", header: "Date", accessor: (row) => <DateCell value={row.date} />, sortable: true },
  ];

  const simpleColumns: TableColumn<TableRow>[] = [
    { id: "id", header: "ID", accessor: (row) => <IdCell value={row.id} />, width: "100px" },
    { id: "name", header: "Vessel", accessor: "name", sortable: true },
    { id: "status", header: "Status", accessor: (row) => <StatusCell value={row.status} /> },
    { id: "category", header: "Type", accessor: (row) => <TagCell value={row.category} variant="info" /> },
    { id: "date", header: "Date", accessor: (row) => <DateCell value={row.date} /> },
  ];

  const selectionStore = createSelectionStore<string>();

  const selectableColumns: TableColumn<TableRow>[] = [
    { id: "name", header: "Vessel", accessor: (row) => <StringCell value={row.name} />, sortable: true },
    { id: "status", header: "Status", accessor: (row) => <StatusCell value={row.status} /> },
    { id: "category", header: "Type", accessor: (row) => <TagCell value={row.category} variant="success" /> },
    { id: "amount", header: "Revenue", accessor: (row) => <MoneyCell value={row.amount} />, align: "right" },
  ];

  return (
    <div class="component-section">
      <h2>Table Component</h2>

      <div class="example-group">
        <h3>Cell Renderers</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          IdCell, StringCell, StatusCell, TagCell, IntCell, MoneyCell, DurationCell, DateCell
        </p>
        <BaseTable data={data.slice(0, 5)} columns={cellRendererColumns} hoverable />
      </div>

      <div class="example-group">
        <h3>QuickFilter</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Type to filter across all columns. Try "cargo", "active", or "2024-01-1".
        </p>
        <QuickFilter
          data={data}
          columns={simpleColumns}
          filterPlaceholder="Search vessels..."
          hoverable
          striped
        />
      </div>

      <div class="example-group">
        <h3>Selectable Table</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Checkbox selection with action bar. Select rows to see the action bar appear.
        </p>
        <SelectableTable
          data={data.slice(0, 5)}
          columns={selectableColumns}
          getRowId={(row) => row.id}
          selectionStore={selectionStore}
          selectionActions={[
            { label: "Export", variant: "default", onClick: (ids) => console.log(`Exporting ${ids.size} items`) },
            { label: "Archive", variant: "primary", onClick: (ids) => console.log(`Archiving ${ids.size} items`) },
            { label: "Delete", variant: "danger", onClick: (ids) => console.log(`Deleting ${ids.size} items`) },
          ]}
          hoverable
        />
      </div>

      <div class="example-group">
        <h3>Compact with Sticky Header</h3>
        <BaseTable data={data} columns={simpleColumns} maxHeight="200px" stickyHeader compact hoverable />
      </div>

      <div class="example-group">
        <h3>Grouped Table (Rowspan)</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Vessel, Barge, and Date columns are rowspanned when multiple assets share the same vessel call.
        </p>
        <GroupedTableDemo />
      </div>

      <div class="example-group">
        <h3>DataTableContainer</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Scrollable wrapper with max-height and overflow. Wraps any table content.
        </p>
        <DataTableContainer maxHeight="180px">
          <table class="hud-table__table" style={{ width: "100%" }}>
            <thead><tr><th style={{ padding: "8px", "text-align": "left", "border-bottom": "1px solid var(--jtf-border)" }}>Row</th><th style={{ padding: "8px", "text-align": "left", "border-bottom": "1px solid var(--jtf-border)" }}>Value</th></tr></thead>
            <tbody>
              <For each={Array.from({ length: 20 }, (_, i) => i + 1)}>
                {(n) => <tr><td style={{ padding: "6px 8px" }}>Row {n}</td><td style={{ padding: "6px 8px" }}>{(n * 17) % 100}</td></tr>}
              </For>
            </tbody>
          </table>
        </DataTableContainer>
      </div>
    </div>
  );
};

// ── Section ──────────────────────────────────────────────────────────

const SectionShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Section, Panel & Divider Components</h2>

      <div class="example-group">
        <h3>Default Section</h3>
        <Section title="Section Title" subtitle="This is a subtitle with additional context">
          <p style={{ margin: 0, color: "var(--jtf-text-secondary)" }}>
            Section content goes here.
          </p>
        </Section>
      </div>

      <div class="example-group">
        <h3>Bordered Section</h3>
        <Section title="Bordered Section" subtitle="With border and background" variant="bordered">
          <p style={{ margin: 0, color: "var(--jtf-text-secondary)" }}>
            This section has a border and background.
          </p>
        </Section>
      </div>

      <div class="example-group">
        <h3>Decorated Section</h3>
        <Section title="Decorated Section" variant="decorated">
          <p style={{ margin: 0, color: "var(--jtf-text-secondary)" }}>
            This section has decorative corner accents and a clipped shape.
          </p>
        </Section>
      </div>

      <div class="example-group">
        <h3>Panel</h3>
        <div class="example-row" style={{ gap: "16px" }}>
          <Panel title="Panel with Title" style={{ flex: 1 }}>
            <p style={{ margin: 0, color: "var(--jtf-text-secondary)" }}>Panel content</p>
          </Panel>
          <Panel padding="sm" style={{ flex: 1 }}>
            <p style={{ margin: 0, color: "var(--jtf-text-secondary)" }}>Small padding panel</p>
          </Panel>
        </div>
      </div>

      <div class="example-group">
        <h3>Dividers</h3>
        <Panel>
          <p style={{ margin: 0, color: "var(--jtf-text-secondary)" }}>Content above</p>
          <Divider />
          <p style={{ margin: 0, color: "var(--jtf-text-secondary)" }}>Content below (solid)</p>
          <Divider variant="dashed" />
          <p style={{ margin: 0, color: "var(--jtf-text-secondary)" }}>Content below (dashed)</p>
        </Panel>
      </div>
    </div>
  );
};

// ── Selector ─────────────────────────────────────────────────────────

const SelectorShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Selector Components</h2>

      <div class="example-group">
        <h3>Sidebar Selector</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          A sidebar with selectable cards and an arbitrary content display area.
          This demo shows Avatar: The Last Airbender episodes with character focus.
        </p>
        <SidebarSelectorDemo />
      </div>
    </div>
  );
};

// ── Card ─────────────────────────────────────────────────────────────

const CardShowcase: Component = () => {
  const [activeId, setActiveId] = createSignal("vessel-2");

  const vessels = [
    { id: "vessel-1", name: "Pacific Voyager", asset: "12-345", date: "2026-01-15" },
    { id: "vessel-2", name: "Atlantic Runner", asset: "67-890", date: "2026-01-14" },
    { id: "vessel-3", name: "Northern Star", asset: "11-222", date: "2026-01-13" },
  ];

  return (
    <div class="component-section">
      <h2>Card Components</h2>

      <div class="example-group">
        <h3>VesselCard — States</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Click a card to set it active. Cards support title, details slot, remove button, and children.
        </p>
        <div style={{ width: "220px", display: "flex", "flex-direction": "column", gap: "10px" }}>
          <For each={vessels}>
            {(v) => (
              <div onClick={() => setActiveId(v.id)}>
                <VesselCard
                  title={v.name}
                  active={activeId() === v.id}
                  onRemove={() => setActiveId("")}
                  details={
                    <>
                      <span style={{ "font-size": "12px", "font-weight": "600", color: "var(--jtf-text-secondary)", background: "rgba(0,168,204,0.15)", padding: "2px 6px", "border-radius": "3px" }}>{v.asset}</span>
                      <span style={{ "font-size": "11px", color: "var(--jtf-text-muted)" }}>{v.date}</span>
                    </>
                  }
                />
              </div>
            )}
          </For>
        </div>
      </div>

      <div class="example-group">
        <h3>VesselCard — Minimal</h3>
        <div style={{ width: "220px", display: "flex", "flex-direction": "column", gap: "10px" }}>
          <VesselCard title="Title Only" />
          <VesselCard title="With Remove" onRemove={() => {}} />
          <VesselCard
            title="With Children"
            details={<span style={{ "font-size": "11px", color: "var(--jtf-text-muted)" }}>Detail text</span>}
          >
            <div style={{ "font-size": "11px", color: "var(--jtf-text-muted)", "border-top": "1px solid rgba(0,168,204,0.2)", "padding-top": "8px" }}>
              Footer content (heatmap, sparkline, etc.)
            </div>
          </VesselCard>
        </div>
      </div>
    </div>
  );
};

// ── Exported Hopper ──────────────────────────────────────────────────

export const HopperShowcase: Component = () => {
  return (
    <div class="component-section">
      <HUDShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Badges</h2>
      <HopperBadgesShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Feedback</h2>
      <FeedbackShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Data Display</h2>
      <DataDisplayShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Inputs</h2>
      <HopperInputsShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Button</h2>
      <HopperButtonShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Icon</h2>
      <HopperIconShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Toggle</h2>
      <HopperToggleShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Progress</h2>
      <ProgressShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Heatmap</h2>
      <HeatmapShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Table</h2>
      <TableShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Section</h2>
      <SectionShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Selector</h2>
      <SelectorShowcase />
      <h2 style={{ "margin-top": "48px", "padding-top": "32px", "border-top": "2px solid var(--jtf-border)" }}>Card</h2>
      <CardShowcase />
    </div>
  );
};
