import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { EntityCard } from "./index";

describe("EntityCard", () => {
  it("renders the required identifier region", () => {
    const { container, getByText } = render(() => (
      <EntityCard identifier="Pacific Trader" />
    ));
    expect(getByText("Pacific Trader")).toBeTruthy();
    expect(container.querySelector(".sui-entity-card__id")).toBeTruthy();
  });

  it("omits the status region when status is absent or empty", () => {
    const { container } = render(() => <EntityCard identifier="x" status="" />);
    expect(container.querySelector(".sui-entity-card__status")).toBeNull();
  });

  it("collapses the bottom row when timing/progress/counts are all absent", () => {
    const { container } = render(() => <EntityCard identifier="x" />);
    expect(container.querySelector(".sui-entity-card__bottom")).toBeNull();
  });

  it("renders the bottom row when any bottom region is present", () => {
    const { container, getByText } = render(() => (
      <EntityCard identifier="x" counts="3 ⚠" />
    ));
    expect(container.querySelector(".sui-entity-card__bottom")).toBeTruthy();
    expect(getByText("3 ⚠")).toBeTruthy();
  });

  it("exposes button semantics and pressed state only when clickable", () => {
    const { container } = render(() => (
      <EntityCard identifier="x" selected onClick={() => {}} />
    ));
    const card = container.querySelector(".sui-entity-card") as HTMLElement;
    expect(card.getAttribute("role")).toBe("button");
    expect(card.getAttribute("aria-pressed")).toBe("true");
    expect(card.classList.contains("sui-entity-card--selected")).toBe(true);
  });

  it("fires onClick via keyboard (Enter) when interactive", () => {
    let clicks = 0;
    const { container } = render(() => (
      <EntityCard identifier="x" onClick={() => (clicks += 1)} />
    ));
    const card = container.querySelector(".sui-entity-card") as HTMLElement;
    fireEvent.keyDown(card, { key: "Enter" });
    expect(clicks).toBe(1);
  });

  it("renders the remove control and stops propagation to onClick", () => {
    let clicks = 0;
    let removed = 0;
    const { container } = render(() => (
      <EntityCard
        identifier="x"
        onClick={() => (clicks += 1)}
        onRemove={() => (removed += 1)}
      />
    ));
    const remove = container.querySelector(".sui-entity-card__remove") as HTMLElement;
    expect(remove).toBeTruthy();
    fireEvent.click(remove);
    expect(removed).toBe(1);
    expect(clicks).toBe(0);
  });
});
