// `/unstable` is a separate published entry (package.json exports["./unstable"]),
// not a barrel folded into the root. Two things must hold together:
//   1. its exports resolve from THIS entry
//   2. they stay absent from the root — ChannelChart/barrel.test.ts already
//      pins that from the root's side (PR #194); this file pins it from here.
import { describe, expect, it } from "vitest";
import * as unstable from "./unstable";
import * as sui from "./index";

describe("the /unstable entry", () => {
	it.each(["channelModel", "formatChannelTable"])(
		"exports %s",
		(name) => {
			expect((unstable as Record<string, unknown>)[name]).toBeDefined();
		},
	);

	it.each(["channelModel", "formatChannelTable"])(
		"keeps %s absent from the package root",
		(name) => {
			expect((sui as Record<string, unknown>)[name]).toBeUndefined();
		},
	);
});
