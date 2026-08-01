// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// MarkdownEditor — Composed (Depth 2)
// Composes Markdown for preview. 50/50 split: textarea | preview.
// ============================================
import { type Component, mergeProps } from "solid-js";
import { Grid } from "../Layout/Grid";
import { Markdown } from "./Markdown";

export interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  class?: string;
}

export const MarkdownEditor: Component<MarkdownEditorProps> = (props) => {
  const cls = () => {
    const c = ["sui-markdown-editor"];
    if (props.class) c.push(props.class);
    return c.join(" ");
  };
  return (
    <Grid columns="1fr 1fr" gap="md" class={cls()}>
      <textarea
        class="sui-markdown-editor__textarea"
        rows={props.rows ?? 12}
        value={props.value}
        onInput={(e) => props.onChange(e.currentTarget.value)}
      />
      <div class="sui-markdown-editor__preview">
        <Markdown source={props.value} />
      </div>
    </Grid>
  );
};

export function createMarkdownEditor(
  defaults: Partial<MarkdownEditorProps>,
): Component<MarkdownEditorProps> {
  return (props) => <MarkdownEditor {...mergeProps(defaults, props)} />;
}
