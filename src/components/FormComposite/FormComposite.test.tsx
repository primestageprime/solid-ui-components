import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { FormComposite, createFormComposite } from "./FormComposite";

describe("FormComposite", () => {
  it("renders identity and schedule slots side by side", () => {
    const { container } = render(() => (
      <FormComposite
        identity={<span class="id-content">name + amount</span>}
        schedule={<span class="sched-content">day picker</span>}
      />
    ));
    const identity = container.querySelector(".sui-form-composite__identity")!;
    const schedule = container.querySelector(".sui-form-composite__schedule")!;
    expect(identity.querySelector(".id-content")!.textContent).toBe(
      "name + amount",
    );
    expect(schedule.querySelector(".sched-content")!.textContent).toBe(
      "day picker",
    );
  });

  it("omits an empty slot's wrapper entirely", () => {
    const { container } = render(() => (
      <FormComposite identity={<span>only identity</span>} />
    ));
    expect(
      container.querySelector(".sui-form-composite__identity"),
    ).toBeTruthy();
    expect(container.querySelector(".sui-form-composite__schedule")).toBeNull();
  });

  it("sets the responsive break CSS var", () => {
    const { container } = render(() => (
      <FormComposite identity={<span>x</span>} breakWidth="44rem" />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--fc-break")).toBe("44rem");
    expect(root.className).toContain("sui-form-composite");
  });

  it("createFormComposite bakes defaults", () => {
    const Curried = createFormComposite({ breakWidth: "20rem" });
    const { container } = render(() => <Curried identity={<span>x</span>} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--fc-break")).toBe("20rem");
  });
});

describe("FormComposite amounts slot", () => {
  it("renders [identity][amounts][schedule] in order, amounts atomic", () => {
    const { container } = render(() => (
      <FormComposite
        identity={<span>name</span>}
        amounts={<span class="trio">min typical max</span>}
        schedule={<span>cadence</span>}
      />
    ));
    const root = container.firstElementChild!;
    const classes = [...root.children].map((c) => c.className);
    expect(classes).toEqual([
      "sui-form-composite__identity",
      "sui-form-composite__amounts",
      "sui-form-composite__schedule",
    ]);
    expect(
      root.querySelector(".sui-form-composite__amounts .trio"),
    ).toBeTruthy();
  });
});

describe("FormComposite stacked", () => {
  it("the stacked prop forces the row-per-block arrangement class", async () => {
    const { render } = await import("@solidjs/testing-library");
    const { FormComposite } = await import("./FormComposite");
    const { container } = render(() => (
      <FormComposite stacked identity={<input />} schedule={<div>grid</div>} />
    ));
    const root = container.querySelector(".sui-form-composite")!;
    expect(root.classList.contains("sui-form-composite--stacked")).toBe(true);
  });
});
