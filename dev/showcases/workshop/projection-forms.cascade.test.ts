// Headless observation for the cascade: path -> the JSON the form emits. Run
// `npx vitest run dev/showcases/workshop/projection-forms.cascade.test.ts`.
import { describe, expect, it } from "vitest";
import {
  type CascadeState,
  NOT_BUILT,
  leafOptions,
  pathOf,
  settle,
} from "./projection-forms.cascade";
import { HOURLY_DEFAULTS, LICENSE_DEFAULTS } from "./projection-forms.fixtures";
import {
  buildLicenseLine,
  hourlyEmission,
  licenseEmission,
  lowerLicense,
} from "./projection-forms.lines";

describe("cascade", () => {
  it("each split decides what the next offers", () => {
    const rows = (["revenue", "expense"] as const).flatMap((side) =>
      (["fixed", "variable"] as const).map((amount) => ({
        path: `${side} > ${amount}`,
        options: leafOptions(side, amount)
          .map((o) => o.id)
          .join(" | ") || "(none)",
      })),
    );
    console.table(rows);
    expect(leafOptions("revenue", "fixed").map((o) => o.id)).toEqual([
      "subscription",
      "license",
      "retainer",
    ]);
    expect(leafOptions("revenue", "variable").map((o) => o.id)).toEqual(["hourly", "banded"]);
    expect(leafOptions("expense", "fixed")).toEqual([]);
  });

  it("settle keeps a valid leaf and replaces an invalid one", () => {
    const kept = settle({ side: "revenue", amount: "fixed", leaf: "license" });
    expect(kept.leaf).toBe("license");
    const moved = settle({ side: "revenue", amount: "variable", leaf: "license" });
    expect(moved.leaf).toBe("hourly");
    expect(settle({ side: "expense", amount: "fixed", leaf: "license" }).leaf).toBeNull();
  });

  it("prints path -> emitted JSON for the built leaves", () => {
    const table = (
      [
        [{ side: "revenue", amount: "fixed", leaf: "license" }, licenseEmission(LICENSE_DEFAULTS)],
        [{ side: "revenue", amount: "variable", leaf: "hourly" }, hourlyEmission(HOURLY_DEFAULTS)],
      ] as [CascadeState, { line: { kind: string }; lowered: { effect: string }; landing: { builder: string } }][]
    ).map(([state, e]) => ({
      path: pathOf(state),
      kind: e.line.kind,
      effect: e.lowered.effect,
      landsIn: e.landing.builder,
    }));
    console.table(table);
    console.log(JSON.stringify(licenseEmission(LICENSE_DEFAULTS).line));
    console.log(JSON.stringify(licenseEmission(LICENSE_DEFAULTS).lowered));
    expect(NOT_BUILT.license).toBeNull();
    expect(NOT_BUILT.hourly).toBeNull();
  });

  it("license defaults lower to the engine's own seat_subscription example (license_tests.rs)", () => {
    // thorcasting-engine/model/src/config/line/license_tests.rs: Pro / Acme /
    // Cash, day 1, start 2026-01-15, 10 seats, +2, $50, 25% annual discount,
    // cost $4 at AWS. That plan is ANNUAL-discounted but day_of_month; the
    // engine test states both, so mirror it with billing monthly and the
    // discount stated on the line directly.
    const line = buildLicenseLine({
      ...LICENSE_DEFAULTS,
      paidTo: "Cash",
      start: "2026-01-15",
    });
    line.annual_discount_bp = 2_500;
    expect(lowerLicense(line)).toEqual({
      effect: "seat_subscription",
      params: {
        schedule: { recurring: { shape: "day_of_month", day: 1 } },
        start: "2026-01-15",
        leg: {
          from: "Acme",
          to: "Cash",
          seed_seats: 10,
          net_per_period: 2,
          price_cents: 5_000,
          annual_discount_bp: 2_500,
          cost: { from: "Cash", to: "AWS", per_seat_cents: 400 },
        },
      },
    });
  });

  it("a monthly license states no discount; an annual one does", () => {
    expect(licenseEmission(LICENSE_DEFAULTS).line.annual_discount_bp).toBeUndefined();
    const annual = licenseEmission({ ...LICENSE_DEFAULTS, billing: "annual", month: 3 });
    expect(annual.line.annual_discount_bp).toBe(2_500);
    expect(annual.line.schedule).toEqual({ recurring: { shape: "annual_on", month: 3, day: 1 } });
  });

  it("hourly defaults: $90 x 20 h a week -> per_unit leg, fixed_txn", () => {
    const e = hourlyEmission(HOURLY_DEFAULTS);
    expect(e.line.units_x100).toBe(2_000);
    expect(e.lowered.effect).toBe("fixed_txn");
    expect(e.landing.builder).toBe("Hourly");
  });
});
