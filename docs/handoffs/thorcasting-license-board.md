# Handoff — the License board in thorcasting-ui

Status: **ready to build.** Written 2026-09-21, for Adlai.
Source: the SUI **License Board** bench, `dev/showcases/workshop/license-board.tsx`
(run `npm run dev` in `solid-ui-components`, port 6006 → Workshop → **License
Board**, nav id `workshop:license-board`, direct URL `#/workshop:license-board`).
Target: a new scenario builder in `thorcasting-ui`, `/builder/licenses`.

**Pin `@primestageprime/solid-ui-components@^0.176.0`.** Everything the screen
needs is released — `MutationToolbar`, `StackedTimelineChart` and
`createHighWaterMark` in 0.174.0, the chip × in 0.175.0,
`GroupedMutationSliders` in 0.176.0. `thorcasting-ui/package.json:24` is on
`^0.175.0` today, so the bump is one minor. No source-mode link, no `/ship`.
No screenshot exists; the bench is the reference and it runs in one command.

---

## 1. What to build

A **cash forecast for a business that sells licences**, read four ways at once.
Each product sells the same licence monthly and annually, and the board asks what
the bank balance does over the next 24 months if the counts and prices move the
way you are dragging them. It is the revenue-lumpy sibling of `/builder/hourly`:
same frame, same four regions, but the cash arrives in **spikes** rather than
ramps, because an annual licence pays its whole year in one month and then
nothing for eleven. The bench builds no new component and adds no CSS — it is
arrangement and wiring over the published catalog.

| Region | Question it answers |
|---|---|
| **Cash Flow** (top) | Where does the balance go if this plan holds? |
| **License Mix** (second) | Where is the cash coming from, month by month, by product × billing variant? |
| **Changes** (bottom left) | What are each product's six dials at the change being edited? |
| **Cash, on average** (bottom right) | Averaged over the span, is the business over breakeven, and by how much more or less than the committed plan? |

## 2. The SUI components, region by region

Everything imports from `@primestageprime/solid-ui-components`. **No custom CSS,
no new components**, and no stylesheet import from the screen — theme imports
stay centralised in `thorcasting-ui/src/app.tsx:27-31`, which the
`themeImportsAreCentral` test enforces. `createGroupedMutationSliders` ships as a
**factory only, with no curried variant** (`COMPONENTS.md:800`): `axes.length`
*is* each entity's measure count, so a curried name would dictate every
consumer's data shape. Currying it once at module level satisfies "clients
import only curried components".

**Frame** (every piece predates 0.170.0): `ViewportColumn` → `SpreadRow`
(`SectionTitle` + `PrimaryButton` Save) → `HalfFillColumn` holding two
`HalfFillColumn`s, one card each → `HalfFillColumn` holding a `FillWrapRow` of
`MajorPaneBox` (Changes) and `GrowFillBox` (gauge). Every card is a
`FillCardSurface`; headers are `SpreadRow` + `TextTitle`. **One Save for the
whole board**, beside the board's own name, enabled by a digest comparison —
not in the Changes card's corner.

| Region | Component | Props | First version |
|---|---|---|---|
| Both chart headers | `SpreadRow` + `TextTitle` + `IconOnlyButton` › `Icon name="shrink"` | `onClick={ceiling.reset}` / `{mixCeiling.reset}`, `aria-label="Fit y-axis to current values"` | `shrink` glyph **0.174.0** |
| Cash Flow chart | `CashflowScrubChart` | `cells`, `yMax={ceiling.ceiling()}`, `scrub={false}`, `chartHeight="fill"`, `showGridlines`, `lineLabel`, `balanceSeries` (the two fan edges) | **0.47.0** |
| Cash Flow ceiling | `createHighWaterMark` | one accessor returning the peak **including the fan** — `cell.balanceCents + abs(fanAt(i, nowIndex))`; hand `ceiling()` to `yMax`, `reset` to the button | **0.174.0** |
| License Mix chart | `createStackedTimelineChart({ margin, yTickFormat, xTickFormat })` | `series` (one band per **source** = product × billing), `xDomain`, `yDomain={[0, mixCeiling.ceiling()]}`, `xTickValues`, `events`, `hoverLabel`, `onPick` | **0.174.0** |
| License Mix ceiling | `createHighWaterMark` | peak monthly cash **× 1.15 headroom**, so a spike is never flush against the plot top | **0.174.0** |
| Changes header | `createMutationToolbar({})` | `title`, `changes` (`{ id, label }[]`), `selected`, `onSelect`, `emptyNote`, `onReset`, **`onRemove`** | **0.174.0**; `onRemove` **0.175.0** |
| Dials | `createGroupedMutationSliders({ axes, labels })` — each dial is a `MarkedSlider` internally | `entities`, `summary`, `selected`, `onSelectionChange`, `onChange(id, measure, value)`, `onRemove`, `onRestore`, `onAdd` | **0.176.0** |
| Gauge | `createRateGauge({ baselineLabel, formatAgainst, formatDelta })` in a `GrowCenterColumn` | `domain`, `baseline`, `caution`, `value`, `label` | prop vocabulary (`formatAgainst`/`formatDelta`/`caution`) **0.171.0** |
| Add-product modal | `Modal` + `NarrowStack` of `ThemedInput` (name) + six `ThemedNumberInput`s; footer `EndWrapRow` of `GhostButton` Cancel + `PrimaryButton` Launch | `open`, `onClose`, `title`, `subtitle`, `footer` | `Modal` predates 0.170.0; inputs **0.7.0** |

**Two independent high-water marks, never one shared** — the charts measure a
running balance in cents against dollars of cash a month, and one shared ceiling
makes whichever chart did not set it unreadable. **The Changes toolbar takes only
`onReset` + `onRemove`**: no `onAdd` (the slider row owns the `+`), no `onSave`
(the board saves globally), no `onDelete` (deprecated in 0.175.0 — the × on a
chip names its own victim). **The six axes' labels are one character each**,
because six long labels cost each column the width that makes a dial aimable;
the caption disambiguates the repeated `#` and `$`, in the drawing and in every
dial's accessible name (`Amygdala yr $`). `Δ` is the only track crossing zero,
because its sign *is* the reading; the `%` track runs the whole 0–100 — see §4.

## 3. The model, as rules

Executable spec: `dev/showcases/workshop/license-board-model.ts` and
`license-board-model.test.ts`. Port them into `src/lib/licenseBoard/`, converting
to integer cents on the way in.

1. **Cash lands in the month it is PAID.** A forecast, not accounting — no
   revenue recognition, no deferral, no accrual. An annual licence sold in
   month 0 puts its whole year in month 0.
2. **A product is a segment or a ray** with a `start` and optionally an `end`;
   outside `[start, end)` it bills nothing. Inside, a **change** at month M
   re-declares all six figures and holds until the next change.
3. **Monthly variant**: `count(m) = max(0, # + Δ·m)`, `m` being months since the
   change took effect, and the month's cash is `count(m) × fee`. Clamped at zero
   — a dying base stops at nothing, not below it.
4. **Annual variant is COHORTS.** Each cohort pays in the month it was born and
   every twelve months after; its size at the `k`-th anniversary is
   `max(0, size + churn·k)` when churn is negative, and its full size otherwise.
   **Peter's worked example is the spec** (2026-09-18): ten licences at Δ −1 pay
   `10 × fee` in month 0 and `9 × fee` at month 12. The shrink applies **once
   per year, at renewal — not once per month.**
5. **A positive annual Δ opens NEW cohorts** rather than growing an old one: a
   new sale is a new anniversary, and paying it on an older cohort's date would
   move its cash by up to eleven months.
6. **The annual price is derived, never stored**:
   `annualFee = monthlyFee × 12 × pct / 100`. **The monthly `$` dial therefore
   prices both variants** — raise it and every annual renewal rises with it,
   with no second dial to keep in step. A renewal pays the fee in force *at the
   renewal*, so a fee raised at month 6 is what the month-12 renewal costs.
7. **Six dials per product, in two captioned groups** — `mo` `# Δ $`, `yr`
   `# Δ %`. The order is the model's `FIELDS` tuple and the measure index
   translates back through that same tuple, so dials and writes cannot drift.
8. **The span starts at the month-start of today and runs 24 months** — the
   month is the smallest unit a monthly-billing board can open on, and two years
   is what makes a renewal visible. **The model takes `start` as a parameter and
   calls no `new Date()`**: the bench reads the clock once at module load
   (`monthStartOf(Date.now())`) and threads the number in, which is what lets
   the tests pin deterministic numbers. Keep this — it is why the port is
   testable.
9. **The mix chart has no breakeven rule.** A horizontal line across a stack
   whose top edge jumps from $2.9k to $16.1k in one month is a line the reader
   ignores eleven months in twelve. Breakeven reads on the gauge, where zero
   *is* breakeven, and in the Cash Flow line, which is already net of it.

**The functions worth porting as-is**, renamed into thorcasting's vocabulary:
`annualFeeOf` (rule 6 — the one place `× 12 × pct` lives), `countAfter` and
`monthlyCashByMonth` (rule 3), `cohortsOf` / `cohortSizeAt` /
`annualCashByMonth` (rules 4 and 5), `cashSources` / `cashByMonth` /
`netCashByMonth` (one band per source, the total, the total less fixed cost),
`balancesByMonth` + `fanAt` + `averageNetCash` (the balance, the fan, the
gauge's average), and `licenseMixSeries` + `mixOrder` + `variabilityOf` (the
bands, most variable on top). The supporting layer — `segmentsOf` /
`segmentAt` / `planAtMonth`, `entitiesFor` / `planBefore` / `planFrom`,
`monthOfPick` / `monthRangeOf` / `quarterTicks`, `withChange` /
`withDiscontinue` / `withoutChange`, and the `rateBandTable` / `cashTable` /
`annualPayments` observation — ports with them.

**The bench does not use board-kit's config/lens/view path** — no `BoardConfig`,
no `BoardView`, no `lens.ts`. It *does* reuse the kit's mutation calendar
(`license-board-model.ts:185-194`) and money abbreviator
(`license-board-money.ts:19`). **So there are two paths:** the Hourly board's
`BoardConfig` route, which gets the shared arithmetic free but must express a
cohort model through `contributionAt` (`board-kit/README.md:90-115`), or the
License board's direct composition, which is more lines but states the cohort
arithmetic in its own vocabulary — take the direct composition, since the cash
model is the part of this board that is *not* generic.

## 4. Mapping onto thorcasting's data

**Copy the products/billing precedent**, not the payroll one. A product is
already two config rows sharing one `slot:` tag
(`src/lib/productRoster.ts:1-18`), and `/builder/billing` already draws a
monthly column beside an annual one for one offering
(`src/routes/builder/billing.tsx:6-25`).

| Model concept | thorcasting record |
|---|---|
| A product | A `Product` — the `slot:<value>` tag pair of configs, `src/lib/productRoster.ts:32-46` |
| Its two billing variants | Two products sharing one `offering:` tag, paired by `cadencePair(group)`, `src/lib/offeringGroup.ts:237` |
| Monthly vs annual | The config's schedule `predicateId`: **`isDayOfMonth`** (12 fires/yr) and **`isAnnualOn`** (1 fire/yr), `src/lib/offeringGroup.ts:132-140` |
| `count` (a variant's licences) | `ProductFigures.startingPopulation` → the config's `populationSeed` (`src/lib/subscriptionProduct.ts:180`) → the engine's persistent `Volume:{product}` register (`thorcasting-engine/src/rules/subscription.rs:21-24`) |
| `fee` (monthly price) | `ProductFigures.revenuePerCustomerCents` → `priceSeedCents` (`subscriptionProduct.ts:182`) → the `Price:{product}` money register (`subscription.rs:46`) |
| `Δ` (net change a month) | **Nothing.** The engine has gross `new_per_period` plus `churn_bp` (`subscription.rs:48-49`), two unsigned figures — see §7 |
| `pct` (annual price as a share of twelve months) | The complement of the suite discount over `annualListCents(monthlyRateCents)` = `monthly × 12` (`src/lib/suiteDiscount.ts:68`). **Mind the direction**: the board's `pct` is the share PAID, thorcasting's `discountPct` is the share FORGONE, and they sum to 100 — so `pct = 100 − discountPct` on the way in, and `annualChargeForDiscountPct(rate, 100 − pct)` on the way out |
| `start` / `end` | The config's `window`, plus the cadence's `predicateArgs` reference date (`src/lib/productCadence.ts:80-100`) |
| Fixed monthly cost (breakeven) | Read from the fold, as the payroll gauge reads its rate — not a constant |
| The engine rule | `SubscriptionRevenue`, `thorcasting-engine/src/rules/subscription.rs:40-54` |

**⚠ The percentage ranges do not line up.** `suiteDiscount.ts:46` caps the
discount slider at `DISCOUNT_MAX_PCT = 50` — "a discount over half is not a
cadence discount, it is a different price, and it is authored at Configure." The
board's `%` track runs the whole 0–100 on purpose, because JTF's annual licence
really costs 20% of twelve monthly fees, which is an **80% discount** and so
outside what the suite card can author. Either the board's `%` writes past the
slider's cap, or JTF's annual price stays a Configure-authored figure the board
reads and does not move. Settle this with Peter before wiring the `%` dial.

**The load-bearing convention** — `src/lib/scenarioBoard/types.ts:9-24`: money is
integer cents everywhere **including the props**, and **each adapter returns the
COMPLETE props object** (`domain`, `yMax`, `caution` and all), never a partial
the route completes. A route that supplied the bench's *dollar* constants beside
a *cents* value would pin every needle at a domain edge silently, and no adapter
unit test in isolation would catch it. Owning the unit inside the adapter leaves
the route nothing unit-bearing to get wrong.

## 5. Assumptions

| # | Assumption | Status |
|---|---|---|
| 1 | The License Mix shares the Cash Flow's high-water-mark treatment, with the shrink icon | *Ruled by Peter, 2026-09-18* — "the license mix should use the same y-axis as the cashflow. With the shrink icon" |
| 2 | Changes stays exactly **one** row of product cards, paging with ‹ › by a whole card rather than wrapping | *Ruled by Peter, 2026-09-18* — "I'd like the changes to still be one row" |
| 3 | A negative annual Δ bites at **renewal**, not monthly | *Ruled by Peter, 2026-09-18* — ten licences at Δ −1 show "10 × fee for the first month and 9 × fee for the 12th month" |
| 4 | The span starts at the month-start of today, 24 months | *Ruled by Peter, 2026-09-18* — "start the cashflow timeline today" |
| 5 | One Save for the whole board, beside its title | *Ruled by Peter, 2026-09-18* — "the save will be global" |
| 6 | Every money figure is **$/mo** — licences bill monthly, so no week anywhere in the words | *Ruled by Peter, 2026-09-18* |
| 7 | The products are **Amygdala** (13 monthly @ $900, no annual base yet) and **JTF** (1 monthly @ $5,000, 1 annual at 20% of twelve monthly fees = $12,000/yr) | *Ruled by Peter, 2026-09-18* — his opening figures, and the bench fixture |
| 8 | Raising the annual `#` at month M charges the **whole** new base at M, not the increment | *Assumed here*, and **flagged by the model's author rather than decided**: diffing against the live base and opening a cohort for the increment alone is more nearly right, but makes the `#` dial harder to read off a slider. Confirm with Peter |
| 9 | The screen lives at `/builder/licenses` | *Assumed here* — sibling of `/builder/hourly` |
| 10 | Breakeven, the committed baseline and the gauge domain come from the fold, not constants | *Assumed here* — the bench's `FIXED_MONTHLY_COST` ($11,000) and `COMFORTABLE` ($4,000) are fixture calibration solved against two named moves, not product numbers |
| 11 | The per-dial allowance (the shaded box) is the product's own `ranges`, and the fan widens over the horizon from the pivot | *Assumed here* — both hand-picked in the bench; thorcasting has no product taxonomy to supply either |

## 6. What stays in thorcasting

- **A `src/lib/licenseBoard/` folder**, mirroring `src/lib/hourlyBoard/`:
  `types`, `cohorts`, `cash`, `sources`, `dials`, `gauge`, `edits`, `format`,
  `fromConfigs`, `observe`, `index`. Pure — no Solid, no SUI runtime, no STDB.
- **The formatters**: `$/mo` amounts, the licence-count and fee dial text, the
  signed Δ readout, the gauge's two sentences. `license-board-money.ts` is the
  reference; note the Δ **readout** is signed (`+2`, `−1`) while the Δ **change
  label** must not be, or it prints `++1`.
- **The curries**, one module-level call each: the six-axis
  `createGroupedMutationSliders`, the gauge's words, the mix chart's margin and
  tick text, the toolbar's labels (the defaults already fit).
- **The adapters**: configs ↔ products ↔ model, and model → each component's
  complete props object.
- **`observe.ts`** — the bench's `printTables`, printing the cards, the 24-month
  forecast, the annual payments and the calibration table from a terminal.
- **The stores**: an events store and an overlay store, copied from the payroll
  simulator's. Nothing reaches the server until Save (ADR 0015); Reset drops the
  overlay, which makes it safe on the baseline.
- **The builder registry entry** in `src/components/builder/scenarioBuilders.ts`.

## 7. Known gaps — leave the TODO, do not hand-roll

Ranked by how much work each is. **The time axis is the bulk of it** — the other
four are hours each once it exists.

1. **No time axis on a product.** `ProductFigures`
   (`src/lib/productDraft.ts:52-57`) is one flat figure set per product: no
   change events, no segments, no start or end. The whole board *is* a time
   axis, so this is the work. The Hourly board is the precedent — a level
   becomes one `fixed_txn` segment with a `start` and an `until`, and a change
   is a segment boundary where a figure differs.
2. **No cohort concept for subscriptions.** `SubscriptionRevenue` holds one
   scalar population in `Volume:{product}` and bills the population the period
   opened with (`subscription.rs:1-11`); it cannot remember that forty licences
   renew in March and ten in September. The engine's only cohort-shaped effect
   is the unused punch-card/package one.
3. **No signed net delta.** The engine has gross `new_per_period` plus
   `churn_bp` (`subscription.rs:48-49`), so a "net +2/mo" dial has nothing to
   write to. Either derive the pair from the signed Δ on write, or add a signed
   field — an engine change, so ADR 0024's sign-off applies.
4. **No monthly/annual flag**; it is inferred from the schedule `predicateId`
   plus a shared `offering:` tag. See §4's percentage-range warning — the annual
   *price* has a second representation with a narrower range than the `%` dial.
5. **No licence or seat vocabulary** — it is customer / population / volume
   throughout the UI and the engine. A rename is cosmetic but wide; keeping
   "customer" in the data and saying "licence" only in the board's own words is
   the cheaper answer.

**Correction to the sibling handoff.** `docs/handoffs/thorcasting-hourly-builder.md`
lines 161 and 166-167 still teach `MutationToolbar`'s `onDelete` and `onSave`.
`onDelete` was **deprecated in 0.175.0** in favour of `onRemove` (a Delete
button in the corner names no victim), and Save has moved out of the toolbar to
sit beside the board's own title on both boards. Prefer this document's prop set.

## 8. Definition of done

- [ ] `@primestageprime/solid-ui-components` bumped to `^0.176.0` and installed.
- [ ] `src/lib/licenseBoard/` is pure and tested, with the cohort rules (§3.4–5)
      pinned against a **fixed** `start` — Peter's 10 → 9 example is a test.
- [ ] `observe.ts` prints the cards, the forecast, the annual payments and the
      calibration table from a terminal, with no browser.
- [ ] Every adapter returns a **complete** props object in **cents**.
- [ ] `/builder/licenses` renders all four regions plus the Launch-a-product
      modal, with no new CSS and no stylesheet import outside `app.tsx`.
- [ ] Two independent high-water marks; the Cash Flow one includes the fan.
- [ ] Changes is one paging row; the toolbar passes `onReset` + `onRemove` only.
- [ ] Save is one board-level button, disabled until dirty; nothing reaches the
      server before it.
- [ ] Assumptions 8 and 9, and the §4 percentage conflict, confirmed with Peter.
- [ ] The five gaps above are TODOs in the code, not hand-rolled workarounds.
