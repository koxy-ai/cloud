// This is a function template used to build a node's function:

import { Koxy as KoxyClass } from "../koxy.ts";
import { ValidateInputs } from "../validate-inputs.ts";
import type { ConditionNode } from "../index.d.ts"

// <FUNCTION>
(async (node: ConditionNode, Koxy: KoxyClass, self) => {
  try {
    const inputs = {
      parent: undefined,
      children: [],
      // <INPUTS>
    };

    const validator = new ValidateInputs(Koxy, node.inputs);
    const valid = validator.validate(inputs);
    if (!valid) return KoxyClass.stopSign;

    return; // <NODE_CALL>
  } catch (err) {
    return false;
  }
});
