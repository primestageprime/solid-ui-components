export const isValidSlug = (slug) => /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(slug);

export const slugToTitle = (slug) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const slugToPascal = (slug) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

/**
 * Pull the `meta.label` string out of a bench file's source, falling back to
 * the slug's title case. The template writes the label as a JSON string literal
 * (`label: "..."`), so we capture that literal and `JSON.parse` it to unescape.
 */
export const extractBenchLabel = (source, slug) => {
  const match = source.match(/\blabel:\s*("(?:[^"\\]|\\.)*")/);
  if (!match) return slugToTitle(slug);
  try {
    return JSON.parse(match[1]);
  } catch {
    return slugToTitle(slug);
  }
};

export const renderBenchTemplate = ({ slug, label }) => {
  const pascal = slugToPascal(slug);
  return `import { Component } from "solid-js";
import { SectionTitle } from "../../../src/components/Text";

export const meta = { label: ${JSON.stringify(label)} };

const ${pascal}Bench: Component = () => (
  <div class="component-section component-section--full">
    <SectionTitle>${label}</SectionTitle>
    {/* build here */}
  </div>
);

export default ${pascal}Bench;
`;
};
