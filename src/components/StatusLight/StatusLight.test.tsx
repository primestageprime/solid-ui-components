import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { StatusLight } from "./StatusLight";
import { SmallStatusLight, MdStatusLight } from "./variants";

describe("StatusLight", () => {
  it("defaults to the idle variant and md size with an aria-hidden dot", () => {
    const { container } = render(() => <StatusLight />);
    const dot = container.querySelector(".sui-status-light__dot")!;
    expect(dot.classList.contains("sui-status-light__dot--idle")).toBe(true);
    expect(dot.classList.contains("sui-status-light__dot--md")).toBe(true);
    expect(dot.getAttribute("aria-hidden")).toBe("true");
  });

  it("reflects variant and pulse in the dot classes", () => {
    const { container } = render(() => <StatusLight variant="success" pulse />);
    const dot = container.querySelector(".sui-status-light__dot")!;
    expect(dot.classList.contains("sui-status-light__dot--success")).toBe(true);
    expect(dot.classList.contains("sui-status-light__dot--pulse")).toBe(true);
  });

  it("renders a label span when label is provided", () => {
    const { container } = render(() => <StatusLight label="Online" />);
    const label = container.querySelector(".sui-status-light__label")!;
    expect(label.textContent).toBe("Online");
  });

  it("omits the label span when neither label nor children are given", () => {
    const { container } = render(() => <StatusLight variant="danger" />);
    expect(container.querySelector(".sui-status-light__label")).toBeNull();
  });

  it("SmallStatusLight bakes size sm while leaving variant runtime", () => {
    const { container } = render(() => <SmallStatusLight variant="warning" />);
    const dot = container.querySelector(".sui-status-light__dot")!;
    expect(dot.classList.contains("sui-status-light__dot--sm")).toBe(true);
    expect(dot.classList.contains("sui-status-light__dot--warning")).toBe(true);
  });

  it("MdStatusLight bakes size md", () => {
    const { container } = render(() => <MdStatusLight />);
    const dot = container.querySelector(".sui-status-light__dot")!;
    expect(dot.classList.contains("sui-status-light__dot--md")).toBe(true);
  });
});
