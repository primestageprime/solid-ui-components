import { describe, expect, it } from "vitest";
import { dividerClasses } from "./Divider.tsx";

describe("dividerClasses", () => {
  it("defaults to horizontal, solid, md spacing", () => {
    expect(dividerClasses({})).toBe(
      "sui-divider sui-divider--horizontal sui-divider--solid sui-divider--spacing-md",
    );
  });
  it("takes each setting and the caller's class", () => {
    expect(
      dividerClasses({
        orientation: "vertical",
        variant: "dashed",
        spacing: "sm",
        class: "c",
      }),
    ).toBe(
      "sui-divider sui-divider--vertical sui-divider--dashed sui-divider--spacing-sm c",
    );
  });
});
