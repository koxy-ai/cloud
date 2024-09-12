import modal
from datetime import datetime, timezone
from timing import future, min_to_ms, future, read_iso
import requests
from sandbox import Sandbox, SandBoxItem
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time
from keox import Keox
from usage import Usage
from copy import deepcopy

app = modal.App()

# @app.function(schedule=modal.Period(minutes=1))
def manager():
    print("started")

    sandboxes_pool = modal.Dict.from_name("sandbox-pool", create_if_missing=True)
    apis_pool = modal.Dict.from_name("sandbox-apis", create_if_missing=True)
    terminate_next = modal.Dict.from_name("terminate-next", create_if_missing=True)

    def terminate(key: str, sandbox: SandBoxItem = None, api: dict = None):
        sandbox: SandBoxItem = sandbox if sandbox != None else sandboxes_pool[key]
        api = api if api != None else apis_pool[key]

        if sandbox == None or api == None:
            return

        req = None
        delayed = Keox.read_property(sandbox, "termination_delayed", 0)

        try:
            req = requests.get(
                sandbox["host"],
                headers={"KOXY-STATS": f"yes"}
            )
            req = req.json()
        except:
            if delayed < 3:
                apis_pool[key]["termination_delayed"] = delayed + 1
                print(f"Container {key} will be delayed to stop")

        processing: int = Keox.read_property(req, "processing", 0)

        if processing > 0 and delayed < 3:
            apis_pool[key]["termination_delayed"] = delayed + 1
            print(f"Container {key} will be delayed to stop")
            return

        created_at = read_iso(sandbox["created_at"])
        expires_at = read_iso(sandbox["expires_at"])
        timeout = (expires_at - created_at).total_seconds()

        cpus = Keox.read_cpu(api)
        idle_usage = Keox.read_property(req, "idle", timeout*1000) / 1000
        actual_usage = Keox.read_property(req, "usage", 100) / 1000

        [memory_request, memory_limit, memory] = Keox.read_memory(api)

        base_cpu_usage = Usage.cpu_per_s(cpus, idle_usage)
        actual_cpu_usage = Usage.cpu_per_s(cpus + 3, actual_usage)
        full_cpu_usage = base_cpu_usage + actual_cpu_usage

        print("base_cpu_usage", base_cpu_usage)
        print("actual_cpu_usage", actual_cpu_usage)
        print("full_cpu_usage", full_cpu_usage)

        sb = modal.Sandbox.from_id(sandbox["id"])
        sb.terminate()
        del terminate_next[key]

    def call(key: str):
        sandbox: SandBoxItem = dict(sandboxes_pool[key])
        req = None

        def heavy_traffic(s: int, req: int) -> bool:
            needed = ((s * 100) / 300).__round__()
            if req >= needed:
                return True
            
            return False

        try:
            req = requests.get(
                sandbox["host"],
                headers={"KOXY-STATS": f"yes"}
            )
            req = req.json()
            print(req)
        except:
            # del sandboxes_pool[key] # enable in production
            print("Sandbox is idle")
            return

        created_at = read_iso(sandbox["created_at"])
        created_in = (datetime.now(timezone.utc) - created_at).total_seconds()
        expires_at = read_iso(sandbox["expires_at"])
        expires_in = (expires_at - datetime.now(timezone.utc)).total_seconds()
        timeout = (expires_at - created_at).total_seconds()
        expire_per = (created_in * 100) / timeout

        req_num = Keox.read_property(req, "requests", 0)
        processing = Keox.read_property(req, "processing", 0)

        print("expire_per", expire_per, "total:", timeout, "curent:", created_in)
        print("Sandbox is active")

        if expire_per >= 90:
            api = dict(apis_pool[key])
            traffic = heavy_traffic(created_in, req_num)
            keep_warm = api["keep_warm"] if "keep_warm" in api else False

            if traffic == True or keep_warm == True or processing > 3:
                print("warming up new container")
                Sandbox(key, {}).create(lambda x: print(x))
                terminate(sandbox, api)
                return

            terminate(sandbox, api)
            print(f"container {key} will die soon")

    with ThreadPoolExecutor() as executor:
        terms = list(executor.map(terminate, terminate_next.keys()))
        calls = list(executor.map(call, apis_pool.keys()))

    pass

if __name__ == "__main__":
    manager()

