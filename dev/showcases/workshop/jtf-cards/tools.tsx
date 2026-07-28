// JTF Card Catalog — tools / OCR / settings cards.
// The SUI MetricCard stat tile, the upload dropzone, the OCR extracted-data
// results card, the coverage info-bar, the flow-diagnosis classification chip,
// and the settings group card.
import { type JSX, For } from "solid-js";
import {
  MetricCard,
  CardSurface,
  CompactSurface,
  TightStack,
  NarrowStack,
  WrapRow,
  WrappedClusterRow,
  TopClusterRow,
  ClusterRow,
  SpreadRow,
  GrowBox,
  TextTitle,
  TextLabel,
  TextBody,
  TextSublabel,
  AccentBody,
  MutedBody,
  Icon,
} from "../../../../src";
import { FileDropTarget, CompactFileDropTarget } from "../../../../src";
import { SmStatusBadge } from "../../../../src/components/Badge";
import { SmallGhostButton } from "../../../../src/components/Button";
import { CardBench, CardCase } from "./case";
import type { CardEntry } from "./shared";
import "./catalog.css";

const noop = () => undefined;

// 1. MetricCard row — the SUI stat tile reused across the live tool routes
//    power-log-ocr and ftir-gap-fill. (StatisticsSummary also renders it but
//    that host is itself dead code — 0 importers — so it's not cited here.)
const MetricCardShowcase = () => (
  <CardBench>
    <CardCase
      title="MetricCard — stat tile"
      width="360px"
      routes={["/tools/power-log-ocr", "/tools/ftir-gap-fill"]}
      why="A single headline number with a caption and a semantic color (warning/danger/success). Used in rows of 3–7 to summarise a tool's run — coverage %, counts, averages — before the detail table below."
    >
      <WrapRow>
        <GrowBox><MetricCard label="Missing Metrics" value={3} color="warning" /></GrowBox>
        <GrowBox><MetricCard label="Total Violations" value={7} color="danger" /></GrowBox>
        <GrowBox><MetricCard label="DB Coverage" value="92%" color="success" /></GrowBox>
        <GrowBox><MetricCard label="Overall Avg kW" value={318} units="kW" /></GrowBox>
      </WrapRow>
    </CardCase>
  </CardBench>
);

// 2. Upload dropzone — SUI FileDropZone at both densities.
const DropzoneShowcase = () => (
  <CardBench>
    <CardCase
      title="Upload dropzone"
      width="360px"
      routes={["components/PowerLogDropZone.tsx", "/tools/power-log-ocr"]}
      why="How a PDF enters the tool: a dashed target that is also a click-to-browse picker, showing the prompt on one line. It rejects anything that isn't a PDF with a self-clearing notice, and goes inert (dimmed, no pointer) while the last file is being read. The compact density is the same target tucked into the summary banner row."
    >
      <TightStack>
        <FileDropTarget
          accept={[".pdf"]}
          label="Drop power-log PDF here, or click to browse"
          onFile={noop}
        />
        <CompactFileDropTarget
          accept={[".pdf"]}
          label="Drop power-log PDF here, or click to browse"
          onFile={noop}
        />
        <FileDropTarget
          accept={[".pdf"]}
          label="Reading the power log…"
          disabled
          onFile={noop}
        />
      </TightStack>
    </CardCase>
  </CardBench>
);

// 3. OCR results card — header, 3 MetricCards, table-beside-image, upload-again.
const OcrResultShowcase = () => (
  <CardBench>
    <CardCase
      title="OCR results card"
      width="460px"
      routes={["/tools/power-log-ocr"]}
      why="The filled state after a photo is read: a header (vessel + date), a MetricCard summary row, the extracted hour-by-hour table beside a thumbnail of the source photo (so the operator can spot-check the OCR), and an 'Upload Another' action."
    >
      <CardSurface>
        <TightStack>
          <ClusterRow>
            <TextTitle>Extracted Data</TextTitle>
            <AccentBody>MSC Bellissima</AccentBody>
            <TextSublabel>2025-12-01</TextSublabel>
          </ClusterRow>
      <WrapRow>
        <GrowBox><MetricCard label="Rows" value={24} /></GrowBox>
        <GrowBox><MetricCard label="Overall Avg kW" value={318} units="kW" /></GrowBox>
        <GrowBox><MetricCard label="Aux Columns" value={4} /></GrowBox>
      </WrapRow>
      <TopClusterRow>
        <GrowBox>
          <NarrowStack>
            <For each={[["01:00", "302"], ["02:00", "311"], ["03:00", "297"], ["04:00", "340"]]}>
              {([hour, kw]) => (
                <SpreadRow>
                  <TextLabel>{hour}</TextLabel>
                  <TextBody>{kw} kW</TextBody>
                </SpreadRow>
              )}
            </For>
          </NarrowStack>
        </GrowBox>
        <CompactSurface>
          <MutedBody>[ log photo preview ]</MutedBody>
        </CompactSurface>
      </TopClusterRow>
      <SpreadRow>
        <GrowBox />
        <SmallGhostButton>Upload Another</SmallGhostButton>
      </SpreadRow>
    </TightStack>
      </CardSurface>
    </CardCase>
  </CardBench>
);

// 4. Coverage info-bar — asset + location badge + timestamp range.
const CoverageBarShowcase = () => (
  <CardBench>
    <CardCase
      title="Coverage info-bar"
      width="420px"
      routes={["/tools/ftir-gap-fill"]}
      why="A one-line context header for the gap-fill tool: which asset, where (location badge), and the exact timestamp window being filled. No labels — position and the badge carry the meaning."
    >
      <CardSurface>
        <WrappedClusterRow>
          <AccentBody>xbox3-2</AccentBody>
          <SmStatusBadge variant="info">Berth 402</SmStatusBadge>
          <TextSublabel>2025-12-01 08:14 → 2025-12-02 08:14</TextSublabel>
        </WrappedClusterRow>
      </CardSurface>
    </CardCase>
  </CardBench>
);

// 5. Flow-diagnosis classification chip — CompactSurface + colored left border.
// `tone` selects the semantic color (border + solid pill), painted in CSS.
type FlowTone = "danger" | "warning" | "success";
function FlowChip(props: { tone: FlowTone; label: string; note: string }): JSX.Element {
  return (
    <div class={`jtf-flow-chip jtf-flow-chip--${props.tone}`}>
      <CompactSurface>
        <ClusterRow>
          <span class="jtf-flow-chip__badge">{props.label}</span>
          <TextSublabel>{props.note}</TextSublabel>
        </ClusterRow>
      </CompactSurface>
    </div>
  );
}

const FlowDiagnosisShowcase = () => (
  <CardBench>
    <CardCase
      title="Flow-diagnosis classification chip"
      width="380px"
      routes={["/flow-diagnosis"]}
      why="The verdict banner above the decision flowchart: a colored left border + solid category chip carry the classification at a glance, with a one-line rationale. Color is the signal — blocked/degraded/normal read without reading."
    >
      <TightStack>
        <FlowChip tone="danger" label="BLOCKED" note="Flow below 2 scfm for 40+ min — probable sample-line blockage." />
        <FlowChip tone="warning" label="DEGRADED" note="Intermittent low flow; check pump and filter." />
        <FlowChip tone="success" label="NORMAL" note="Flow within expected band across the call." />
      </TightStack>
    </CardCase>
  </CardBench>
);

// 6. Settings group card — CompactSurface grouping (Appearance).
const SettingsGroupShowcase = () => (
  <CardBench>
    <CardCase
      title="Settings group card"
      width="360px"
      routes={["/settings", "global SettingsModal"]}
      why="A padded grouping card in the settings modal — a titled cluster of related controls (theme, colorblind, date format). Unlike the data cards, labels stay: settings need a name for each control, not positional reading."
    >
      <CompactSurface>
        <NarrowStack>
          <TextTitle>Appearance</TextTitle>
          <SpreadRow>
            <TextLabel>Theme</TextLabel>
            <ClusterRow>
              <SmStatusBadge variant="info">Dark</SmStatusBadge>
              <TextSublabel>Light</TextSublabel>
              <TextSublabel>HUD</TextSublabel>
            </ClusterRow>
          </SpreadRow>
          <SpreadRow>
            <TextLabel>Colorblind mode</TextLabel>
            <SmStatusBadge variant="pending">off</SmStatusBadge>
          </SpreadRow>
          <SpreadRow>
            <TextLabel>Date format</TextLabel>
            <TextSublabel>YYYY-MM-DD</TextSublabel>
          </SpreadRow>
        </NarrowStack>
      </CompactSurface>
    </CardCase>
  </CardBench>
);

export const ENTRIES: CardEntry[] = [
  {
    route: "DataDisplay/MetricCard",
    name: "MetricCard (stat tile)",
    status: "sui",
    note: "SUI stat tile — label + large value + optional units + semantic color (default/success/warning/danger). Live on /tools/power-log-ocr and /tools/ftir-gap-fill.",
    component: MetricCardShowcase,
  },
  {
    route: "components/PowerLogDropZone",
    name: "Upload dropzone",
    status: "sui",
    note: "SUI `FileDropTarget` / `CompactFileDropTarget` — dashed drop target + click-to-browse picker, extension check with a self-clearing notice, disabled state. Replaces the inline-styled drop div in PowerLogDropZone.tsx.",
    component: DropzoneShowcase,
  },
  {
    route: "tools/power-log-ocr",
    name: "OCR results card",
    status: "sui",
    note: "CardSurface: header (Extracted Data + vessel + date), 3 MetricCards, extracted-hours table beside a CompactSurface image preview, 'Upload Another' ghost button.",
    component: OcrResultShowcase,
  },
  {
    route: "tools/ftir-gap-fill",
    name: "Coverage info-bar",
    status: "sui",
    note: "CardSurface WrappedClusterRow: accent asset id + location StatusBadge + timestamp range. Already SUI.",
    component: CoverageBarShowcase,
  },
  {
    route: "flow-diagnosis",
    name: "Flow-diagnosis classification chip",
    status: "sui",
    note: "CompactSurface with a colored left border, a solid category-colored chip (classification) + a one-line note. Sits above the decision flowchart.",
    component: FlowDiagnosisShowcase,
  },
  {
    route: "SettingsPanel",
    name: "Settings group card",
    status: "sui",
    note: "CompactSurface grouping card (Appearance): theme control, colorblind toggle, date-format select. A padded grouping card rather than a data card.",
    component: SettingsGroupShowcase,
  },
];
