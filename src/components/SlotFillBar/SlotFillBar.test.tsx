import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { SlotFillBar } from "./SlotFillBar";

const styleOf = (el: Element) => (el as HTMLElement).getAttribute("style") ?? "";

describe("SlotFillBar", () => {
  it("renders with the expected class", () => {
    const { container } = render(() => <SlotFillBar slots={10} done={0} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/sui-slot-fill-bar/);
  });

  it("done={3} slots={10} produces transform: scaleX(0.3) on the static layer", () => {
    const { container } = render(() => <SlotFillBar slots={10} done={3} />);
    const staticLayer = container.querySelector(".sui-slot-fill-bar__static")!;
    expect(styleOf(staticLayer)).toMatch(/scaleX\(0\.3\)/);
  });

  it("active doing produces clip-path inset(0 60% 0 30%) and the doing colour", () => {
    const { container } = render(() => (
      <SlotFillBar
        slots={10}
        done={3}
        active={{ index: 3, phase: "doing" }}
        doingColor="rgb(0, 0, 255)"
      />
    ));
    const overlay = container.querySelector(".sui-slot-fill-bar__overlay")!;
    const s = styleOf(overlay);
    expect(s).toMatch(/inset\(0 60% 0 30%\)/);
    expect(s).toMatch(/rgb\(0,\s*0,\s*255\)/);
  });

  it("phase done produces the done colour and a 0.6s background-color transition", () => {
    const { container } = render(() => (
      <SlotFillBar
        slots={10}
        done={3}
        active={{ index: 3, phase: "done" }}
        doneColor="rgb(0, 255, 0)"
      />
    ));
    const overlay = container.querySelector(".sui-slot-fill-bar__overlay")!;
    const s = styleOf(overlay);
    expect(s).toMatch(/rgb\(0,\s*255,\s*0\)/);
    expect(s).toMatch(/background-color\s+0\.6s\s+ease-in-out/);
  });

  it("phase doing produces a 0s background-color transition (snap)", () => {
    const { container } = render(() => (
      <SlotFillBar slots={10} done={3} active={{ index: 3, phase: "doing" }} />
    ));
    const overlay = container.querySelector(".sui-slot-fill-bar__overlay")!;
    const s = styleOf(overlay);
    expect(s).toMatch(/background-color\s+0s/);
  });

  it("active null produces an invisible overlay (clip-path inset 0 100% 0 0)", () => {
    const { container } = render(() => (
      <SlotFillBar slots={10} done={0} active={null} />
    ));
    const overlay = container.querySelector(".sui-slot-fill-bar__overlay")!;
    expect(styleOf(overlay)).toMatch(/inset\(0 100% 0 0%\)/);
  });

  it("clamps committed fraction to [0, 1]", () => {
    const { container: c1 } = render(() => <SlotFillBar slots={10} done={-5} />);
    expect(styleOf(c1.querySelector(".sui-slot-fill-bar__static")!)).toMatch(
      /scaleX\(0\)/,
    );
    const { container: c2 } = render(() => <SlotFillBar slots={10} done={50} />);
    expect(styleOf(c2.querySelector(".sui-slot-fill-bar__static")!)).toMatch(
      /scaleX\(1\)/,
    );
  });
});
