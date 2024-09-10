import modal
import asyncio
from typing import TypedDict, Dict, List
from datetime import datetime, timezone, timedelta
from keox import Keox
import time
import json
import shlex
import requests

class SandBoxItem(TypedDict):
    id: str
    sandbox: modal.Sandbox
    host: str
    state: str
    created_at: str
    expires_at: str
    latest_request: str

class Sandbox:
    pool: Dict[str, SandBoxItem]
    id: str

    def __init__(self, id: str):
        self.pool = modal.Dict.from_name("sandbox-pool", create_if_missing=True)
        self.id = id

    def create(self, api: dict, onlog):
        keox = Keox(api)
        startAt = time.time()

        sb = keox.build_sandbox(True)

        took = time.time() - startAt
        print(f"created in {took}")

        tunnel = sb.tunnels()[0]
        host = f"https://{tunnel.host}"

        for line in sb.stdout:
            onlog(line)
            if str.startswith(str.lower(line), "listening"):
                took = time.time() - startAt
                print(f"done in {took}")
                break

        print("READY")

        req  = requests.get(f"{host}/api/hi", headers={"path": "/api/hi"})
        print(req.text)        

        sb.terminate()
        return

    def spinup(self, api: dict, onlog):
        keox = Keox(api)
        startAt = time.time()

        sb = keox.build_sandbox(False)

        took = time.time() - startAt
        print(f"created in {took}")

        tunnel = sb.tunnels()[0]
        host = f"https://{tunnel.host}"

        for line in sb.stdout:
            onlog(line)
            if str.startswith(str.lower(line), "listening"):
                took = time.time() - startAt
                print(f"done in {took}")
                break

        print("READY")

        req  = requests.get(f"{host}/api/hi", headers={"path": "/api/hi"})
        print(req.text)        

        sb.terminate()
        return

    def get(self) -> SandBoxItem | None:
        try:
            return self.pool[self.id]
        except:
            return None

    def delete(self) -> bool:
        try:
            del self.pool[self.id]
            return True
        except:
            return False

    def terminate(self):
        pass

    def generate_timing(self, ms: int) -> List[str]:
        created_at = datetime.now(timezone.utc)
        created_at_iso = created_at.isoformat()

        expiration_time = created_at + timedelta(milliseconds=ms)
        expiration_time_iso = expiration_time.isoformat()

        return [created_at_iso, expiration_time_iso]

def onlog(line):
    print(line)

with open("./src/api.json", "r") as f:
    content = json.load(f)
    sandbox = Sandbox("123")
    sandbox.create(
        content, onlog
    )

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