import { Koxy as KoxyClass } from "./koxy.ts";
import { ValidateInputs } from "./validate-inputs.ts"; // never remove this
import Benchmark from "npm:benchmark";
import type { Flow, KoxyNode, ReturnNode, NormalNode } from "./index.d.ts";
import * as koxyNodes from "./nodes/index.ts";

type NodeFunc = (
  node: any,
  koxy: KoxyClass,
  self: { main: Function; failed?: Function },
  retry?: number,
) => any;

export const myNodes: KoxyNode[] = [
  {
    id: "node1",
    name: "node1",
    type: "normal",
    label: "node1",
    icon: "node1",
    description: "node1",
    code: "node1",
    inputs: [],
    next: "node2",
    onFail: {
      type: "retry",
      max: 3,
      interval: 1000,
      continue: true,
    },
  },
  {
    id: "node2",
    name: "node2",
    type: "condition",
    label: "node2",
    icon: "node2",
    description: "node2",
    code: "node2",
    inputs: [],
    next: {
      success: "end",
      fail: KoxyClass.stopSign,
    },
  },
  {
    type: "return",
    id: "end",
    name: "end",
    label: "end",
    icon: "end",
    description: "end",
    code: "end",
    inputs: [],
  },
];

const testnodes = {
  "node1": [
    myNodes[0],
    {
      main: (async () => {
        return true;
      }),
    },
  ],
  "node2": [
    myNodes[1],
    {
      main: async (node: KoxyNode, koxy: KoxyClass, self) => {
        return koxy.results.get("node1");
      },
    },
  ],
  "end": [
    myNodes[2],
    {
      main: async () => {
        return { status: 200, message: "Hi!" };
      },
    },
  ],
};

const nodes: Record<
  string,
  [KoxyNode, { main: NodeFunc; failed?: NodeFunc }]
> = {
  // <KOXY_NODES_FUNCTIONS>
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
      default:
        throw new Error(`Invalid node type`);
    }
  }

  async runLoop(): Promise<{
    status: number;
    body?: any;
  }> {
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
      return { status: res.res.status ?? 200, body: res.res };
    }

    this.koxy.logger.info(`Flow ${this.path} finished with no response`);
    return { status: 203 };
  }

  isValidString(value: string) {
    return typeof value === "string" && value.length > 0;
  }
}

const myapi: any = "// <API_HERE>";
const testkoxy = new KoxyClass(myapi, {} as any, {}, true);

// export const testkoxy = new Koxy(
//   {
//     flows: {
//       "/api/hi": [
//         {
//           id: "1",
//           name: "1",
//           method: "GET",
//           history: [],
//           "dependecies": [],
//           start: {
//             type: "start",
//             id: "start",
//             name: "start",
//             label: "start",
//             icon: "start",
//             description: "start",
//             code: "start",
//             inputs: [],
//             next: "node1",
//           },
//           end: {
//             type: "return",
//             id: "end",
//             name: "end",
//             label: "end",
//             icon: "end",
//             description: "end",
//             code: "end",
//             inputs: [],
//           },
//           nodes: myNodes,
//         },
//       ],
//     },
//   },
//   {} as any,
//   {},
//   true
// );

(async () => {
  console.time("run");
  const res = await testkoxy.run("/api/hi/", "GET");
  console.timeEnd("run");

  console.log(res);
  console.log(testkoxy.results);

  return;

  const suite = new Benchmark.Suite();

  suite.add("run", async () => {
    await testkoxy.run("/api/hi/", "GET");
  });

  suite
    .on("cycle", (event: any) => {
      console.log(String(event.target));
    })
    .on("complete", function (this: any) {
      console.log("benchmark finished");
    });

  await suite.run({ async: true });
})();
