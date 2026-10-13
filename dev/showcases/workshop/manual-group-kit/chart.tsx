// The cumulative deviation chart: per config, a schedule track on the zero
// line and a stair of running actual-minus-expected above it; the uncovered
// payments as a dashed stair with the peak the y domain clips marked.
import { type Component, For, Show, createMemo } from "solid-js";
import {
  Chart,
  Grid,
  LineSeries,
  OutOfRangeMarkers,
  PointCaptions,
  PointSeries,
  ReferenceLine,
  SlotTrack,
  SlotTrackSwatch,
  XAxis,
  YAxis,
} from "../../../../src/components/Chart";
import { MutedEmptyState } from "../../../../src/components/Feedback";
import { Legend, type LegendItem } from "../../../../src/components/Legend";
import { NarrowStack } from "../../../../src/components/Layout";
import {
  type Config,
  type Expected,
  LAST,
  type Payee,
  type Payment,
  TODAY,
  configSeries,
  dayMs,
  expOf,
  isoOf,
  money,
  ms,
  signed,
  uncoveredSeries,
} from "./model";

const SUCCESS = "var(--sui-success)";
const WARNING = "var(--sui-warning)";
const DANGER = "var(--sui-danger)";
const HALTED = "rgba(var(--sui-success-rgb), 0.55)";

const MONTHS = ["2025-11-01", "2025-12-01", "2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"];
const MONTH_NAMES = ["Nov", "Dec", "Jan '26", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const MONTH_MS = MONTHS.map(ms);
const monthName = (v: number): string => MONTH_NAMES[MONTH_MS.indexOf(v)] ?? "";
const X_DOMAIN: [Date, Date] = [new Date("2025-10-01T00:00:00Z"), new Date("2026-10-31T00:00:00Z")];

export interface DeviationChartProps {
  readonly payee: Payee;
  readonly configs: readonly Config[];
  readonly uncovered: readonly Payment[];
  readonly exp: Expected;
  readonly discarded: boolean;
  readonly groupGone: boolean;
}

const ConfigMarks: Component<{ c: Config; exp: Expected }> = (props) => {
  const s = createMemo(() => configSeries(props.c, props.exp));
  const stroke = () => (props.c.halt ? HALTED : SUCCESS);
  const expected = () => expOf(props.c, props.exp);
  return (
    <>
      <Show when={props.c.halt}>
        {(h) => <PointSeries data={[{ x: ms(h()) }]} x={(p) => p.x} y={() => 0} radius={3.5} fill={stroke()} title={() => `Halted ${h()}`} />}
      </Show>
      <SlotTrack
        data={s().slots}
        from={(sl) => dayMs(sl.lo)}
        to={(sl) => dayMs(sl.hi)}
        y={0}
        state={(sl) => sl.state}
        caption={(sl) => sl.caption}
        title={(sl) => (sl.state === "empty" ? `Expected around ${isoOf(sl.g)}: nothing arrived` : `Expected around ${isoOf(sl.g)}: ${sl.hits} arrived`)}
      />
      <PointSeries
        data={s().dots}
        x={(d) => ms(d.row.d)}
        y={() => 0}
        radius={2.5}
        fill={(d) => (d.inSlot && d.okAmt ? SUCCESS : WARNING)}
        title={(d) =>
          `${d.row.d}: ${money(d.row.c)}${props.c.variable ? ` inside $0 – ${money(props.c.hi ?? 0)}` : ` expected ${money(expected())}${d.dv ? ` (${signed(d.dv)})` : ""}`}${d.inSlot ? "" : " — OUTSIDE ANY SLOT"}${d.okAmt ? "" : " — OUTSIDE AMOUNT BAND"}`
        }
      />
      <PointCaptions data={s().dots.filter((d) => d.timing)} x={(d) => ms(d.row.d)} y={() => 0} text={(d) => d.timing ?? ""} offset={9} tone="warning" />
      <PointCaptions data={s().dots.filter((d) => d.amount)} x={(d) => ms(d.row.d)} y={() => 0} text={(d) => d.amount ?? ""} side="below" offset={9} tone="warning" />
      <LineSeries data={s().line} x={(p) => p.x} y={(p) => p.y} stroke={stroke()} strokeWidth={2} curve="step" />
      <Show when={Math.abs(s().drift) >= 100}>
        <PointCaptions data={[s().end]} x={(p) => p.x} y={(p) => p.y} text={() => signed(s().drift)} side={s().end.y >= 0 ? "above" : "below"} offset={8} tone="success" />
      </Show>
    </>
  );
};

export const DeviationChart: Component<DeviationChartProps> = (props) => {
  const ticks = () => props.payee.ticks ?? (props.payee.unit === 1000 ? [30000, 20000, 10000, 0] : [100, 50, 0, -50]);
  const fmtY = (v: number) => `${v > 0 ? "+" : ""}${props.payee.unit === 1000 ? `$${v / 1000}k` : `$${v}`}`;
  const unc = createMemo(() => uncoveredSeries(props.payee, props.uncovered));
  const showUncovered = () => props.uncovered.length > 0 && !props.discarded;
  const legend = createMemo<LegendItem[]>(() => {
    const items: LegendItem[] = props.configs.map((c) =>
      c.variable
        ? { color: SUCCESS, line: true, label: `Variable $0–${money(c.hi ?? 0)}${c.med ? `, expects ${money(expOf(c, props.exp))} a slot` : ""}${c.halt ? ", halted" : ""}` }
        : { swatch: <SlotTrackSwatch />, label: `${c.qty ? `${c.qty} × ` : ""}${money(expOf(c, props.exp))}${c.tol ? ` ±${Math.round(c.tol * 100)}%` : ""} ${c.when}${c.halt ? " (halted)" : ""}` },
    );
    if (showUncovered()) items.push({ color: DANGER, line: { dash: "6 4" }, label: "Uncovered by any config" });
    if (props.configs.some((c) => c.every)) items.push({ swatch: <SlotTrackSwatch state="empty" />, label: "expected slot, nothing arrived" });
    items.push({ color: SUCCESS, line: true, label: "line = running actual minus expected" });
    const first = props.payee.configs[0];
    if (first?.grace && !first.variable) items.push({ color: WARNING, line: true, label: "dot outside its pill = early or late" });
    return items;
  });
  return (
    <NarrowStack>
      <Show when={!props.groupGone} fallback={<MutedEmptyState message="Group discarded. Nothing to measure." />}>
        <Chart width={860} height={262} xDomain={X_DOMAIN} yDomain={[props.payee.yMin, props.payee.yMax]} margin={{ top: 30, right: 16, bottom: 34, left: 58 }} responsive>
          <Grid horizontal vertical tickCount={4} />
          <YAxis hideLine tickValues={ticks()} tickFormat={fmtY} />
          <XAxis hideLine tickValues={MONTH_MS} tickFormat={monthName} />
          <ReferenceLine orientation="horizontal" value={0} color="var(--sui-accent)" strokeWidth={1.5} opacity={1} />
          <ReferenceLine orientation="vertical" value={new Date(`${LAST}T00:00:00Z`)} strokeDasharray="3 3" label="Last" />
          <ReferenceLine orientation="vertical" value={new Date(`${TODAY}T00:00:00Z`)} strokeDasharray="3 3" label="Today" />
          <Show when={showUncovered()}>
            <LineSeries data={unc().line} x={(p) => p.x} y={(p) => p.y} stroke={DANGER} strokeWidth={2} strokeDasharray="6 4" curve="step" />
            <PointSeries
              data={unc().dots}
              x={(d) => ms(d.row.d)}
              y={(d) => d.acc / 100}
              radius={4}
              fill="var(--sui-chart-surface, var(--sui-bg-primary))"
              stroke={DANGER}
              strokeWidth={2}
              title={(d) => `${d.row.d}: ${money(d.row.c)} not covered by any config. Running total ${money(d.acc)}`}
            />
            <OutOfRangeMarkers points={unc().line} format={(v) => money(v * 100)} tone="danger" />
            <Show when={unc().end.y <= props.payee.yMax}>
              <PointCaptions data={[unc().end]} x={(p) => p.x} y={(p) => p.y} text={() => `+${money(unc().total)} uncovered`} offset={8} tone="danger" />
            </Show>
          </Show>
          <For each={props.configs}>{(c) => <ConfigMarks c={c} exp={props.exp} />}</For>
        </Chart>
        <Legend items={legend()} />
      </Show>
    </NarrowStack>
  );
};
