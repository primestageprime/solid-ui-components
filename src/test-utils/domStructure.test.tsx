import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { domStructure } from "./domStructure";
import { Stack } from "../components/Layout/Stack";

afterEach(cleanup);

describe("domStructure", () => {
  it("captures tag + sorted classes + text as an indented tree", () => {
    const { container } = render(() => (
      <Stack gap="sm" align="center">
        <span class="label">Hello</span>
      </Stack>
    ));
    expect(domStructure(container)).toBe(
      [
        "div.stack.stack--align-center.stack--gap-sm",
        '  span.label',
        '    "Hello"',
      ].join("\n"),
    );
  });

  it("captures curated semantic attributes but ignores style", () => {
    const { container } = render(() => (
      <button type="button" aria-label="Close" style={{ color: "red" }}>
        x
      </button>
    ));
    expect(domStructure(container)).toBe(
      ['button[aria-label=Close][type=button]', '  "x"'].join("\n"),
    );
  });

  it("is stable under class reordering (sorted)", () => {
    const a = render(() => <div class="b a c" />);
    const b = render(() => <div class="c b a" />);
    expect(domStructure(a.container)).toBe(domStructure(b.container));
  });

  it("can omit text and ignore noise classes", () => {
    const { container } = render(() => (
      <div class="keep hash-x1y2">
        <span>drop me</span>
      </div>
    ));
    expect(
      domStructure(container, { text: false, ignoreClasses: ["hash-x1y2"] }),
    ).toBe(["div.keep", "  span"].join("\n"));
  });
});
