import { describe, it, expect } from "vitest";
import * as sui from "../../index";

describe("package root exports", () => {
  it("exposes NotificationCenter and its types", () => {
    expect(sui.NotificationCenter).toBeTypeOf("function");
    expect(sui.CountBadge).toBeTypeOf("function");
  });
});
