import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { installFakeSizer, type FakeSizer } from "../../test-utils/fakeSizer";
import { PayChain } from "./PayChain";

let sizer: FakeSizer;
beforeEach(() => { sizer = installFakeSizer(); });
afterEach(() => sizer.restore());

const live = (c: HTMLElement) => c.querySelector(".step-chain__line")!;

describe("PayChain", () => {
  it("words a monthly chain: suffix on the first, mo spans, gaps cleaned", () => {
    const { container } = render(() => (
      <PayChain
        name="Sara Lincoln"
        cadence="monthly"
        steps={[
          { amount_cents: 625_000, months: 6 },
          { amount_cents: 0, months: 0 },
          { amount_cents: 3_750_000, months: 1 },
          { amount_cents: 3_750_000, months: 2 },
          { amount_cents: 1_666_700 },
        ]}
      />
    ));
    const l = live(container);
    expect(Array.from(l.querySelectorAll(".step-chain__amt")).map((e) => e.textContent))
      .toEqual(["$6,250/mo", "$37,500", "$16,667"]);
    expect(Array.from(l.querySelectorAll(".step-chain__arrow small")).map((e) => e.textContent?.trim()))
      .toEqual(["6mo", "3mo", ""]);
    expect(l.querySelector(".step-chain__tag")!.textContent).toBe("monthly");
  });

  it("bi-weekly uses /biwk and wk", () => {
    const { container } = render(() => (
      <PayChain name="Peter" cadence="biweekly" ends steps={[{ amount_cents: 278_400, weeks: 4 }, { amount_cents: 385_700, weeks: 52 }]} />
    ));
    const l = live(container);
    expect(l.querySelector(".step-chain__amt")!.textContent).toBe("$2,784/biwk");
    expect(l.querySelector(".step-chain__tag")!.textContent).toBe("bi-weekly");
    expect(l.querySelector(".step-chain__done")!.textContent).toBe("done");
    expect(container.textContent).toContain("52wk");
  });
});
