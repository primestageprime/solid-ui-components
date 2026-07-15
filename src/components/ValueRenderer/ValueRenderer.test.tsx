import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ValueRenderer } from "./ValueRenderer";

describe("ValueRenderer default dispatch", () => {
  it("renders a string as plain value text", () => {
    const { container } = render(() => <ValueRenderer value="ONLINE" />);
    expect(container.querySelector(".sui-value__text")!.textContent).toBe(
      "ONLINE",
    );
  });

  it("renders a number with the configured precision", () => {
    const { container } = render(() => (
      <ValueRenderer value={1234.5} numberPrecision={2} />
    ));
    expect(container.querySelector(".sui-value__number")!.textContent).toBe(
      "1,234.50",
    );
  });

  it("renders a boolean and an em-dash for null", () => {
    const { container: b } = render(() => <ValueRenderer value={true} />);
    expect(b.querySelector(".sui-value__text")!.textContent).toBe("true");

    const { container: n } = render(() => <ValueRenderer value={null} />);
    expect(n.querySelector(".sui-value__empty")!.textContent).toBe("—");
  });

  it("renders a plain object as key/value entries", () => {
    const { container } = render(() => (
      <ValueRenderer value={{ temp: 45, active: true }} />
    ));
    const keys = container.querySelectorAll(".sui-value__entry-key");
    expect(Array.from(keys).map((k) => k.textContent)).toEqual([
      "temp:",
      "active:",
    ]);
  });

  it("stringifies non-plain objects (Date) via String()", () => {
    const d = new Date("2026-01-01T00:00:00.000Z");
    const { container } = render(() => <ValueRenderer value={d} />);
    expect(container.querySelector(".sui-value__text")!.textContent).toBe(
      String(d),
    );
  });
});

describe("ValueRenderer label + override", () => {
  it("renders a label cell when label is supplied", () => {
    const { container } = render(() => (
      <ValueRenderer label="Status" value="OK" />
    ));
    const root = container.querySelector(".sui-value")!;
    expect(root.classList.contains("sui-value--with-label")).toBe(true);
    expect(root.querySelector(".sui-value__label")!.textContent).toBe(
      "Status:",
    );
  });

  it("respects a renderValue override and defers on undefined", () => {
    const { container } = render(() => (
      <ValueRenderer
        value="ALARM"
        renderValue={(v) =>
          v === "ALARM" ? <span class="custom">!!</span> : undefined
        }
      />
    ));
    expect(container.querySelector(".custom")!.textContent).toBe("!!");
  });
});
