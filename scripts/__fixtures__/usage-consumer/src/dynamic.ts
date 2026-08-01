export async function lazy() {
  const mod = await import("solid-ui-components");
  const dist = require("@primestageprime/solid-ui-components/dist/index.js");
  return { mod, dist };
}
