interface RetryOnFail {
  type: "retry";
  max: number;
  interval: number;
  continue: boolean;
}

interface TerminateOnFail {
  type: "terminate";
}

interface IgnoreOnFail {
  type: "ignore";
}

interface CustomOnFail {
  type: "custom";
  code: string;
}

type OnFail = RetryOnFail | TerminateOnFail | IgnoreOnFail | CustomOnFail;

interface Input {
  type: string;
  key: string;
  label: string;
  description?: string;

  required: boolean;
  visible: boolean;

  validationRegex?: string;
  default?: any;
}

interface BaseNode {
  id: string;
  name: string;
  label: string;
  icon: string;
  description: string;

  code: string;
  inputs: [Input, string][]; // value format: <kv-[type]>::
  dependencies: string[];

  group?: string;
  docs?: string; // markdown documentation
  help?: string; // link
}

interface NormalNode extends BaseNode {
  type: "normal";
  next: string;
  onFail?: OnFail;
}

interface ConditionNode extends BaseNode {
  type: "condition";
  next: { success: string; fail: string };
}

interface ControlNode extends BaseNode {
  type: "control";
  next: string;
  children: NormalNode[];
}

interface StartNode extends BaseNode {
  type: "start";
  next: string;
}

interface ReturnNode extends BaseNode {
  type: "return";
}

type KoxyNode = NormalNode | ConditionNode | ControlNode;

interface Flow {
  id: string;
  name: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";

  start: StartNode;
  nodes: KoxyNode[];
  end: ReturnNode;

  history: Flow[];
  dependecies: string[];
}

interface Api {
  flows: Record<string, Flow[]>;
}
