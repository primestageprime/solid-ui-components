// ============================================
// TimingPanel — the selected season's start and stop rules. COMPOSED from SUI,
// no CSS of its own:
//
//   SpreadRow / TightStack     layout
//   TextSublabel, TextBody + AccentBody   the sentence readout
//   SteadyMonoValue + InfoBadge | WarningBadge   the resolved window and its
//                              Fixed / Projected tag
//   LooseCardGrid of CompactSurface   the Starts and Stops cards, each with
//   SegmentedControl           kind pills (only the kinds allowed on that end;
//                              a projected kind wears a ~) and a RuleForm
// ============================================
import type { Component } from "solid-js";
import {
  AccentBody,
  CompactSurface,
  InfoBadge,
  LooseCardGrid,
  MonoMeta,
  SegmentedControl,
  SpreadRow,
  SteadyMonoValue,
  TextBody,
  TextLabel,
  TextSublabel,
  TightStack,
  WarningBadge,
  WarningBody,
  fn,
} from "../../../../src";
import {
  type Ctx,
  type Rule,
  type RuleKind,
  type Season,
  type Side,
  ctxOf,
  endText,
  isFixed,
  kindLabel,
  kindsFor,
  lengthText,
  makeRule,
  phrase,
  resolve,
  sampleCash,
  windowText,
  type BuilderKey,
} from "../seasonal-builder-model";
import { RuleForm } from "./rule-form";

const { map } = fn;

const SideCard: Component<{
  readonly id: string;
  readonly side: Side;
  readonly season: Season;
  readonly ctx: Ctx;
  readonly onRule: (side: Side, rule: Rule) => void;
}> = (props) => {
  const rule = () => props.season[props.side];
  const when = () => endText(props.season, props.side, props.ctx);
  const options = () =>
    map(
      (kind: RuleKind) => ({
        value: kind,
        label: `${kindLabel(kind, props.ctx)}${isFixed(makeRule(kind)) ? "" : " ~"}`,
      }),
      kindsFor(props.side),
    );
  return (
    <CompactSurface>
      <TightStack>
        <SpreadRow>
          <TextLabel>{props.side === "start" ? "Starts" : "Stops"}</TextLabel>
          {isFixed(rule()) ? (
            <MonoMeta>{when()}</MonoMeta>
          ) : (
            <WarningBody>{when()}</WarningBody>
          )}
        </SpreadRow>
        <SegmentedControl
          aria-label={`${props.side} rule kind`}
          options={options()}
          value={rule().kind}
          onValueChange={(kind) =>
            props.onRule(props.side, makeRule(kind as RuleKind))
          }
        />
        <RuleForm
          id={props.id}
          side={props.side}
          season={props.season}
          ctx={props.ctx}
          cashNow={sampleCash(0)}
          onChange={(r) => props.onRule(props.side, r)}
        />
      </TightStack>
    </CompactSurface>
  );
};

export const TimingPanel: Component<{
  /** Unique per builder on the page. */
  readonly id: BuilderKey;
  readonly season: Season;
  readonly onRule: (side: Side, rule: Rule) => void;
}> = (props) => {
  const ctx = () => ctxOf(props.id);
  const w = () => resolve(props.season, ctx());
  return (
    <TightStack>
      <SpreadRow>
        <TightStack>
          <TextSublabel>{`Timing · ${props.season.name}`}</TextSublabel>
          <TextBody>
            Starts <AccentBody>{phrase(props.season.start, ctx())}</AccentBody>.
            Stops <AccentBody>{phrase(props.season.stop, ctx())}</AccentBody>.
          </TextBody>
        </TightStack>
        <TightStack>
          <SteadyMonoValue>{windowText(props.season, ctx())}</SteadyMonoValue>
          <SpreadRow>
            <MonoMeta>{lengthText(props.season, ctx())}</MonoMeta>
            {w().projected ? (
              <WarningBadge label="Projected" />
            ) : (
              <InfoBadge label="Fixed" />
            )}
          </SpreadRow>
        </TightStack>
      </SpreadRow>
      <LooseCardGrid>
        <SideCard
          id={`${props.id}-start`}
          side="start"
          season={props.season}
          ctx={ctx()}
          onRule={props.onRule}
        />
        <SideCard
          id={`${props.id}-stop`}
          side="stop"
          season={props.season}
          ctx={ctx()}
          onRule={props.onRule}
        />
      </LooseCardGrid>
    </TightStack>
  );
};
