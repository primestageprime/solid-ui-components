// Every public name must resolve from the PACKAGE ROOT. `src/index.ts` is
// `export *` over every barrel, and an ambiguous `export *` resolves to
// nothing, silently — this is what makes a collision loud.
import { describe, expect, it } from "vitest";
import * as sui from "../../index";

describe("the package root", () => {
	it.each([
		"ChannelChart",
		"ChannelDivergenceChart",
		"createChannelChart",
		"DEFAULT_CHANNEL_CHART_TONES",
		"CHANNEL_CHART_FALLBACK_SIZE",
	])("exports %s", (name) => {
		expect((sui as Record<string, unknown>)[name]).toBeDefined();
	});

	it.each(["channelModel", "formatChannelTable"])(
		"keeps the geometry core %s internal",
		(name) => {
			expect((sui as Record<string, unknown>)[name]).toBeUndefined();
		},
	);
});
