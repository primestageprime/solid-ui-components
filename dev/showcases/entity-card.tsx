// EntityCard — the region-slot card, shown holding things a typed card can't.
//
// The distinction worth seeing: SlotCard takes VALUES and decides how each one
// renders; EntityCard takes REGIONS and renders whatever JSX the client puts in
// them. That is the whole reason both exist. A demo where every region holds a
// string would look like a worse SlotCard, so the regions here hold what only
// this card can hold — a status badge, a stacked progress bar, a live
// sparkline, a count chip — while the card keeps the grid, the selection
// affordance and the hover-remove control that call sites must never hand-roll.
//
// The card is a list member, never a standalone tile, so it is shown in the
// scrolling sidebar list it was cut for, over one run of scenario executions.
import { type Component, For, createSignal } from "solid-js";
import { EntityCard } from "../../src/components/EntityCard";
import {
  CompliantBadge,
  ViolationBadge,
  PendingBadge,
  WarningBadge,
  CountChip,
} from "../../src/components/Badge";
import { StackedProgressBar } from "../../src/components/Progress";
import { Sparkline } from "../../src/components/Sparkline";
import { ScrollYBox, Column, ContentStack, NarrowStack } from "../../src/components/Layout";
import { SubsectionTitle, TextSublabel, MutedBody } from "../../src/components/Text";
import "./entity-card.css";

// ── One run of scenario executions ───────────────────────────────────────────
type Outcome = "passed" | "failed" | "running" | "flagged";

interface Run {
  id: string;
  scenario: string;
  asset: string;
  outcome: Outcome;
  started: string;
  /** Minutes elapsed / expected, which is what the progress region shows. */
  elapsed: number;
  expected: number;
  alarms: number;
  /** Engine load trace, sampled every 5 minutes — the sparkline's data. */
  trace: number[];
}

const SCENARIOS = [
  "Aux engine derate",
  "Bunker transfer — port",
  "Ballast exchange",
  "Main engine trial",
  "Shaft generator cut-in",
  "Emergency stop drill",
  "Fuel changeover (HFO → MGO)",
  "Bow thruster load test",
  "Boiler warm-up",
  "Crash astern",
];
const ASSETS = ["MV Northern Star", "SS Pacific Dawn", "MT Coral Sea", "MV Aurora"];
const OUTCOMES: Outcome[] = ["passed", "failed", "running", "flagged"];

const RUNS: Run[] = (() => {
  let s = 31;
  const rand = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return SCENARIOS.map((scenario, i) => {
    const outcome =
      i === 2 ? "running" : OUTCOMES[Math.floor(rand() * OUTCOMES.length)];
    const expected = 30 + Math.floor(rand() * 90);
    let load = 40 + rand() * 30;
    const trace = Array.from({ length: 24 }, () => {
      load = Math.max(5, Math.min(100, load + (rand() - 0.48) * 14));
      return Math.round(load);
    });
    return {
      id: `run-${i + 1}`,
      scenario,
      asset: ASSETS[Math.floor(rand() * ASSETS.length)],
      outcome,
      started: `2026-07-${String(12 + (i % 9)).padStart(2, "0")} ${String(6 + i).padStart(2, "0")}:00`,
      elapsed:
        outcome === "running" ? Math.floor(expected * (0.2 + rand() * 0.6)) : expected,
      expected,
      alarms: Math.floor(rand() * 5),
      trace,
    };
  });
})();

// Which badge a run's outcome earns. The tone is in the badge's NAME, so this
// is a data→component mapping, not a variant prop being computed.
const badgeFor = (outcome: Outcome) => {
  if (outcome === "passed") return <CompliantBadge label="passed" />;
  if (outcome === "failed") return <ViolationBadge label="failed" />;
  if (outcome === "flagged") return <WarningBadge label="flagged" />;
  return <PendingBadge label="running" />;
};

const OUTCOME_COLOR: Record<Outcome, string> = {
  passed: "var(--sui-success)",
  failed: "var(--sui-danger)",
  flagged: "var(--sui-warning)",
  running: "var(--sui-accent)",
};

export const EntityCardShowcase: Component = () => {
  const [selected, setSelected] = createSignal("run-3");
  const [removed, setRemoved] = createSignal<string[]>([]);

  const visible = () => RUNS.filter((run) => !removed().includes(run.id));

  return (
    <div class="component-section">
      <h2>EntityCard — Composite (Depth 2)</h2>
      <p class="text-meta">
        A fixed three-column grid with named regions —{" "}
        <code>identifier</code> / <code>status</code> on the top row,{" "}
        <code>detail</code> in the middle, <code>timing</code> /{" "}
        <code>progress</code> / <code>counts</code> along the bottom. SUI owns
        the grid, the selection affordance and the hover-revealed remove
        control; the client owns what goes IN each region. That is the split
        that distinguishes it from SlotCard, which takes typed values and
        decides how to render them: here a region can hold anything, so a
        two-field card and a six-field card still line up with each other.
      </p>

      <ContentStack>
        <SubsectionTitle>In the list it exists for</SubsectionTitle>
        <TextSublabel>
          Ten scenario runs in a scrolling sidebar. Every region holds real
          content rather than a label: the status is a tone-named badge, the
          progress is a stacked bar over elapsed-vs-remaining minutes, the
          counts are a chip. Click a card to select it — the accent border and
          wash are baked in, so no call site re-implements them — and hover one
          to reveal the ✕, which never occupies the status region.
        </TextSublabel>
        <div class="entity-card-demo__list">
          <ScrollYBox class="entity-card-demo__scroll">
            <Column>
              <For each={visible()}>
                {(run) => (
                  <EntityCard
                    identifier={run.scenario}
                    status={badgeFor(run.outcome)}
                    detail={run.asset}
                    timing={run.started}
                    progress={
                      <StackedProgressBar
                        class="entity-card-demo__bar"
                        segments={[
                          {
                            percentage: (run.elapsed / run.expected) * 100,
                            color: OUTCOME_COLOR[run.outcome],
                          },
                          {
                            percentage:
                              100 - (run.elapsed / run.expected) * 100,
                            color: "var(--sui-border)",
                          },
                        ]}
                      />
                    }
                    counts={
                      <CountChip count={run.alarms} label="alarm" />
                    }
                    selected={selected() === run.id}
                    onClick={() => setSelected(run.id)}
                    onRemove={() =>
                      setRemoved((prev) => [...prev, run.id])
                    }
                  />
                )}
              </For>
            </Column>
          </ScrollYBox>
        </div>
        <MutedBody>
          selected: {selected()} ·{" "}
          {removed().length === 0
            ? "nothing removed"
            : `${removed().length} removed`}
        </MutedBody>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>A region can hold a chart</SubsectionTitle>
        <TextSublabel>
          The same card with the engine-load trace in the progress region
          instead of a bar. Nothing about the card changed — this is what "the
          client fills the region" buys, and what a typed value renderer could
          not express without growing a case for every content kind anyone
          might want.
        </TextSublabel>
        <div class="entity-card-demo__list">
          <NarrowStack>
            <For each={visible().slice(0, 3)}>
              {(run) => (
                <EntityCard
                  identifier={run.scenario}
                  status={badgeFor(run.outcome)}
                  detail={run.asset}
                  timing={`${run.elapsed} / ${run.expected} min`}
                  progress={
                    <Sparkline
                      values={run.trace}
                      color={OUTCOME_COLOR[run.outcome]}
                      width={96}
                      height={18}
                    />
                  }
                  counts={<CountChip count={run.alarms} label="alarm" />}
                />
              )}
            </For>
          </NarrowStack>
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>Unused regions collapse</SubsectionTitle>
        <TextSublabel>
          Every region but <code>identifier</code> is optional, and the rows
          they sit on disappear when empty. A bare card and a full one are the
          same component with the same grid — which is why a list can mix them
          without the alignment falling apart.
        </TextSublabel>
        <div class="entity-card-demo__list">
          <NarrowStack>
            <EntityCard identifier="Crash astern" />
            <EntityCard
              identifier="Boiler warm-up"
              status={<PendingBadge label="queued" />}
            />
            <EntityCard
              identifier="Ballast exchange"
              detail="MT Coral Sea"
              timing="2026-07-14 08:00"
            />
            <EntityCard
              identifier="Main engine trial"
              status={<CompliantBadge label="passed" />}
              detail="MV Aurora"
              timing="2026-07-15 06:00"
              counts={<CountChip count={0} label="alarm" />}
            />
          </NarrowStack>
        </div>
      </ContentStack>
    </div>
  );
};
