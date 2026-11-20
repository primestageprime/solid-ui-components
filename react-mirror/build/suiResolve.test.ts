// @vitest-environment node
import { describe, expect, it } from "vitest";
import { type Roots, resolveSui } from "./suiResolve.ts";

const roots: Roots = {
  components: "/sui/src/components",
  mirror: "/sui/react-mirror/src",
};
/** The files that exist, for the resolver's look-ups. */
const files = new Set([
  "/sui/src/components/Button/variants.ts",
  "/sui/src/components/Button/Button.tsx",
  "/sui/src/components/MarkedSlider/geometry.ts",
  "/sui/src/components/Icon/Icon.tsx",
  "/sui/src/components/Badge/Badge.tsx",
  "/sui/src/fn/index.ts",
]);
const exists = (path: string): boolean => files.has(path);
const resolve = (specifier: string, importer: string, flavored: boolean) =>
  resolveSui(specifier, { path: importer, flavored }, roots, exists);

describe("resolveSui", () => {
  it("opens a sui: module, flavored, at its .ts file", () => {
    expect(
      resolve("sui:Button/variants", "/sui/react-mirror/src/index.ts", false),
    ).toEqual({
      kind: "sui",
      path: "/sui/src/components/Button/variants.ts",
    });
  });

  it("refuses a sui: module that does not exist", () => {
    expect(resolve("sui:Nope/variants", "/x.ts", false).kind).toBe("refuse");
  });

  it("serves the icon table from Icon.tsx", () => {
    expect(resolve("sui:Icon/paths", "/x.ts", false)).toEqual({
      kind: "icons",
      path: "/sui/src/components/Icon/Icon.tsx",
    });
  });

  it("points a flavored module's factory import at the React base", () => {
    expect(
      resolve("./Button", "/sui/src/components/Button/variants.ts", true),
    ).toEqual({ kind: "react", path: "/sui/react-mirror/src/Button.tsx" });
  });

  it("refuses a flavored import of a Solid component with no React base", () => {
    const r = resolve(
      "../Badge/Badge",
      "/sui/src/components/Button/variants.ts",
      true,
    );
    expect(r.kind).toBe("refuse");
  });

  it("passes a flavored import of a pure module through", () => {
    expect(
      resolve("../../fn", "/sui/src/components/MarkedSlider/geometry.ts", true),
    ).toEqual({ kind: "pass" });
  });

  it("passes everything from an unflavored importer through", () => {
    expect(
      resolve("./Button", "/sui/src/components/Button/variants.ts", false),
    ).toEqual({ kind: "pass" });
  });

  it("passes a bare package import through", () => {
    expect(
      resolve("solid-js", "/sui/src/components/Button/variants.ts", true),
    ).toEqual({
      kind: "pass",
    });
  });
});
