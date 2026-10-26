import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { PaymentsPopover } from "./PaymentsPopover";

describe("PaymentsPopover", () => {
	it("shows the count as its trigger", () => {
		render(() => (
			<PaymentsPopover
				count="2"
				payments={[
					{ date: "Jan 3", payee: "", score: "", amount: "$10" },
					{ date: "Feb 3", payee: "", score: "", amount: "$12" },
				]}
			/>
		));
		expect(screen.getByText("2")).toBeTruthy();
	});
});
