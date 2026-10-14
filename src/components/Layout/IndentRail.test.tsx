import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { IndentRail } from "./IndentRail";
import { NESTED_LIST_MAX_INDENT_STEPS } from "./NestedList";

// IndentRail draws NestedList's indent and guide rail with NO list semantics,
// for a hierarchy that lives somewhere a listitem cannot (a table cell).
describe("IndentRail", () => {
  const rail = (level: number) =>
    render(() => <IndentRail level={level}>x</IndentRail>).container
      .firstElementChild as HTMLElement;

  it("draws no indent at level 1", () => {
    expect(rail(1).className).toContain("sui-nested-list__row--indent-0");
  });

  it("draws one step per level past the root, with the NestedList classes", () => {
    const el = rail(3);
    expect(el.classList.contains("sui-nested-list__row")).toBe(true);
    expect(el.className).toContain("--indent-2");
    expect(el.textContent).toBe("x");
  });

  it("stops growing at the NestedList cap and marks the row as capped", () => {
    const el = rail(NESTED_LIST_MAX_INDENT_STEPS + 5);
    expect(el.className).toContain(`--indent-${NESTED_LIST_MAX_INDENT_STEPS}`);
    expect(el.classList.contains("sui-nested-list__row--capped")).toBe(true);
  });

  it("carries no role and no aria-level", () => {
    const el = rail(2);
    expect(el.getAttribute("role")).toBeNull();
    expect(el.getAttribute("aria-level")).toBeNull();
  });

  it("keeps a caller class beside its own", () => {
    const { container } = render(() => (
      <IndentRail level={2} class="extra">
        x
      </IndentRail>
    ));
    const el = container.firstElementChild as HTMLElement;
    expect(el.classList.contains("extra")).toBe(true);
    expect(el.classList.contains("sui-nested-list__row")).toBe(true);
  });
});
