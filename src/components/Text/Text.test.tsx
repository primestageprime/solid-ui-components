import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Text, createText } from "./Text";
import { TextLabel, EllipsizedTitle } from "./index";

describe("Text", () => {
  it("renders with the variant class", () => {
    const { container } = render(() => <Text variant="title">hi</Text>);
    expect(container.firstElementChild!.className).toMatch(/text--title/);
  });

  it("TextLabel curried variant", () => {
    const { container } = render(() => <TextLabel>label</TextLabel>);
    expect(container.firstElementChild!.className).toMatch(/text--label/);
  });

  it("EllipsizedTitle applies ellipsis style", () => {
    const { container } = render(() => <EllipsizedTitle>x</EllipsizedTitle>);
    const el = container.firstElementChild as HTMLElement;
    const style = el.getAttribute("style") ?? "";
    expect(style).toMatch(/ellipsis/);
    expect(style).toMatch(/nowrap/);
  });

  it("createText produces a curried component", () => {
    const Big = createText({ variant: "value" });
    const { container } = render(() => <Big>9</Big>);
    expect(container.firstElementChild!.className).toMatch(/text--value/);
  });
});
