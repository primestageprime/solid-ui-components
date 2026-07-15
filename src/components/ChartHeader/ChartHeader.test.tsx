import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ChartHeader } from "./ChartHeader";

describe("ChartHeader", () => {
  it("renders title and meta spread across a row", () => {
    const { getByText, container } = render(() => (
      <ChartHeader title="Completion Timeline" meta="42 completions in window" />
    ));
    expect(getByText("Completion Timeline")).toBeTruthy();
    expect(getByText("42 completions in window")).toBeTruthy();
    const row = container.querySelector(".row")!;
    expect(row.classList.contains("row--justify-between")).toBe(true);
  });

  it("title carries the accent mono treatment; meta stays muted", () => {
    const { getByText } = render(() => (
      <ChartHeader title="T" meta="M" />
    ));
    const title = getByText("T") as HTMLElement;
    expect(title.style.color).toBe("var(--sui-accent)");
    expect(title.style.fontFamily).toContain("--sui-font-mono");
    const meta = getByText("M") as HTMLElement;
    expect(meta.style.color).toBe("");
  });

  it("meta is optional", () => {
    const { getByText } = render(() => <ChartHeader title="Solo" />);
    expect(getByText("Solo")).toBeTruthy();
  });
});
