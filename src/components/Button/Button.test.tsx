import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Button, createButton } from "./index";

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
