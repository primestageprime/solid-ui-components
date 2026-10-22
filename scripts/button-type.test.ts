// @vitest-environment node
// Every raw `<button>` under src/ says its `type` (scripts/button-type.mjs).
// A typeless one is a submit button, so in a consumer's `<form>` it submits.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { typelessButtons } from "./button-type.mjs";

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

describe("typelessButtons", () => {
  it("finds a tag with no type, across lines and braces", () => {
    const source = [
      "// <button> in a comment is prose",
      "const a = <button",
      "  onClick={() => n > 1}",
      ">go</button>;",
      'const b = <button type="button" {...rest}>x</button>;',
    ].join("\n");
    expect(typelessButtons(source)).toEqual([2]);
  });
});

describe("SUI source", () => {
  it("has no <button> without a type", () => {
    const offenders = walk("src")
      .filter((file) => file.endsWith(".tsx") && !/\.test\./.test(file))
      .flatMap((file) =>
        typelessButtons(readFileSync(file, "utf8")).map(
          (line: number) => `${file}:${line}`,
        ),
      );
    expect(offenders).toEqual([]);
  });
});
