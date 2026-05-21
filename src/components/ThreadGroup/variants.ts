// ============================================
// ThreadGroup Curried Variants — Depth 1 (zero CSS)
// Pre-configured ThreadGroup via createThreadGroup().
// ============================================
import type { Component } from "solid-js";
import { createThreadGroup } from "./ThreadGroup";
import type { ThreadGroupDataProps } from "./ThreadGroup";

/** Indented thread group — the default for conversation trees with replies. */
export const IndentedThreadGroup: Component<ThreadGroupDataProps> =
  createThreadGroup({ threaded: true });

/** Flat thread group — depth-padding suppressed; replies render in-line. */
export const FlatThreadGroup: Component<ThreadGroupDataProps> =
  createThreadGroup({ threaded: false });
