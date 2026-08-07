import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import {
  InfoAlert,
  WarningAlert,
  EmptyState,
  MutedEmptyState,
} from "./variants";
import { createAlertBox } from "./AlertBox";
import { createEmptyState } from "./EmptyState";
import { installFakeSizer, type FakeSizer } from "../../test-utils";

// Some composed Surface/Layout primitives observe size with ResizeObserver,
// which jsdom does not provide. Stub a no-op so components mount.
let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

describe("AlertBox variants", () => {
  it("renders title, description and slotted children", () => {
    const { getByText } = render(() => (
      <InfoAlert title="Heads up" description="details here">
        <span>extra</span>
      </InfoAlert>
    ));
    expect(getByText("Heads up")).toBeTruthy();
    expect(getByText("details here")).toBeTruthy();
    expect(getByText("extra")).toBeTruthy();
  });

  it("renders an action slot whose control fires", () => {
    const onClick = vi.fn();
    const { getByText } = render(() => (
      <WarningAlert
        title="Careful"
        action={<button onClick={onClick}>Undo</button>}
      />
    ));
    fireEvent.click(getByText("Undo"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("createAlertBox merges call-site props over baked defaults", () => {
    const Custom = createAlertBox({ variant: "success", title: "Baked" });
    const { getByText } = render(() => <Custom description="live" />);
    expect(getByText("Baked")).toBeTruthy();
    expect(getByText("live")).toBeTruthy();
  });
});

describe("EmptyState variants", () => {
  it("renders the message and an optional icon", () => {
    const { getByText } = render(() => (
      <EmptyState message="Nothing yet" icon={<span>ic</span>} />
    ));
    expect(getByText("Nothing yet")).toBeTruthy();
    expect(getByText("ic")).toBeTruthy();
  });

  it("prefers children over the message slot", () => {
    const { getByText, queryByText } = render(() => (
      <MutedEmptyState message="ignored">
        <span>custom body</span>
      </MutedEmptyState>
    ));
    expect(getByText("custom body")).toBeTruthy();
    expect(queryByText("ignored")).toBeNull();
  });

  it("createEmptyState bakes size/variant defaults", () => {
    const Big = createEmptyState({ size: "lg", variant: "accent" });
    const { getByText } = render(() => <Big message="Empty large" />);
    expect(getByText("Empty large")).toBeTruthy();
  });
});
