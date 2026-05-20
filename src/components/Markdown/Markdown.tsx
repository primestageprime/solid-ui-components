// ============================================
// Markdown — Atomic (Depth 1)
// Owns CSS (Markdown.css), no component imports.
// Tiny markdown viewer supporting h1-h3, ul, **bold**, *italic*, `code`,
// and paragraph breaks. Extracted from the inline SimpleMarkdown in
// dside-ui DesignView.
// ============================================
import { Component, mergeProps } from "solid-js";
import "./Markdown.css";

export interface MarkdownProps {
  source: string;
  class?: string;
}

function renderInline(s: string): string {
  let out = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return out;
}

export function renderMarkdownHtml(source: string): string {
  const lines = source.split("\n");
  const out: string[] = [];
  let inList = false;
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flushParagraph();
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushParagraph();
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      const lvl = h[1].length;
      out.push(`<h${lvl}>${renderInline(h[2])}</h${lvl}>`);
      continue;
    }
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) {
      flushParagraph();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${renderInline(li[1])}</li>`);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  if (inList) out.push("</ul>");
  return out.join("\n");
}

export const Markdown: Component<MarkdownProps> = (props) => {
  const cls = () => {
    const c = ["sui-markdown"];
    if (props.class) c.push(props.class);
    return c.join(" ");
  };
  return <div class={cls()} innerHTML={renderMarkdownHtml(props.source)} />;
};

export function createMarkdown(
  defaults: Partial<MarkdownProps>,
): Component<MarkdownProps> {
  return (props) => <Markdown {...mergeProps(defaults, props)} />;
}
