import { describe, expect, it } from "vitest";
import { join, map } from "../../../../src/fn";
import {
  MONTHS_FROM,
  WEEKS_FROM,
  YEARS_FROM,
  formatDays,
  formatSavingsGoal,
  runwayReading,
  savingsGoalColor,
  timeToSavingsGoal,
  unitForDays,
} from "./savings-model";
import { HORIZON, RUNWAY_GALLERY, SAVINGS_GALLERY, SLOPE_FIXTURE } from "./slope-model";

/** THE PRINTED TABLE: every savings gallery card. */
const savingsTable = (): string =>
  join("\n", [
    `horizon ${HORIZON.label} = ${HORIZON.days} days; units: days < ${WEEKS_FROM} ≤ weeks < ${MONTHS_FROM} ≤ months < ${YEARS_FROM} ≤ years`,
    "case                     saved     gain/mo   reads        tone",
    ...map((c) => {
      const r = timeToSavingsGoal(c.input);
      return join("  ", [
        c.name.padEnd(23),
        String(c.input.saved).padStart(7),
        String(c.input.monthlyGain).padStart(9),
        formatSavingsGoal(r).padEnd(11),
        savingsGoalColor(r, HORIZON.days),
      ]);
    }, SAVINGS_GALLERY),
  ]);

const runwayTable = (): string =>
  join("\n", [
    `minimum runway ${SLOPE_FIXTURE.minRunwayDays} days`,
    "case                   crossing  slope/mo   reads        tone",
    ...map((c) => {
      const r = runwayReading(c.input, SLOPE_FIXTURE.minRunwayDays);
      return join("  ", [
        c.name.padEnd(21),
        String(c.input.crossingDays ?? "—").padStart(8),
        String(c.input.slopePerMonth).padStart(9),
        r.label.padEnd(11),
        r.color,
      ]);
    }, RUNWAY_GALLERY),
  ]);

describe("payroll board — savings goal and runway statuses", () => {
  it("prints both status tables", () => {
    console.log(savingsTable());
    console.log(runwayTable());
  });

  it("speaks days / weeks / months / years at thorcasting's thresholds", () => {
    expect([14, 15, 60, 61, 730, 731].map(unitForDays)).toEqual([
      "days", "weeks", "weeks", "months", "months", "years",
    ]);
    expect(formatDays(1)).toBe("1 day");
    expect(formatDays(21)).toBe("3 weeks");
  });

  it("shows every savings format, orange past the horizon and for never", () => {
    const read = (name: string) => {
      const c = SAVINGS_GALLERY.find((g) => g.name === name)!;
      const r = timeToSavingsGoal(c.input);
      return [formatSavingsGoal(r), savingsGoalColor(r, HORIZON.days)];
    };
    expect(read("met")).toEqual(["Now", "success"]);
    expect(read("days")).toEqual(["6 days", "default"]);
    expect(read("weeks")).toEqual(["3 weeks", "default"]);
    expect(read("months, inside horizon")).toEqual(["3 months", "default"]);
    expect(read("months, beyond horizon")).toEqual(["8 months", "warning"]);
    expect(read("years")).toEqual(["4 years", "warning"]);
    expect(read("never")).toEqual(["Never", "warning"]);
  });

  it("met beats never, and a goal on the horizon's last day is still inside", () => {
    expect(timeToSavingsGoal({ target: 1, saved: 2, monthlyGain: -1 })).toEqual({ kind: "now" });
    expect(savingsGoalColor({ kind: "days", days: HORIZON.days }, HORIZON.days)).toBe("default");
    expect(savingsGoalColor({ kind: "days", days: HORIZON.days + 1 }, HORIZON.days)).toBe("warning");
  });

  it("shows every runway state, red under the minimum", () => {
    const read = (name: string) => {
      const r = runwayReading(RUNWAY_GALLERY.find((g) => g.name === name)!.input, SLOPE_FIXTURE.minRunwayDays);
      return [r.label, r.color];
    };
    expect(read("bankrupt")).toEqual(["Bankrupt", "danger"]);
    expect(read("runs out, days")).toEqual(["10 days", "danger"]);
    expect(read("runs out, < minimum")).toEqual(["7 weeks", "danger"]);
    expect(read("runs out, ≥ minimum")).toEqual(["4 months", "warning"]);
    expect(read("solvent")).toEqual(["Solvent", "success"]);
    expect(read("beyond the window")).toEqual([`Beyond ${HORIZON.label}`, "warning"]);
  });
});
