// @vitest-environment node
// The committed declarations must be what SUI's sources generate today; when
// SUI adds, drops or renames a variant, run `npm run generate`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GENERATED_DIR, generatedFiles } from "../build/generate.ts";

describe("src/generated/sui", () => {
  it.each(
    Object.entries(generatedFiles()),
  )("%s is current", (path, content) => {
    expect(readFileSync(join(GENERATED_DIR, path), "utf8")).toBe(content);
  });
});
