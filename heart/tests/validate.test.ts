import { expect } from "https://deno.land/x/expect/mod.ts";
import { ValidateInputs } from "../src/validate-inputs.ts";
import { testkoxy } from "../src/runner.ts";

const validator = new ValidateInputs(testkoxy, [
  [
    {
      type: "string",
      key: "name",
      label: "Name",
      required: true,
      visible: true,
    },
    "",
  ],
  [
    {
      type: "object",
      properties: [
        [
          {
            key: "name",
            type: "string",
            label: "Name",
            required: true,
            visible: true,
          },
          "",
        ],
        [
          {
            key: "age",
            type: "number",
            label: "Name",
            required: true,
            visible: true,
          },
          "",
        ],
        [
          {
            key: "languages",
            type: "array",
            items: {
              type: "string",
              key: "items",
              label: "Name",
              required: true,
              visible: true,
            },
            label: "Name",
            required: true,
            visible: true,
          },
          "",
        ],
      ],
      key: "obj",
      label: "Name",
      required: true,
      visible: true,
    },
    "",
  ],
]);

const valid1 = validator.validate({
  name: "Kais",
  obj: {
    name: "kais",
    age: 19,
    languages: [
      "ts",
      "py",
    ],
  },
});

console.log(valid1);
