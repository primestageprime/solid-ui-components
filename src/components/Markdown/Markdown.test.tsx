import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import {
  Markdown,
  createMarkdown,
  renderMarkdownHtml,
} from "./Markdown";
import { MarkdownEditor } from "./MarkdownEditor";

describe("renderMarkdownHtml", () => {
  it("renders h1-h3 headings", () => {
    const html = renderMarkdownHtml("# One\n## Two\n### Three");
    expect(html).toContain("<h1>One</h1>");
    expect(html).toContain("<h2>Two</h2>");
    expect(html).toContain("<h3>Three</h3>");
  });

  it("renders bold, italic, and inline code", () => {
    const html = renderMarkdownHtml("**b** *i* `c`");
    expect(html).toContain("<strong>b</strong>");
    expect(html).toContain("<em>i</em>");
    expect(html).toContain("<code>c</code>");
  });

  it("groups consecutive list items into a single ul", () => {
    const html = renderMarkdownHtml("- one\n- two");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>two</li>");
    expect(html.match(/<ul>/g)!.length).toBe(1);
  });

  it("wraps plain lines in paragraphs", () => {
    const html = renderMarkdownHtml("hello world");
    expect(html).toContain("<p>hello world</p>");
  });

  it("escapes HTML special characters in the source", () => {
    const html = renderMarkdownHtml("a < b & c");
    expect(html).toContain("&lt;");
    expect(html).toContain("&amp;");
  });
});

describe("Markdown", () => {
  it("renders parsed HTML into the container", () => {
    const { container } = render(() => <Markdown source="# Title" />);
    const root = container.querySelector(".sui-markdown")!;
    expect(root.querySelector("h1")!.textContent).toBe("Title");
  });

  it("createMarkdown bakes default props", () => {
    const Curried = createMarkdown({ class: "docs" });
    const { container } = render(() => <Curried source="text" />);
    expect(
      container.querySelector(".sui-markdown")!.classList.contains("docs"),
    ).toBe(true);
  });
});

describe("MarkdownEditor", () => {
  it("renders a textarea alongside a live preview", () => {
    const { container } = render(() => (
      <MarkdownEditor value="# Live" onChange={() => {}} />
    ));
    expect(
      container.querySelector(".sui-markdown-editor__textarea"),
    ).toBeTruthy();
    expect(
      container.querySelector(".sui-markdown-editor__preview h1")!.textContent,
    ).toBe("Live");
  });

  it("calls onChange as the textarea is edited", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <MarkdownEditor value="" onChange={onChange} />
    ));
    const ta = container.querySelector("textarea")!;
    fireEvent.input(ta, { target: { value: "new" } });
    expect(onChange).toHaveBeenCalledWith("new");
  });
});
