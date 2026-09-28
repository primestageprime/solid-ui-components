import { describe, expect, it } from "vitest";
import {
  COMBOBOX_CREATE_VALUE,
  comboboxWithCreateRow,
  isComboboxCreateOption,
} from "./comboboxCreateRow";

const OPTIONS = [
  { value: "a", label: "Roofing Cash-in Test Group" },
  { value: "b", label: "Payroll" },
];

describe("comboboxWithCreateRow", () => {
  it("appends a Create row when no option matches the text at all", () => {
    const rows = comboboxWithCreateRow(OPTIONS, "Nothing Like It");
    expect(rows).toHaveLength(3);
    expect(rows[2]).toEqual({
      value: COMBOBOX_CREATE_VALUE,
      label: 'Create "Nothing Like It"',
    });
  });

  it("appends a Create row when the text is a substring of an option (no exact match)", () => {
    // The historical bug: "Roofing" is a substring of "Roofing Cash-in Test
    // Group" but not an exact label match, so a Create row is still offered
    // — but so is the real option, letting Enter pick it instead.
    const rows = comboboxWithCreateRow(OPTIONS, "Roofing");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toBe(OPTIONS[0]);
    expect(isComboboxCreateOption(rows[2])).toBe(true);
  });

  it("omits the Create row on an exact label match", () => {
    const rows = comboboxWithCreateRow(OPTIONS, "Payroll");
    expect(rows).toEqual(OPTIONS);
  });

  it("is case-insensitive and trims for the exact-match check", () => {
    const rows = comboboxWithCreateRow(OPTIONS, "  payroll  ");
    expect(rows).toEqual(OPTIONS);
  });

  it("returns options unchanged for empty or blank text", () => {
    expect(comboboxWithCreateRow(OPTIONS, "")).toBe(OPTIONS);
    expect(comboboxWithCreateRow(OPTIONS, "   ")).toBe(OPTIONS);
  });

  it("still offers Create against an empty option list", () => {
    const rows = comboboxWithCreateRow([], "New Group");
    expect(rows).toHaveLength(1);
    expect(isComboboxCreateOption(rows[0])).toBe(true);
  });
});

describe("isComboboxCreateOption", () => {
  it("is true only for the sentinel value", () => {
    expect(isComboboxCreateOption({ value: COMBOBOX_CREATE_VALUE })).toBe(
      true,
    );
    expect(isComboboxCreateOption({ value: "a" })).toBe(false);
    expect(isComboboxCreateOption(null)).toBe(false);
    expect(isComboboxCreateOption(undefined)).toBe(false);
  });
});
