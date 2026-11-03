import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { installFakeSizer, type FakeSizer } from "../../test-utils/fakeSizer";
import { installRects, rectOf } from "../../test-utils/fakeRects";
import { StepChain, type ChainStep } from "./StepChain";

// jsdom lays nothing out: size the probe's parts by attribute and the root by `rootWidth`.
let rootWidth = 1000;
let sizer: FakeSizer;
let restore: () => void;

beforeEach(() => {
  sizer = installFakeSizer();
  restore = installRects((el) => {
    const w = el.hasAttribute("data-a") ? 50
      : el.hasAttribute("data-r") ? 20
      : el.hasAttribute("data-head") ? 100
      : el.hasAttribute("data-more") ? 30
      : el.classList.contains("step-chain") ? rootWidth
      : null;
    return w === null ? null : rectOf({ left: 0, top: 0, width: w, height: 16 });
  });
});
afterEach(() => {
  restore();
  sizer.restore();
});

const steps = (n: number): ChainStep[] =>
  Array.from({ length: n }, (_, i) => ({ label: `$${i + 1}00`, span: i < n - 1 ? `${i + 1}mo` : undefined }));

const root = (c: HTMLElement) => c.querySelector<HTMLElement>(".step-chain")!;
const live = (c: HTMLElement) => c.querySelector(".step-chain__line")!;
const liveAmounts = (c: HTMLElement) =>
  Array.from(live(c).querySelectorAll(".step-chain__amt")).map((e) => e.textContent);

describe("StepChain", () => {
  it("case 1: everything fits, one line, every step", () => {
    const { container } = render(() => <StepChain name="Sara" tag="monthly" steps={steps(3)} />);
    expect(root(container).dataset.mode).toBe("one");
    expect(liveAmounts(container)).toEqual(["$100", "$200", "$300"]);
    expect(container.textContent).toContain("Sara");
    expect(container.textContent).toContain("monthly");
  });

  it("case 2: too narrow beside the name, the whole chain on its own line", () => {
    rootWidth = 260; // chain is 250 wide, head + chain is 358
    const { container } = render(() => <StepChain name="Peter" tag="bi-weekly" steps={steps(3)} />);
    expect(root(container).dataset.mode).toBe("two");
    expect(liveAmounts(container)).toHaveLength(3);
    expect(live(container).querySelector(".step-chain__more")).toBeNull();
  });

  it("case 3: first two steps, the count above an ellipsis, then the last", () => {
    rootWidth = 300;
    const { container } = render(() => <StepChain name="Michael" tag="bi-weekly" steps={steps(8)} />);
    expect(root(container).dataset.mode).toBe("fold");
    expect(liveAmounts(container)).toEqual(["$100", "$200", "$800"]);
    const more = live(container).querySelector(".step-chain__more")!;
    expect(more.querySelector("small")!.textContent).toBe("5 more");
    expect(more.querySelector("b")!.textContent).toBe("…");
  });

  it("re-folds when the container is resized", async () => {
    rootWidth = 1000;
    const { container } = render(() => <StepChain name="Sara" tag="monthly" steps={steps(8)} />);
    expect(root(container).dataset.mode).toBe("one");
    rootWidth = 300;
    await sizer.resize(root(container), { width: 300, height: 16 });
    expect(root(container).dataset.mode).toBe("fold");
    rootWidth = 1000;
    await sizer.resize(root(container), { width: 1000, height: 16 });
    expect(root(container).dataset.mode).toBe("one");
  });

  it("a closed chain ends in muted done; an open one in a bare arrow", () => {
    const a = render(() => <StepChain name="A" steps={steps(2)} ends />);
    expect(live(a.container).querySelector(".step-chain__done")?.textContent).toBe("done");
    a.unmount();
    const b = render(() => <StepChain name="B" steps={steps(2)} />);
    expect(live(b.container).querySelector(".step-chain__done")).toBeNull();
    expect(live(b.container).querySelectorAll(".step-chain__arrow")).toHaveLength(2);
  });

  it("the ellipsis opens a popover with the caption and every step; Escape closes", () => {
    rootWidth = 300;
    const { container } = render(() => <StepChain name="Michael" tag="bi-weekly" steps={steps(8)} />);
    const trigger = live(container).querySelector<HTMLElement>(".step-chain__more")!;
    expect(trigger.tagName).toBe("BUTTON");
    fireEvent.focus(trigger);
    const pop = document.querySelector(".step-chain__pop")!;
    expect(pop).toBeTruthy();
    expect(pop.querySelector(".step-chain__caption")!.textContent).toBe("Michael · bi-weekly · 8 steps");
    expect(pop.querySelectorAll(".step-chain__amt")).toHaveLength(8);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(document.querySelector(".step-chain__pop")).toBeNull();
  });
});
