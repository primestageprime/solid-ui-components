import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { NumberWithUnits } from "./NumberWithUnits";

// The component's only real decision is `formatted()`. Each branch of it is
// pinned below, plus the one inline-style carve-out.
describe("NumberWithUnits — value formatting", () => {
  const value = (c: HTMLElement) =>
    c.querySelector(".sui-num-with-units__value")?.textContent;

  it("renders an em dash for null and undefined", () => {
    const { container: a } = render(() => (
      <NumberWithUnits value={null} units="ppm" />
    ));
    const { container: b } = render(() => (
      <NumberWithUnits value={undefined} units="ppm" />
    ));
    expect(value(a)).toBe("—");
    expect(value(b)).toBe("—");
  });

  // The nullish guard is `v == null`, not a falsy check. Zero is a real
  // reading and must not render as "no data" — the plausible regression here
  // is someone "simplifying" it to `if (!v)`.
  it("renders zero as a value, not as missing data", () => {
    const { container } = render(() => (
      <NumberWithUnits value={0} units="ppm" />
    ));
    expect(value(container)).toBe("0");
  });

  it("applies precision to a numeric value", () => {
    const { container } = render(() => (
      <NumberWithUnits value={3.14159} units="g/kWh" precision={2} />
    ));
    expect(value(container)).toBe("3.14");
  });

  it("pads to the requested precision rather than only truncating", () => {
    const { container } = render(() => (
      <NumberWithUnits value={2} units="g/kWh" precision={3} />
    ));
    expect(value(container)).toBe("2.000");
  });

  it("stringifies a number with no precision rather than defaulting one", () => {
    const { container } = render(() => (
      <NumberWithUnits value={3.14159} units="g/kWh" />
    ));
    expect(value(container)).toBe("3.14159");
  });

  // The `typeof v === "number"` guard means precision is silently inert on a
  // pre-formatted string. That is deliberate — the caller has already chosen
  // the representation — but it surprises people, so it is pinned.
  it("ignores precision when the value is already a string", () => {
    const { container } = render(() => (
      <NumberWithUnits value="1.23456" units="g/kWh" precision={1} />
    ));
    expect(value(container)).toBe("1.23456");
  });

  it("renders the units alongside the value", () => {
    const { container } = render(() => (
      <NumberWithUnits value={5} units="mg/m³" />
    ));
    expect(
      container.querySelector(".sui-num-with-units__units")?.textContent,
    ).toBe("mg/m³");
  });
});

describe("NumberWithUnits — data-driven colour", () => {
  it("paints the value inline when a colour is supplied", () => {
    const { container } = render(() => (
      <NumberWithUnits value={5} units="ppm" color="rgb(255, 0, 0)" />
    ));
    const el = container.querySelector<HTMLElement>(
      ".sui-num-with-units__value",
    );
    expect(el?.style.color).toBe("rgb(255, 0, 0)");
  });

  // The carve-out is only licensed for a genuinely per-instance value, so the
  // default must be no inline style at all — not an empty or inherited one.
  it("writes no inline style when no colour is supplied", () => {
    const { container } = render(() => (
      <NumberWithUnits value={5} units="ppm" />
    ));
    const el = container.querySelector<HTMLElement>(
      ".sui-num-with-units__value",
    );
    expect(el?.getAttribute("style")).toBeNull();
  });
});
