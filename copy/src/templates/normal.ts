// This is a function template used to build a node's function:

import { Koxy as KoxyClass } from "../koxy.ts";
import { ValidateInputs } from "../validate-inputs.ts";
import type { NormalNode } from "../index.d.ts"

// <FUNCTION>
(async (node: NormalNode, Koxy: KoxyClass, self: {
  main: Function;
  failed?: Function;
}, retry: number = 0): Promise<any> => {
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

    function sleep(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    if (!node.onFail) return KoxyClass.stopSign;

    if (node.onFail.type === "retry" && retry < node.onFail.max) {
      await sleep(node.onFail.interval || 0);

      Koxy.logger.error(`Node failed, retrying`, err.message || err);
      return await self.main(node, Koxy, self, retry + 1);
    }

    if (node.onFail.type === "terminate") {
      Koxy.logger.error(`Node failed, terminating`, err.message || err);
      return KoxyClass.stopSign;
    }

    if (node.onFail.type === "ignore") {
      Koxy.logger.error(`Node failed, ignoring`, err.message || err);
      return KoxyClass.ignoreSign;
    }

    if (node.onFail.type === "custom" && self.failed) {
      Koxy.logger.error(`Node failed, running custom handler`, err.message || err);
      return await self.failed(node, Koxy, self);
    }

    Koxy.logger.error(`Node failed, terminating`, err.message || err);
    return KoxyClass.stopSign;
  }
});