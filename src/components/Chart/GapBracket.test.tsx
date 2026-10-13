import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Chart } from "./Chart";
import { GapBracket } from "./GapBracket";

const chart = (children: () => ReturnType<typeof GapBracket>) =>
	render(() => (
		<Chart
			width={200}
			height={100}
			xDomain={[0, 1]}
			yDomain={[0, 100]}
			margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
		>
			{children()}
		</Chart>
	));

describe("GapBracket", () => {
	it("stands past the plot's right edge, between the two values, with its caption", () => {
		const { container } = chart(() => (
			<GapBracket from={20} to={60} label="40 apart" />
		));
		const stem = container.querySelector(".sui-chart__gap-bracket-stem")!;
		// Plot is 160 wide; offset 4 puts the stem at 164.
		expect(stem.getAttribute("x1")).toBe("164");
		expect(Number(stem.getAttribute("y1"))).toBeLessThan(
			Number(stem.getAttribute("y2")),
		);
		expect(container.textContent).toContain("40 apart");
	});

	it("draws nothing when the two values coincide", () => {
		const { container } = chart(() => <GapBracket from={50} to={50} />);
		expect(container.querySelector(".sui-chart__gap-bracket")).toBeNull();
	});

	it("stands at a given x when one is passed", () => {
		const { container } = chart(() => (
			<GapBracket from={20} to={60} x={0.5} offset={0} />
		));
		expect(
			container
				.querySelector(".sui-chart__gap-bracket-stem")!
				.getAttribute("x1"),
		).toBe("80");
	});
});
