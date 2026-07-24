// JTF Card Catalog — fortnight / vessel-detail cards.
// The compliance-review surface: per-calculation detail cards, CARB formula
// panels, bracket-cornered decorated sections, and approval banners. All are
// reachable via /detail/:id (VesselCallOverview) and /reports/fortnight/:id.
//
// (Reachability audit 2026-07-23: ViolationCard — fortnight/ViolationCardList —
// and the NOx Result widget — NoxWidgets — were dropped: both have zero
// importers in jtf-ui, i.e. dead components rendered by nothing.)
import { type JSX, For, Show } from "solid-js";
import {
  CardSurface,
  CompactSurface,
  WarningSurface,
  SuccessSurface,
  createSection,
  createBox,
  createFormulaPanel,
  type FormulaConfig,
  TightStack,
  SpreadRow,
  WrappedClusterRow,
  GrowBox,
  Divider,
  TextTitle,
  InfoTitle,
  WarningTitle,
  SuccessTitle,
  TextBody,
  TextSublabel,
  MutedBody,
  Icon,
  NumberWithUnits,
  DTable,
  DRow,
  DT,
  DD,
} from "../../../../src";
import { SmStatusBadge } from "../../../../src/components/Badge";
import { PrimaryButton, SmallDangerButton } from "../../../../src/components/Button";
import { CardBench, CardCase } from "./case";
import type { CardEntry } from "./shared";
import "./catalog.css";

// ---------------------------------------------------------------------------
// 1. DetailSection / CalculationCard — detail-ui.tsx + VesselCallOverview.tsx
//    (SUI: CardSurface + accent InfoTitle; CalculationCard extends it)
// ---------------------------------------------------------------------------
function DetailSection(props: { title?: string; children: JSX.Element }): JSX.Element {
  return (
    <CardSurface>
      <TightStack>
        <Show when={props.title}>
          <InfoTitle>{props.title}</InfoTitle>
        </Show>
        {props.children}
      </TightStack>
    </CardSurface>
  );
}

const CalculationCardShowcase = () => (
  <CardBench>
    <CardCase
      title="CalculationCard (DetailSection)"
      width="400px"
      routes={["/detail/:id → Compliance Calculations (when cached)", "/reports/fortnight/:id → Summary"]}
      why="The generic card for a non-NOx/ROG compliance calculation, rendered in the overview's Compliance Calculations section once the call is cached. Header names the calc and links to its deep-dive; the badge line states the verdict as value operator threshold; the DTable lists the exact inputs; a WarningSurface note explains any override."
    >
  <WrappedClusterRow>
    <DetailSection>
      <TightStack>
        <SpreadRow>
          <TextTitle>ROG</TextTitle>
          <Icon name="search" size="sm" />
        </SpreadRow>
        <WrappedClusterRow>
          <SmStatusBadge variant="violation">VIOLATION</SmStatusBadge>
          <TextSublabel>=</TextSublabel>
          <NumberWithUnits value={0.31} units="" precision={2} />
          <TextSublabel>&gt;</TextSublabel>
          <TextSublabel>0.14</TextSublabel>
          <MutedBody>g/kWh</MutedBody>
        </WrappedClusterRow>
        <Divider />
        <DTable>
          <DRow><DT>FID THC avg</DT><DD><NumberWithUnits value={9.81} units="ppm" precision={2} /></DD></DRow>
          <DRow><DT>MSO F2 avg</DT><DD><NumberWithUnits value={96.1} units="scfm" precision={1} /></DD></DRow>
          <DRow><DT>Engine Power</DT><DD><NumberWithUnits value={540} units="kW" precision={1} /></DD></DRow>
          <DRow><DT>Amps</DT><DD><NumberWithUnits value={812} units="A" precision={0} /></DD></DRow>
        </DTable>
        <WarningSurface>
          <TextBody><WarningTitle>Note: </WarningTitle>Aux engine default applied — power log pending.</TextBody>
        </WarningSurface>
      </TightStack>
    </DetailSection>
  </WrappedClusterRow>
    </CardCase>
  </CardBench>
);

// ---------------------------------------------------------------------------
// 2. Formula Panel (NOx / ROG) — lib/formulaPanels.ts via SUI createFormulaPanel
//    The full "NOx Result" / "ROG Result" card: result value + threshold badge,
//    the givens rows, and the interactive LaTeX CARB equation. This IS the big
//    card on the NOx/ROG detail tabs — the same SUI primitive jtf configures,
//    with the real NOx/ROG configs copied here.
// ---------------------------------------------------------------------------
const noxConfig: FormulaConfig = {
  label: "NOx Result",
  resultUnits: "g/kWh",
  borderColor: "var(--sui-border, rgba(0, 212, 255, 0.4))",
  wrap: true,
  vars: [
    { id: "ce", label: "CE Level", units: "%", precision: 0 },
    { id: "nox", label: "NOx", units: "ppm", precision: 2 },
    { id: "f2", label: "MSO_F2", units: "scfm", precision: 1 },
    { id: "kw", label: "Engine", units: "kW", precision: 0 },
    { id: "amps", label: "Amps", units: "A", precision: 0 },
  ],
  threshold: 2.8,
  comparison: "lt",
  resultPrecision: 4,
  resultSigFigs: 4,
  compute: (v) =>
    (1 - v.ce / 100) * 13.8 +
    (v.nox * v.f2 * 2760) / (836200 * v.kw) +
    (0.1029 * v.amps) / v.kw,
  latex: (r) =>
    `(1 - \\var{ce}{CE}) \\times 13.8 + \\frac{\\var{nox}{NOx} \\times \\var{f2}{F_2} \\times 2760}{836200 \\times \\var{kw}{kW}} + \\frac{0.1029 \\times \\var{amps}{A}}{\\var{kw}{kW}} = \\var{result}{${r}}`,
};

const rogConfig: FormulaConfig = {
  label: "ROG Result",
  resultUnits: "g/kWh",
  borderColor: "rgba(180, 140, 255, 0.4)",
  wrap: true,
  vars: [
    { id: "ce", label: "CE Level", units: "%", precision: 0 },
    { id: "thc", label: "FID THC", units: "ppm", precision: 2 },
    { id: "f2", label: "MSO_F2", units: "scfm", precision: 1 },
    { id: "kw", label: "Engine", units: "kW", precision: 0 },
    { id: "amps", label: "Amps", units: "A", precision: 0 },
  ],
  threshold: 0.14,
  comparison: "lt",
  resultPrecision: 4,
  resultSigFigs: 4,
  compute: (v) =>
    (1 - v.ce / 100) * 0.52 +
    (v.thc * v.f2 * 821.76) / (836200 * v.kw) +
    (0.0137 * v.amps) / v.kw,
  latex: (r) =>
    `(1 - \\var{ce}{CE}) \\times 0.52 + \\frac{\\var{thc}{THC} \\times \\var{f2}{F_2} \\times 821.76}{836200 \\times \\var{kw}{kW}} + \\frac{0.0137 \\times \\var{amps}{A}}{\\var{kw}{kW}} = \\var{result}{${r}}`,
};

const NoxFormula = createFormulaPanel(noxConfig);
const RogFormula = createFormulaPanel(rogConfig);

const FormulaPanelShowcase = () => (
  <CardBench>
    <CardCase
      title="Formula Panel — NOx / ROG Result"
      width="440px"
      routes={["/detail/:id?vctab=nox", "/detail/:id?vctab=rog", "/detail/:id → Compliance Calculations (when cached)", "/reports/fortnight/:id → Summary"]}
      why="The full result card, built with SUI's createFormulaPanel: the headline value + threshold verdict badge, the givens rows (CE, NOx/THC, MSO_F2, Engine, Amps), and the interactive LaTeX CARB equation with the same variables highlighted. This IS the big card on the NOx/ROG detail tabs — NOx (accent border) and ROG (purple border) are one primitive with two configs."
    >
      <WrappedClusterRow>
        <NoxFormula.Panel values={{ ce: 90, nox: 57.38, f2: 6284.1, kw: 300, amps: 350 }} />
        <RogFormula.Panel values={{ ce: 90, thc: 9.81, f2: 6284.1, kw: 300, amps: 350 }} />
      </WrappedClusterRow>
    </CardCase>
  </CardBench>
);

// ---------------------------------------------------------------------------
// 3. Decorated Section + Category Coverage strip — VesselCallOverview.tsx
//    (SUI: createSection({corners:"bracket"}) + 8-up GrowBox chip strip)
// ---------------------------------------------------------------------------
const DecoratedSection = createSection({ corners: "bracket" });
const CoverageStrip = createBox({
  style: { display: "flex", "flex-wrap": "wrap", gap: "12px", padding: "var(--sui-space-3)" },
});

// Coverage value → tone key; the `.jtf-coverage--{tone}` class paints the color.
const COVERAGE_TONE: Record<string, string> = {
  FULL: "full",
  PARTIAL: "partial",
  SPARSE: "sparse",
  MISSING: "missing",
  "N/A": "na",
};

const COVERAGE = [
  { k: "FTIR I", v: "FULL" },
  { k: "FTIR O", v: "FULL" },
  { k: "SCR", v: "PARTIAL" },
  { k: "FID", v: "FULL" },
  { k: "DP", v: "SPARSE" },
  { k: "MSI", v: "FULL" },
  { k: "MSO", v: "MISSING" },
  { k: "AUX", v: "N/A" },
];

const DecoratedSectionShowcase = () => (
  <CardBench>
    <CardCase
      title="Decorated Section + Category Coverage"
      width="500px"
      routes={["components/fortnight/vessel-detail/VesselCallOverview.tsx", "/detail/:id"]}
      why="A bracket-cornered section wrapping the 8-category coverage strip. Each chip is a category + a status-colored value (FULL / PARTIAL / SPARSE / MISSING), so data gaps are visible before the reviewer trusts any calculation built on them."
    >
  <DecoratedSection title="Category Coverage">
    <CoverageStrip>
      <For each={COVERAGE}>
        {(cat) => (
          <GrowBox>
            <TightStack>
              <TextSublabel>{cat.k}</TextSublabel>
              <span class={`jtf-coverage--${COVERAGE_TONE[cat.v]}`}>{cat.v}</span>
            </TightStack>
          </GrowBox>
        )}
      </For>
    </CoverageStrip>
  </DecoratedSection>
    </CardCase>
  </CardBench>
);

// ---------------------------------------------------------------------------
// 4. Approval Status — ApprovalSection.tsx (SUI: Warning / Success surfaces)
// ---------------------------------------------------------------------------
const ApprovalShowcase = () => (
  <CardBench>
    <CardCase
      title="Approval Status banner"
      width="420px"
      routes={["components/ApprovalSection.tsx", "/detail/:id", "/reports/fortnight/:id"]}
      why="Shown only when a call is non-compliant. Pending = amber banner + Approve button; Approved = green banner with who/when, a Remove action, and the justification note. The semantic surface color carries the state."
    >
  <TightStack>
    <WarningSurface>
      <SpreadRow>
        <TightStack>
          <WarningTitle>Pending Approval</WarningTitle>
          <TextBody>This vessel call is non-compliant and needs sign-off before publishing.</TextBody>
        </TightStack>
        <PrimaryButton>Approve</PrimaryButton>
      </SpreadRow>
    </WarningSurface>
    <SuccessSurface>
      <TightStack>
        <SpreadRow>
          <TightStack>
            <SuccessTitle>Approved</SuccessTitle>
            <TextBody>Approved on 2025-12-03 by reviewer</TextBody>
          </TightStack>
          <SmallDangerButton>Remove</SmallDangerButton>
        </SpreadRow>
        <CompactSurface>
          <TextSublabel>Note: justified under aux-engine default; power log to follow.</TextSublabel>
        </CompactSurface>
      </TightStack>
    </SuccessSurface>
  </TightStack>
    </CardCase>
  </CardBench>
);

export const ENTRIES: CardEntry[] = [
  {
    route: "vessel-detail/CalculationCard",
    name: "CalculationCard (DetailSection)",
    status: "sui",
    note: "CardSurface + accent InfoTitle detail card. Header (calc name + search link), StatusBadge = value operator threshold, Divider, DTable of context rows, optional WarningSurface note. Reachable via /detail/:id and /reports/fortnight/:id.",
    component: CalculationCardShowcase,
  },
  {
    route: "lib/formulaPanels",
    name: "Formula Panel (NOx / ROG Result)",
    status: "sui",
    note: "The full result card on the NOx/ROG detail tabs — built with SUI's createFormulaPanel (Result + Givens + interactive LaTeX Formula). jtf just supplies the NOx/ROG FormulaConfig; this replica uses the real configs, so it renders the actual card, not an approximation.",
    component: FormulaPanelShowcase,
  },
  {
    route: "vessel-detail/DecoratedSection",
    name: "Decorated Section + Category Coverage",
    status: "sui",
    note: "createSection({corners:'bracket'}) titled surface hosting the 8-up coverage strip (FTIR I/O, SCR, FID, DP, MSI, MSO, AUX) of status-colored GrowBox chips.",
    component: DecoratedSectionShowcase,
  },
  {
    route: "vessel-detail/ApprovalSection",
    name: "Approval Status banner",
    status: "sui",
    note: "WarningSurface (Pending Approval + Approve) / SuccessSurface (Approved on … + Remove + nested CompactSurface note). Semantic surfaces, zero call-site color.",
    component: ApprovalShowcase,
  },
];
