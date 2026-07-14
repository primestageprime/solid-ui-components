import { type Component, createSignal } from "solid-js";
import { MarkdownEditor } from "../../src/components/Markdown";

/**
 * MarkdownEditor showcase — closes the showcase gap so the layout-purity
 * migration (the 50/50 `display:grid` editor → the `Grid` primitive) is
 * visually verifiable. The `.sui-markdown` prose + the preview's own scroll
 * stay intrinsic.
 */
const SAMPLE = `# Markdown Editor

Type on the **left**, see the rendered preview on the **right**.

- bullet one
- bullet two

Inline \`code\` and _emphasis_ both render.`;

export const MarkdownEditorShowcase: Component = () => {
  const [value, setValue] = createSignal(SAMPLE);
  return (
    <div class="component-section">
      <h2>MarkdownEditor — Composed (Depth 2)</h2>
      <p class="text-meta">
        50/50 split: a monospace textarea beside a live <code>Markdown</code>{" "}
        preview. Two equal columns via the <code>Grid</code> primitive.
      </p>

      <div class="example-group">
        <h3>Editable</h3>
        <MarkdownEditor value={value()} onChange={setValue} />
      </div>
    </div>
  );
};
