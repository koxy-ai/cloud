import modal
from sandbox import Sandbox
import json

if __name__ == "__main__":
    def onlog(line: str):
        print(line)

    sandbox = modal.Sandbox.from_id("sb-UgWdQrMjgtemB8zPnHZEf3")
    print(sandbox.stderr.read())

    # with open("./src/api.json", "r") as f:
    #     content = json.load(f)
    #     sandbox = Sandbox(content)
    #     sandbox.request(onlog)
