import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import {
  Checkbox,
  createCheckbox,
  CheckboxField,
  SmallCheckbox,
} from "./index";

describe("Checkbox", () => {
  it("renders an input[type=checkbox]", () => {
    const { container } = render(() => <Checkbox />);
    const input = container.querySelector("input")!;
    expect(input).toBeTruthy();
    expect(input.type).toBe("checkbox");
  });

  it("reflects the controlled checked prop", () => {
    const { container } = render(() => <Checkbox checked />);
    expect(container.querySelector<HTMLInputElement>("input")!.checked).toBe(
      true,
    );
  });

  it("size applies as a class", () => {
    const { container } = render(() => <Checkbox size="sm" />);
    expect(container.querySelector(".sui-checkbox--sm")).toBeTruthy();
  });

  it("onCheckedChange receives the new boolean", () => {
    let seen: boolean | undefined;
    const { container } = render(() => (
      <Checkbox onCheckedChange={(v) => (seen = v)} />
    ));
    fireEvent.click(container.querySelector("input")!);
    expect(seen).toBe(true);
  });

  it("createCheckbox bakes defaults", () => {
    const Small = createCheckbox({ size: "sm" });
    const { container } = render(() => <Small />);
    expect(container.querySelector(".sui-checkbox--sm")).toBeTruthy();
  });

  it("SmallCheckbox variant is small", () => {
    const { container } = render(() => <SmallCheckbox />);
    expect(container.querySelector(".sui-checkbox--sm")).toBeTruthy();
  });
});

describe("CheckboxField", () => {
  it("renders label, hint, and a checkbox tied by id", () => {
    const { container, getByText } = render(() => (
      <CheckboxField
        id="repo"
        label="Create the repo"
        hint="git init"
        checked
      />
    ));
    expect(getByText("Create the repo")).toBeTruthy();
    expect(getByText("git init")).toBeTruthy();
    const input = container.querySelector<HTMLInputElement>("input")!;
    expect(input.id).toBe("repo");
    expect(input.checked).toBe(true);
    expect(container.querySelector('label[for="repo"]')).toBeTruthy();
  });

  it("dispatches onChange when toggled", () => {
    let fired = 0;
    const { container } = render(() => (
      <CheckboxField id="ci" label="Wire CI" onChange={() => (fired += 1)} />
    ));
    fireEvent.click(container.querySelector("input")!);
    expect(fired).toBe(1);
  });
});
