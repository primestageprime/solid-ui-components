import { describe, expect, it } from "vitest";
import { groupNote } from "./MutationDial.tsx";

const member = (id: string, value: number, old: number | null) => ({
  id,
  label: id,
  value,
  old,
  range: [0, 100] as const,
});
const fmt = (n: number): string => `$${n}`;

describe("groupNote", () => {
  it("is empty for identical, established members", () => {
    expect(groupNote([member("a", 5, 5), member("b", 5, 5)], fmt, "New")).toBe(
      "",
    );
  });

  it("gives the spread when members differ", () => {
    expect(
      groupNote([member("a", 4, 4), member("b", 6, 6)], fmt, "New"),
    ).toMatch(/^avg · \$\d+–\$\d+$/);
  });

  it("counts the new ones when only some are new", () => {
    expect(
      groupNote([member("a", 5, null), member("b", 5, 5)], fmt, "New"),
    ).toContain("1 new");
  });
});
