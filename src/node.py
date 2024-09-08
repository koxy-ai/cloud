import shlex
from typing import TypedDict, Optional, Any, List

class Input(TypedDict):
    type: str
    key: str
    required: bool
    validationRegex: Optional[str]
    default: Any

class BaseNodeType(TypedDict):
    id: str
    name: str
    code: str
    inputs: List[Input]

class NormalNodeType(BaseNodeType):
    type: "normal"
    next: str
    onFail: Any

class ConditionNodeType(BaseNodeType):
    type: "condition"
    next: { "success": str, "fail": str }

class Node:
    node: NormalNodeType | ConditionNodeType

    def __init__(self, root: str, node: NormalNodeType | ConditionNodeType):
        self.root = root
        self.node = node

    def command(self) -> str:
        command = f'echo {shlex.quote(self.node["code"])} > {self.root}/{self.node["id"]}.ts'
        return command

    def export(self):
        return "export { main as " + self.node["id"] + " } from " + f'"./{self.node["id"]}.ts"'


node = Node("/koxy", {
    "type": "normal",
    "id": "node1",
    "name": "Node 1",
    "next": [],
    "code": """const fs = require("fs");

console.log("hi", 'hi', `${Date.now()} "f"`, fs)"""
})

print(node.command())
print("---")
print(node.export())