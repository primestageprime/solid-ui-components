import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { TagInput } from "./TagInput";

const input = () =>
  document.querySelector<HTMLInputElement>(".tag-input__input")!;
const chips = () =>
  [...document.querySelectorAll(".tag-input__chip")].map(
    (c) => c.textContent?.replace("×", "").trim() ?? "",
  );
const suggestions = () =>
  [...document.querySelectorAll(".tag-input__suggestion")].map(
    (s) => s.textContent ?? "",
  );

describe("TagInput", () => {
  it("renders a chip per tag", () => {
    render(() => (
      <TagInput
        tags={["alpha", "bravo"]}
        suggestions={[]}
        onAdd={() => {}}
        onRemove={() => {}}
      />
    ));
    expect(chips()).toEqual(["alpha", "bravo"]);
  });

  it("uses the default placeholder, overridable via prop", () => {
    render(() => (
      <TagInput
        tags={[]}
        suggestions={[]}
        onAdd={() => {}}
        onRemove={() => {}}
        placeholder="Type here"
      />
    ));
    expect(input().placeholder).toBe("Type here");
  });

  it("commits a tag on Enter and clears the input", () => {
    const onAdd = vi.fn();
    render(() => (
      <TagInput tags={[]} suggestions={[]} onAdd={onAdd} onRemove={() => {}} />
    ));
    fireEvent.input(input(), { target: { value: "charlie" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onAdd).toHaveBeenCalledWith("charlie");
    expect(input().value).toBe("");
  });

  it("commits on comma as well", () => {
    const onAdd = vi.fn();
    render(() => (
      <TagInput tags={[]} suggestions={[]} onAdd={onAdd} onRemove={() => {}} />
    ));
    fireEvent.input(input(), { target: { value: "delta" } });
    fireEvent.keyDown(input(), { key: "," });
    expect(onAdd).toHaveBeenCalledWith("delta");
  });

  it("does not commit whitespace-only input", () => {
    const onAdd = vi.fn();
    render(() => (
      <TagInput tags={[]} suggestions={[]} onAdd={onAdd} onRemove={() => {}} />
    ));
    fireEvent.input(input(), { target: { value: "   " } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("ignores a duplicate tag (case-insensitive) and just clears the input", () => {
    const onAdd = vi.fn();
    render(() => (
      <TagInput
        tags={["Alpha"]}
        suggestions={[]}
        onAdd={onAdd}
        onRemove={() => {}}
      />
    ));
    fireEvent.input(input(), { target: { value: "  alpha " } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onAdd).not.toHaveBeenCalled();
    expect(input().value).toBe("");
  });

  it("removes the last tag on Backspace when the input is empty", () => {
    const onRemove = vi.fn();
    render(() => (
      <TagInput
        tags={["alpha", "bravo"]}
        suggestions={[]}
        onAdd={() => {}}
        onRemove={onRemove}
      />
    ));
    fireEvent.keyDown(input(), { key: "Backspace" });
    expect(onRemove).toHaveBeenCalledWith("bravo");
  });

  it("does not remove on Backspace while the input has text", () => {
    const onRemove = vi.fn();
    render(() => (
      <TagInput
        tags={["alpha"]}
        suggestions={[]}
        onAdd={() => {}}
        onRemove={onRemove}
      />
    ));
    fireEvent.input(input(), { target: { value: "x" } });
    fireEvent.keyDown(input(), { key: "Backspace" });
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("removes a tag when its chip × button is clicked", () => {
    const onRemove = vi.fn();
    render(() => (
      <TagInput
        tags={["alpha", "bravo"]}
        suggestions={[]}
        onAdd={() => {}}
        onRemove={onRemove}
      />
    ));
    const removeButtons = document.querySelectorAll(".tag-input__chip-remove");
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith("alpha");
  });

  it("suggests prefix matches, excluding already-applied tags, capped at 8", () => {
    render(() => (
      <TagInput
        tags={["apricot"]}
        suggestions={[
          "apple",
          "apricot",
          "application",
          "banana",
          "apex",
          "april",
          "apply",
          "append",
          "apron",
          "aptitude",
        ]}
        onAdd={() => {}}
        onRemove={() => {}}
      />
    ));
    fireEvent.input(input(), { target: { value: "ap" } });
    const shown = suggestions();
    // "banana" excluded (no prefix match); "apricot" excluded (already a tag).
    expect(shown).not.toContain("banana");
    expect(shown).not.toContain("apricot");
    expect(shown.length).toBe(8);
  });

  it("shows no suggestions for an empty query", () => {
    render(() => (
      <TagInput
        tags={[]}
        suggestions={["apple", "apricot"]}
        onAdd={() => {}}
        onRemove={() => {}}
      />
    ));
    fireEvent.focus(input());
    expect(suggestions().length).toBe(0);
  });

  it("commits a tag when a suggestion is clicked", () => {
    const onAdd = vi.fn();
    render(() => (
      <TagInput
        tags={[]}
        suggestions={["apple", "apricot"]}
        onAdd={onAdd}
        onRemove={() => {}}
      />
    ));
    fireEvent.input(input(), { target: { value: "app" } });
    const first = document.querySelector(".tag-input__suggestion")!;
    fireEvent.mouseDown(first);
    expect(onAdd).toHaveBeenCalledWith("apple");
  });

  it("reflects a reactive tags update", () => {
    const [tags, setTags] = createSignal(["alpha"]);
    render(() => (
      <TagInput
        tags={tags()}
        suggestions={[]}
        onAdd={() => {}}
        onRemove={() => {}}
      />
    ));
    expect(chips()).toEqual(["alpha"]);
    setTags(["alpha", "bravo"]);
    expect(chips()).toEqual(["alpha", "bravo"]);
  });
});
