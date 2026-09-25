# Licence cash forecast: cohorts, renewal-time shrink, and the board outranks the configured cap

Retires `docs/handoffs/thorcasting-license-board.md` (written 2026-09-21 for
the SUI **License Board** bench, `dev/showcases/workshop/license-board.tsx`).
Its component table named `FillPaneRailGrid` and friends, now superseded by
`BuilderBoard` (thorcasting-ui PR #24, merged 2026-09-23). Keeping only what
outlives that table: the cash model and Peter's rulings on it.

thorcasting-ui shipped the model as `src/lib/licenseBoard/` (the overlay
path, live by default) — its file list matches the handoff's §6 almost
exactly. `cohorts.ts` opens with the same words as rule 4 below,
near-verbatim. thorcasting-ui also shipped a **second, newer path**, its own
**ADR 0027** — a `seat_subscription` lens behind `FLAG_SEAT_SUBSCRIPTION`
(default OFF), landed in PR #26 ("a licence change is a segment in the one
draft tree"). §5 covers where it disagrees. Do not confuse thorcasting ADR
0027 with this document's number — unrelated sequences, different repos.

## 1. The model, as rules

Executable spec on the SUI side:
`dev/showcases/workshop/license-board-model.ts` +
`license-board-model.test.ts`.

1. **Cash lands in the month it is PAID.** A forecast, not accounting — no
   revenue recognition, no deferral, no accrual. An annual licence sold in
   month 0 puts its whole year in month 0.
2. **A product is a segment or a ray**, with a `start` and optionally an
   `end`; outside `[start, end)` it bills nothing. Inside, a **change** at
   month M re-declares all six figures and holds until the next change.
3. **Monthly variant**: `count(m) = max(0, # + Δ·m)`, `m` months since the
   change took effect; the month's cash is `count(m) × fee`. Clamped at
   zero — a dying base stops at nothing, not below it.
4. **Annual variant is COHORTS.** Each cohort pays in the month it was born
   and every twelve months after; its size at the `k`-th anniversary is
   `max(0, size + churn·k)` when churn is negative, and its full size
   otherwise. **Peter's worked example is the spec** (2026-09-18): ten
   licences at Δ −1 pay `10 × fee` in month 0 and `9 × fee` at month 12. The
   shrink applies **once per year, at renewal — not once per month.**
5. **A positive annual Δ opens NEW cohorts** rather than growing an old
   one: a new sale is a new anniversary, and paying it on an older cohort's
   date would move its cash by up to eleven months. *Not a Peter ruling —
   the model author's design choice; see §5's departure below.*
6. **The annual price is derived, never stored**:
   `annualFee = monthlyFee × 12 × pct / 100`. The monthly `$` dial therefore
   prices both variants — raise it and every annual renewal rises with it,
   with no second dial to keep in step. A renewal pays the fee in force *at
   the renewal*, so a fee raised at month 6 is what the month-12 renewal
   costs. *Also a design choice, not a ruling — see §5.*
7. **Six dials per product, in two captioned groups** — `mo` `# Δ $`, `yr`
   `# Δ %`. The order is the model's `FIELDS` tuple, and the measure index
   translates back through that same tuple, so dials and writes cannot
   drift.
8. **The span starts at the month-start of today and runs 24 months.** The
   month is the smallest unit a monthly-billing board can open on, and two
   years is what makes a renewal visible. **The model takes `start` as a
   parameter and calls no `new Date()`** — the caller reads the clock once
   at load and threads the number in, which is what makes the tests
   deterministic. Keep this; it is why the port stayed testable.
9. **The mix chart has no breakeven rule.** A horizontal line across a stack
   whose top edge jumps from $2.9k to $16.1k in one month is a line the
   reader ignores eleven months in twelve. Breakeven reads on the gauge,
   where zero *is* breakeven, and on the Cash Flow line, which is already
   net of it.

## 2. Two independent high-water marks

The Cash Flow and Licence Mix charts each own their y-axis ceiling
(`createHighWaterMark`), never one shared: the charts measure a running
balance in cents against dollars of cash a month, and one shared ceiling
makes whichever chart did not set it unreadable. The Cash Flow ceiling
includes the uncertainty fan; the Mix ceiling adds 15% headroom over the peak
monthly cash.

## 3. Adapters return COMPLETE props, in integer cents

`src/lib/scenarioBoard/types.ts` convention, load-bearing here too: money is
integer cents everywhere including the props, and **each adapter returns the
complete props object** (`domain`, `yMax`, `caution`, all of it) — never a
partial the route completes. A route supplying dollar constants beside a
cents value would pin a needle at a domain edge silently, with no adapter
unit test catching it in isolation.

## 4. Rulings

*Ruled by Peter, 2026-09-18:*

1. The Licence Mix shares the Cash Flow's high-water-mark treatment, with
   the shrink icon — "the license mix should use the same y-axis as the
   cashflow. With the shrink icon."
2. Changes stays exactly one row of product cards, paging with ‹ › by a
   whole card rather than wrapping — "I'd like the changes to still be one
   row."
3. A negative annual Δ bites at renewal, not monthly — ten licences at Δ −1
   show "10 × fee for the first month and 9 × fee for the 12th month"
   (rule 4's worked example).
4. The span starts at the month-start of today, 24 months — "start the
   cashflow timeline today."
5. One Save for the whole board, beside its title — "the save will be
   global."
6. Every money figure is $/mo — no "week" anywhere in the words.
7. Opening fixture products: Amygdala (13 monthly @ $900, no annual base
   yet) and JTF (1 monthly @ $5,000, 1 annual at 20% of twelve monthly
   fees).

*Ruled by Peter, 2026-09-21* (the suite-discount conflict): the board's `%`
track runs the **full 0–100 and writes past `DISCOUNT_MAX_PCT = 50`**. A
forecast exists to price scenarios the configured product does not yet
allow, so the cap must not be able to veto a projection. Two consequences
that follow, stated rather than left to be rediscovered:

- **`DISCOUNT_MAX_PCT` stays where it is.** It still governs the suite card
  authoring a real cadence discount — a different job. Do not raise it to
  100 to make the two agree; the cap is a deliberate ruling about what
  Configure may express.
- **The suite card will be shown values its own slider cannot represent.**
  Once the board has written an 80% discount, whatever renders that slider
  must survive a value above its maximum — clamp the **thumb** for display,
  never the stored figure, and never let a render round-trip write the
  clamped value back.

## 5. Where thorcasting-ui departs from rules 5 and 6

The live overlay path (`licenseBoard/cohorts.ts`) implements rules 4–6 as
written, including the "opens new cohorts" language in its own comments,
nearly verbatim.

The flagged-off `seat_subscription` lens (thorcasting ADR 0027, PR #26)
**does not** implement cohorts at all: `seatsAt` is one closed-form scalar
per segment, `seats(d) = max(0, seed + netPerPeriod × periodsElapsed)`, with
`periodsElapsed` counting the schedule's own billing days. A positive annual
Δ raises the one count in force rather than opening a dated cohort (departs
rule 5), and PR #26's decision 5 derives the annual `%` from
`annual_discount_bp` on the annual line alone, stating explicitly that under
the lens "the monthly `$` dial prices the monthly line alone, where the
overlay's priced both" — the reverse of rule 6. Because the lens has only one
billing day per schedule rather than per-cohort anniversaries, rule 4's
worked example (10 → 9 at month 12) still holds in aggregate; only the
mechanism differs.

This is the model author's own simplification for the lens rewrite, not a
Peter ruling reversing rules 5–6. The two paths coexist; the overlay is what
ships by default today.

## 6. Assumption 8 — still open

*"Does raising the annual `#` at month M charge the whole new base, or only
the increment against the live count?"* Not put to Peter on either side.

- SUI's model and thorcasting's overlay (`licenseBoard/cohorts.ts`) both
  chose **whole new base at M** — the simpler rule for a slider to mean
  "this many, from here." The overlay's own comment marks this explicitly:
  `⚠ ASSUMPTION 8, AND IT IS THE OWNER'S CALL` ... `TODO(owner): rule
  assumption 8 before the board ships.` That TODO is still in the shipped
  file.
- The `seat_subscription` lens's `applyPlanAt` (PR #26) makes the same
  choice for its own `seedSeats` patch — "states the seat count AT `at`,"
  i.e. the whole base, not a diff.
- PR #26's body never names Assumption 8 and does not resolve it as a
  ruling; both implementations independently defaulted to the same answer
  without Peter's sign-off. Confirm before relying on it as settled.

Other items left open rather than ruled:

- **The route.** `/builder/licenses` was assumed as the hourly board's
  sibling, not ruled; it is what shipped.
- **Fold-derived breakeven.** Assumed the fixed monthly cost and comfortable
  margin come from the fold rather than constants; the SUI bench's own
  figures were fixture calibration, not product numbers.

## 7. The Hourly builder handoff (companion, also retired)

`docs/handoffs/thorcasting-hourly-builder.md` is fully landed: `/builder/hourly`
ships, `src/lib/hourlyBoard/` exists with an `observe.ts`,
`scenarioBuilders.ts` registers the "Hourly" tab, and
`payrollSimulatorScreen.tsx` now uses `createMutationToolbar` (its §4 TODO —
"also replaces the hand-built row" — is done). Its Peter-ruled items, for the
record: services are segments or rays with change events and no seasonal
formula; every money figure is `$/wk`; changes land on ISO weeks, clicked on
the Work Mix chart; Work Mix stacks by variability, most variable on top; the
Cash Flow y-axis is a high-water mark with an easing shrink button; hover on
Work Mix shows the week as a day range.

Its own open assumptions (the `service:<slug>` tag prefix, `meta` carrying
`{hours, ratePerHourCents}`, the revenue bucket, fold-derived breakeven, the
per-service dial allowance) were not re-verified here; nothing in
thorcasting-ui's shipped code contradicts them.
