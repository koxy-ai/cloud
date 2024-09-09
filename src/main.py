import modal
import asyncio
from typing import TypedDict, Dict, List
from datetime import datetime, timezone, timedelta
from keox import Keox
import time
import json
import shlex

class SandBoxItem(TypedDict):
    id: str
    sandbox: modal.Sandbox
    host: str
    state: str
    created_at: str
    expires_at: str
    latest_request: str

keox = Keox()
image = keox.build_image()

class Sandbox:
    pool: Dict[str, SandBoxItem]
    id: str

    def __init__(self, id: str):
        self.pool = modal.Dict.from_name("sandbox-pool", create_if_missing=True)
        self.id = id

    def create(self, api: str):
        startAt = time.time()

        sb = modal.Sandbox.create(
            *["bash", "-c", f"chmod +x /source/deno.sh && /source/deno.sh && echo {api} > /source/api.json && cat /source/api.json && /root/.deno/deno/bin run --allow-all /source/heart/main.ts"],
            image=image,
            timeout=10,
            encrypted_ports=[9009],
            # gpu=modal.gpu.T4(count=1),
        )

        took = time.time() - startAt
        print(f"created in {took}")

        for line in sb.stderr:
            print(line)

        # sb.wait()
        return

        # pull = sb.exec("bash", "-c", "cd /source && git pull")

        # for line in pull.stdout:
        #     print(line)

        # for line in pull.stderr:
        #     print(line)

        # pull.wait()

        # took = time.time() - startAt
        # print(f"done in {took}")

        for line in sb.stdout:
            if str.startswith(line, "READY"):
                took = time.time() - startAt
                print(f"done in {took}")
                break

            print(line)

        pass

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

with open("./src/api.json", "r") as f:
    content = json.dumps(f.read())
    sandbox = Sandbox("123")
    sandbox.create(
        shlex.quote(
            content
        )
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