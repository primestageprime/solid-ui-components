import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { AssigneeIcon } from "./AssigneeIcon";

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
});
