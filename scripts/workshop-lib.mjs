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
