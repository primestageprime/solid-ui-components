// @vitest-environment node
import { describe, expect, it } from "vitest";
import { exportedTypes, indexDeclarations, reachable } from "./dts.ts";

const SOURCE = `
import type { X } from "y";
export type Domain = readonly [number, number];
type Hidden = string;
export interface SliderProps {
  readonly domain: Domain;
  readonly label: string;
}
export interface Box { readonly x: number }
export const slider = 1;
`;

describe("exportedTypes", () => {
  it("keeps exported interfaces and aliases as written", () => {
    expect(exportedTypes(SOURCE).map((d) => d.name)).toEqual([
      "Domain",
      "SliderProps",
      "Box",
    ]);
    expect(exportedTypes(SOURCE)[0]?.text).toBe(
      "export type Domain = readonly [number, number];",
    );
  });
});

describe("reachable", () => {
  it("follows names from the roots, and leaves the rest out", () => {
    expect(
      reachable(exportedTypes(SOURCE), ["SliderProps"]).map((d) => d.name),
    ).toEqual(["Domain", "SliderProps"]);
  });

  it("survives a cycle and a missing name", () => {
    const cyclic = [
      { name: "A", text: "export interface A { b: B }" },
      { name: "B", text: "export interface B { a: A }" },
    ];
    expect(reachable(cyclic, ["A", "Missing"]).map((d) => d.name)).toEqual([
      "A",
      "B",
    ]);
  });
});

describe("indexDeclarations", () => {
  it("aliases a variant's props as <Comp>Props, and reuses a base's own", () => {
    const out = indexDeclarations(exportedTypes(SOURCE), [
      { name: "Slider", props: "SliderProps" },
      { name: "TallSlider", props: "SliderProps" },
    ]);
    expect(out).toContain(
      "export declare const Slider: (props: SliderProps) => ReactElement;",
    );
    expect(out).toContain("export type TallSliderProps = SliderProps;");
    expect(out).not.toContain("export type SliderProps = SliderProps");
    expect(out).not.toContain("interface Box");
  });
});
