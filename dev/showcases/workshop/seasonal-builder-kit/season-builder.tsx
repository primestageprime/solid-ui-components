// ============================================
// SeasonBuilder — one builder (Seasonal workers, or Seasonal work): the two
// have ONE shape and this is it. COMPOSED from SUI, no CSS of its own:
//
//   CardSurface                 the panel
//   SectionTitle + TextSublabel + SteadyMonoValue   the title and the two totals
//   ContentChartFrame           the frame: title, y-axis title, fullscreen
//     YearStrip                 the stepped bands (year-strip.tsx)
//   GroupedMutationSliders      a row of vertical dials, one per season: name,
//                               max bound, prior marker, level and delta. One
//                               measure per season; its `caption` display is the
//                               clickable start rule in brief + date and length.
//                               The dials' selection IS the selected season
//                               (a name click picks it) so pinning never links two.
//   TimingPanel                 the selected season's rules (timing-panel.tsx)
//
// The seasons live in the bench's signal, so every edit re-resolves every
// window and every band from the pure model.
// ============================================
import { type Component, createMemo, createSignal } from "solid-js";
import {
  CardSurface,
  ContentChartFrame,
  ClusterRow,
  GroupedMutationSliders,
  type GroupedMutationEntity,
  type MeasureCaptionProps,
  MonoMeta,
  MutedBody,
  SectionTitle,
  SpreadRow,
  SteadyMonoValue,
  TextButton,
  TextSublabel,
  TightCenteredColumn,
  TightStack,
  WarningBody,
  fn,
} from "../../../../src";
import {
  type BuilderKey,
  type Season,
  bands,
  brief,
  ctxOf,
  formatLevel,
  levelStep,
  levels,
  niceMax,
  resolve,
  setLevel,
  setRule,
  summaries,
  topSeasonOn,
  whenCaption,
} from "../seasonal-builder-model";
import { TimingPanel } from "./timing-panel";
import { YearStrip } from "./year-strip";

const { map } = fn;

export const SeasonBuilder: Component<{
  readonly id: BuilderKey;
  readonly title: string;
  readonly sub: string;
  /** The y-axis's name and unit. */
  readonly yTitle: string;
  readonly unit: string;
  readonly initial: readonly Season[];
  readonly initialSelected: number;
}> = (props) => {
  const ctx = ctxOf(props.id);
  const [seasons, setSeasons] = createSignal<readonly Season[]>(props.initial);
  const [selected, setSelected] = createSignal(props.initialSelected);

  const stack = createMemo(() => bands(seasons(), ctx));
  const top = createMemo(() =>
    niceMax(
      Math.max(
        ...levels(seasons(), ctx),
        ...map((s: Season) => s.max * 0.25, seasons()),
      ),
    ),
  );
  const fmt = (v: number) => formatLevel(props.id, v);

  const entities = createMemo((): readonly GroupedMutationEntity[] =>
    map(
      (s: Season, i: number): GroupedMutationEntity => ({
        id: String(i),
        label: s.name,
        measures: [{ prior: s.prior, value: s.level, range: [0, s.max] }],
      }),
      seasons(),
    ),
  );

  /** Under each dial: the start rule in brief, its date and length. A button that opens the season's timing. */
  const Caption: Component<MeasureCaptionProps> = (c) => {
    const i = () => Number(c.entityId);
    const season = () => seasons()[i()];
    const w = () => resolve(season(), ctx);
    return (
      <TextButton
        aria-label={`Edit ${season().name}'s start and stop rules`}
        onClick={() => setSelected(i())}
      >
        <TightCenteredColumn>
          <MonoMeta>{brief(season().start, ctx)}</MonoMeta>
          {w().projected ? (
            <WarningBody>{whenCaption(season(), ctx)}</WarningBody>
          ) : (
            <MonoMeta>{whenCaption(season(), ctx)}</MonoMeta>
          )}
        </TightCenteredColumn>
      </TextButton>
    );
  };

  return (
    <CardSurface>
      <TightStack>
        <SpreadRow>
          <TightStack>
            <SectionTitle>{props.title}</SectionTitle>
            <MutedBody>{props.sub}</MutedBody>
          </TightStack>
          <ClusterRow>
            {map(
              (m) => (
                <TightStack>
                  <TextSublabel>{m.label}</TextSublabel>
                  {m.up ? (
                    <SteadyMonoValue tone="success">{m.value}</SteadyMonoValue>
                  ) : (
                    <SteadyMonoValue>{m.value}</SteadyMonoValue>
                  )}
                  <MonoMeta>{m.sub}</MonoMeta>
                </TightStack>
              ),
              summaries(props.id, seasons(), ctx),
            )}
          </ClusterRow>
        </SpreadRow>
        <ContentChartFrame
          title={`${props.title} across 2026`}
          yTitle={props.yTitle}
        >
          <YearStrip
            bands={stack()}
            ctx={ctx}
            selected={selected()}
            top={top()}
            format={fmt}
            onPick={(day) => {
              const hit = topSeasonOn(stack(), day);
              if (hit !== null) setSelected(hit);
            }}
          />
        </ContentChartFrame>
        <GroupedMutationSliders
          entities={entities()}
          axes={[
            {
              label: props.unit,
              format: fmt,
              deltaFormat: fmt,
              snap: levelStep(props.id),
              caption: Caption,
            },
          ]}
          selected={[String(selected())]}
          onSelectionChange={(ids) => {
            const next = ids.find((id) => id !== String(selected()));
            if (next !== undefined) setSelected(Number(next));
          }}
          onChange={(id, _measure, v) =>
            setSeasons((ss) => setLevel(ss, Number(id), v))
          }
        />
        <TimingPanel
          id={props.id}
          season={seasons()[selected()]}
          onRule={(side, rule) =>
            setSeasons((ss) => setRule(ss, selected(), side, rule))
          }
        />
      </TightStack>
    </CardSurface>
  );
};
