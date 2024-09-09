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

export type OnFail = RetryOnFail | TerminateOnFail | IgnoreOnFail | CustomOnFail;

interface UntypedInput {
  key: string;
  label: string;
  description?: string;

  required: boolean;
  visible: boolean;

  validationRegex?: string;
  default?: any;
}

interface BaseInput extends UntypedInput {
  type: "string" | "number" | "boolean" | "any";
}

interface ArrayInput extends UntypedInput {
  type: "array";
  items: BaseInput | ObjectInput | ArrayInput;
}

interface ObjectInput extends UntypedInput {
  type: "object";
  properties: [BaseInput | ObjectInput | ArrayInput, string][];
}

export type Input = BaseInput | ObjectInput | ArrayInput;

export interface BaseNode {
  id: string;
  name: string;
  label: string;
  icon: string;
  description: string;

  code: string;
  inputs: [Input, string][]; // value format: type:K::

  group?: string;
  docs?: string; // markdown documentation
  help?: string; // link
}

export interface NormalNode extends BaseNode {
  type: "normal";
  next: string;
  onFail?: OnFail;
}

export interface ConditionNode extends BaseNode {
  type: "condition";
  next: { success: string; fail: string };
}

export interface ControlNode extends BaseNode {
  type: "control";
  next: string;
  children: NormalNode[];
}

export interface StartNode extends BaseNode {
  type: "start";
  next: string;
}

export interface ReturnNode extends BaseNode {
  type: "return";
}

export type KoxyNode = NormalNode | ConditionNode | ControlNode | ReturnNode;

export interface Flow {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE";

  start: StartNode;
  nodes: KoxyNode[];
  end: ReturnNode;

  history: Flow[];
  dependecies: string[];
}

export interface Api {
  flows: Record<string, Flow[]>;
}
