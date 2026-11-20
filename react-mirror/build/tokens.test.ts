// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  colorValue,
  rootDeclarations,
  textStyles,
  tokensCss,
  tokensJson,
} from "./tokens.ts";

describe("rootDeclarations", () => {
  it("reads the custom properties of top-level :root rules, in order, whitespace folded", () => {
    const css = `
      body { --nope: 1px; }
      :root {
        --a: #FFF; /* note */
        --b:
          system-ui,   sans-serif;
        color: red;
      }
      @media (x) { :root { --c: 1px; } }`;
    expect(rootDeclarations(css)).toEqual([
      ["a", "#FFF"],
      ["b", "system-ui, sans-serif"],
    ]);
  });
});

describe("colorValue", () => {
  const vars = new Map([
    ["sui-accent-rgb", "0, 212, 255"],
    ["sui-accent", "#00d4ff"],
  ]);

  it("keeps hex, lowercased", () => {
    expect(colorValue("#00D4FF", vars)).toBe("#00d4ff");
  });

  it("keeps rgb() and rgba() with plain numbers", () => {
    expect(colorValue("rgba(13, 26, 42, 0.8)", vars)).toBe(
      "rgba(13, 26, 42, 0.8)",
    );
  });

  it("resolves a channel triplet inside rgba()", () => {
    expect(colorValue("rgba(var(--sui-accent-rgb), 0.3)", vars)).toBe(
      "rgba(0, 212, 255, 0.3)",
    );
  });

  it("turns a bare var() of another token into an alias", () => {
    expect(colorValue("var(--sui-accent)", vars)).toBe("{sui-accent}");
  });

  it("refuses anything else", () => {
    expect(colorValue("rgba(var(--missing-rgb), 0.3)", vars)).toBeNull();
    expect(colorValue("color-mix(in srgb, red, blue)", vars)).toBeNull();
    expect(colorValue("12px", vars)).toBeNull();
    expect(colorValue("0, 212, 255", vars)).toBeNull();
    expect(colorValue("var(--sui-accent, red)", vars)).toBeNull();
  });
});

describe("textStyles", () => {
  it("reads each .text--<name> rule's size and weight", () => {
    const css = `
      .text--value { font-size: 1.5rem; font-weight: 600; color: x; }
      .text--body { font-size: 0.875rem; font-weight: normal; }
      .text--success { color: green; }`;
    expect(textStyles(css)).toEqual([
      { name: "value", fontSize: "1.5rem", fontWeight: 600 },
      { name: "body", fontSize: "0.875rem", fontWeight: 400 },
    ]);
  });
});

const HUD = `:root {
  --sui-accent: #00d4ff;
  --sui-accent-rgb: 0, 212, 255;
  --sui-border: rgba(var(--sui-accent-rgb), 0.3);
  --sui-on-accent: var(--sui-bg-deep);
  --sui-bg-deep: #030810;
  --sui-radius-sm: 0;
  --sui-clip-sm: 8px;
  --sui-space-1: 4px;
  --sui-dense-row-pad-y: 4px;
  --sui-font-family: system-ui, sans-serif;
  --sui-font-mono: "JetBrains Mono", monospace;
  --chart-mix: color-mix(in srgb, red, blue);
}`;
const LIGHT = `:root {
  --sui-accent: #c96442;
  --sui-accent-rgb: 201, 100, 66;
  --sui-border: #ddd1b9;
  --sui-on-accent: #ffffff;
  --sui-bg-deep: #efeae0;
  --sui-only-light: #123456;
  --sui-radius-sm: 4px;
  --sui-clip-sm: 8px;
  --sui-space-1: 4px;
  --sui-font-family: "Lora", serif;
  --sui-font-utility: "Inter", sans-serif;
  --sui-font-mono: ui-monospace, monospace;
}`;
const THEMES = [
  { id: "hud", name: "HUD", css: HUD },
  { id: "light", name: "Light (Bronze)", css: LIGHT },
] as const;
const TEXT = ".text--body { font-size: 0.875rem; font-weight: normal; }";

describe("tokensJson", () => {
  const built = tokensJson(THEMES, TEXT);

  it("lists the themes, first one first", () => {
    expect(built.json.color.themes).toEqual([
      { id: "hud", name: "HUD" },
      { id: "light", name: "Light (Bronze)" },
    ]);
  });

  it("gives each color a value per theme, first theme's names first", () => {
    expect(built.json.color.tokens).toEqual([
      { name: "sui-accent", value: { hud: "#00d4ff", light: "#c96442" } },
      {
        name: "sui-border",
        value: { hud: "rgba(0, 212, 255, 0.3)", light: "#ddd1b9" },
      },
      {
        name: "sui-on-accent",
        value: { hud: "{sui-bg-deep}", light: "#ffffff" },
      },
      { name: "sui-bg-deep", value: { hud: "#030810", light: "#efeae0" } },
      { name: "sui-only-light", value: { light: "#123456" } },
    ]);
  });

  it("files spacing, radius and clip by prefix, with a note when themes differ", () => {
    expect(built.json.spacing.tokens).toEqual([
      { name: "sui-space-1", value: "4px" },
    ]);
    expect(built.json.radius.tokens).toEqual([
      { name: "sui-radius-sm", value: "0", usage: "Light (Bronze): 4px" },
    ]);
    expect(built.json.clip.tokens).toEqual([
      { name: "sui-clip-sm", value: "8px" },
    ]);
  });

  it("names every family and the text styles", () => {
    expect(built.json.type.families).toEqual({
      "hud-sans": "system-ui, sans-serif",
      "hud-mono": '"JetBrains Mono", monospace',
      "light-sans": '"Lora", serif',
      "light-utility": '"Inter", sans-serif',
      "light-mono": "ui-monospace, monospace",
    });
    expect(built.json.type.groups).toEqual([
      {
        name: "Text",
        family: "hud-sans",
        styles: [{ name: "body", fontSize: "0.875rem", fontWeight: 400 }],
      },
    ]);
  });

  it("reports what it could not carry", () => {
    expect(built.skipped).toEqual(["chart-mix", "sui-dense-row-pad-y"]);
  });
});

describe("tokensCss", () => {
  it("compiles in the design system's shape", () => {
    const css = tokensCss(tokensJson(THEMES, TEXT).json);
    expect(css.split("\n")[0]).toBe("/* SUI — generated from tokens.json */");
    expect(css).toContain(
      ':root, [data-theme="hud"] {\n  --sui-accent: #00d4ff;\n  --sui-border: rgba(0, 212, 255, 0.3);\n  --sui-on-accent: var(--sui-bg-deep);\n  --sui-bg-deep: #030810;\n  --sui-only-light: #123456;\n}',
    );
    expect(css).toContain(
      '[data-theme="light"] {\n  --sui-accent: #c96442;\n  --sui-border: #ddd1b9;\n  --sui-on-accent: #ffffff;\n  --sui-bg-deep: #efeae0;\n  --sui-only-light: #123456;\n}',
    );
    expect(css).toContain(
      ":root {\n  --sui-space-1: 4px;\n  --sui-radius-sm: 0;\n  --sui-clip-sm: 8px;\n  --font-hud-sans: system-ui, sans-serif;",
    );
    expect(css).toContain(
      ".body {\n  font-family: var(--font-hud-sans);\n  font-size: 0.875rem;\n  font-weight: 400;\n}",
    );
  });
});
