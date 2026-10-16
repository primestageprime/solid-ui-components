import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { createThreeSlotRow, threeSlotColumns } from "./ThreeSlotRow";
import { ThreeSlotRow } from "./variants";

const slots = (root: HTMLElement) => ({
  frame: root.querySelector<HTMLElement>("[data-three-slot-row]")!,
  start: root.querySelector<HTMLElement>('[data-slot="start"]')!,
  center: root.querySelector<HTMLElement>('[data-slot="center"]')!,
  end: root.querySelector<HTMLElement>('[data-slot="end"]')!,
});

describe("ThreeSlotRow", () => {
  it("puts each slot in its own cell, in start | center | end order", () => {
    const { container } = render(() => (
      <ThreeSlotRow start="Logo" center="Nav" end="User" />
    ));
    const s = slots(container);
    expect(s.start.textContent).toBe("Logo");
    expect(s.center.textContent).toBe("Nav");
    expect(s.end.textContent).toBe("User");
    expect([...s.frame.children]).toEqual([s.start, s.center, s.end]);
  });

  it("gives the centre a shrinkable 1fr track so a self-measuring child can fold", () => {
    const { container } = render(() => <ThreeSlotRow center="Nav" />);
    expect(slots(container).frame.style.gridTemplateColumns).toBe(
      "auto minmax(0, 1fr) auto",
    );
  });

  it("createThreeSlotRow bakes a fixed start width into the track list", () => {
    const Fixed = createThreeSlotRow({ startWidth: "160px" });
    const { container } = render(() => <Fixed start="Logo" />);
    expect(slots(container).frame.style.gridTemplateColumns).toBe(
      threeSlotColumns("160px"),
    );
    expect(threeSlotColumns("160px")).toBe("160px minmax(0, 1fr) auto");
  });

  it("centres the centre slot and packs the end slot to the end", () => {
    const { container } = render(() => <ThreeSlotRow center="Nav" end="User" />);
    const s = slots(container);
    expect(s.center.className).toContain("row--justify-center");
    expect(s.end.className).toContain("row--justify-end");
    expect(s.end.className).not.toContain("row--wrap");
  });
});
