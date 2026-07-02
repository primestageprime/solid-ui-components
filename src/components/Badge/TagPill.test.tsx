import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { TagPill } from "./TagPill";

describe("TagPill", () => {
  it("renders a plain label as a single lozenge", () => {
    const { container } = render(() => <TagPill tag={{ label: "stax" }} />);
    const root = container.firstElementChild!;
    expect(root.className).not.toMatch(/--split/);
    expect(root.textContent).toBe("stax");
  });

  it("splits a label containing ':' into namespace + value", () => {
    const { container } = render(() => <TagPill tag={{ label: "primestage:dside" }} />);
    const root = container.firstElementChild!;
    expect(root.className).toMatch(/--split/);
    expect(container.querySelector(".sui-tag-pill__ns")?.textContent).toBe("primestage");
    expect(container.querySelector(".sui-tag-pill__val")?.textContent).toBe("dside");
  });

  it("renders the explicit key/value shape as a split lozenge", () => {
    const { container } = render(() => <TagPill tag={{ key: "stax", value: "jtf" }} />);
    expect(container.firstElementChild!.className).toMatch(/--split/);
    expect(container.querySelector(".sui-tag-pill__ns")?.textContent).toBe("stax");
    expect(container.querySelector(".sui-tag-pill__val")?.textContent).toBe("jtf");
  });

  it("active flag adds the highlight class", () => {
    const { container } = render(() => <TagPill tag={{ label: "stax", active: true }} />);
    expect(container.firstElementChild!.className).toMatch(/--active/);
  });
});
