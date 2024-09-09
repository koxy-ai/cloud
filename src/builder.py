from node import Node
import os
import shutil
import shlex
import json
from typing import Dict, Optional

class Builder:
    def __init__(self, source: str, path: str, api: Dict, env: Optional[Dict[str, str]] | None = None):
        self.source = source
        self.path = path
        self.api = api
        self.env = env

    def copySource(self):
        print("Copying source code to destination")

        if not os.path.exists(self.path):
            print(f"Creating directory {self.path}")
            os.makedirs(self.path)

        os.system(f'/bin/bash -c "cp -r {self.source}/* {self.path}"')
        print("Copied source code to destination")

    def writeNodes(self):
        print("Writing nodes")

        nodes = []
        commands = []
        exports = ""
        callers = ""

        for v in self.api["flows"].keys():
            flows = self.api["flows"][v]

            for f in flows:
                print(f"Reading flow {v}->{f['method']}")
                f["nodes"].append(f["end"])

                for n in f["nodes"]:
                    if n["type"] in ["normal", "condition", "return"]:
                        print(f"Building {n['type']} node: {n['name']}")
                        node = Node(f"{self.path}/src/nodes", f"{self.path}/src/templates", n)
                        built = node.buildNode()
                        callers += f'"{n["name"]}": [{json.dumps(n)}, ' + "{ main: " + built["caller"] + "}],\n"
                        print(f"Built {n['type']} node: {n['name']}")

                    if n["type"] in ["normal", "condition"]:
                        print(f"Writing {n['type']} node: {n['name']}")

                        exports += built["export"] + "\n"
                        os.system(f"/bin/bash -c 'echo holder > {self.path}/src/nodes/{n['id']}.ts'")
                        with open(f"{self.path}/src/nodes/{n['id']}.ts", "w") as file:
                            file.write(n["code"])
                            file.close()
                            print(f"Wrote {n['type']} node: {n['name']}")

                print(f"Wrote flow {v}->{f['method']}")

        print("Built all flows")

        with open(f"{self.path}/src/nodes/index.ts", "w") as f:
            print("Writing nodes index & exports")
            f.write(exports)
            f.close()

        with open(f"{self.path}/src/runner.ts", "r") as f:
            print("Writing runner callers")

            content = f.read()
            content = str.replace(content, "// <KOXY_NODES_FUNCTIONS>", callers)
            # content = str.replace(content, '"// <API_HERE>"', json.dumps(self.api))
            f.close()

            with open(f"{self.path}/src/runner.ts", "w") as f:
                f.write(content)
                f.close()

    def writeApi(self):
        print("Writing api")

        with open(f"{self.path}/main.ts", "r") as f:
            content = f.read()
            content = str.replace(content, '"// <KOXY_API>"', json.dumps(self.api))
            f.close()

            with open(f"{self.path}/main.ts", "w") as f:
                f.write(content)
                f.close()

    def writeEnv(self):
        print("Writing env")

        with open(f"{self.path}/.env", "w") as f:
            for k, v in self.env.items():
                f.write(f"{k}={v}\n")
            f.close()

    def build(self, copy: bool = True):
        if copy != False:
            self.copySource()

        self.writeNodes()
        self.writeApi()

        if self.env:
            self.writeEnv()

        print(f"Done building project: {self.api['id']}")

testapi = dict({
    "id": "324",
    "flows": {
        "/api/hi": [
            {
                "id": "1",
                "name": "1",
                "method": "GET",
                "history": [],
                "dependecies": [],
                "start": {
                    "type": "start",
                    "id": "start",
                    "name": "start",
                    "label": "start",
                    "icon": "start",
                    "description": "start",
                    "code": "start",
                    "inputs": [],
                    "next": "node1",
                },
                "end": {
                    "type": "return",
                    "id": "end",
                    "name": "end",
                    "label": "end",
                    "icon": "end",
                    "description": "end",
                    "code": "end",
                    "inputs": [
                        [{
                            "key": "response",
                            "type": "string",
                            "label": "",
                            "required": True,
                            "visible": True,
                        },
                        'code:K::Koxy.results.get("node1")']
                    ],
                },
                "nodes": [
                    {
                        "type": "normal",
                        "id": "node1id",
                        "name": "node1",
                        "label": "Node",
                        "description": "",
                        "icon": "",
                        "next": "node2",
                        "inputs": [
                            [{"key": "date", "type": "number", "label": "", "required": True, "visible": True}, "code:K::Date.now()"],
                            [{"key": "hi-s", "type": "string", "label": "", "required": True, "visible": True}, "string:K::hi"],
                        ],
                        "code": """export async function main(koxy, inputs) {
                            console.log("node1", inputs);
                            return "Hi";
                        }"""
                    },
                    {
                        "type": "normal",
                        "id": "node2id",
                        "name": "node2",
                        "label": "Node",
                        "description": "",
                        "icon": "",
                        "next": "end",
                        "inputs": [
                            [{"key": "date", "type": "number", "label": "", "required": True, "visible": True}, "code:K::Date.now()"],
                            [{"key": "hi-s", "type": "string", "label": "", "required": True, "visible": True}, "string:K::hi"],
                        ],
                        "code": """export async function main(koxy, inputs) {console.log("node2", inputs)}"""
                    },
                ]
            },
        ],
    },
})

builder = Builder(
    "/home/user/cloud/heart", 
    "/home/user/cloud/copy", 
    testapi, 
    {
        "TOKEN": "fmdslnfdslgsdygojo34yeifd",
        "TOKEN2": "fndsfknsdkofdpgofdu"
    }
)
builder.build()
