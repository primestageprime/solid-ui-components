// Shared sandbox-step contract. The harness in `dev/sandbox.tsx` only
// touches these types; step files import from here.
import type { JSX } from "solid-js";

export interface SandboxRenderCtx {
  /** Imperatively navigate to another step by id. */
  goTo: (id: string) => void;
}

export interface SandboxStep {
  /** URL-safe id; appears in the hash route as `#/sandbox/<id>`. */
  id: string;
  /** Sidebar label. */
  label: string;
  /** One-line description rendered under the label in the sidebar. */
  hint?: string;
  render: (ctx: SandboxRenderCtx) => JSX.Element;
}
