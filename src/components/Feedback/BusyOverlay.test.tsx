import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { BusyOverlay } from "./BusyOverlay";

const overlay = (c: HTMLElement) => c.querySelector<HTMLElement>(".sui-busy-overlay");

describe("BusyOverlay", () => {
  it("renders a spinner and announces itself as busy", () => {
    const { container } = render(() => <BusyOverlay />);
    const el = overlay(container);
    expect(el).not.toBeNull();
    expect(el?.getAttribute("role")).toBe("status");
    expect(el?.getAttribute("aria-busy")).toBe("true");
    // The spinner icon is the one that animates itself (Icon.tsx).
    expect(container.querySelector(".jtf-icon--spinning")).not.toBeNull();
  });

  it("shows a label when given one, and nothing extra when not", () => {
    const { container: bare } = render(() => <BusyOverlay />);
    expect(bare.querySelector(".sui-busy-overlay__label")).toBeNull();

    const { container: labelled } = render(() => <BusyOverlay label="Cropping" />);
    expect(labelled.querySelector(".sui-busy-overlay__label")?.textContent).toBe("Cropping");
  });
});
