import { Koxy } from "./koxy.ts";
import type { KoxyNode, Input } from "./index.d.ts"

export class ValidateInputs {
  inputs: KoxyNode["inputs"];
  koxy: Koxy;

  constructor(koxy: Koxy, inputs: KoxyNode["inputs"]) {
    this.koxy = koxy;
    this.inputs = inputs;
  }

  validate(data: Record<string, any>, inputs?: Input[]) {
    for (const i of inputs || this.inputs.map((i) => i[0])) {
      const item = data[i.key];
      const res = this.validateInput(item, i);

      if (!res) return false;
    }

    return true;
  }

  validateInput(item: any, input: Input): boolean {
    if (item === undefined && input.required) {
      this.koxy.logger.error(`Input ${input.key} is required`);
      return false;
    }

    if (item === undefined && !input.required) return true;

    if (input.validationRegex) {
      const regex = new RegExp(input.validationRegex);
      if (!regex.test(item)) {
        this.koxy.logger.error(
          `Input ${input.key} is invalid based on the regex validation`,
        );
        return false;
      }
    }

    if (input.type === "any") return true;

    if (typeof item !== String(input.type === "array" ? "object" : input.type)) {
      this.koxy.logger.error(
        `Input ${input.key} has invalid type. expected ${input.type} got ${typeof item}`,
      );
      return false;
    }

    if (input.type === "array") {
      const res = (item as any[]).map((i) =>
        this.validateInput(i, input.items)
      );
      return res.every((i) => i);
    }

    if (input.type === "object") {
      const res = this.validate(item, input.properties.map(i => i[0]));
      return res;
    }

    return true;
  }
}
