import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { CodeBlock, createCodeBlock } from "./CodeBlock";

describe("CodeBlock", () => {
  it("renders a <pre> with the code-block class and string children", () => {
    const { container } = render(() => <CodeBlock>{'{ "a": 1 }'}</CodeBlock>);
    const root = container.firstElementChild!;
    expect(root.tagName).toBe("PRE");
    expect(root.className).toMatch(/sui-code-block/);
    expect(root.textContent).toBe('{ "a": 1 }');
  });

  it("defaults to md size", () => {
    const { container } = render(() => <CodeBlock>x</CodeBlock>);
    expect(container.firstElementChild!.className).toMatch(/sui-code-block--md/);
  });

  it("applies size variant", () => {
    const { container } = render(() => <CodeBlock size="lg">x</CodeBlock>);
    expect(container.firstElementChild!.className).toMatch(/sui-code-block--lg/);
  });

  it("createCodeBlock bakes defaults", () => {
    const Small = createCodeBlock({ size: "sm" });
    const { container } = render(() => <Small>x</Small>);
    expect(container.firstElementChild!.className).toMatch(/sui-code-block--sm/);
  });
});
