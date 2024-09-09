// This is a function template used to build a node's function:

import { Koxy } from "../koxy.ts";

// <FUNCTION>
(async (node: ControlNode, koxy: Koxy, self) => {
  try {
    const inputs = {
      parent: undefined,
      children: node.children,
      // <INPUTS>
    };

    return; // <NODE_CALL>
  } catch (err) {
    return false;
  }
});
