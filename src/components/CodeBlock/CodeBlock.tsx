// ============================================
// CodeBlock — Atomic (Depth 1)
// Owns CSS (CodeBlock.css), no component imports.
// Recessed, dark, monospace block for raw code / JSON.
//   <CodeBlock>{someString}</CodeBlock>
// Preserves whitespace/newlines, scrolls horizontally on
// overflow. Factory: createCodeBlock() for curried variants.
// ============================================
import { Component, JSX, mergeProps, splitProps } from "solid-js";
import "./CodeBlock.css";

export interface CodeBlockProps extends JSX.HTMLAttributes<HTMLPreElement> {
  /** Text scale. Default "md". */
  size?: "sm" | "md" | "lg";
}

export const CodeBlock: Component<CodeBlockProps> = (props) => {
  const [local, others] = splitProps(props, ["size", "class", "children"]);

  const classes = () => {
    const classList = ["sui-code-block"];
    classList.push(`sui-code-block--${local.size ?? "md"}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <pre class={classes()} {...others}>
      {local.children}
    </pre>
  );
};

export function createCodeBlock(
  defaults: Partial<Omit<CodeBlockProps, "children">>,
): Component<CodeBlockProps> {
  return (props) => <CodeBlock {...mergeProps(defaults, props)} />;
}
