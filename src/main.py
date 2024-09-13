import modal
import asyncio
from typing import TypedDict, Dict, List, Callable, Any
from datetime import datetime, timezone, timedelta
from keox import Keox
from sandbox import Sandbox
import time
import json
import shlex
import requests

if __name__ == "__main__":
    def onlog(line: str):
        print(line)

    with open("./src/api.json", "r") as f:
        content = json.load(f)
        sandbox = Sandbox(content)
        sandbox.request(onlog)
