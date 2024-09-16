from sandbox import Sandbox
import json
import shlex
import os

if __name__ == "__main__":
    this_file_dir = os.path.dirname(os.path.realpath(__file__))

    def onlog(line: str):
        print(line)

    with open("./src/api.json", "r") as f:
        content = json.load(f)
        content = json.dumps(content)
        content = json.loads(content)
        with open("./src/api.json", "w") as f:
            json.dump(content, f, indent=2)
        sandbox = Sandbox(content, f"{this_file_dir}/api.json", {})
        sandbox.request(onlog)
