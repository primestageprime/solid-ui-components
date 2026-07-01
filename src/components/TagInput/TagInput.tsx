// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// TagInput — Atomic (Depth 1)
// Owns CSS (TagInput.css), no component imports.
// Chip row + autocomplete text input for tag editing.
// ============================================
import { type Component, For, Show, createSignal, createMemo } from "solid-js";
import "./TagInput.css";

export interface TagInputProps {
  tags: string[];
  suggestions: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
  autofocus?: boolean;
}

const normalize = (tag: string) => tag.trim().toLowerCase();

export const TagInput: Component<TagInputProps> = (props) => {
  const [text, setText] = createSignal("");
  const [showSuggestions, setShowSuggestions] = createSignal(false);
  let inputRef: HTMLInputElement | undefined;

  const filteredSuggestions = createMemo(() => {
    const query = normalize(text());
    if (query === "") return [];
    const already = new Set(props.tags.map(normalize));
    return props.suggestions
      .filter((s) => {
        const n = normalize(s);
        return n.startsWith(query) && !already.has(n);
      })
      .slice(0, 8);
  });

  const commitTag = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") return;
    const already = new Set(props.tags.map(normalize));
    if (already.has(normalize(trimmed))) {
      setText("");
      return;
    }
    props.onAdd(trimmed);
    setText("");
    setShowSuggestions(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
      if (text().trim() !== "") {
        e.preventDefault();
        commitTag(text());
      }
    } else if (
      e.key === "Backspace" &&
      text() === "" &&
      props.tags.length > 0
    ) {
      e.preventDefault();
      props.onRemove(props.tags[props.tags.length - 1]);
    }
  };

  return (
    <div class="tag-input">
      <div class="tag-input__chips">
        <For each={props.tags}>
          {(tag) => (
            <span class="tag-input__chip">
              {tag}
              <button
                type="button"
                class="tag-input__chip-remove"
                onClick={() => props.onRemove(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          )}
        </For>
        <input
          ref={inputRef}
          class="tag-input__input"
          type="text"
          value={text()}
          placeholder={props.placeholder ?? "Add a tag..."}
          autofocus={props.autofocus}
          onInput={(e) => {
            setText(e.currentTarget.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
          onKeyDown={onKeyDown}
        />
      </div>
      <Show when={showSuggestions() && filteredSuggestions().length > 0}>
        <div class="tag-input__suggestions">
          <For each={filteredSuggestions()}>
            {(s) => (
              <button
                type="button"
                class="tag-input__suggestion"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commitTag(s);
                }}
              >
                {s}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
