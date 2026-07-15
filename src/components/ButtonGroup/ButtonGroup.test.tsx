import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  ButtonGroup,
  VerticalButtonGroup,
  BorderedButtonGroup,
  createButtonGroup,
} from "./index";

describe("ButtonGroup", () => {
  it("renders the group role with default horizontal md gap", () => {
    const { container } = render(() => <ButtonGroup>btns</ButtonGroup>);
    const group = container.querySelector(".sui-btn-group")!;
    expect(group.getAttribute("role")).toBe("group");
    expect(group.classList.contains("sui-btn-group--vertical")).toBe(false);
    expect(group.classList.contains("sui-btn-group--gap-md")).toBe(true);
  });

  it("VerticalButtonGroup bakes the vertical orientation", () => {
    const { container } = render(() => <VerticalButtonGroup>x</VerticalButtonGroup>);
    const group = container.querySelector(".sui-btn-group")!;
    expect(group.classList.contains("sui-btn-group--vertical")).toBe(true);
  });

  it("BorderedButtonGroup bakes the bordered modifier", () => {
    const { container } = render(() => <BorderedButtonGroup>x</BorderedButtonGroup>);
    const group = container.querySelector(".sui-btn-group")!;
    expect(group.classList.contains("sui-btn-group--bordered")).toBe(true);
  });

  it("createButtonGroup merges gap/tone defaults without clobbering call-site class", () => {
    const Curried = createButtonGroup({ gap: "lg", tone: "muted" });
    const { container } = render(() => <Curried class="my-toolbar">x</Curried>);
    const group = container.querySelector(".sui-btn-group")!;
    expect(group.classList.contains("sui-btn-group--gap-lg")).toBe(true);
    expect(group.classList.contains("sui-btn-group--tone-muted")).toBe(true);
    expect(group.classList.contains("my-toolbar")).toBe(true);
  });

  it("renders its children", () => {
    const { getByText } = render(() => (
      <ButtonGroup>
        <button>one</button>
        <button>two</button>
      </ButtonGroup>
    ));
    expect(getByText("one")).toBeTruthy();
    expect(getByText("two")).toBeTruthy();
  });
});
