import modal
from typing import TypedDict, Dict, List, Callable, Any, Optional, Literal
from datetime import datetime, timezone, timedelta
from keox import Keox
import time
import json
import shlex
import requests

class SandBoxItem(TypedDict):
    id: str
    host: str
    created_at: str
    expires_at: str
    latest_request: str | None
    sandbox: modal.Sandbox

class Sandbox:
    pool: Dict[str, SandBoxItem]
    creation_state: Dict[str, bool]
    id: str
    api: dict
    keox: Keox

    def __init__(self, api: dict, pool: Optional[modal.Dict] = None):
        self.pool = pool if pool != None else modal.Dict.from_name("sandbox-pool", create_if_missing=True)
        self.creation_state = modal.Dict.from_name("sandbox-creation-state", create_if_missing=True)
        self.id = api["id"]
        self.api = api
        self.keox = Keox(self.api)

    def create(self, onlog: Callable[[str], Any]) -> SandBoxItem | None:
        try:
            if self.creation_state[self.id] == True:
                print("Waiting for container to warm up...")
                while self.creation_state[self.id] == True:
                    time.sleep(0.1)
                return self.get()

            self.creation_state[self.id] = True

            timeout = self.api["timeout"] if "timeout" in self.api else 120
            self.api["timeout"] = timeout

            current = self.get_sandbox(clone=True)

            [sandbox, host] = self.keox.build_sandbox(onlog)

            req  = requests.get(f"{host}/api/hi", headers={"path": "/api/hi"})
            print(req.json())

            timing = self.generate_timing(timeout*1000)
            item: SandBoxItem = {
                "id": sandbox.object_id,
                "host": host,
                "created_at": timing[0],
                "expires_at": timing[1],
                "latest_request": None,
                "sandbox": sandbox
            }

            self.pool[self.id] = item

            if current != None:
                try:
                    current.terminate()
                except:
                    pass

            self.creation_state[self.id] = False
            return item
        except modal.exception.FunctionTimeoutError:
            print("Timed out")
            self.creation_state[self.id] = False
            return None
        except:
            self.creation_state[self.id] = False
            return None

    def request(self, onlog: Callable[[str], Any]) -> SandBoxItem | None:
        sandbox = self.get()
        if sandbox != None and self.verify_timing(sandbox) == True:
            return sandbox

        return self.create(onlog)

    def verify_timing(self, sandbox: SandBoxItem):
        [created_at, expires_at] = [sandbox["created_at"], sandbox["expires_at"]]

        if self.future(expires_at) < self.min_to_ms(0.3):
            print("Container expired")
            return False

        return True

    def get(self, clone: bool = False) -> SandBoxItem | None:
        try:
            sandbox = self.pool[self.id]
            if clone == True:
                return dict(sandbox)
            return sandbox
        except:
            return None

    def get_sandbox(self, clone: bool = False) -> modal.Sandbox | None:
        item = self.get()
        if item == None:
            return None

        if clone == True:
            return modal.Sandbox.from_id(item["id"])

        return item["sandbox"]

    def get_host(self) -> str | None:
        item = self.get()
        if item == None:
            return None

        return item["host"]

    def delete(self) -> bool:
        try:
            self.terminate()
            del self.pool[self.id]
            return True
        except:
            return False

    def terminate(self) -> bool:
        sandbox = self.get_sandbox()

        if sandbox == None:
            return False

        if sandbox.poll() == None:
            sandbox.terminate()

        return True

    def state(self) -> str:
        sandbox = self.get_sandbox()

        if sandbox == None:
            return "idle"

        if sandbox.poll() == None:
            return "running"

        return "idle"

    def creation_state(self) -> bool:
        try:
            return self.creation_state[self.id]
        except:
            return False

    def generate_timing(self, ms: int) -> List[str]:
        created_at = datetime.now(timezone.utc)
        created_at_iso = created_at.isoformat()

        expiration_time = created_at + timedelta(milliseconds=ms)
        expiration_time_iso = expiration_time.isoformat()

        return [created_at_iso, expiration_time_iso]

    def read_iso(self, iso: str) -> datetime:
        return datetime.fromisoformat(iso)

    def now(self) -> int:
        return datetime.now(timezone.utc).timestamp() * 1000

    def ago(self, iso: str) -> int:
        return (datetime.now(timezone.utc) - self.read_iso(iso)).total_seconds() * 1000

    def future(self, iso: str) -> int:
        return (self.read_iso(iso) - datetime.now(timezone.utc)).total_seconds() * 1000

    def min_to_ms(self, min: int | float) -> int:
        return (min * 60 * 1000).__round__()

print("Started")
test = Sandbox({"id": "123"})

box_item = test.request(lambda x: print(x))

print(test.ago(box_item["created_at"]))

print(test.state())
