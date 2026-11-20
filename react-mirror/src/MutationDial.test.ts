import { describe, expect, it } from "vitest";
import { groupNote, metaLine } from "./MutationDial.tsx";

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

describe("metaLine", () => {
  it("is the readout's own line when there is no footnote", () => {
    expect(metaLine("was $48K", undefined)).toBe("was $48K");
    expect(metaLine("", undefined)).toBe("");
  });
  it("is the footnote alone when the readout has nothing to say", () => {
    expect(metaLine("", "×3 = $188K")).toBe("×3 = $188K");
  });
  it("joins the two when both speak", () => {
    expect(metaLine("New", "×1 = $60K")).toBe("New · ×1 = $60K");
  });
});
