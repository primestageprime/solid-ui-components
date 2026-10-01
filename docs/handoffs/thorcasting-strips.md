# Handoff — build thorcasting's simple forms from SUI Strips

Written 2026-10-01 (SUI session). Target: `thorcasting-ui` on **main** (read it
through the `thorcasting-ui-main-ref` worktree; the `thorcasting-ui` checkout
is a stale `local/preview` branch). Do not edit this repo's bench to change
thorcasting; this file is the brief an agent in thorcasting works from.

Look at it: `npm run dev` in this repo, then `workshop:projection-forms`
(gallery of 14 forms built from the strips, a strip catalog, and the
exceptions list). The strips themselves are in `src/components/Strips/`, with
a showcase named **Strips**.

---

## 1. What to build

Replace the hand-placed field stacks in thorcasting's simple projection forms
(Configure's `CurriedFormFields`, Import's `RevenueCard`, the add-dialogs) with
four published SUI **strips**, each a Depth-2 composite that edits an
**engine-neutral value** and enforces its own rules. thorcasting keeps one
**adapter** that maps strip values to its stored line. A form is a stack of
strips: label, amount, cadence, window. Money in or out (revenue | expense) is a
choice above the strips, not a strip.

## 2. The strips (first exported in SUI 0.207.0)

| Strip | Edits | Curried variants |
|---|---|---|
| `LabelStrip` | `string` | `LabelStrip` |
| `AmountStrip` | `AmountValue` | `AmountStrip` (to $999,999, dollars), `SmallAmountStrip` (to $9,999, cents), `LargeAmountStrip` (to $1B, thousands), `SeatsAmountStrip`, `HoursAmountStrip` |
| `CadenceStrip` | `CadenceValue` | `CadenceStrip` (all 8), `RecurringCadenceStrip`, `MonthlyOrAnnualCadenceStrip`, `PayCadenceStrip`; `createCadenceStrip({ allowed })` for any other set |
| `WindowStrip` | `WindowValue` | `WindowStrip`, `StartWindowStrip`, `EndWindowStrip` |

The values (all in `src/components/Strips/values.ts`; money is integer cents,
dates are ISO strings):

```ts
AmountValue =
  | { kind: "single"; cents; per: "payment" | "year" }
  | { kind: "range"; min; typical; max }
  | { kind: "units"; units; unitPrice; perPeriod }
CadenceValue =
  | { shape: "annual"; anchor: { month; day } }
  | { shape: "quarterly" | "biweekly" | "once"; anchor: IsoDate }
  | { shape: "monthly"; anchor: number | "last" }
  | { shape: "weekly"; anchor: number }          // 0 = Sunday
  | { shape: "semimonthly" } | { shape: "daily" }
WindowValue = { start?: IsoDate; until?: IsoDate }   // an absent side is open
```

## 3. The rules live in the strips. Do not re-implement them.

Pure, exported, unit-tested (`values.test.ts`, which prints tables):

- `setAmountRangeField`: a range keeps `min ≤ typical ≤ max`; the edited field pushes the others.
- `setWindowStart` / `setWindowUntil`: start never passes end; an empty side is open.
- `perPaymentCents(annualCents, periods)` and `PERIODS_PER_YEAR`: a per-year amount's payment, half-even (26 / 24 / 12 / ...). `paymentCents` applies it to a single value.
- `normalizeCadence`: the day grid is 1..28, months 1..12, weekdays 0..6; `"last"` exists only for monthly.
- `offeredShapes(allowed)`: how a kind narrows the cadence.
- `anchorText`, `cadenceOfShape` (keeps a date anchor between date shapes).

ADR 0029's rule applies: a hand copy of engine logic in the UI is a bug. The
strips carry **UI** rules (ordering, valid anchors, display); the engine keeps
money rules (the lowering, fires per year, rounding in the fold). Where the
strip derives a per-payment figure it is for DISPLAY; thorcasting writes the
stated figure (`amount.annual`) and lets the engine lower it.

## 4. Which thorcasting forms are which strips

From `thorcasting-ui` main, `src/lib/configFormShapes/*.ts` (`CURRIED_FORMS`)
and `components/screens/import/RevenueCard.tsx`. Recipe = Amount + Cadence + Window.

| Form (spec id) | Strips | Notes |
|---|---|---|
| Monthly fixed (`monthly-fixed`) | Label, Single, Monthly, — | |
| Monthly variable (`monthly-variable`) | Label, Range, Monthly, — | Range replaces the min / typical / max trio and its ordering rule |
| Weekly fixed (`weekly-fixed`) | Label, Single, Weekly, — | |
| Weekly variable (`weekly-variable`) | Label, Range, Weekly, — | |
| Daily fixed (`daily-fixed`) | Label, Single, Daily, — | |
| One-time (`one-time`) | Label, Single, Once, — | |
| Quarterly (reference date) (`quarterly-reference`) | Label, Single, Quarterly, — | |
| Annual (`annual-fixed`) | Label, Single, Annual, — | strip offers day 1..28; the form's "29 = last of Feb" is not offered |
| Terminal recurring (`terminal-recurring`) | Label, Single, Monthly, End | adapter also writes `optimistic_beyond_end` (the form's givens) |
| Deferred recurring (`deferred-recurring`) | Label, Single, Monthly, Start | |
| Bi-weekly salary (anchored) (`biweekly-anchored`), Bi-weekly (reference date) (`biweekly-reference`) | Label, Single per year, `PayCadenceStrip`, — | the strip's anchor is a reference payday; do not port `anchoredPhase` / `biweeklyPhaseFrom` (an engine rule, ADR 0029 §2) |
| Retainer | Label, Single, Monthly, — | NOT a type today: a preset of Monthly fixed in the Support category |
| License (kind `license`) | Label (product), Units x price (`SeatsAmountStrip`), `MonthlyOrAnnualCadenceStrip`, Start | annual discount, cost to serve and customer are smaller fields |
| Hourly service (kind `hourly_service`) | Label (service), Units x price (`HoursAmountStrip`), a recurring cadence set, Start | rate x hours; `units_x100` = hours x 100 |
| Salary (kind `salary`) | Label, Single per year, `PayCadenceStrip`, — | semi-monthly needs the engine branch (see §8) |

Covered by **no** strip yet: see §7.

## 5. The adapter (thorcasting writes this)

SUI never emits engine JSON. The adapter is the one place the strip values meet
engine keys. The bench has a working copy: `dev/showcases/workshop/projection-forms.adapter.ts`
(key names verified against `thorcasting-engine/model/src/config/`:
`schedule.rs`, `amount.rs`, `fixed_txn.rs`, `line/{license,hourly_service,salary}.rs`,
`line/kindTypes.generated.ts`).

**Schedule** (from `CadenceValue`; shape names are the engine's):

| shape | engine `schedule` |
|---|---|
| annual | `{recurring:{shape:"annual_on",month,day}}` |
| quarterly | `{recurring:{shape:"quarterly_from",referenceDate}}` |
| monthly | `{recurring:{shape:"day_of_month",day}}` (`day` may be `"last"`) |
| semimonthly | `{recurring:{shape:"semi_monthly"}}` (engine branch, §8) |
| biweekly | `{recurring:{shape:"biweekly_from",referenceDate}}` |
| weekly | `{recurring:{shape:"day_of_week",dow}}` |
| daily | `{recurring:{shape:"daily"}}` |
| once | `{once:{date}}` |

**Window**: `start` / `until` at the top level of the line (the key is omitted when the side is open).

**Amount**: single per payment `amount_cents`; single per year `amount:{annual:{cents}}`; range `amount_cents` (typical) plus `band:{min_cents,max_cents}`; units for a license `seed_seats` (= units), `net_per_period`, `price_cents`; units for an hourly service `rate_cents` (= unitPrice), `units_x100` (= units x 100).

**Stored line per kind** (`kindTypes.generated.ts`):

| Kind | Fields from strips | Fields thorcasting supplies |
|---|---|---|
| `license` | `product` ← label; `schedule` (monthly or annual only); `start` (**required**: refuse a License with no Start); `until`; `seed_seats`, `net_per_period`, `price_cents` | `customer` (`counterparty:`), `paid_to` (`account:`); optional `annual_discount_bp` (annual only), `cost` |
| `hourly_service` | `service` ← label; `schedule` (recurring only); `rate_cents`, `units_x100`; `start`, `until` | `customer`, `paid_to` |
| `salary` | `label`; `schedule` (recurring only); `amount` (per year → `{annual:{cents}}`, or `amount_cents` per payment); `start`, `until` | `person` (`person:per-<32 hex>` from the tree), `paid_from` |
| plain (`fixed_txn`) | `params.schedule`; `params.leg.label`; the amount keys on `params.leg`; `start`, `until` on `params` | `params.leg.from` / `to` (the Direction split picks which side is the account) |

**The computed `{effect, params}` view must come from the engine's wasm
`lower`, not a TypeScript copy** (ADR 0029 §2; `thorcasting-ui/CLAUDE.md`). The
bench prints the stored line and the plain config; it does not re-implement
`lower`. Use `parse_line` / `lower` from `~/lib/engineWasm`.

Counterparties, accounts and people are NOT strips: thorcasting's models know
them (cash account, payee, person tree); the bench uses placeholder labels.

## 6. Where smaller fields are still fine

Use a plain SUI field where a strip would not fit; prefer the strip wherever it can:

- Name pickers: customer, payee, person, account (`NameInput` / pickers).
- Tags and role: the payroll `role:architect` segmented control (`RoleField`), the contract phase band, offering and slot tags.
- The Direction split, the Category chips and the Type chooser; the interpretation cards.
- License extras: annual discount percent, cost to serve per seat and its host.
- Anything with its own client logic the strips do not own.

## 7. Exceptions and pending work

Forms the four strips do **not** cover (the bench's gallery lists them, with the same reasons):

- **Payroll tax** (`payroll-tax`, `payroll-tax-single`): a percentage of a salary register. Decided: a read-only strip, not built.
- **Punch-card package** (`punch-card-package`): a cohort of buyers; the engine rule runs once and is **silently dropped when recurring**. Needs a once-only guard.
- **Spend up to** (`spend-up-to`): a budget cap, once only; **silently dropped when recurring**.
- **Afford when** (`afford-when`), **Runway ladder** (`runway-ladder`): the date comes from a balance gate; the ladder's money lives inside the schedule.
- **Product sale** growth models and **Subscription** population (new / churn): companion rows and population registers, not a price times a count. Decided: a **Growth strip**, not built.
- **Contract payment (net terms)** (`contract-net-terms`): `netDays` + `settleDays` shift the cash date (`shift_days`); not a cadence anchor.
- **Salary change** (set / add / scale, `salary-set|modify|scale`): edits a register at a date.
- **Conditional / priority forms** (the gated set): a condition or a priority decides whether a line fires.
- **Hourly employee**: no kind routes it to a builder; the `exp-hourly` bucket exists and nothing reads it. A decided but **unbuilt hourly-wage kind** would give it one.

## 8. Assumptions

- *Ruled by Peter, 2026-10-01:* four strips (label, amount, cadence, window); Amount has Single (per payment | per year), Range, Units x price; the eight cadences with compact value + popover anchors; money in or out is the Direction split; counterparties are dropped from minimal and scenario forms; rules live in the strip; strips do not emit engine JSON; Growth is decided and unbuilt.
- *Ruled by Peter:* a `Scenario` view renders Amount as the builder's vertical dials (GroupedMutationSliders / PairedMutationSliders / CompactCurrencyMutationSliders) with cadence and window as read-only labels. The strips do not draw dials; the bench does.
- *Assumed here:* semi-monthly. The engine has it on branch `feat/semi-monthly-schedule` (`Cadence::SemiMonthly`, legacy id `isSemiMonthly`), **not on main**. The strip offers it; the adapter must not emit it until the engine has merged and thorcasting's engine dependency carries it.
- *Assumed here:* `Retainer` is a preset, not a type.
- *Assumed here:* Hourly service allows weekly, bi-weekly, semi-monthly, monthly and daily (recurring only, per `hourly_service.rs`).
- *Assumed here:* the day grid stops at 28 and "last" is monthly only; thorcasting's annual form offered "29 = last of Feb". Confirm that dropping it is acceptable.

## 9. What stays in thorcasting

The adapter; the stores and reducers; the account / payee / person models; tags;
the interpretation ranking (`candidatesForRow`); the Direction, Category and
Type controls; formatting of domain units; the wasm calls.

## 10. Known gaps (leave as TODOs, do not hand-roll)

- Growth strip; hourly-wage kind; read-only payroll-tax strip (all in §7).
- A configurable placeholder on `DatePicker` (it hard-codes `YYYY-MM-DD`; the Window strip works around it with its own "beginning / end of time" popover trigger).
- The Range at $9,999 with cents is 131px a field: three fit one line from about 410px, so on a 390px phone `max` wraps to a second line. Hideable steppers on the number inputs (not built) would fit all three.

## 11. Migration order (suggested)

1. Add the adapter next to `configEffectShim.ts`; unit-test it against the engine's own fixtures (`license_tests.rs`, `hourly_service_tests.rs`, `salary_tests.rs`).
2. Move Import's `RevenueCard` (Hourly | License) onto `SeatsAmountStrip` / `HoursAmountStrip`, the cadence strips and `WindowStrip`; it already has the field vocabulary.
3. Move the plain-form specs one at a time (Monthly fixed first) behind the same adapter, then retire their `FieldSpec`s.
4. Leave the exceptions on the legacy renderer until their strips exist.
