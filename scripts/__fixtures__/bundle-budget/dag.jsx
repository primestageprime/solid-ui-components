// Positive control for d3-dag, same reasoning as math.jsx.
import { render } from "solid-js/web";
import { DagChart } from "@primestageprime/solid-ui-components";
render(() => <DagChart nodes={[]} edges={[]} />, document.body);
