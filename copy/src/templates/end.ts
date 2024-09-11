// This is a function template used to build a node's function:

import { Koxy as KoxyClass } from "../koxy.ts";
import { ValidateInputs } from "../validate-inputs.ts";
import type { ReturnNode } from "../index.d.ts"

// <FUNCTION>
(async (node: ReturnNode, Koxy: KoxyClass, self) => {
  try {
    const inputs = {
      // <INPUTS>
    };

    const validator = new ValidateInputs(Koxy, node.inputs);
    const valid = validator.validate(inputs);
    if (!valid) return KoxyClass.stopSign;

    return inputs;
  } catch (err) {
    return {
      status: 500,
      body: {
        success: false,
        message: err.message || "Unexpected error while running the return node",
      },
    };
  }
});
