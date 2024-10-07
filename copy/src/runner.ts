import { exec } from "node:child_process";
import { Koxy as KoxyClass } from "./koxy.ts";
import { ValidateInputs } from "./validate-inputs.ts"; // never remove this
import type { Flow, KoxyNode, NormalNode, Res, ReturnNode } from "./index.d.ts";
import * as koxyNodes from "./nodes/index.ts";

type NodeFunc = (
  node: any,
  koxy: KoxyClass,
  self: { main: Function; failed?: Function },
  retry?: number,
) => any;

const nodes: Record<
  string,
  [KoxyNode, { main: NodeFunc; failed?: NodeFunc }]
> = {
  "node1": [{"type": "python", "id": "node1id", "name": "node1", "label": "Node", "description": "", "icon": "", "next": "node2", "inputs": [[{"key": "date", "type": "number", "label": "", "required": true, "visible": true}, "code:K::Date.now()"], [{"key": "hi-s", "type": "string", "label": "", "required": true, "visible": true}, "string:K::hi"]], "code": "def main(inputs):\n  print('Hi from python/main')\n  def nest():\n   return 'hello from nested'\n  return nest()"}, { main: 
(async (node: NormalNode, Koxy: KoxyClass, self: {
  main: Function;
  failed?: Function;
}, retry: number = 0): Promise<any> => {
  try {
    const inputs = {
      parent: undefined,
      children: [],
      "date": Date.now(),"hi-s": "hi",
    };

    const validator = new ValidateInputs(Koxy, node.inputs || []);
    const valid = validator.validate(inputs);
    if (!valid) return KoxyClass.stopSign;

    const filePath = "/home/user/cloud/copy/src/nodes/node1id.py";
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
}),}],
"node2": [{"type": "normal", "id": "node2id", "name": "node2", "label": "Node", "description": "", "icon": "", "next": "end", "inputs": [[{"key": "date", "type": "number", "label": "", "required": true, "visible": true}, "code:K::Date.now()"], [{"key": "hi-s", "type": "string", "label": "", "required": true, "visible": true}, "string:K::hi"]], "code": "export async function main(koxy: any, inputs: any) {koxy.db.set('test', '1', {value: koxy.body.value}); return true;}"}, { main: 
(async (node: NormalNode, Koxy: KoxyClass, self: {
  main: Function;
  failed?: Function;
}, retry: number = 0): Promise<any> => {
  try {

    const inputs = {
      parent: undefined,
      children: [],
      "date": Date.now(),"hi-s": "hi",
    };

    const validator = new ValidateInputs(Koxy, node.inputs);
    const valid = validator.validate(inputs);
    if (!valid) return KoxyClass.stopSign;

    return await koxyNodes.node2(Koxy, inputs);
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
}),}],
"end": [{"type": "return", "id": "end", "name": "end", "label": "end", "icon": "end", "description": "end", "code": "end", "inputs": [[{"key": "response", "type": "string", "label": "", "required": true, "visible": true}, "code:K::Koxy.results.node1"]]}, { main: 
(async (node: ReturnNode, Koxy: KoxyClass, self) => {
  try {
    const inputs = {
      "response": Koxy.results.node1,
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
}),}],
"node1_2": [{"type": "normal", "id": "node1_2id", "name": "node1_2", "label": "Node", "description": "", "icon": "", "next": "node2_2", "inputs": [[{"key": "date", "type": "number", "label": "", "required": true, "visible": true}, "code:K::Date.now()"], [{"key": "hi-s", "type": "string", "label": "", "required": true, "visible": true}, "string:K::hi"]], "code": "export async function main(koxy: any, inputs: any) { return \"Hi\"; }"}, { main: 
(async (node: NormalNode, Koxy: KoxyClass, self: {
  main: Function;
  failed?: Function;
}, retry: number = 0): Promise<any> => {
  try {

    const inputs = {
      parent: undefined,
      children: [],
      "date": Date.now(),"hi-s": "hi",
    };

    const validator = new ValidateInputs(Koxy, node.inputs);
    const valid = validator.validate(inputs);
    if (!valid) return KoxyClass.stopSign;

    return await koxyNodes.node1_2(Koxy, inputs);
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
}),}],
"node2_2": [{"type": "normal", "id": "node2_2id", "name": "node2_2", "label": "Node", "description": "", "icon": "", "next": "end2", "inputs": [[{"key": "date", "type": "number", "label": "", "required": true, "visible": true}, "code:K::Date.now()"], [{"key": "hi-s", "type": "string", "label": "", "required": true, "visible": true}, "string:K::hi"]], "code": "export async function main(koxy: any, inputs: any) {return true;}"}, { main: 
(async (node: NormalNode, Koxy: KoxyClass, self: {
  main: Function;
  failed?: Function;
}, retry: number = 0): Promise<any> => {
  try {

    const inputs = {
      parent: undefined,
      children: [],
      "date": Date.now(),"hi-s": "hi",
    };

    const validator = new ValidateInputs(Koxy, node.inputs);
    const valid = validator.validate(inputs);
    if (!valid) return KoxyClass.stopSign;

    return await koxyNodes.node2_2(Koxy, inputs);
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
}),}],
"end2": [{"type": "return", "id": "end2", "name": "end2", "label": "end2", "icon": "end", "description": "end", "code": "end", "inputs": [[{"key": "value", "type": "string", "label": "", "required": true, "visible": true}, "code:K::(await Koxy.db.get('test', '1')).value"]]}, { main: 
(async (node: ReturnNode, Koxy: KoxyClass, self) => {
  try {
    const inputs = {
      "value": (await Koxy.db.get('test', '1')).value,
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
}),}],

};

export class Runner {
  koxy: KoxyClass;
  path: string;
  method: string;
  flow: Flow;

  constructor(path: string, method: string, koxy: KoxyClass) {
    this.koxy = koxy;
    this.path = path;
    this.method = method;

    const rootPath = this.getPathRoot(path);
    const wantedPath = koxy.api.flows[rootPath];

    if (!wantedPath) {
      throw new Error(`Path ${rootPath} not found under API`);
    }

    const flow = wantedPath.find((f) =>
      f.method.toLowerCase() === method.toLowerCase()
    );

    if (!flow) {
      throw new Error(`Method ${method} doesn't exist on path ${rootPath}`);
    }

    this.flow = flow;
  }

  getPathRoot(path: string) {
    const parts = path.split("?");
    let pathRoot = parts[0].split("#")[0];
    while (pathRoot.endsWith("/")) {
      pathRoot = pathRoot.slice(0, -1);
    }

    return pathRoot;
  }

  async runNode(name: string): Promise<any> {
    const [node, funcs] = nodes[name];

    if (node.type !== "normal") {
      this.koxy.logger.error(`Node ${name} is not a normal node`);
      return KoxyClass.stopSign;
    }

    const res = await funcs.main(node, this.koxy, funcs);

    if (res === KoxyClass.stopSign) {
      return res;
    }

    if (res === KoxyClass.ignoreSign) {
      this.koxy.results.set(name, undefined);
      return;
    }

    this.koxy.results.set(name, res);
    return await this.runNext(node.next);
  }

  async runCondition(name: string): Promise<any> {
    const [node, funcs] = nodes[name];

    if (node.type !== "condition") {
      this.koxy.logger.error(`Node ${name} is not a condition node`);
      return KoxyClass.stopSign;
    }

    const res = (await funcs.main(node, this.koxy, funcs)) as boolean;

    if (res) {
      this.koxy.logger.info(`Condition ${name} passed`);
      return await this.runNext(node.next.success);
    }

    this.koxy.logger.info(`Condition ${name} failed`);
    return await this.runNext(node.next.fail);
  }

  async runController(name: string) {
  }

  async runReturn(name: string) {
    const [node, funcs] = nodes[name];

    if (node.type !== "return") {
      this.koxy.logger.error(`Node ${name} is not a return node`);
      return KoxyClass.stopSign;
    }

    const res = await funcs.main(node, this.koxy, funcs);

    if (res === KoxyClass.stopSign) {
      return res;
    }

    if (res === KoxyClass.ignoreSign) {
      return res;
    }

    return { type: "return", res };
  }

  async runPython(name: string) {
    const [node, funcs] = nodes[name] || [{}, undefined];

    if (node.type !== "python") {
      this.koxy.logger.error(`Node ${name} is not a python node`);
      return KoxyClass.stopSign;
    }

    const res = await funcs.main(node, this.koxy, funcs);

    if (res === KoxyClass.stopSign) {
      return res;
    }

    if (res === KoxyClass.ignoreSign) {
      this.koxy.results.set(name, undefined);
      return;
    }

    this.koxy.results.set(name, res);
    return await this.runNext(node.next);
  }

  async runNext(name: string) {
    if (this.isValidString(this.koxy.runningNode)) {
      this.koxy.logger.info(`Node ${this.koxy.runningNode} finished`);
    }

    if (!this.isValidString(name)) {
      this.koxy.logger.error(`Invalid next node name: ${name}`);
      return KoxyClass.stopSign;
    }

    if (name === KoxyClass.stopSign) {
      return name;
    }

    if (name === KoxyClass.ignoreSign) {
      return name;
    }

    const node = this.flow.nodes.find((n) => n.name === name);

    if (!node) {
      this.koxy.logger.error(`Node ${name} not found`);
      return KoxyClass.stopSign;
    }

    this.koxy.runningNode = name;
    this.koxy.logger.info(`Running ${name}`);
    return await this.processNode(node);
  }

  async processNode(node: KoxyNode | ReturnNode): Promise<any> {
    switch (node.type) {
      case "normal":
        return await this.runNode(node.name);
      case "condition":
        return await this.runCondition(node.name);
      case "control":
        return await this.runController(node.name);
      case "return":
        return await this.runReturn(node.name);
      case "python":
        return await this.runPython(node.name);
      default:
        throw new Error(`Invalid node type`);
    }
  }

  async runLoop(): Promise<Res> {
    if (this.flow.start.type !== "start") {
      this.koxy.logger.error(`Flow ${this.path} has no start node`);
      return { status: 500 };
    }

    const res: any = await this.runNext(this.flow.start.next);

    if (res === KoxyClass.stopSign) {
      this.koxy.logger.info(`Flow ${this.path} stopped`);
      return { status: 500 };
    }

    if (res === KoxyClass.ignoreSign) {
      this.koxy.logger.info(`Flow ${this.path} ignored`);
      return { status: 200 };
    }

    if (res?.type === "return") {
      this.koxy.logger.info(`Flow ${this.path} returned`);
      return {
        status: res.res.status ?? 200,
        body: res.res,
        headers: res.res.headers,
      };
    }

    this.koxy.logger.info(`Flow ${this.path} finished with no response`);
    return { status: 203 };
  }

  isValidString(value: string) {
    return typeof value === "string" && value.length > 0;
  }
}
