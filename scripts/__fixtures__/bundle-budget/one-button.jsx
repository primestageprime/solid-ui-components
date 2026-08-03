// The canonical ADR 0005 case: the smallest possible consumer. If a barrel-level
// eager import ever drags a heavy dep back in, it shows up here first.
import { render } from "solid-js/web";
import { DefaultButton } from "@primestageprime/solid-ui-components";
render(() => <DefaultButton onClick={() => {}}>hi</DefaultButton>, document.body);
