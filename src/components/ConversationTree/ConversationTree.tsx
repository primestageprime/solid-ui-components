// ============================================
// ConversationTree — Pure Composite (Depth 3+).
// Composes ThreadGroup + ParticipantAvatar +
// ParticipantNameLabel + ParticipantTimeLabel +
// LabeledDivider + Duration + MessageBubble +
// Layout Curried Variants (ConversationStack).
//
// Owns zero CSS and zero inline `style={}` — all
// visual styling lives in Primitives / Curried
// Variants. The Composite expresses only the
// tree-building + grouping + composition.
//
// Renders a multi-participant conversation as a
// (optionally threaded) tree. Groups consecutive
// messages from the same author. Shows efficient
// time readouts: absolute when the gap is large
// or the day changes, otherwise relative; full
// timestamp via tooltip on hover.
// ============================================
import { Component, For, Show, createMemo } from "solid-js";
import { ConversationStack } from "../Layout";
import { Duration } from "../Duration";
import { MessageBubble } from "../MessageBubble";
import { ParticipantAvatar } from "../ParticipantAvatar";
import { ParticipantNameLabel } from "../ParticipantNameLabel";
import { ParticipantTimeLabel } from "../ParticipantTimeLabel";
import { LabeledDivider } from "../LabeledDivider";
import { ThreadGroup } from "../ThreadGroup";

export interface Participant {
  id: string;
  name: string;
  /** Override the auto-derived color. CSS color string. */
  color?: string;
  /** Optional avatar image URL. Falls back to initials. */
  avatarUrl?: string;
}

export interface ConversationMessage {
  id: string;
  participantId: string;
  text: string;
  timestamp: number | Date;
  /** ID of the message this one replies to. null/undefined → top-level. */
  replyToId?: string | null;
}

export interface ConversationTreeProps {
  participants: Participant[];
  messages: ConversationMessage[];
  /** Group consecutive messages from the same author within this gap. Default 5min. */
  groupWithinMs?: number;
  /** Show an absolute date/time divider when the gap exceeds this. Default 1h. */
  absoluteAfterMs?: number;
  /** Indent replies. Default true. */
  threaded?: boolean;
  /** Reference "now" for relative timestamps. Default Date.now(). */
  now?: number;
  /** Click handler for an individual message. */
  onMessageClick?: (id: string) => void;
  /** Participant ID of the viewer — their messages render right-aligned. */
  currentUserId?: string;
  /** Lines before a long message collapses behind a (more…) toggle. Default 5. */
  clampLines?: number;
  /** When expanded, lines beyond this scroll internally. Default 20. */
  maxLines?: number;
}

const toMs = (t: number | Date): number => (t instanceof Date ? t.getTime() : t);

// Deterministic color from id — muted cool palette (cyan → indigo).
// Hue 185..260, low saturation, mid-high lightness for a calm, readable feel.
const colorForId = (id: string): string => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = 185 + (h % 76); // 185..260
  const sat = 32 + ((h >> 8) % 14); // 32..45
  const light = 60 + ((h >> 16) % 8); // 60..67
  return `hsl(${hue} ${sat}% ${light}%)`;
};

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";

const sameDay = (a: number, b: number): boolean => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

const formatAbsolute = (t: number, now: number): string => {
  const d = new Date(t);
  const todayLike = sameDay(t, now);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (todayLike) return `Today, ${time}`;
  if (sameDay(t, now - 86_400_000)) return `Yesterday, ${time}`;
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${date}, ${time}`;
};

const formatFull = (t: number): string =>
  new Date(t).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

interface TreeNode {
  msg: ConversationMessage;
  children: TreeNode[];
  depth: number;
}

const buildTree = (msgs: ConversationMessage[]): TreeNode[] => {
  const byId = new Map<string, TreeNode>();
  msgs.forEach((m) => byId.set(m.id, { msg: m, children: [], depth: 0 }));
  const roots: TreeNode[] = [];
  msgs.forEach((m) => {
    const node = byId.get(m.id)!;
    if (m.replyToId && byId.has(m.replyToId)) {
      const parent = byId.get(m.replyToId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  // Sort children by timestamp at every level.
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => toMs(a.msg.timestamp) - toMs(b.msg.timestamp));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
};

// Flatten with grouping. Within a parent (same depth, same thread context),
// consecutive messages from same author within `groupWithinMs` are folded
// into a single block.
interface RenderItem {
  kind: "divider" | "group";
  // divider
  dividerLabel?: string;
  // group
  participantId?: string;
  depth?: number;
  startMs?: number;
  endMs?: number;
  msgs?: ConversationMessage[];
}

const flattenWithGrouping = (
  roots: TreeNode[],
  groupWithinMs: number,
  absoluteAfterMs: number,
  now: number,
): RenderItem[] => {
  const items: RenderItem[] = [];
  let lastMs: number | null = null;

  const visit = (node: TreeNode) => {
    const m = node.msg;
    const ts = toMs(m.timestamp);

    // Divider: first message, day change, or large gap.
    if (
      lastMs == null ||
      !sameDay(lastMs, ts) ||
      ts - lastMs > absoluteAfterMs
    ) {
      items.push({ kind: "divider", dividerLabel: formatAbsolute(ts, now) });
    }

    // Coalesce into previous group if same author, same depth, within window.
    const prev = items[items.length - 1];
    if (
      prev &&
      prev.kind === "group" &&
      prev.participantId === m.participantId &&
      prev.depth === node.depth &&
      ts - (prev.endMs ?? 0) <= groupWithinMs
    ) {
      prev.msgs!.push(m);
      prev.endMs = ts;
    } else {
      items.push({
        kind: "group",
        participantId: m.participantId,
        depth: node.depth,
        startMs: ts,
        endMs: ts,
        msgs: [m],
      });
    }

    lastMs = ts;
    node.children.forEach(visit);
  };

  roots.forEach(visit);
  return items;
};

const bubbleBg = (color: string, isSelf: boolean): string =>
  isSelf
    ? `color-mix(in srgb, ${color} 70%, #0a1525 30%)`
    : `color-mix(in srgb, ${color} 12%, transparent)`;

const bubbleTextColor = (isSelf: boolean): string | undefined =>
  isSelf ? "#f4f8ff" : undefined;

export const ConversationTree: Component<ConversationTreeProps> = (props) => {
  const groupWithinMs = () => props.groupWithinMs ?? 5 * 60_000;
  const absoluteAfterMs = () => props.absoluteAfterMs ?? 60 * 60_000;
  const threaded = () => props.threaded ?? true;
  const now = () => props.now ?? Date.now();

  const participantById = createMemo(() => {
    const m = new Map<string, Participant>();
    props.participants.forEach((p) => m.set(p.id, p));
    return m;
  });

  const colorById = createMemo(() => {
    const m = new Map<string, string>();
    props.participants.forEach((p) => m.set(p.id, p.color ?? colorForId(p.id)));
    return m;
  });

  const items = createMemo(() =>
    flattenWithGrouping(
      buildTree(props.messages),
      groupWithinMs(),
      absoluteAfterMs(),
      now(),
    ),
  );

  return (
    <ConversationStack>
      <For each={items()}>
        {(item) => (
          <Show
            when={item.kind === "group"}
            fallback={<LabeledDivider label={item.dividerLabel} />}
          >
            {(() => {
              const participant = participantById().get(item.participantId!);
              if (!participant) return null;
              const color = colorById().get(participant.id)!;
              const isSelf = props.currentUserId === participant.id;
              return (
                <ThreadGroup
                  depth={item.depth ?? 0}
                  color={color}
                  variant={isSelf ? "self" : "other"}
                  threaded={threaded()}
                  avatar={
                    <ParticipantAvatar
                      initials={initialsOf(participant.name)}
                      imageSrc={participant.avatarUrl}
                      color={color}
                      size="md"
                    />
                  }
                  header={
                    <>
                      <ParticipantNameLabel color={color}>
                        {participant.name}
                      </ParticipantNameLabel>
                      <ParticipantTimeLabel title={formatFull(item.startMs!)}>
                        <Duration ms={Math.max(0, now() - item.startMs!)} />
                        {" ago"}
                      </ParticipantTimeLabel>
                    </>
                  }
                  bubbles={
                    <For each={item.msgs!}>
                      {(m) => (
                        <MessageBubble
                          variant={isSelf ? "self" : "other"}
                          bg={bubbleBg(color, isSelf)}
                          textColor={bubbleTextColor(isSelf)}
                          title={formatFull(toMs(m.timestamp))}
                          onClick={
                            props.onMessageClick
                              ? () => props.onMessageClick!(m.id)
                              : undefined
                          }
                          clampLines={props.clampLines ?? 5}
                          maxLines={props.maxLines ?? 20}
                        >
                          {m.text}
                        </MessageBubble>
                      )}
                    </For>
                  }
                />
              );
            })()}
          </Show>
        )}
      </For>
    </ConversationStack>
  );
};
