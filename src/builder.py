from node import Node
import os
import shutil
import shlex
import json
from typing import Dict, Optional
import sys

class Builder:
    def __init__(self, source: str, path: str, api: Dict, env: Optional[Dict[str, str]] | None = None):
        self.source = source
        self.path = path
        self.api = api
        self.env = env

    def copy_source(self):
        print("Copying source code to destination")

        if not os.path.exists(self.path):
            print(f"Creating directory {self.path}")
            os.makedirs(self.path)

        os.system(f'/bin/bash -c "cp -r {self.source}/* {self.path}"')
        print("Copied source code to destination")

    def write_nodes(self):
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
                        os.system(f"/bin/bash -c 'touch {self.path}/src/nodes/{n['id']}.ts'")
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

    def write_api(self):
        print("Writing api")

        with open(f"{self.path}/main.ts", "r") as f:
            content = f.read()
            content = str.replace(content, '"// <KOXY_API>"', json.dumps(self.api))
            f.close()

            with open(f"{self.path}/main.ts", "w") as f:
                f.write(content)
                f.close()

    def write_env(self):
        print("Writing env")

        with open(f"{self.path}/.env", "w") as f:
            for k, v in self.env.items():
                f.write(f"{k}={v}\n")
            f.close()

    def build(self, copy: bool = True):
        if copy != False:
            self.copy_source()

        self.write_nodes()
        self.write_api()

        if self.env:
            self.write_env()

        print(f"Done building project: {self.api['id']}")

if __name__ == "__main__":
    with open(f"{os.path.dirname(os.path.realpath(__file__))}/api.json") as f:
        testapi = json.load(f)
        f.close()

        args = sys.argv[1:]
        options = {}

        for arg in args:
            [key, value] = str.split(arg, "=")
            options[key] = value

        builder = Builder(
            options["source"],
            options["path"],
            testapi, 
        )

        builder.build()
