import { describe, it, expect } from "vitest";
import * as sui from "../../index";

describe("package root exports", () => {
  it("exposes NotificationCenter and its types", () => {
    expect(sui.NotificationCenter).toBeTypeOf("function");
    expect(sui.CountBadge).toBeTypeOf("function");
  });

  it("exposes the prefab action builders", () => {
    expect(sui.viewAction).toBeTypeOf("function");
    expect(sui.dismissAction).toBeTypeOf("function");
    expect(sui.markReadAction).toBeTypeOf("function");
    expect(sui.acceptAction).toBeTypeOf("function");
    expect(sui.declineAction).toBeTypeOf("function");
    expect(sui.deleteAction).toBeTypeOf("function");
  });
});
