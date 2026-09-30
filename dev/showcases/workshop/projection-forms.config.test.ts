// Headless observation for the Projection Forms bench: the rows the two forms
// emit and the builder each lands in, printed as tables (run with
// `npx vitest run dev/showcases/workshop/projection-forms.config.test.ts`).
import { describe, expect, it } from "vitest";
import {
  buildBiweeklyReference,
  buildMonthlyFixed,
  landsIn,
  wireFromLegacy,
  type FormContext,
} from "./projection-forms.config";
import { BIWEEKLY_REFERENCE, MONTHLY_FIXED, bucketIdFor } from "./projection-forms.fixtures";

const ctx = (side: "revenue" | "expense", category: string, counterparty: string): FormContext => ({
  side,
  bucketId: bucketIdFor(side, category),
  mineAccount: "Columbia Bank Checking",
  counterparty,
});

describe("projection-forms emitted config", () => {
  const monthly = buildMonthlyFixed(
    { name: MONTHLY_FIXED.name, amount: MONTHLY_FIXED.amount, day: MONTHLY_FIXED.day },
    ctx("revenue", "Contract", "RTH"),
  );
  const biweekly = buildBiweeklyReference(
    {
      name: BIWEEKLY_REFERENCE.name,
      annual: BIWEEKLY_REFERENCE.annual,
      referenceDate: BIWEEKLY_REFERENCE.referenceDate,
      role: BIWEEKLY_REFERENCE.role,
    },
    ctx("expense", "Salary", BIWEEKLY_REFERENCE.name),
  );

  it("prints the emitted rows and where they land", () => {
    console.table(
      [monthly, biweekly].map((row) => ({
        name: row.name,
        bucket: row.bucketId,
        predicate: row.predicateId,
        args: JSON.stringify(row.predicateArgs),
        cents: row.effects.createTxn[0].amount_cents,
        effect: wireFromLegacy(row).effect,
        shape: String(wireFromLegacy(row).params.schedule.shape),
        landsIn: landsIn(row).builder,
        also: landsIn(row).also.join(" | "),
      })),
    );
    expect(true).toBe(true);
  });

  it("monthly fixed: $10,000 on day 1 -> isDayOfMonth, fixed_txn, 1,000,000 cents", () => {
    expect(monthly.predicateId).toBe("isDayOfMonth");
    expect(monthly.effects.createTxn[0].amount_cents).toBe(1_000_000);
    expect(wireFromLegacy(monthly).params.schedule).toEqual({ day: 1, shape: "day_of_month" });
  });

  it("bi-weekly reference: annual 102,891.10 -> 395,735 cents a paycheck, biweekly_from", () => {
    expect(biweekly.effects.createTxn[0].amount_cents).toBe(395_735);
    expect(wireFromLegacy(biweekly).params.schedule.shape).toBe("biweekly_from");
    expect(biweekly.tags).toEqual(["role:architect"]);
  });

  it("lands in: contract bucket -> Contracts, salary bucket -> Payroll", () => {
    expect(landsIn(monthly).builder).toBe("Contracts");
    expect(landsIn(biweekly).builder).toBe("Payroll");
    expect(landsIn({ ...monthly, bucketId: "rev-license" }).claimed).toBe(false);
    expect(landsIn({ ...monthly, bucketId: "rev-support", predicateId: "isDayOfWeek" }).builder).toBe("Hourly");
  });
});
