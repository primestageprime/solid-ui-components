import { render, fireEvent } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import {
  ConversationTree,
  type ConversationMessage,
  type Participant,
} from "./ConversationTree";

const participants: Participant[] = [
  { id: "u1", name: "Alice Smith" },
  { id: "u2", name: "Bob Jones" },
];

const MIN = 60_000;
const DAY = 86_400_000;
// A fixed base instant so timestamp-derived dividers are deterministic.
const BASE = Date.UTC(2026, 0, 5, 12, 0);
const NOW = BASE + 3 * DAY;

const bubbles = () =>
  [...document.querySelectorAll(".sui-message-bubble")];
const groups = () =>
  [...document.querySelectorAll(".sui-thread-group")];
const dividers = () =>
  [...document.querySelectorAll(".sui-labeled-divider")];

describe("ConversationTree", () => {
  it("renders a bubble per message with its text", () => {
    const messages: ConversationMessage[] = [
      { id: "m1", participantId: "u1", text: "hello", timestamp: BASE },
      { id: "m2", participantId: "u2", text: "hi there", timestamp: BASE + MIN },
    ];
    render(() => (
      <ConversationTree
        participants={participants}
        messages={messages}
        now={NOW}
      />
    ));
    expect(bubbles().map((b) => b.textContent)).toEqual(["hello", "hi there"]);
  });

  it("folds consecutive same-author messages within the window into one group", () => {
    const messages: ConversationMessage[] = [
      { id: "m1", participantId: "u1", text: "one", timestamp: BASE },
      { id: "m2", participantId: "u1", text: "two", timestamp: BASE + MIN },
      { id: "m3", participantId: "u2", text: "three", timestamp: BASE + 2 * MIN },
    ];
    render(() => (
      <ConversationTree
        participants={participants}
        messages={messages}
        now={NOW}
      />
    ));
    // u1's two messages coalesce → 2 groups total, first holds 2 bubbles.
    expect(groups().length).toBe(2);
    expect(groups()[0].querySelectorAll(".sui-message-bubble").length).toBe(2);
    expect(bubbles().length).toBe(3);
  });

  it("starts a new group when the author changes", () => {
    const messages: ConversationMessage[] = [
      { id: "m1", participantId: "u1", text: "a", timestamp: BASE },
      { id: "m2", participantId: "u2", text: "b", timestamp: BASE + MIN },
    ];
    render(() => (
      <ConversationTree
        participants={participants}
        messages={messages}
        now={NOW}
      />
    ));
    expect(groups().length).toBe(2);
  });

  it("inserts a divider on a day change", () => {
    const messages: ConversationMessage[] = [
      { id: "m1", participantId: "u1", text: "day one", timestamp: BASE },
      { id: "m2", participantId: "u1", text: "day three", timestamp: BASE + 2 * DAY },
    ];
    render(() => (
      <ConversationTree
        participants={participants}
        messages={messages}
        now={NOW}
      />
    ));
    // First message always gets a divider; the day jump adds a second.
    expect(dividers().length).toBe(2);
  });

  it("fires onMessageClick with the message id", () => {
    const onMessageClick = vi.fn();
    const messages: ConversationMessage[] = [
      { id: "m1", participantId: "u1", text: "click me", timestamp: BASE },
    ];
    render(() => (
      <ConversationTree
        participants={participants}
        messages={messages}
        now={NOW}
        onMessageClick={onMessageClick}
      />
    ));
    fireEvent.click(bubbles()[0]);
    expect(onMessageClick).toHaveBeenCalledWith("m1");
  });

  it("renders the current user's messages with the self variant", () => {
    const messages: ConversationMessage[] = [
      { id: "m1", participantId: "u1", text: "mine", timestamp: BASE },
      { id: "m2", participantId: "u2", text: "theirs", timestamp: BASE + 30 * MIN },
    ];
    render(() => (
      <ConversationTree
        participants={participants}
        messages={messages}
        now={NOW}
        currentUserId="u1"
      />
    ));
    expect(document.querySelectorAll(".sui-thread-group--self").length).toBe(1);
    expect(document.querySelectorAll(".sui-thread-group--other").length).toBe(1);
  });

  it("indents a threaded reply beneath its parent", () => {
    const messages: ConversationMessage[] = [
      { id: "m1", participantId: "u1", text: "parent", timestamp: BASE },
      {
        id: "m2",
        participantId: "u2",
        text: "reply",
        timestamp: BASE + MIN,
        replyToId: "m1",
      },
    ];
    render(() => (
      <ConversationTree
        participants={participants}
        messages={messages}
        now={NOW}
        threaded={true}
      />
    ));
    const reply = groups().find((g) => g.textContent?.includes("reply"))!;
    // depth 1 → padding-left 24px (threaded indent).
    expect((reply as HTMLElement).style.paddingLeft).toBe("24px");
  });
});
