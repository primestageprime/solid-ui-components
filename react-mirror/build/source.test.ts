// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sliceInitializer, variantTable } from "./source.ts";

describe("sliceInitializer", () => {
  const source = [
    "export const A: Record<string, { x: string }> =",
    "  {",
    "    // a { brace in a comment }",
    '    one: { x: `<path d="M1 {2}"/>` },',
    '    two: { x: "}" },',
    "  };",
    "export const B = 1;",
  ].join("\n");

  it("returns the object literal an export is initialised with", () => {
    const literal = sliceInitializer(source, "A");
    expect(literal.startsWith("{")).toBe(true);
    expect(literal.endsWith("}")).toBe(true);
    expect(new Function(`return (${literal});`)()).toEqual({
      one: { x: '<path d="M1 {2}"/>' },
      two: { x: "}" },
    });
  });

  it("throws for an export that is not there", () => {
    expect(() => sliceInitializer(source, "C")).toThrow(/C/);
  });
});

describe("variantTable", () => {
  it("lists each exported variant with the factory that builds it", () => {
    const source = [
      'import { createButton } from "./Button";',
      "export const PrimaryButton: Component<ButtonDataProps> = createButton({",
      '  variant: "primary",',
      "});",
      "export const ReservedGlyphSlotButton: Component<ButtonDataProps> =",
      "  createButton({ size: 'sm' });",
      'export const CardSurface = createSurface({ padding: "md" });',
      "const ELLIPSIS = { a: 1 } as const;",
      "export const NOT_A_VARIANT = 3;",
    ].join("\n");
    expect(variantTable(source)).toEqual([
      { name: "PrimaryButton", factory: "createButton" },
      { name: "ReservedGlyphSlotButton", factory: "createButton" },
      { name: "CardSurface", factory: "createSurface" },
    ]);
  });
});
