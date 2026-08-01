import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { FocusLabelBand, createFocusLabelBand } from "./FocusLabelBand";

describe("FocusLabelBand", () => {
  it("renders label content and the two bar slots", () => {
    const { container, getByText } = render(() => (
      <FocusLabelBand aboveBar={<span>above</span>} belowBar={<span>below</span>}>
        My Focus
      </FocusLabelBand>
    ));
    expect(container.querySelector(".sui-focus-label-band")).toBeTruthy();
    expect(getByText("My Focus")).toBeTruthy();
    expect(getByText("above")).toBeTruthy();
    expect(getByText("below")).toBeTruthy();
    expect(
      container.querySelectorAll(".sui-focus-label-band__bar").length,
    ).toBe(2);
  });

  it("exposes selected as a data attribute", () => {
    const { container } = render(() => (
      <FocusLabelBand selected>x</FocusLabelBand>
    ));
    const band = container.querySelector(".sui-focus-label-band")!;
    expect(band.getAttribute("data-selected")).toBe("");
  });

  it("is interactive only when onClick is wired", () => {
    const onClick = vi.fn();
    const { container } = render(() => (
      <>
        <FocusLabelBand onClick={onClick}>go</FocusLabelBand>
        <FocusLabelBand>inert</FocusLabelBand>
      </>
    ));
    const bands = container.querySelectorAll(".sui-focus-label-band");
    expect(bands[0].getAttribute("role")).toBe("button");
    expect(bands[0].getAttribute("tabindex")).toBe("0");
    expect(bands[1].getAttribute("role")).toBeNull();
    fireEvent.click(bands[0]);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("activates via the Enter key when interactive", () => {
    const onClick = vi.fn();
    const { container } = render(() => (
      <FocusLabelBand onClick={onClick}>go</FocusLabelBand>
    ));
    const band = container.querySelector(".sui-focus-label-band")!;
    fireEvent.keyDown(band, { key: "Enter" });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("createFocusLabelBand bakes override defaults", () => {
    const Curried = createFocusLabelBand({ class: "rail-band" });
    const { container } = render(() => <Curried selected>x</Curried>);
    const band = container.querySelector(".sui-focus-label-band")!;
    expect(band.classList.contains("rail-band")).toBe(true);
    expect(band.getAttribute("data-selected")).toBe("");
  });
});
