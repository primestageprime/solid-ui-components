import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { LabeledDivider } from "./LabeledDivider";
import { domStructure } from "../../test-utils/domStructure";

afterEach(cleanup);

// Layout-purity regression guard. The former ::before/::after flex:1 rule lines
// are now real GrowBox elements, and the outer flex row is a ClusterRow (Peter
// ruling 1). The centered label sits between two growing 1px rule lines.
describe("LabeledDivider layout purity", () => {
  it("composes ClusterRow + two GrowBox rule lines around the label", () => {
    const { container } = render(() => <LabeledDivider label="Section" />);
    expect(domStructure(container)).toBe(
      [
        "div.row.row--align-center.row--gap-sm.sui-labeled-divider[aria-label=Section]",
        "  div.box.box--grow.sui-labeled-divider__rule[aria-hidden=true]",
        "  span.sui-labeled-divider__label",
        '    "Section"',
        "  div.box.box--grow.sui-labeled-divider__rule[aria-hidden=true]",
      ].join("\n"),
    );
  });

  it("keeps deriving aria-label from a string label, overridable by prop", () => {
    const { container } = render(() => (
      <LabeledDivider label="X" aria-label="custom" />
    ));
    expect(
      container.querySelector(".sui-labeled-divider")!.getAttribute("aria-label"),
    ).toBe("custom");
  });
});
