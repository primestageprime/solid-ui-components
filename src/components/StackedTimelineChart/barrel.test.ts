// Every public name of the three pieces the Hourly Board was broken into must
// resolve from the PACKAGE ROOT. `src/index.ts` is `export *` over every
// barrel, and an ambiguous `export *` resolves to nothing, silently — this is
// what makes a collision loud.
import { describe, expect, it } from "vitest";
import * as sui from "../../index";

describe("the package root", () => {
  it.each([
    "StackedTimelineChart",
    "createStackedTimelineChart",
    "STACKED_TIMELINE_FALLBACK_SIZE",
    "MutationToolbar",
    "createMutationToolbar",
    "DEFAULT_MUTATION_TOOLBAR_LABELS",
    "createHighWaterMark",
    "nextHighWater",
    "stepHighWater",
    "isHighWaterSettled",
  ])("exports %s", (name) => {
    expect((sui as Record<string, unknown>)[name]).toBeDefined();
  });
});
