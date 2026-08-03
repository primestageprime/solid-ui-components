// Guards the dist/server/ per-module output (the 129,330 B -> 953 B fix).
// Logs the rendered markup so the harness can assert it still RENDERS — a
// bundle that shrank because it broke is not a win.
import { renderToString } from "solid-js/web";
import { DefaultButton } from "@primestageprime/solid-ui-components";
console.log(renderToString(() => <DefaultButton>hi</DefaultButton>));
