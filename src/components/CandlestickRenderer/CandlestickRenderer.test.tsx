import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { CandlestickRenderer, type Candlestick } from "./CandlestickRenderer";

const CS: Candlestick = { open: 100, close: 105, high: 107, low: 99, mean: 103 };

describe("CandlestickRenderer", () => {
  it("renders open/close/high/low and the mean marker", () => {
    const { container } = render(() => (
      <CandlestickRenderer candlestick={CS} />
    ));
    const viz = container.querySelector(".sui-candlestick__viz")!;
    expect(viz.querySelector(".sui-candlestick__high")!.textContent).toContain(
      "107",
    );
    expect(viz.querySelector(".sui-candlestick__low")!.textContent).toContain(
      "99",
    );
    expect(viz.querySelector(".sui-candlestick__open")!.textContent).toContain(
      "100",
    );
    expect(viz.querySelector(".sui-candlestick__close")!.textContent).toContain(
      "105",
    );
    expect(viz.querySelector(".sui-candlestick__mean")!.textContent).toContain(
      "103",
    );
  });

  it("renders an em-dash placeholder when candlestick is null", () => {
    const { container } = render(() => (
      <CandlestickRenderer candlestick={null} />
    ));
    expect(container.querySelector(".sui-candlestick__empty")!.textContent).toBe(
      "—",
    );
    expect(container.querySelector(".sui-candlestick__viz")).toBeNull();
  });

  it("renders the label variant when a label is supplied", () => {
    const { container } = render(() => (
      <CandlestickRenderer label="Price" candlestick={CS} />
    ));
    const root = container.querySelector(".sui-candlestick")!;
    expect(root.classList.contains("sui-candlestick--with-label")).toBe(true);
    expect(root.querySelector(".sui-candlestick__label")!.textContent).toBe(
      "Price:",
    );
  });

  it("respects the precision prop", () => {
    const { container } = render(() => (
      <CandlestickRenderer candlestick={CS} precision={0} />
    ));
    // With 0 decimals the mean shows as an integer, no ".00".
    expect(
      container.querySelector(".sui-candlestick__mean")!.textContent,
    ).not.toContain(".");
  });

  it("uses a custom getBoxColor when provided", () => {
    const { container } = render(() => (
      <CandlestickRenderer candlestick={CS} getBoxColor={() => "rgb(1, 2, 3)"} />
    ));
    const box = container.querySelector(".sui-candlestick__box") as HTMLElement;
    expect(box.style.borderColor).toBe("rgb(1, 2, 3)");
  });
});
