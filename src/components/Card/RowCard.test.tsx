import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { HatchedProgressBar, share } from "../Progress/HatchedProgressBar";
import { RowCard } from "./RowCard";

describe("RowCard", () => {
  it("draws the name, the aside and the bar", () => {
    const { container, getByText } = render(() => (
      <RowCard name="Load test" aside="Ana" bar={<HatchedProgressBar done={2} active={1} total={4} label="Load test" />} />
    ));
    expect(getByText("Load test")).toBeTruthy();
    expect(getByText("Ana")).toBeTruthy();
    const bar = container.querySelector(".sui-hatched-bar");
    expect(bar?.getAttribute("aria-valuenow")).toBe("50");
    expect((container.querySelector(".sui-hatched-bar__done") as HTMLElement).style.width).toBe("50%");
    expect((container.querySelector(".sui-hatched-bar__active") as HTMLElement).style.width).toBe("25%");
  });
  it("omits the bar and the aside when absent", () => {
    const { container } = render(() => <RowCard name="Plan" />);
    expect(container.querySelector(".sui-hatched-bar")).toBeNull();
    expect(container.querySelector(".sui-row-card__aside")).toBeNull();
  });
});

describe("share", () => {
  it("is a clamped percentage, 0 of an empty total", () => {
    expect(share(1, 4)).toBe(25);
    expect(share(5, 4)).toBe(100);
    expect(share(1, 0)).toBe(0);
  });
});
