import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { RemovableItemCard } from "./RemovableItemCard";
import { StatusCard, createStatusCard } from "./StatusCard";

// StatusCard measures its description with a ResizeObserver, which jsdom does
// not provide. Stub a no-op so the component mounts under the test environment.
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

describe("RemovableItemCard", () => {
  it("renders the title and no remove button without onRemove", () => {
    const { getByText, queryByTitle } = render(() => (
      <RemovableItemCard title="Alpha" />
    ));
    expect(getByText("Alpha")).toBeTruthy();
    expect(queryByTitle("Remove")).toBeNull();
  });

  it("renders a remove button that fires onRemove", () => {
    const onRemove = vi.fn();
    const { getByTitle } = render(() => (
      <RemovableItemCard title="Alpha" onRemove={onRemove} />
    ));
    fireEvent.click(getByTitle("Remove"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("renders optional details", () => {
    const { getByText } = render(() => (
      <RemovableItemCard title="Alpha" details={<span>extra</span>} />
    ));
    expect(getByText("extra")).toBeTruthy();
  });
});

describe("StatusCard", () => {
  it("renders the name and slotted status/meta content", () => {
    const { container, getByText } = render(() => (
      <StatusCard
        name="Task 1"
        status={<span>done</span>}
        progress={<span>50%</span>}
      />
    ));
    const root = container.querySelector(".sui-status-card")!;
    expect(root.querySelector(".sui-status-card__name")!.textContent).toBe(
      "Task 1",
    );
    expect(getByText("done")).toBeTruthy();
    expect(root.querySelector(".sui-status-card__row3")).toBeTruthy();
  });

  it("omits the meta row when no meta slots are given", () => {
    const { container } = render(() => <StatusCard name="Task" />);
    expect(container.querySelector(".sui-status-card__row3")).toBeNull();
  });

  it("flips active and clickable modifiers and fires onSelect", () => {
    const onSelect = vi.fn();
    const { container } = render(() => (
      <StatusCard name="Task" active onSelect={onSelect} />
    ));
    const root = container.querySelector(".sui-status-card")!;
    expect(root.classList.contains("sui-status-card--active")).toBe(true);
    expect(root.classList.contains("sui-status-card--clickable")).toBe(true);
    fireEvent.click(root);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("renders the description text when provided", () => {
    const { container } = render(() => (
      <StatusCard name="Task" description="the details" />
    ));
    expect(container.querySelector(".sui-status-card__desc")!.textContent).toBe(
      "the details",
    );
  });

  it("createStatusCard bakes defaults", () => {
    const Card = createStatusCard({ active: true });
    const { container } = render(() => <Card name="Baked" />);
    expect(
      container
        .querySelector(".sui-status-card")!
        .classList.contains("sui-status-card--active"),
    ).toBe(true);
  });
});
