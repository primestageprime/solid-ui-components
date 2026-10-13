// The config cards and the action row under the chart.
import { type Component, For, Show } from "solid-js";
import { CompliantBadge, TagPill } from "../../../../src/components/Badge";
import { IconOnlyButton, SmallButton, SmallGhostButton, SmallOutlinedButton } from "../../../../src/components/Button";
import { Icon } from "../../../../src/components/Icon";
import { ActionWrapRow, ClusterRow, NarrowStack, SpreadRow } from "../../../../src/components/Layout";
import { Slider } from "../../../../src/components/Slider";
import { CompactSurface, SuccessSurface } from "../../../../src/components/Surface";
import { MonoValue, MutedBody, SuccessBody, TextBody, TextTitle } from "../../../../src/components/Text";
import {
  type Config,
  type Expected,
  type Payee,
  type Payment,
  type Why,
  configSeries,
  driftTolerance,
  editable,
  expOf,
  fitOf,
  headline,
  money,
  signed,
  summary,
} from "./model";

export interface ConfigCardsProps {
  readonly payee: Payee;
  readonly configs: readonly Config[];
  readonly exp: Expected;
  readonly editing: string | null;
  readonly groupGone: boolean;
  readonly onEdit: (id: string | null) => void;
  readonly onExpected: (id: string, cents: number) => void;
}

const DriftPill: Component<{ c: Config; drift: number; suffix?: string }> = (props) => (
  <TagPill tag={{ label: `drift ${signed(props.drift)}${props.suffix ?? ""}`, active: Math.abs(props.drift) < driftTolerance(props.c) }} />
);

const ConfigCard: Component<{ c: Config; exp: Expected; editing: boolean; onEdit: (id: string | null) => void; onExpected: (id: string, cents: number) => void }> = (props) => {
  const sub = () => summary(props.c, props.exp);
  const drift = () => configSeries(props.c, props.exp).drift;
  const Card = props.c.halt ? CompactSurface : SuccessSurface;
  return (
    <Card>
      <SpreadRow>
        <NarrowStack>
          <Show when={!props.c.halt} fallback={<MutedBody>{headline(props.c, props.exp)}</MutedBody>}>
            <TextTitle>{headline(props.c, props.exp)}</TextTitle>
          </Show>
          <MutedBody>
            {sub().text} <SuccessBody>{sub().verdict}</SuccessBody>
          </MutedBody>
          <Show when={editable(props.c)}>
            <Show
              when={props.editing}
              fallback={
                <ClusterRow>
                  <DriftPill c={props.c} drift={drift()} suffix={` over ${props.c.rows.length} payments`} />
                  <SmallGhostButton onClick={() => props.onEdit(props.c.id)}>Edit</SmallGhostButton>
                </ClusterRow>
              }
            >
              <NarrowStack>
                <Slider
                  label={props.c.variable ? "Expects" : "Level"}
                  value={expOf(props.c, props.exp)}
                  min={0}
                  max={props.c.variable ? (props.c.hi ?? 0) : Math.round((props.c.amt ?? 0) * 1.1)}
                  step={1}
                  format={(v) => `${money(v)} ${props.c.variable ? "a slot" : "a payment"}`}
                  onChange={(v) => props.onExpected(props.c.id, v)}
                />
                <ClusterRow>
                  <DriftPill c={props.c} drift={drift()} />
                  <SmallButton onClick={() => props.onExpected(props.c.id, fitOf(props.c))}>Zero the drift · {money(fitOf(props.c))}</SmallButton>
                  <SmallGhostButton onClick={() => props.onEdit(null)}>Done</SmallGhostButton>
                </ClusterRow>
              </NarrowStack>
            </Show>
          </Show>
        </NarrowStack>
        <IconOnlyButton aria-label="Delete config" title="Delete config">
          <Icon name="trash" size="sm" />
        </IconOnlyButton>
      </SpreadRow>
    </Card>
  );
};

export const ConfigCards: Component<ConfigCardsProps> = (props) => (
  <NarrowStack>
    <Show
      when={!props.groupGone}
      fallback={
        <CompactSurface>
          <NarrowStack>
            <MutedBody>Group discarded</MutedBody>
            <MutedBody>{(props.payee.configs[0]?.rows.length ?? 0) + props.payee.uncovered.length} payments left out of the model.</MutedBody>
          </NarrowStack>
        </CompactSurface>
      }
    >
      <For each={props.configs}>
        {(c) => <ConfigCard c={c} exp={props.exp} editing={props.editing === c.id} onEdit={props.onEdit} onExpected={props.onExpected} />}
      </For>
    </Show>
  </NarrowStack>
);

export interface ActionsProps {
  readonly payee: Payee;
  readonly applied: readonly string[];
  readonly uncovered: readonly Payment[];
  readonly discarded: boolean;
  readonly groupGone: boolean;
  readonly settled: boolean;
  readonly coveredCount: number;
  readonly onAddConfig: () => void;
  readonly onApply: (id: string) => void;
  readonly onDiscard: () => void;
}

const WhyLine: Component<{ why: Why }> = (props) => (
  <MutedBody>
    Why: <For each={props.why}>{(seg) => (seg.strong ? <SuccessBody>{seg.text}</SuccessBody> : <>{seg.text}</>)}</For>
  </MutedBody>
);

export const Actions: Component<ActionsProps> = (props) => {
  const open = () => !props.settled;
  const total = () => props.uncovered.reduce((a, r) => a + r.c, 0);
  const rec = () => open() && props.payee.recommend === "discard";
  return (
    <Show when={!props.groupGone}>
      <NarrowStack>
        <ActionWrapRow>
          <SmallButton onClick={props.onAddConfig}>+ Add config</SmallButton>
          <For each={props.payee.autos}>
            {(au) => {
              const done = () => props.applied.includes(au.id);
              return (
                <SmallButton disabled={done() || props.discarded} onClick={() => props.onApply(au.id)}>
                  {au.label}
                  {done() ? " ✓" : ""}
                </SmallButton>
              );
            }}
          </For>
          <Show when={props.uncovered.length > 0 || props.discarded}>
            <SmallOutlinedButton disabled={!open()} onClick={props.onDiscard}>
              Discard non-matching · {money(total())}
              {props.uncovered.length === 1 ? " (one-time)" : ""}
              <Show when={rec()}>
                {" "}
                <CompliantBadge label="Recommended" />
              </Show>
            </SmallOutlinedButton>
          </Show>
        </ActionWrapRow>
        <Show when={open()} fallback={
          <Show when={props.discarded} fallback={<MutedBody>Every payment is claimed by a config. Halted configs add nothing to the forecast.</MutedBody>}>
            <MutedBody>{props.payee.uncovered.length - props.coveredCount + (props.payee.configs[0]?.rows.length ?? 0)} payments stay in history and are left out of the model.</MutedBody>
          </Show>
        }>
          <WhyLine why={props.payee.why(props.uncovered)} />
        </Show>
      </NarrowStack>
    </Show>
  );
};

/** A line of mono money, for the right-aligned amount cells. */
export const Amount: Component<{ cents: number }> = (props) => <MonoValue>-{money(props.cents)}</MonoValue>;
export { TextBody };
