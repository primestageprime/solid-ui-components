import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { DiffPair } from "./DiffPair";
import { domStructure } from "../../test-utils/domStructure";

afterEach(cleanup);

// Layout-purity regression guard. The labeled form is now a LabelValueGrid
// (was display:grid) and the before/arrow/after row a BaselineWrapRow (was a
// hand-rolled baseline flex), per Peter ruling 3. Gap snapped 12px->md on the
// grid; the pair keeps sm(8).
describe("DiffPair layout purity", () => {
  it("composes LabelValueGrid + BaselineWrapRow for the labeled form", () => {
    const { container } = render(() => (
      <DiffPair label="Status" before={<span>A</span>} after={<span>B</span>} />
    ));
    expect(domStructure(container)).toBe(
      [
        "div.grid.grid--align-baseline.grid--gap-md.sui-diff-pair.sui-diff-pair--with-label",
        "  span.sui-diff-pair__label",
        '    "Status"',
        '    ":"',
        "  div.row.row--align-baseline.row--gap-sm.row--wrap.sui-diff-pair__pair",
        "    div.sui-diff-pair__side.sui-diff-pair__side--before",
        "      span",
        '        "A"',
        "    span.sui-diff-pair__arrow[aria-hidden=true]",
        '      "→"',
        "    div.sui-diff-pair__side.sui-diff-pair__side--after",
        "      span",
        '        "B"',
      ].join("\n"),
    );
  });

  it("no-label form renders just the BaselineWrapRow pair", () => {
    const { container } = render(() => (
      <DiffPair before={<span>x</span>} after={<span>y</span>} />
    ));
    const root = container.firstElementChild!;
    expect(root.classList.contains("sui-diff-pair")).toBe(true);
    expect(root.classList.contains("grid")).toBe(false);
    expect(root.querySelector(".sui-diff-pair__pair.row")).toBeTruthy();
  });
});
