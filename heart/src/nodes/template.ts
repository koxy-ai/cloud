// This is a function template used to build a node's function:

import { Koxy } from "../koxy.ts";

// <FUNCTION>
(async (node: NormalNode, koxy: Koxy, self: {
  main: Function;
  failed?: Function;
}, retry: number = 0): Promise<any> => {
  try {
    const inputs = {
      parent: undefined,
      children: [],
      // <INPUTS>
    };

    return; // <NODE_CALL>
  } catch (err) {

    function sleep(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    if (!node.onFail) return koxy.stopSign;

    if (node.onFail.type === "retry" && retry < node.onFail.max) {
      await sleep(node.onFail.interval || 0);

      koxy.logger.error(`Node failed, retrying`, err.message || err);
      return await self.main(node, koxy, self, retry + 1);
    }

    if (node.onFail.type === "terminate") {
      koxy.logger.error(`Node failed, terminating`, err.message || err);
      return koxy.stopSign;
    }

    if (node.onFail.type === "ignore") {
      koxy.logger.error(`Node failed, ignoring`, err.message || err);
      return koxy.ignoreSign;
    }

    if (node.onFail.type === "custom" && self.failed) {
      koxy.logger.error(`Node failed, running custom handler`, err.message || err);
      return await self.failed(node, koxy, self);
    }

    koxy.logger.error(`Node failed, terminating`, err.message || err);
    return koxy.stopSign;
  }
});