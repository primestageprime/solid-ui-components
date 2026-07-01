/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CHART_DIR = join(__dirname);

const collectFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "boundaries.test.ts") continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
};

const FORBIDDEN_PATTERNS: Array<{ name: string; rx: RegExp }> = [
  { name: "amygdala import path", rx: /from\s+["']\.\.\/\.\.\/amygdala/i },
  { name: "amygdala absolute path", rx: /from\s+["'][^"']*amygdala-ui/i },
  { name: "factAppearance import", rx: /\bfactAppearance\b/ },
  { name: "AUTO_CORRELATE_OFFSET_MS", rx: /AUTO_CORRELATE_OFFSET_MS/ },
  { name: "alarmLab page import", rx: /\balarmLab/i },
  // Hex color literals in source (tests can have them as fixture data)
  // — only flag .ts/.tsx files that aren't *.test.*
];

describe("Chart slot boundaries — no amygdala-domain leakage", () => {
  const files = collectFiles(CHART_DIR);

  for (const { name, rx } of FORBIDDEN_PATTERNS) {
    it(`no source file matches: ${name}`, () => {
      const offenders: Array<{ file: string; line: number; text: string }> = [];
      for (const file of files) {
        const text = readFileSync(file, "utf8");
        const lines = text.split("\n");
        lines.forEach((line, i) => {
          if (rx.test(line)) {
            offenders.push({
              file: file.replace(`${CHART_DIR}/`, ""),
              line: i + 1,
              text: line.trim(),
            });
          }
        });
      }
      if (offenders.length > 0) {
        const msg = offenders
          .map((o) => `  ${o.file}:${o.line} → ${o.text}`)
          .join("\n");
        throw new Error(
          `Found ${offenders.length} forbidden reference(s):\n${msg}`,
        );
      }
      expect(offenders.length).toBe(0);
    });
  }

  it("no hex color literals in NON-TEST chart source files", () => {
    const HEX_RX = /#[0-9a-f]{3,8}\b/i;
    const sourceFiles = files.filter((f) => !/\.test\.(ts|tsx)$/.test(f));
    const offenders: Array<{ file: string; line: number; text: string }> = [];
    for (const file of sourceFiles) {
      const text = readFileSync(file, "utf8");
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        if (HEX_RX.test(line)) {
          offenders.push({
            file: file.replace(`${CHART_DIR}/`, ""),
            line: i + 1,
            text: line.trim(),
          });
        }
      });
    }
    if (offenders.length > 0) {
      const msg = offenders
        .map((o) => `  ${o.file}:${o.line} → ${o.text}`)
        .join("\n");
      throw new Error(
        `Found ${offenders.length} hex color literal(s) in source:\n${msg}`,
      );
    }
    expect(offenders.length).toBe(0);
  });
});
