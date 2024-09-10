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

def onlog(line: str):
    print(line)

with open("./src/api.json", "r") as f:
    content = json.load(f)
    sandbox = Sandbox(content)
    sandbox.create(onlog)

# sb = modal.Sandbox.from_id("sb-HTuc0F7q9PUuEcz4TqN8ik")

async def read_stdout(process):
    for line in process.stdout:
        print(line, str.startswith(line, "foo 4"))

        if (str.startswith(line, "foo 4")):
            break

async def main():
    print("Started")

    sb = modal.Sandbox.create(
        *["sleep", "infinity"], 
        image=modal.Image.debian_slim(),
        timeout=20
    )

    print(sb.object_id)

    # stdout_task0 = asyncio.create_task(read_stdout(sb))
    print("starting process")
    process = sb.exec("bash", "-c", "for i in $(seq 1 10); do echo foo $i; sleep 0.5; done")

    stdout_task = asyncio.create_task(read_stdout(process))

    print("Got here")

    await stdout_task

    print("Finished printing")
    process.wait()

    print(process.returncode)
    sb.terminate()


# asyncio.run(main())