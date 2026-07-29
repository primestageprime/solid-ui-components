import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { DigitRoller } from "./DigitRoller";

describe("DigitRoller", () => {
  it("renders static when mounted with no history", () => {
    const { container } = render(() => <DigitRoller value="42" />);
    expect(container.textContent).toContain("4");
    expect(container.textContent).toContain("2");
  });

  it("auto-rolls on value change with NO previousValue prop (default behavior)", () => {
    const [value, setValue] = createSignal("1");
    const { container } = render(() => <DigitRoller value={value()} />);
    setValue("2");
    // The odometer strip is built from the auto-tracked previous value:
    // path 1→2 renders both digits in one column strip.
    const strip = container.querySelector(".digit-roller__strip");
    expect(strip?.textContent).toBe("12");
  });

  it("explicit previousValue prop overrides auto-tracking", () => {
    const { container } = render(() => (
      <DigitRoller value="5" previousValue="3" animate />
    ));
    const strip = container.querySelector(".digit-roller__strip");
    expect(strip?.textContent).toBe("345"); // odometer path 3→4→5
  });

  it("animate={false} disables the roll", () => {
    const [value, setValue] = createSignal("1");
    const { container } = render(() => (
      <DigitRoller value={value()} animate={false} />
    ));
    setValue("2");
    const strip = container.querySelector(".digit-roller__strip");
    expect(strip?.textContent).toBe("2"); // static: current digit only
  });

  it("does NOT replay the roll when re-rendered with an EQUAL value (upstream identity churn)", async () => {
    const raf2 = () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
    const [tick, setTick] = createSignal(0);
    const [n, setN] = createSignal("1");
    // value depends on BOTH signals — `tick` models a parent rebuilding its
    // props object while the derived string stays equal (TagPill's tag).
    const { container } = render(() => (
      // biome-ignore lint/complexity/noCommaOperator: deliberate — reading `tick()` for its dependency alone is the whole point of the test; the comma keeps the subscription while the rendered value stays `n()`.
      <DigitRoller value={(tick(), n())} />
    ));
    setN("2");
    await raf2();
    const strip = () =>
      container.querySelector<HTMLElement>(".digit-roller__strip")!;
    expect(strip().style.transform).toBe("translateY(-1em)"); // rolled 1→2
    setTick(1); // spurious churn — value still "2"
    await raf2();
    // Without the memo boundary this reset to 0 and replayed the 1→2 roll.
    expect(strip().style.transform).toBe("translateY(-1em)");
  });

  it("SURVIVAL CONTRACT: the same instance must receive the change — this is what a <For> remount breaks", () => {
    const [value, setValue] = createSignal("8");
    const { container } = render(() => <DigitRoller value={value()} />);
    const before = container.querySelector(".digit-roller");
    setValue("9");
    const after = container.querySelector(".digit-roller");
    // Identity assertion: same DOM node across the change (no remount) …
    expect(after).toBe(before);
    // … which is exactly why the roll history exists:
    expect(container.querySelector(".digit-roller__strip")?.textContent).toBe(
      "89",
    );
  });
});
