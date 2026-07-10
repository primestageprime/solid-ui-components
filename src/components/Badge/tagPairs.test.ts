import { describe, it, expect } from "vitest";
import { composeTagPairs, type SourceTag, type TagDisplayConfig } from "./tagPairs";

const customerProject: TagDisplayConfig = {
  pairs: [
    { parent: "customer", child: "project" },
    { parent: "owner", child: "assignee" },
  ],
};

describe("composeTagPairs", () => {
  it("pairs a rule's two dims into one split lozenge, parent value : child value", () => {
    const tags: SourceTag[] = [
      { dim: "customer", value: "stax" },
      { dim: "project", value: "jtf" },
    ];
    const [tag, ...rest] = composeTagPairs(tags, customerProject);
    expect(rest).toHaveLength(0);
    expect(tag.key).toBe("stax");
    expect(tag.value).toBe("jtf");
    expect(tag.title).toBe("customer: stax · project: jtf");
    expect(tag.sources).toEqual([
      { dim: "customer", value: "stax" },
      { dim: "project", value: "jtf" },
    ]);
  });

  it("applies the second rule (owner/assignee) independently", () => {
    const tags: SourceTag[] = [
      { dim: "owner", value: "peter" },
      { dim: "assignee", value: "ada" },
    ];
    const [tag] = composeTagPairs(tags, customerProject);
    expect(tag.key).toBe("peter");
    expect(tag.value).toBe("ada");
    expect(tag.title).toBe("owner: peter · assignee: ada");
  });

  it("keeps both rules' pairs, in rule order, ahead of leftovers", () => {
    const tags: SourceTag[] = [
      { dim: "assignee", value: "ada" },
      { dim: "status", value: "todo" },
      { dim: "project", value: "jtf" },
      { dim: "owner", value: "peter" },
      { dim: "customer", value: "stax" },
    ];
    const out = composeTagPairs(tags, customerProject);
    expect(out.map((t) => [t.key, t.value])).toEqual([
      ["stax", "jtf"], // customer/project rule fires first
      ["peter", "ada"], // owner/assignee rule second
      ["status", "todo"], // leftover, labeled
    ]);
  });

  it("does not abbreviate a dim whose pair partner is absent — labeled fallback", () => {
    const tags: SourceTag[] = [{ dim: "customer", value: "stax" }];
    const [tag, ...rest] = composeTagPairs(tags, customerProject);
    expect(rest).toHaveLength(0);
    expect(tag.key).toBe("customer");
    expect(tag.value).toBe("stax");
    expect(tag.title).toBe("customer: stax");
    expect(tag.sources).toEqual([{ dim: "customer", value: "stax" }]);
  });

  it("emits unknown dims (no matching rule) in labeled form", () => {
    const tags: SourceTag[] = [
      { dim: "priority", value: "high" },
      { dim: "team", value: "core" },
    ];
    const out = composeTagPairs(tags, customerProject);
    expect(out).toEqual([
      { key: "priority", value: "high", title: "priority: high", sources: [tags[0]] },
      { key: "team", value: "core", title: "team: core", sources: [tags[1]] },
    ]);
  });

  it("orders leftover labeled tags by cfg.order, unknown dims after, stable", () => {
    const tags: SourceTag[] = [
      { dim: "team", value: "core" },
      { dim: "status", value: "todo" },
      { dim: "priority", value: "high" },
    ];
    const cfg: TagDisplayConfig = { pairs: [], order: ["priority", "status"] };
    const out = composeTagPairs(tags, cfg);
    expect(out.map((t) => t.key)).toEqual(["priority", "status", "team"]);
  });

  it("pairs only the first occurrence of a duplicated dim; extras stay labeled", () => {
    const tags: SourceTag[] = [
      { dim: "customer", value: "stax" },
      { dim: "customer", value: "acme" },
      { dim: "project", value: "jtf" },
      { dim: "project", value: "dside" },
    ];
    const out = composeTagPairs(tags, customerProject);
    expect(out[0]).toMatchObject({ key: "stax", value: "jtf" });
    expect(out.slice(1).map((t) => [t.key, t.value])).toEqual([
      ["customer", "acme"],
      ["project", "dside"],
    ]);
  });

  it("preserves input order for leftovers when no cfg.order is given", () => {
    const tags: SourceTag[] = [
      { dim: "team", value: "core" },
      { dim: "priority", value: "high" },
    ];
    const out = composeTagPairs(tags, { pairs: [] });
    expect(out.map((t) => t.key)).toEqual(["team", "priority"]);
  });

  it("handles empty tags and empty config gracefully", () => {
    expect(composeTagPairs([], customerProject)).toEqual([]);
    expect(composeTagPairs([{ dim: "a", value: "1" }], { pairs: [] })).toEqual([
      { key: "a", value: "1", title: "a: 1", sources: [{ dim: "a", value: "1" }] },
    ]);
  });
});
