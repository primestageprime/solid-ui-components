// MutationFlags — the flag lane inside a bare <Chart> (G24). Its full
// behaviour (select, nudge, drag, G22) is exercised through
// StackedTimelineChart's tests; this pins that the slot mounts on its own.
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Chart } from "./Chart";
import { MutationFlags } from "./MutationFlags";

describe("MutationFlags", () => {
	it("draws a numbered flag per mutation inside any Chart", () => {
		const { container } = render(() => (
			<Chart
				width={600}
				height={200}
				xDomain={[new Date("2025-01-01"), new Date("2026-01-01")]}
				yDomain={[0, 10]}
				margin={{ top: 24 }}
			>
				<MutationFlags
					mutations={[
						{ id: "x", at: new Date("2025-03-01"), label: "X" },
						{ id: "y", at: new Date("2025-02-01"), label: "Y" },
					]}
				/>
			</Chart>
		));
		const flags = container.querySelectorAll<SVGGElement>(".sui-chart__mutation");
		expect(Array.from(flags, (f) => `${f.dataset.mutationId}${f.textContent}`)).toEqual([
			"y1",
			"x2",
		]);
	});
});
