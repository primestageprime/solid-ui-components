// Sandbox-step registry.
//
// To add a step: drop a file in this directory (e.g. `my-step.tsx`) that
// exports a `SandboxStep`, import it below, and append it to `SEED_STEPS`.
// Each step is fully self-contained — its data, helpers, and rendering all
// live in its own file. Removing a step is "delete the file + delete the
// import line"; nothing else in the harness needs to change.
//
// Steps share only this directory's `types.ts` (the `SandboxStep` contract)
// and `MockBaseline` (the two-pane page scaffold). Anything else they need
// stays inside the step's own file.

import type { SandboxStep } from "./types";

export type { SandboxStep, SandboxRenderCtx } from "./types";
export { MockBaseline } from "./MockBaseline";
export type { MockBaselineProps } from "./MockBaseline";

export const SEED_STEPS: SandboxStep[] = [];
