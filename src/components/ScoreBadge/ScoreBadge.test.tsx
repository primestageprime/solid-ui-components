import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ScoreBadge, ScoreBadgeList, scoreVariantOf } from "./ScoreBadge";

describe("ScoreBadge", () => {
	it("maps each scored tone to a status variant", () => {
		expect(scoreVariantOf("ok")).toBe("compliant");
		expect(scoreVariantOf("weak")).toBe("warning");
		expect(scoreVariantOf("stop")).toBe("violation");
	});

	it("shows the label of a scored badge and of a plain badge", () => {
		render(() => (
			<ScoreBadgeList
				badges={[
					{ label: "same day", tone: "ok", tip: "Paid on the 3rd" },
					{ label: "one payee", tone: "plain", tip: "a\nb" },
				]}
			/>
		));
		expect(screen.getByText("same day")).toBeTruthy();
		expect(screen.getByText("one payee")).toBeTruthy();
	});

	it("mounts one badge alone", () => {
		render(() => (
			<ScoreBadge badge={{ label: "late", tone: "weak", tip: "2 days late" }} />
		));
		expect(screen.getByText("late")).toBeTruthy();
	});
});
