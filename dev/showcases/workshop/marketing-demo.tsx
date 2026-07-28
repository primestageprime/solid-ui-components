// Marketing demo bench — 5 subtabs of marketing scenarios. Subtab 1, "The
// Leaky Pipe Problem", is built out with stub flow data; the rest are stubs to
// be filled in. Pure SUI composition — no inline styles (ratchet-clean).
import { type Component, createSignal, For, Show, Switch, Match } from "solid-js";
import { UnderlineTabs, type Tab } from "../../../src/components/Tabs";
import { DataTransferScenario } from "./marketing-demo/transfer";
import { BiReportsScenario } from "./marketing-demo/reports";
import {
  Chart,
  Grid,
  XAxis,
  YAxis,
  LineSeries,
  AreaSeries,
} from "../../../src/components/Chart";
import { AlarmBands } from "../../../src/components/Alarm";
import { ChartHeader } from "../../../src/components/ChartHeader";
import {
  ContentStack,
  TightStack,
  WrapRow,
} from "../../../src/components/Layout";
import { SectionTitle, TextBody, TextSublabel } from "../../../src/components/Text";
import { SmStatusBadge } from "../../../src/components/Badge";
import { BlockPlaceholder } from "../../../src/components/Placeholder";
import "./marketing-demo.css";

export const meta = { label: "Marketing demo" };

// ── Stub data: the leaky-pipe flow story ────────────────────────────────────
// Five flow meters (signal MSO_F2, m³/h) on one line. Pipes 1–2, upstream of the
// leak, hold full flow the whole time. At the fault time the leak opens and Pipe
// 3 plus everything downstream (4, 5) drop to the same lower level. Only Pipe 3
// turns red — it's the first meter to fall below its upstream neighbour, so it
// marks WHERE the leak is; its line runs green (nominal) then red at the drop,
// with the AlarmBands "error band" over the fault region. Pipes 4–5 sit at the
// SAME low value but stay green: it's the relative position, not the absolute
// flow, that flags the fault.

interface FlowPt {
  t: number;
  v: number;
}

// The leak: affected meters run nominal until FAULT_START, then step down to
// FAULT_LEVEL. Pipes upstream of the leak never drop.
const FAULT_START = 54; // minute the leak opens
const FAULT_LEVEL = 62; // m³/h affected meters drop to
// The culprit's line splits here: green (nominal) up to SPLIT_T, red from SPLIT_T
// on (so the drop edge itself is drawn red).
const SPLIT_T = FAULT_START - 1;

const nominalPart = (data: FlowPt[]): FlowPt[] => data.filter((p) => p.t <= SPLIT_T);
const faultPart = (data: FlowPt[]): FlowPt[] => data.filter((p) => p.t >= SPLIT_T);

// Deterministic PRNG so the stub series are stable across renders.
const prng = (seed: number) => {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
};

// 90 minutes of flow (one sample/min) as noisy jitter + gentle undulation
// around a baseline — reads like a real MSO_F2 sensor trace. When `faultAt` is
// set, the baseline steps down to `faultTo` from that minute on.
const flowSeries = (
  baseline: number,
  seed: number,
  faultAt?: number,
  faultTo?: number,
): FlowPt[] => {
  const rand = prng(seed);
  const out: FlowPt[] = [];
  for (let t = 0; t < 90; t++) {
    const base =
      faultAt !== undefined && faultTo !== undefined && t >= faultAt
        ? faultTo
        : baseline;
    const jitter = (rand() - 0.5) * 4; // ±2 m³/h sensor noise
    const undulation = Math.sin(t / 14) * 1.5;
    out.push({ t, v: Math.max(0, base + jitter + undulation) });
  }
  return out;
};

interface Pipe {
  id: string;
  label: string;
  baseline: number;
  seed: number;
  /** Does this meter's flow drop at the leak time? (Upstream meters don't.) */
  drops?: boolean;
  /** The culprit: green→red split line + error band + FAULT badge. */
  culprit?: boolean;
  note: string;
}

// 1–2 upstream (never drop). 3 is the culprit (first to fall → the source). 4–5
// downstream drop at the same time and to the same level, but stay green.
const PIPES: Pipe[] = [
  { id: "p1", label: "Pipe 1 Flow", baseline: 98, seed: 11, note: "Upstream of the leak — full flow, unaffected." },
  { id: "p2", label: "Pipe 2 Flow", baseline: 97, seed: 23, note: "Upstream of the leak — full flow, unaffected." },
  { id: "p3", label: "Pipe 3 Flow", baseline: 97, seed: 37, drops: true, culprit: true, note: `Fault at ${FAULT_START}m — first meter to fall below upstream, so it's the source.` },
  { id: "p4", label: "Pipe 4 Flow", baseline: 96, seed: 41, drops: true, note: "Downstream — drops with the leak, but nominal relative to Pipe 3." },
  { id: "p5", label: "Pipe 5 Flow", baseline: 95, seed: 53, drops: true, note: "Downstream — drops with the leak, but nominal relative to Pipe 3." },
];

// One 300px-wide tile. Green line + green fill by default. The culprit's line
// runs green up to the drop, then red — with an AlarmBands red box over the
// fault region — while downstream meters that drop the same amount stay green.
function PipeFlowChart(props: { pipe: Pipe }): ReturnType<Component> {
  const p = props.pipe;
  const data = flowSeries(
    p.baseline,
    p.seed,
    p.drops ? FAULT_START : undefined,
    p.drops ? FAULT_LEVEL : undefined,
  );
  return (
    <div class="mkt-tile">
      <TightStack>
        <ChartHeader
          title={p.label}
          meta={
            <SmStatusBadge variant={p.culprit ? "violation" : "compliant"}>
              {p.culprit ? `FAULT @${FAULT_START}m` : "NOMINAL"}
            </SmStatusBadge>
          }
        />
        <Chart width={300} height={170} xDomain={[0, 89]} yDomain={[0, 110]}>
          <Grid />
          <YAxis tickCount={3} tickFormat={(v) => `${v}`} />
          <XAxis tickCount={4} tickFormat={(v) => `${v}m`} />
          <Show
            when={p.culprit}
            fallback={
              <>
                <AreaSeries data={data} x={(d) => d.t} y={(d) => d.v} class="mkt-flow-area--success" fillOpacity={0.15} />
                <LineSeries data={data} x={(d) => d.t} y={(d) => d.v} class="mkt-flow--success" strokeWidth={2} />
              </>
            }
          >
            {/* Green nominal first half, red box + red line once the fault hits. */}
            <AreaSeries data={nominalPart(data)} x={(d) => d.t} y={(d) => d.v} class="mkt-flow-area--success" fillOpacity={0.15} />
            <LineSeries data={nominalPart(data)} x={(d) => d.t} y={(d) => d.v} class="mkt-flow--success" strokeWidth={2} />
            <AlarmBands ranges={[{ start: FAULT_START, end: 89 }]} />
            <LineSeries data={faultPart(data)} x={(d) => d.t} y={(d) => d.v} class="mkt-flow--danger" strokeWidth={2} />
          </Show>
        </Chart>
        <TextSublabel>{p.note}</TextSublabel>
      </TightStack>
    </div>
  );
}

const LeakyPipeProblem: Component = () => (
  <ContentStack>
    <SectionTitle>The Leaky Pipe Problem</SectionTitle>
    <TextBody>
      Five flow meters (signal MSO_F2, m³/h) on one line. Pipes 1–2, upstream of
      the leak, hold full flow. At {FAULT_START} minutes in the leak opens: Pipe 3
      and everything downstream (4, 5) drop to the same lower level. Only Pipe 3
      turns red — it's the first meter to fall below its upstream neighbour, so it
      marks the leak. Pipes 4–5 sit at the same low value but stay green: it's the
      relative position, not the absolute flow, that flags the fault.
    </TextBody>
    <WrapRow>
      <For each={PIPES}>{(pipe) => <PipeFlowChart pipe={pipe} />}</For>
    </WrapRow>
  </ContentStack>
);

// ── Subtabs ─────────────────────────────────────────────────────────────────
const TABS: Tab[] = [
  { id: "leaky-pipe", label: "The Leaky Pipe Problem" },
  { id: "scenario-2", label: "Data Transfer" },
  { id: "scenario-3", label: "BI Reports" },
  { id: "scenario-4", label: "Scenario 4" },
  { id: "scenario-5", label: "Scenario 5" },
];

const labelOf = (id: string): string => {
  for (const tab of TABS) if (tab.id === id) return tab.label;
  return id;
};

const MarketingDemoBench: Component = () => {
  const [active, setActive] = createSignal("leaky-pipe");
  return (
    <div class="component-section component-section--full">
      <ContentStack>
        <SectionTitle>Marketing demo</SectionTitle>
        <UnderlineTabs tabs={TABS} activeTab={active()} onTabChange={setActive} />
        <Switch
          fallback={
            <ContentStack>
              <SectionTitle>{labelOf(active())}</SectionTitle>
              <BlockPlaceholder label="Marketing scenario — stub to be filled in" />
            </ContentStack>
          }
        >
          <Match when={active() === "leaky-pipe"}>
            <LeakyPipeProblem />
          </Match>
          <Match when={active() === "scenario-2"}>
            <DataTransferScenario />
          </Match>
          <Match when={active() === "scenario-3"}>
            <BiReportsScenario />
          </Match>
        </Switch>
      </ContentStack>
    </div>
  );
};

export default MarketingDemoBench;
