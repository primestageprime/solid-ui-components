import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { AssigneeIcon, createAssigneeIcon } from "./AssigneeIcon";

describe("AssigneeIcon", () => {
  it("renders up to 2 centered initials", () => {
    const { container } = render(() => <AssigneeIcon initials="PST" />);
    // Only the first 2 chars are kept.
    expect(container.querySelector("text")?.textContent).toBe("PS");
  });

  it("person kind renders the silhouette (default)", () => {
    const { container } = render(() => <AssigneeIcon initials="P" kind="person" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-label")).toMatch(/person/);
    // Person icon has no antenna dots.
    expect(container.querySelectorAll("circle.dot").length).toBe(0);
  });

  it("ai kind renders the antennaed robot head", () => {
    const { container } = render(() => <AssigneeIcon initials="A" kind="ai" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-label")).toMatch(/AI/);
    // Two antenna dots.
    expect(container.querySelectorAll("circle.dot").length).toBe(2);
  });

  it("active flag adds the highlight class hook", () => {
    const { container } = render(() => <AssigneeIcon initials="P" active />);
    expect(container.firstElementChild!.className).toMatch(/--active/);
  });

  it("title carries the full name on hover; initials stay the ambient display", () => {
    const { container } = render(() => <AssigneeIcon initials="Pe" title="Peter Stradinger" />);
    expect(container.firstElementChild!.getAttribute("title")).toBe("Peter Stradinger");
    expect(container.querySelector("text")?.textContent).toBe("Pe");
  });

  it("no title → hover falls back to the initials (previous behavior)", () => {
    const { container } = render(() => <AssigneeIcon initials="Pe" />);
    expect(container.firstElementChild!.getAttribute("title")).toBe("Pe");
  });

  it("no size → no inline dimensions (stylesheet 25×23 default rules)", () => {
    const { container } = render(() => <AssigneeIcon initials="P" />);
    const svg = container.querySelector("svg")!;
    expect(svg.style.width).toBe("");
    expect(svg.style.height).toBe("");
  });

  it("size scales the box, height-authoritative, keeping the 25:23 ratio", () => {
    const { container } = render(() => <AssigneeIcon initials="P" size={46} />);
    const svg = container.querySelector("svg")!;
    expect(svg.style.height).toBe("46px");
    expect(svg.style.width).toBe("50px"); // round(46 * 25/23)
  });

  it("createAssigneeIcon freezes size; call site stays data-only", () => {
    const Big = createAssigneeIcon({ size: 46 });
    const { container } = render(() => <Big initials="Pe" kind="ai" />);
    const svg = container.querySelector("svg")!;
    expect(svg.style.height).toBe("46px");
    expect(container.querySelector("text")?.textContent).toBe("Pe");
  });
});
