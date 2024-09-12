import modal
from typing import TypedDict, Dict, List, Callable, Any, Optional, Literal
from datetime import datetime, timezone, timedelta
from keox import Keox
import time
import json
import shlex
import requests
from timing import min_to_ms, future, ago, read_iso
from version import version

class SandBoxItem(TypedDict):
    id: str
    host: str
    created_at: str
    expires_at: str
    latest_request: str | None
    sandbox: modal.Sandbox
    requests: List[str]
    version: str

class Sandbox:
    pool: Dict[str, SandBoxItem]
    local_pool: Dict[str, SandBoxItem]
    creation_state: Dict[str, bool]
    id: str
    api: dict
    keox: Keox

    def __init__(
        self, 
        api: dict | str,
        local_pool: Dict[str, SandBoxItem] = {},
    ):
        self.update_pools()
        self.local_pool = local_pool

        if type(api) == str:
            api = self.apis_pool[api]

        if api == None:
            raise Exception("API not found")

        self.id = api["id"]
        self.api = api
        self.keox = Keox(self.api)

        self.apis_pool[self.id] = self.api
        pass

    def update_pools(self):
        self.pool = modal.Dict.from_name("sandbox-pool", create_if_missing=True)
        self.creation_state = modal.Dict.from_name("sandbox-creation-state", create_if_missing=True)
        self.apis_pool = modal.Dict.from_name("sandbox-apis", create_if_missing=True)

    def create(self, onlog: Callable[[str], Any], force_rebuild: bool = False, skip:bool = False) -> SandBoxItem | None:
        try:
            if force_rebuild != True and skip != True and self.id in self.creation_state and self.creation_state[self.id] == True:
                print("Waiting for container to warm up...")
                total: float = 0.0;

                while self.creation_state[self.id] == True:
                    if total > 12:
                        print("Timed out waiting for container to warm up, warming up new one!")
                        self.creation_state[self.id] = False
                        total = 100
                        return self.create(onlog)

                    time.sleep(0.1)
                    total += 0.1

                current = self.get(True)
                if current != None and self.verify_timing(current) == True:
                    return current

                return self.create(onlog, skip=True)

            self.creation_state[self.id] = True
            timeout = self.api["timeout"] if "timeout" in self.api else 120
            self.api["timeout"] = timeout

            if self.id in self.local_pool:
                del self.local_pool[self.id]

            current = self.get(clone=True)
            [sandbox, host] = self.keox.build_sandbox(onlog, force_rebuild)

            timing = self.generate_timing(timeout*1000)
            item: SandBoxItem = {
                "id": sandbox.object_id,
                "host": host,
                "created_at": timing[0],
                "expires_at": timing[1],
                "sandbox": sandbox,
                "version": version(),
                "requests": current["requests"] if current and "requests" in current != None else []
            }

            self.pool[self.id] = item
            # self.local_pool[self.id] = item

            keep_awake = self.api["keep_awake"] if "keep_awake" in self.api else False

            # remove once the manager is deployed
            if current != None and keep_awake != True:
                try:
                    current = modal.Sandbox.from_id(current["id"])
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

    def request(self, onlog: Callable[[str], Any], force_rebuild: bool = False) -> SandBoxItem | None:
        self.update_pools()

        if force_rebuild != True:
            sandbox = self.get()
            if sandbox != None and self.verify_sandbox(sandbox) == True:
                self.pool[self.id]["requests"].append(datetime.now(timezone.utc).isoformat())
                return sandbox

        created = self.create(onlog)
        if created == None:
            return None

        self.pool[self.id]["requests"].append(datetime.now(timezone.utc).isoformat())
        return created

    def verify_sandbox(self, sandbox: SandBoxItem):
        timing = self.verify_timing(sandbox=sandbox)
        if timing == False:
            return False

        if sandbox["version"] != version():
            return False

        return True

    def verify_timing(self, sandbox: SandBoxItem):
        [created_at, expires_at] = [sandbox["created_at"], sandbox["expires_at"]]

        if future(expires_at) < min_to_ms(0.3):
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

    def get_host(self, onlog: Callable[[str], Any] | None = None, sandbox: modal.Sandbox | None = None) -> str | None:
        sandbox = sandbox if sandbox != None else self.request(onlog=onlog if onlog != None else lambda x: print(x))
        if sandbox == None:
            return None

        return sandbox["host"]

    def get_connection(self, onlog: Callable[[str], Any] | None = None, sandbox: modal.Sandbox | None = None) -> List[str] | None:
        sandbox = sandbox if sandbox != None else self.request(onlog=onlog if onlog != None else lambda x: print(x))
        if sandbox == None:
            return None

        return [self.get_host(), sandbox["expires_at"]]

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

        try:
            sandbox.terminate()
            return True
        except:
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

if __name__ == "__main__":
    print("Started")

    test = Sandbox({"id": "123456"}, {})

    start = time.time()
    box_item = test.request(lambda x: print(x))
    sandbox = modal.Sandbox.from_id(box_item["id"])
    print(sandbox._hydrate_metadata(None))

    print(ago(box_item["created_at"]))
    # print(test.state())

    req  = requests.get(f"{box_item['host']}/api/hi", headers={"path": "/api/hi"})
    print(req.json())
    print(time.time() - start)

    start = time.time()
    req  = requests.get(f"{box_item['host']}/api/hi", headers={"path": "/api/hi"})
    print(req.json())
    print(time.time() - start)

    start = time.time()
    req  = requests.get(f"{box_item['host']}", headers={"KOXY-GET-REQUESTS": "yes"})
    print(req.json())
    print(time.time() - start)

    print(box_item["host"])