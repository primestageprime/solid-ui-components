import { describe, it, expect } from "vitest";
import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { Button, createButton } from "./Button";
import {
  DisclosureButton,
  ReservedDisclosureButton,
  TextButton,
} from "./variants";

describe("Button", () => {
  it("renders with default variant class", () => {
    const { container } = render(() => <Button>click</Button>);
    const btn = container.querySelector("button")!;
    expect(btn).toBeTruthy();
    expect(btn.textContent).toBe("click");
    expect(btn.className).toMatch(/sui-btn/);
  });

  it("applies the variant class", () => {
    const { container } = render(() => <Button variant="danger">x</Button>);
    expect(container.querySelector("button")!.className).toMatch(/danger/);
  });

  it("createButton produces a curried component with baked-in defaults", () => {
    const Danger = createButton({ variant: "danger" });
    const { container } = render(() => <Danger>x</Danger>);
    expect(container.querySelector("button")!.className).toMatch(/danger/);
  });
});

describe("Button tone matrix", () => {
  it("emits a tone class for every tone in the matrix", () => {
    const { container } = render(() => (
      <>
        <Button tone="accent">a</Button>
        <Button tone="outline">o</Button>
        <Button tone="muted">m</Button>
        <Button tone="danger">d</Button>
      </>
    ));
    expect(container.querySelector(".sui-btn--tone-accent")).toBeTruthy();
    expect(container.querySelector(".sui-btn--tone-outline")).toBeTruthy();
    expect(container.querySelector(".sui-btn--tone-muted")).toBeTruthy();
    expect(container.querySelector(".sui-btn--tone-danger")).toBeTruthy();
  });

  it("keeps the tone class alongside a curried variant's own class", () => {
    // TextButton bakes variant="text"; tone must survive as a runtime data
    // prop so an inline action can pick its colour per instance.
    const { container } = render(() => (
      <TextButton tone="danger">Delete</TextButton>
    ));
    const btn = container.querySelector("button");
    expect(btn?.classList.contains("sui-btn--text")).toBe(true);
    expect(btn?.classList.contains("sui-btn--tone-danger")).toBe(true);
  });
});

describe("DisclosureButton", () => {
  it("is a ghost button with no padding, pinned to 24px, and passes ARIA through", () => {
    const { container } = render(() => (
      <DisclosureButton aria-expanded={true} aria-label="Collapse Motor">
        v
      </DisclosureButton>
    ));
    const btn = container.querySelector("button") as HTMLButtonElement;
    expect(btn.classList.contains("sui-btn--ghost")).toBe(true);
    expect(btn.style.padding).toBe("0px");
    expect(btn.style.height).toBe("24px");
    expect(btn.style.visibility).toBe("");
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(btn.getAttribute("aria-label")).toBe("Collapse Motor");
  });

  it("has a reserved twin with the same box, hidden", () => {
    const { container } = render(() => (
      <ReservedDisclosureButton tabindex={-1}>v</ReservedDisclosureButton>
    ));
    const btn = container.querySelector("button") as HTMLButtonElement;
    expect(btn.style.padding).toBe("0px");
    expect(btn.style.height).toBe("24px");
    expect(btn.style.visibility).toBe("hidden");
  });
});

describe("Button onAction", () => {
  it("shows the spinner and disables itself while the work runs", async () => {
    let resolve!: () => void;
    let calls = 0;
    const { container } = render(() => (
      <Button
        onAction={() => {
          calls += 1;
          return new Promise<void>((r) => (resolve = r));
        }}
      >
        send
      </Button>
    ));
    const btn = container.querySelector("button")!;
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(btn.disabled).toBe(true);
    expect(container.querySelector(".sui-btn__spinner")).toBeTruthy();
    await waitFor(() => expect(calls).toBe(1));
    resolve();
    await waitFor(() => expect(btn.disabled).toBe(false));
    expect(container.querySelector(".sui-btn__spinner")).toBeNull();
  });

  it("with once, stays disabled after the work is sent", async () => {
    const { container } = render(() => (
      <Button once onAction={() => undefined}>
        send
      </Button>
    ));
    const btn = container.querySelector("button")!;
    fireEvent.click(btn);
    await waitFor(() => expect(container.querySelector(".sui-btn__spinner")).toBeNull());
    expect(btn.disabled).toBe(true);
  });

  it("still calls a plain onClick", () => {
    let clicked = 0;
    const { container } = render(() => (
      <Button onClick={() => (clicked += 1)}>x</Button>
    ));
    fireEvent.click(container.querySelector("button")!);
    expect(clicked).toBe(1);
  });
});
