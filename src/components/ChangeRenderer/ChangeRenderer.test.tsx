import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ChangeRenderer } from "./ChangeRenderer";

describe("ChangeRenderer", () => {
  it("renders the before and after values", () => {
    const { container } = render(() => (
      <ChangeRenderer label="Count" before={12} after={15} />
    ));
    expect(container.textContent).toContain("12");
    expect(container.textContent).toContain("15");
  });

  it("renders the label when supplied", () => {
    const { container } = render(() => (
      <ChangeRenderer label="Count" before={1} after={2} />
    ));
    expect(container.textContent).toContain("Count");
  });

  it("renders a default arrow glyph between the two sides", () => {
    const { container } = render(() => (
      <ChangeRenderer before="A" after="B" />
    ));
    expect(container.textContent).toContain("→");
  });

  it("accepts a custom arrow element", () => {
    const { container } = render(() => (
      <ChangeRenderer before="A" after="B" arrow={<span>{"==>"}</span>} />
    ));
    expect(container.textContent).toContain("==>");
  });

  it("applies a custom class to the outer container", () => {
    const { container } = render(() => (
      <ChangeRenderer before={1} after={2} class="my-change" />
    ));
    expect(container.querySelector(".my-change")).toBeTruthy();
  });
});
