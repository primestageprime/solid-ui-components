// @vitest-environment node
import { describe, expect, it } from "vitest";
import { iconDeclarations, variantDeclarations } from "./declarations.ts";

describe("variantDeclarations", () => {
  it("types each variant as a React component taking its base's data props", () => {
    const out = variantDeclarations([
      { name: "PrimaryButton", factory: "createButton" },
      { name: "CardRow", factory: "createRow" },
    ]);
    expect(out).toContain(
      'import type { ButtonDataProps } from "../../../Button.tsx";',
    );
    expect(out).toContain(
      'import type { RowDataProps } from "../../../Layout.tsx";',
    );
    expect(out).toContain(
      "export declare const PrimaryButton: (props: ButtonDataProps) => ReactElement;",
    );
    expect(out).toContain(
      "export declare const CardRow: (props: RowDataProps) => ReactElement;",
    );
  });

  it("imports each props type once", () => {
    const out = variantDeclarations([
      { name: "A", factory: "createText" },
      { name: "B", factory: "createText" },
    ]);
    expect(out.match(/TextDataProps } from/g)).toHaveLength(1);
  });

  it("refuses a factory the mirror has no base for", () => {
    expect(() =>
      variantDeclarations([{ name: "A", factory: "createChart" }]),
    ).toThrow(/createChart/);
  });
});

describe("iconDeclarations", () => {
  it("names every glyph", () => {
    const out = iconDeclarations(["check", "plus"]);
    expect(out).toContain('export type IconName = "check" | "plus";');
    expect(out).toContain("export declare const ICON_PATHS");
  });
});
