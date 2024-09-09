import { Koxy } from "./koxy";
// <NODES_IMPORTS>

type NodeFunc = (
  node: KoxyNode,
  koxy: Koxy,
  self: { main: Function; failed?: Function },
  retry?: number,
) => any;

const nodes: Record<
  string,
  [KoxyNode, { main: NodeFunc; failed: NodeFunc }]
> = {
  // <KOXY_NODES_FUNCTIONS>
};

export class Runner {
  koxy: Koxy;
  path: string;
  method: string;
  flow: Flow;

  constructor(path: string, method: string, koxy: Koxy) {
    this.koxy = koxy;
    this.path = path;
    this.method = method;

    const wantedPath = koxy.api.flows[this.getPathRoot(path)];

    if (!wantedPath) {
      throw new Error(`Path ${path} not found`);
    }

    const flow = wantedPath.find((f) =>
      f.method.toLowerCase() === method.toLowerCase()
    );
    if (!flow) {
      throw new Error(`Method ${method} not found`);
    }

    this.flow = flow;
  }

  getPathRoot(path: string) {
    const parts = path.split("?");
    const pathRoot = parts[0].split("#")[0];
    return pathRoot;
  }

  async runNode(name: string): Promise<any> {
    const [node, funcs] = nodes[name];

    if (node.type !== "normal") {
      throw new Error(`Node ${name} is not a normal node`);
    }

    const res = await funcs.main(node, this.koxy, funcs);

    if (res === this.koxy.stopSign) {
      return;
    }

    if (res === this.koxy.ignoreSign) {
      this.koxy.results.set(name, undefined);
      return;
    }

    this.koxy.results.set(name, res);
    return await this.runNext(node.next);
  }

  async runCondition(name: string) {
    const [node, funcs] = nodes[name];

    if (node.type !== "condition") {
      throw new Error(`Node ${name} is not a condition node`);
    }

    const res = (await funcs.main(node, this.koxy, funcs)) as boolean;

    if (res) {
      return await this.runNext(node.next.success);
    };

    return await this.runNext(node.next.fail);
  }

  async runController(name: string) {

  }

  async runNext(name: string) {
    if (!this.isValidString(name)) {
      throw new Error(`Invalid next node name: ${name}`);
    }

    if (name === this.koxy.stopSign) {
      return;
    }

    if (name === this.koxy.ignoreSign) {
      return;
    }

    const node = this.flow.nodes.find((n) => n.id === name);

    if (!node) {
      throw new Error(`Node ${name} not found`);
    }

    this.koxy.runningNode = name;
    return await this.processNode(node);
  }

  async processNode(node: KoxyNode) {}

  async runLoop() {
    if (this.flow.start.type !== "start") {
      throw new Error(`Start node is not a start node`);
    }

    return await this.runNext(this.flow.start.next);
  }

  isValidString(value: string) {
    return typeof value === "string" && value.length > 0;
  }
}
