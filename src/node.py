import shlex
from typing import TypedDict, Optional, Any, List

class Node:
    def __init__(self, root: str, templates: str, node):
        self.root = root
        self.node = node
        self.templates = templates

    def getTemplate(self) -> str:
        file = ""

        if self.node["type"] == "normal":
            file = f"{self.templates}/normal.ts"

        elif self.node["type"] == "condition":
            file = f"{self.templates}/condition.ts"

        elif self.node["type"] == "control":
            file = f"{self.templates}/control.ts"

        elif self.node["type"] == "return":
            file = f"{self.templates}/end.ts"
        
        elif self.node["type"] == "python":
            file = f"{self.templates}/python.ts"

        with open(file, "r") as f:
            content = f.read()

            return content

    def buildCaller(self) -> str:
        template = self.getTemplate()
        func = str.split(template, "// <FUNCTION>")[1]
        inputs = ""
        solved: List[str] = []

        for input in self.node["inputs"]:
            [type, value] = str.split(input[1], ":K::")

            if input[0]["key"] in solved:
                continue

            if type == "string":
                value = f'"{shlex.quote(value)}"'

            inputs += f'"{input[0]["key"]}"' + ": " + value + ","
            solved.append(input[0]["key"])

        func = str.replace(func, "// <INPUTS>", inputs)
        func = str.replace(func, "; // <NODE_CALL>", " await koxyNodes." + self.node["name"] + "(Koxy, inputs);")
        func = str.replace(func, "<PYTHON_FILE_PATH>", f'{self.root}/{self.node["id"]}.py')

        # while the func ends with a white space remove it:
        if str.endswith(func, "\n"):
            func = func[:-1]

        if str.endswith(func, ";"):
            func = func[:-1]

        func += ","

        return func

    def command(self) -> str:
        command = f'echo {shlex.quote(self.node["code"])} > {self.root}/{self.node["id"]}.ts'
        return command

    def export(self):
        return "export { main as " + self.node["name"] + " } from " + '"' + f'./{self.node["id"]}.ts' + '";'

    def pythonFile(self) -> str:
        with open(f"{self.templates}/python.py", "r") as f:
            content = f.read()
            content = str.replace(content, "# <CODE>", self.node["code"])
            return content

    def getCode(self):
        if self.node["type"] != "python":
            return self.node["code"]

        return self.pythonFile()

    def buildNode(self):
        return {
            "caller": self.buildCaller(),
            "command": self.command(),
            "code": self.getCode(),
            "export": self.export()
        }