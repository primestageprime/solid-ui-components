import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { FormComposite } from "./FormComposite";
import { domStructure } from "../../test-utils/domStructure";

afterEach(cleanup);

// Layout-purity regression guard. The hand-rolled holy-albatross flex-basis
// layout is now the AutoStackRow / AutoStackItem Layout primitive (Peter ruling
// 3). Slots render only when supplied; BEM hook classes persist; outer gap
// snapped 12px->md, item gap stays sm(8).
describe("FormComposite layout purity", () => {
  it("composes AutoStackRow + AutoStackItem, only for supplied slots", () => {
    const { container } = render(() => (
      <FormComposite identity={<span>ID</span>} schedule={<span>SCHED</span>} />
    ));
    expect(domStructure(container)).toBe(
      [
        "div.auto-stack-row.auto-stack-row--gap-md.sui-form-composite",
        "  div.auto-stack-item.auto-stack-item--gap-sm.sui-form-composite__identity",
        "    span",
        '      "ID"',
        "  div.auto-stack-item.auto-stack-item--gap-sm.sui-form-composite__schedule",
        "    span",
        '      "SCHED"',
      ].join("\n"),
    );
  });

  it("threads breakWidth to the --auto-stack-break var and stacked to the row", () => {
    const { container } = render(() => (
      <FormComposite
        breakWidth="50rem"
        stacked
        identity={<span>ID</span>}
      />
    ));
    const row = container.querySelector(".sui-form-composite") as HTMLElement;
    expect(row.classList.contains("auto-stack-row--stacked")).toBe(true);
    expect(row.style.getPropertyValue("--auto-stack-break")).toBe("50rem");
  });
});
