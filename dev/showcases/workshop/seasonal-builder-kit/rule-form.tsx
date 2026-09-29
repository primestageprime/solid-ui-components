// ============================================
// RuleForm — the fields of one start or stop rule, by kind. COMPOSED from SUI,
// no CSS of its own: ChoiceDropdown / NumField / MoneyField in a BaselineWrapRow,
// SegmentedControl for business-or-calendar days, TextSublabel under it.
//
//   date      Month · Day
//   nth       Which · Weekday · of · Month
//   after     Count · Business days | Calendar days · after it starts
//   cash      "When the projected cash balance reaches" · Amount
//   accum     "After we've paid / earn" · Amount · in this season
//   supplies  Stock · Units · used at · Per day
// ============================================
import { type Component, Match, Show, Switch } from "solid-js";
import {
  BaselineWrapRow,
  TextSublabel,
  SegmentedControl,
  TextBody,
  TightStack,
  fn,
} from "../../../../src";
import {
  type AccumRule,
  type AfterRule,
  type CashRule,
  type Ctx,
  type DateWhen,
  MONTHS_FULL,
  NTHS,
  type Nth,
  type NthWhen,
  type Rule,
  type Season,
  type Side,
  type SuppliesRule,
  WEEKDAYS_FULL,
  YEAR,
  compactMoney,
  daysInMonth,
  ordinalCap,
  setRuleField,
} from "../seasonal-builder-model";
import { ChoiceDropdown, MoneyField, NumField } from "./fields";

const { map } = fn;

const MONTH_CHOICES = map(
  (m: string, i: number) => ({ value: i + 1, label: m }),
  MONTHS_FULL,
);
const NTH_CHOICES = map((n: Nth) => ({ value: n, label: ordinalCap(n) }), NTHS);
const WEEKDAY_CHOICES = map(
  (d: string, i: number) => ({ value: i, label: d }),
  WEEKDAYS_FULL,
);
const UNIT_CHOICES = map(
  (u: string) => ({ value: u, label: u }),
  ["kits", "units", "tons", "bags"],
);
const COUNTS = [
  { value: "business", label: "Business days" },
  { value: "calendar", label: "Calendar days" },
];

export const RuleForm: Component<{
  /** Unique per form on the page. */
  readonly id: string;
  readonly side: Side;
  readonly season: Season;
  readonly ctx: Ctx;
  /** Cash on the first day, for the cash hint. */
  readonly cashNow: number;
  readonly onChange: (rule: Rule) => void;
}> = (props) => {
  const rule = (): Rule => props.season[props.side];
  const set = (field: string) => (value: number | string) =>
    props.onChange(setRuleField(rule(), field, value));
  const as = <R extends Rule>(kind: R["kind"]): R | undefined =>
    rule().kind === kind ? (rule() as R) : undefined;
  const name = (f: string) => `${props.id}-${f}`;
  return (
    <TightStack>
      <BaselineWrapRow>
        <Show when={as<DateWhen>("date")}>
          {(r) => (
            <>
              <ChoiceDropdown
                label="Month"
                items={MONTH_CHOICES}
                value={r().month}
                onChange={set("month")}
              />
              <NumField
                label="Day"
                name={name("day")}
                value={r().day}
                min={1}
                max={daysInMonth(YEAR, r().month)}
                onChange={set("day")}
              />
            </>
          )}
        </Show>
        <Show when={as<NthWhen>("nth")}>
          {(r) => (
            <>
              <ChoiceDropdown
                label="Which"
                items={NTH_CHOICES}
                value={r().n}
                onChange={set("n")}
              />
              <ChoiceDropdown
                label="Weekday"
                items={WEEKDAY_CHOICES}
                value={r().weekday}
                onChange={set("weekday")}
              />
              <TextBody>of</TextBody>
              <ChoiceDropdown
                label="Month"
                items={MONTH_CHOICES}
                value={r().month}
                onChange={set("month")}
              />
            </>
          )}
        </Show>
        <Show when={as<AfterRule>("after")}>
          {(r) => (
            <>
              <NumField
                label="Count"
                name={name("n")}
                value={r().n}
                min={1}
                onChange={set("n")}
              />
              <SegmentedControl
                aria-label="Count business days or calendar days"
                options={COUNTS}
                value={r().count}
                onValueChange={set("count")}
              />
              <TextBody>after it starts</TextBody>
            </>
          )}
        </Show>
        <Show when={as<CashRule>("cash")}>
          {(r) => (
            <>
              <TextBody>When the projected cash balance reaches</TextBody>
              <MoneyField
                label="Amount"
                name={name("amount")}
                value={r().amount}
                min={0}
                step={1000}
                onChange={set("amount")}
              />
            </>
          )}
        </Show>
        <Show when={as<AccumRule>("accum")}>
          {(r) => (
            <>
              <TextBody>{props.ctx.accum.label}</TextBody>
              <MoneyField
                label="Amount"
                name={name("amount")}
                value={r().amount}
                min={0}
                step={500}
                onChange={set("amount")}
              />
              <TextBody>in this season</TextBody>
            </>
          )}
        </Show>
        <Show when={as<SuppliesRule>("supplies")}>
          {(r) => (
            <>
              <NumField
                label="Stock"
                name={name("stock")}
                value={r().stock}
                min={0}
                step={10}
                onChange={set("stock")}
              />
              <ChoiceDropdown
                label="Units"
                items={UNIT_CHOICES}
                value={r().unit}
                onChange={set("unit")}
              />
              <TextBody>used at</TextBody>
              <NumField
                label="Per day"
                name={name("perDay")}
                value={r().perDay}
                min={1}
                onChange={set("perDay")}
              />
            </>
          )}
        </Show>
      </BaselineWrapRow>
      <TextSublabel>
        <Switch>
          <Match when={rule().kind === "date"}>
            The same day every year, whatever weekday it falls on.
          </Match>
          <Match when={rule().kind === "nth"}>
            Moves with the calendar, like US Thanksgiving (4th Thursday of
            November) or Memorial Day (last Monday of May).
          </Match>
          <Match when={as<AfterRule>("after")}>
            {(r) =>
              r().count === "business"
                ? "Skips weekends and the holidays in the work calendar."
                : "Counts every day, the start day included."
            }
          </Match>
          <Match when={rule().kind === "cash"}>
            {`Projected: the fold starts the season on the first day its running cash is at or above this. Today's projection starts at ${compactMoney(props.cashNow)} on Jan 1.`}
          </Match>
          <Match when={rule().kind === "accum"}>
            {`Projected: the season's own running total. At today's level that's ${compactMoney(props.ctx.perDay(props.season))} a day.`}
          </Match>
          <Match when={rule().kind === "supplies"}>
            Projected: stops the day the stock runs out. The stock refills each
            year when the season starts.
          </Match>
        </Switch>
      </TextSublabel>
    </TightStack>
  );
};
