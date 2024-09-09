from node import Node
import os
import shutil
import shlex
import json

class Box:
    def __init__(self, source: str, path: str, api):
        self.source = source
        self.path = path
        self.api = api

    def copySource(self):
        if not os.path.exists(self.path):
            os.makedirs(self.path)

        os.system(f'/bin/bash -c "cp -r {self.source}/* {self.path}"')

    def writeNodes(self):
        nodes = []
        commands = []
        exports = ""
        callers = ""

        for v in self.api["flows"].keys():
            flows = self.api["flows"][v]

            for f in flows:
                f["nodes"].append(f["end"])
                for n in f["nodes"]:
                    if n["type"] in ["normal", "condition", "return"]:
                        node = Node(f"{self.path}/src/nodes", f"{self.path}/src/templates", n)
                        built = node.buildNode()
                        callers += f'"{n["name"]}": [{json.dumps(n)}, ' + "{ main: " + built["caller"] + "}],\n"

                    if n["type"] in ["normal", "condition"]:
                        exports += built["export"] + "\n"
                        os.system(f"/bin/bash -c 'echo holder > {self.path}/src/nodes/{n['id']}.ts'")
                        with open(f"{self.path}/src/nodes/{n['id']}.ts", "w") as file:
                            file.write(n["code"])
                            file.close()

        with open(f"{self.path}/src/nodes/index.ts", "w") as f:
            f.write(exports)
            f.close()

        with open(f"{self.path}/src/runner.ts", "r") as f:
            content = f.read()
            content = str.replace(content, "// <KOXY_NODES_FUNCTIONS>", callers)
            content = str.replace(content, '"// <API_HERE>"', json.dumps(self.api))
            f.close()

            with open(f"{self.path}/src/runner.ts", "w") as f:
                f.write(content)
                f.close()

    def writeApi(self):
        with open(f"{self.path}/main.ts", "r") as f:
            content = f.read()
            content = str.replace(content, '"// <KOXY_API>"', json.dumps(self.api))
            f.close()

            with open(f"{self.path}/main.ts", "w") as f:
                f.write(content)
                f.close()

    def build(self):
        self.copySource()
        self.writeNodes()
        self.writeApi()

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
                            "key": "node1",
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
                            return 4;
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

box = Box("/home/user/cloud/heart", "/home/user/cloud/copy", testapi)
box.build()
 