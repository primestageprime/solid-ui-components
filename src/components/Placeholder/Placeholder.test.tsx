import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  Placeholder,
  FitPlaceholder,
  FillPlaceholder,
  BlockPlaceholder,
  MediumPlaceholder,
} from "./index";

const box = (c: HTMLElement) => c.querySelector(".sui-placeholder") as HTMLElement;

describe("Placeholder", () => {
  it("renders its label", () => {
    const { getByText } = render(() => <Placeholder label="Chart goes here" />);
    expect(getByText("Chart goes here")).toBeTruthy();
  });

  it("defaults to fill + block when no shape is given", () => {
    const { container } = render(() => <Placeholder label="x" />);
    const el = box(container);
    expect(el.classList.contains("sui-placeholder--fill")).toBe(true);
    expect(el.classList.contains("sui-placeholder--block")).toBe(true);
  });

  it("FitPlaceholder shrinkwraps on a single line", () => {
    const { container } = render(() => <FitPlaceholder label="tag" />);
    const el = box(container);
    expect(el.classList.contains("sui-placeholder--fit")).toBe(true);
    expect(el.classList.contains("sui-placeholder--line")).toBe(true);
  });

  it("FillPlaceholder fills width on a single line", () => {
    const { container } = render(() => <FillPlaceholder label="bar" />);
    const el = box(container);
    expect(el.classList.contains("sui-placeholder--fill")).toBe(true);
    expect(el.classList.contains("sui-placeholder--line")).toBe(true);
  });

  it("BlockPlaceholder fills width as a tall block", () => {
    const { container } = render(() => <BlockPlaceholder label="para" />);
    const el = box(container);
    expect(el.classList.contains("sui-placeholder--fill")).toBe(true);
    expect(el.classList.contains("sui-placeholder--block")).toBe(true);
  });

  it("a size preset applies the fill + size min-height classes", () => {
    const { container } = render(() => <MediumPlaceholder label="KPI" />);
    const el = box(container);
    expect(el.classList.contains("sui-placeholder--fill")).toBe(true);
    expect(el.classList.contains("sui-placeholder--md")).toBe(true);
  });
});
