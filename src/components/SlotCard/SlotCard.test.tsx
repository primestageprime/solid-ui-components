import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  TitleStatus,
  TitleDotsMeta,
  DenseStatusRow,
  PickCard,
  type SlotValues,
} from "./index";

describe("SlotCard", () => {
  it("renders a shell with a max-width cap that defaults to the baked 40ch", () => {
    const { container } = render(() => (
      <TitleStatus values={{ name: { text: "Pacific Trader" } }} />
    ));
    const shell = container.querySelector(".sui-slot-card__shell") as HTMLElement;
    expect(shell).toBeTruthy();
    expect(shell.style.maxWidth).toBe("40ch");
  });

  it("coerces a numeric maxWidth override to px", () => {
    const { container } = render(() => (
      <TitleStatus maxWidth={640} values={{ name: { text: "Pacific Trader" } }} />
    ));
    const shell = container.querySelector(".sui-slot-card__shell") as HTMLElement;
    expect(shell.style.maxWidth).toBe("640px");
  });

  it("renders only the slots present in values", () => {
    const { getByText, queryByText } = render(() => (
      <TitleStatus
        values={{
          name: { text: "Aframax Horizon" },
          status: { tone: "success", label: "complete" },
        }}
      />
    ));
    expect(getByText("complete")).toBeTruthy();
    expect(queryByText("xbox5-1")).toBeNull();
  });

  it("paints an accent icon slot by tone via a modifier class, not inline style", () => {
    const { container } = render(() => (
      <DenseStatusRow
        values={
          {
            icon: { name: "check", tone: "success" },
            name: { text: "Pacific Trader" },
          } as SlotValues
        }
      />
    ));
    const icon = container.querySelector(".sui-slot-card__slot-icon--success");
    expect(icon).toBeTruthy();
  });

  it("renders labeled indicator dots for the dots slot", () => {
    const { getByText } = render(() => (
      <TitleDotsMeta
        values={{
          name: { text: "Pacific Trader" },
          dots: [
            { label: "NOx", tone: "danger" },
            { label: "ROG", tone: "success" },
          ],
        }}
      />
    ));
    expect(getByText("NOx")).toBeTruthy();
    expect(getByText("ROG")).toBeTruthy();
  });

  it("shows the corner badge and remove affordance only when configured and wired", () => {
    let removed = false;
    const { container } = render(() => (
      <PickCard
        values={{ text: "job-42" }}
        corner="12"
        onRemove={() => {
          removed = true;
        }}
      />
    ));
    expect(container.querySelector(".sui-slot-card__corner")?.textContent).toBe("12");
    const remove = container.querySelector(".sui-slot-card__remove") as HTMLElement;
    expect(remove).toBeTruthy();
    remove.click();
    expect(removed).toBe(true);
  });
});
