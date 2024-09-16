import { exec } from "node:child_process";
import { Koxy as KoxyClass } from "../koxy.ts";
import { ValidateInputs } from "../validate-inputs.ts";
import type { NormalNode } from "../index.d.ts";

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

    const validator = new ValidateInputs(Koxy, node.inputs || []);
    const valid = validator.validate(inputs);
    if (!valid) return KoxyClass.stopSign;

    const filePath = "<PYTHON_FILE_PATH>";
    let command = `python3 ${filePath}`;

    for (const key of Object.keys(inputs)) {
      command += ` --${key} `;
      command += JSON.stringify(inputs[key]);
    }

    const process: Promise<{
      type: "error" | "success";
      value: string | undefined;
    }> = new Promise((resolve) => {
      exec(command, (err, stdout, stderr) => {
        if (stderr) {
          const errors = stderr.split("\n");
          for (const error of errors) {
            Koxy.logger.error("python process ->", error);
          }
        }

        if (err) {
          resolve({ type: "error", value: err });
          return;
        }

        let res: any;

        for (const line of (stdout || "").split("\n")) {
          if (line.startsWith("<KOXY_RES> ")) {
            res = line.replace("<KOXY_RES> ", "");
            continue;
          }
          Koxy.logger.info("python process ->", line);
        }

        try {
          const json = JSON.parse(res || "{}");
          res = json;
        } catch {}

        resolve({ type: "success", value: res });
      });
    });

    const res = await process;

    if (res.type === "error") {
      throw new Error(res.value);
    }

    return res.value;
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
      Koxy.logger.error(
        `Node failed, running custom handler`,
        err.message || err,
      );
      return await self.failed(node, Koxy, self);
    }

    Koxy.logger.error(`Node failed, terminating`, err.message || err);
    return KoxyClass.stopSign;
  }
});
