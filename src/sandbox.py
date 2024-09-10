import modal
from typing import TypedDict, Dict, List, Callable, Any, Optional
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

class Sandbox:
    pool: Dict[str, SandBoxItem]
    id: str
    api: dict
    keox: Keox

    def __init__(self, api: dict, pool: Optional[modal.Dict] = None):
        self.pool = pool if pool != None else modal.Dict.from_name("sandbox-pool", create_if_missing=True)
        self.id = api["id"]
        self.api = api
        self.keox = Keox(self.api)

    def create(self, onlog: Callable[[str], Any]) -> modal.Sandbox | None:
        try:
            [sandbox, host] = self.keox.build_sandbox(onlog)

            req  = requests.get(f"{host}/api/hi", headers={"path": "/api/hi"})
            print(req.json())

            # sandbox.terminate()
            # print(sandbox.poll())

            return sandbox
        except:
            return None

    def request(self, onlog: Callable[[str], Any]):
        sandbox = self.get()
        if sandbox != None and self.verify_timing(sandbox):
            return modal.Sandbox.from_id(sandbox["id"])

        sandbox = self.create(onlog)
        return sandbox

    def verify_timing(self, sandbox: SandBoxItem):
        created_at = self.read_iso(sandbox["created_at"])
        expires_at = self.read_iso(sandbox["expires_at"])

        if expires_at - self.min_to_ms(1) < datetime.now(timezone.utc):
            return False

        return True

    def get(self) -> SandBoxItem | None:
        try:
            return self.pool[self.id]
        except:
            return None

    def get_sandbox(self) -> modal.Sandbox | None:
        item = self.get()
        if item == None:
            return None

        return modal.Sandbox.from_id(item["id"])

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


test = Sandbox({"id": "123"})
timing = test.generate_timing(30000)

time.sleep(1)

print("ago", (test.ago(timing[0]) / 1000).__round__())
print("future", (test.future(timing[1]) / 1000).__round__())
print("min_to_ms", test.min_to_ms(1.5))

print(test.pool)