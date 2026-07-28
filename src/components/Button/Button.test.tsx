import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Button, createButton } from "./Button";
import { TextButton } from "./variants";

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
