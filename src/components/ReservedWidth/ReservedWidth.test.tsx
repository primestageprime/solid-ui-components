import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ReservedWidth } from "./ReservedWidth";

afterEach(cleanup);

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "ReservedWidth.css"),
  "utf8",
);

describe("ReservedWidth", () => {
  it("renders the live content first and the widest copy hidden and inert", () => {
    const { container } = render(() => (
      <ReservedWidth widest={<button type="button">Wide state</button>}>
        <button type="button">Live</button>
      </ReservedWidth>
    ));
    const [live, widest] = Array.from(
      container.querySelector(".sui-reserved-width")!.children,
    );
    expect(live?.textContent).toBe("Live");
    expect(widest?.textContent).toBe("Wide state");
    expect(widest?.getAttribute("aria-hidden")).toBe("true");
    // Static `inert` compiles to the attribute (browsers reflect it).
    expect(widest?.hasAttribute("inert")).toBe(true);
    // The first button a query finds is the live one.
    expect(container.querySelector("button")?.textContent).toBe("Live");
  });

  it("stacks both in one grid cell and draws nothing of the copy", () => {
    expect(css).toMatch(/display: inline-grid/);
    expect(css).toMatch(/grid-area: 1 \/ 1/);
    expect(css).toMatch(/__widest\s*\{[^}]*visibility: hidden/);
  });
});
