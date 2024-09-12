import modal
from datetime import datetime, timezone
from timing import future, min_to_ms, future, read_iso
import requests
from sandbox import Sandbox, SandBoxItem
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time

app = modal.App()

# @app.function(schedule=modal.Period(minutes=1))
def manager():
    print("started")

    sandboxes_pool = modal.Dict.from_name("sandbox-pool", create_if_missing=True)
    apis_pool = modal.Dict.from_name("sandbox-apis", create_if_missing=True)
    terminate_next = modal.Dict.from_name("terminate-next", create_if_missing=True)

    def terminate(key: str):
        sandbox: SandBoxItem = terminate_next[key]
        sb = modal.Sandbox.from_id(sandbox["id"])
        sb.terminate()
        del terminate_next[key]

    def call(key: str):
        sandbox: SandBoxItem = sandboxes_pool[key]
        req = None

        def heavy_traffic(s: int, req: int) -> bool:
            needed = ((s * 100) / 300).__round__()
            if req >= needed:
                return True
            
            return False
            pass

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

        req_num = req["requests"] if "requests" in req else 0

        print("expire_per", expire_per, "total:", timeout, "curent:", created_in)
        print("Sandbox is active")

        if expire_per >= 90:
            api = apis_pool[key]
            traffic = heavy_traffic(created_in, req_num)
            keep_warm = api["keep_warm"] if "keep_warm" in api else False

            if traffic == False or keep_warm != True:
                print(f"container {key} will die soon")
                terminate_next[key] = sandbox
                return

            print("warming up new container")
            Sandbox(key, {}).create(lambda x: print(x))
            terminate_next[key] = sandbox

    with ThreadPoolExecutor() as executor:
        calls = list(executor.map(call, apis_pool.keys()))
        terms = list(executor.map(terminate, terminate_next.keys()))

    pass

if __name__ == "__main__":
    manager()
    