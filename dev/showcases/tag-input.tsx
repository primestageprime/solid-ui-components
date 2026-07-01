import { type Component, createSignal } from "solid-js";
import { TagInput } from "../../src/components/TagInput";

export const TagInputShowcase: Component = () => {
  const [tags, setTags] = createSignal<string[]>(["solid", "ssr"]);
  return (
    <div class="component-section">
      <h2>TagInput — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Inline pill-style tag editor. Caller owns the tag list; component emits{" "}
        <code>onAdd</code> / <code>onRemove</code>.
      </p>
      <div class="example-group" style={{ "max-width": "480px" }}>
        <TagInput
          tags={tags()}
          suggestions={[
            "typescript",
            "react",
            "vue",
            "svelte",
            "kobalte",
            "solid",
            "ssr",
            "edge",
          ]}
          placeholder="add a tag…"
          onAdd={(t) => setTags((cur) => (cur.includes(t) ? cur : [...cur, t]))}
          onRemove={(t) => setTags((cur) => cur.filter((x) => x !== t))}
        />
      </div>
    </div>
  );
};
