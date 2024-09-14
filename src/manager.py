import modal
import sys

app = modal.App(name="koxy-sandbox-manager")

image = (
    modal.Image.debian_slim(python_version="3.11.8")
    .pip_install("modal", "requests")
)

@app.function(
    schedule=modal.Period(seconds=60), 
    cpu=1.5,
    memory=2048,
    image=image,
    container_idle_timeout=5,
    mounts=[
        modal.Mount
        .from_local_python_packages(
            "keox", "usage", "sandbox", "timing", "version"
        )
    ],
)
def manager():
    import modal
    from datetime import datetime, timezone
    from timing import future, min_to_ms, future, read_iso
    import requests
    from sandbox import Sandbox, SandBoxItem
    from concurrent.futures import ThreadPoolExecutor
    import time
    from keox import Keox
    from usage import Usage

    print("started")

    sandboxes_pool = modal.Dict.from_name("sandbox-pool", create_if_missing=True)
    apis_pool = modal.Dict.from_name("sandbox-apis", create_if_missing=True)
    usage_check = modal.Dict.from_name("usage-check", create_if_missing=True)
    terminate_next = modal.Dict.from_name("terminate-next", create_if_missing=True)

    def get_check(id: str, api: dict):
        saved = usage_check[id] if id in usage_check else None
        if saved != None:
            print(f"Using saved check for container {id}")
            return saved

        timeout = Keox.read_timeout(api)
        print(f"Creating new avg check for container {id}")
        return {"idle": 1000, "usage": timeout*1000}

    def bill(api: dict, usage: float, idle: float, timeout: float, full_cpu: int = None):
        dead_time = timeout - (usage + idle)
        if dead_time > 0:
            idle += dead_time

        print(f"Billing {api['id']} -> Usage: {usage}s, Idle: {idle}s")

        cpu = Keox.read_cpu(api)
        [memory_request, memory_limit, memory] = Keox.read_memory(api)
        if full_cpu == None:
            full_cpu = cpu + 2

        idle_cpu = Usage.cpu_per_s(cpu, idle)
        active_cpu = Usage.cpu_per_s(full_cpu, usage)
        total_cpu = idle_cpu + active_cpu

        idle_memory = Usage.ram_per_s(memory_request / 1000, idle)
        active_memory = Usage.ram_per_s(memory_limit / 1000, usage)
        total_memory = idle_memory + active_memory

        total = total_cpu + total_memory

        print(f"Generated bill: ${total}. CPU: {total_cpu}, RAM: {total_memory}")
        return total

    def terminate(key: str, sandbox: SandBoxItem = None, api: dict = None):
        sandbox: SandBoxItem = sandbox if sandbox != None else terminate_next[key]
        api = api if api != None else apis_pool[key]

        if sandbox == None or api == None:
            return

        print(f"Terminating container {sandbox['id']} for API {key}")

        req = None
        delayed = Keox.read_property(sandbox, "termination_delayed", 0)
        sb = modal.Sandbox.from_id(sandbox["id"])
        created_at = read_iso(sandbox["created_at"])
        expires_at = read_iso(sandbox["expires_at"])
        timeout = (expires_at - created_at).total_seconds()
        since = (datetime.now(timezone.utc) - created_at).total_seconds() * 1000

        if (sb.returncode != None and sb.returncode != 0) or future(sandbox["full_limit"]) < 0:
            print(f"Container {sandbox['id']} is already dead ({sb.returncode}). billing and deleting")
            if Keox.read_property(api, "billed", False) == False:
                usage = get_check(sandbox['id'], api)

                sb_bill = bill(api, usage["usage"] / 1000, usage["idle"] / 1000, timeout)
                print("Billed:", f"${sb_bill}")

            del terminate_next[key]
            return

        try:
            req = requests.get(
                sandbox["host"],
                headers={"KOXY-STATS": f"yes"}
            )
            req = req.json()
        except:
            if delayed < 3:
                terminate_next[key]["termination_delayed"] = delayed + 1
                print(f"Container {sandbox['id']} will be delayed to stop (not responding)")
                return

        if req == None:
            print(f"Couldn't get specific stats for container {sandbox['id']}")
            req = get_check(sandbox['id'], api)
            req["requests"] = 0
            req["processing"] = 0
        else:
            usage_check[sandbox['id']] = req

        print(req)
        processing: int = Keox.read_property(req, "processing", 0)

        if processing > 0 and delayed < 3:
            terminate_next[key]["termination_delayed"] = delayed + 1
            print(
                f"Container {sandbox['id']} will be delayed to stop. processing: {processing} requests"
            )
            return

        idle_usage = Keox.read_property(req, "idle", timeout*1000) / 1000
        actual_usage = Keox.read_property(req, "usage", 1000) / 1000
        sb_bill = bill(api, actual_usage, idle_usage, timeout)
        print("Billed:", f"${sb_bill}")

        try:
            sb = modal.Sandbox.from_id(sandbox["id"])
            sb.terminate()
            del terminate_next[key]
        except:
            del terminate_next[key]

    def call(key: str):
        sandbox: SandBoxItem = dict(sandboxes_pool[key]) if key in sandboxes_pool else None
        if sandbox == None:
            return

        api = apis_pool[key]
        sb = modal.Sandbox.from_id(sandbox["id"])
        req = None

        def heavy_traffic(s: int, req: int) -> bool:
            needed = ((s * 100) / 300).__round__()
            if req >= needed:
                return True

            return False

        if sb.returncode != None and sb.returncode != 0:
            print(f"Container {sandbox['id']} is dead, return code: {sb.returncode}")
            if Keox.read_property(sandbox, "billed", False) == False:
                terminate_next[key] = sandbox
            del sandboxes_pool[key]
            return

        created_at = read_iso(sandbox["created_at"])
        created_in = (datetime.now(timezone.utc) - created_at).total_seconds()
        expires_at = read_iso(sandbox["expires_at"])
        expires_in = (expires_at - datetime.now(timezone.utc)).total_seconds()
        timeout = (expires_at - created_at).total_seconds()

        if future(sandbox["full_limit"]) < 0:
            print(f"Container {sandbox['id']} is expired, will terminate")
            terminate_next[key] = sandbox
            del sandboxes_pool[key]
            return

        try:
            print(f"Communicating with container {sandbox['host']}")
            req = requests.get(
                sandbox["host"],
                headers={"KOXY-STATS": "yes"}
            )
            req = req.json()
        except:
            print(
                f"Can't communicate with container {sandbox['id']}"
            )
            return

        # update the usage check to latest info we have
        usage_check[sandbox['id']] = req

        expire_per = round((created_in * 100) / timeout, 2)
        req_num = Keox.read_property(req, "requests", 0)
        processing = Keox.read_property(req, "processing", 0)

        print(f"Expiration percentage for {sandbox['id']}: {expire_per}%")

        if expire_per >= 90:
            api = dict(apis_pool[key])
            traffic = heavy_traffic(created_in, req_num)
            keep_warm = Keox.read_property(api, "keep_warm", False)

            if traffic == True or keep_warm == True or processing >= 10:
                print(f"Replacing container {sandbox['id']} with new warm one")
                Sandbox(key, {}).create(lambda x: print(x))
                terminate_next[key] = sandbox
                return

            terminate_next[key] = sandbox
            del sandboxes_pool[key]
            print(f"Killing container {sandbox['id']} soon")

    def safe_call(key: str):
        try:
            call(key)
        except:
            pass
    
    def safe_terminate(key: str):
        try:
            terminate(key)
        except:
            pass

    with ThreadPoolExecutor() as executor:
        calls = list(executor.map(safe_call, apis_pool.keys()))
        terms = list(executor.map(safe_terminate, terminate_next.keys()))

    pass

if __name__ == "__main__":
    deploy_arg = "--deploy" in sys.argv

    if deploy_arg == True:
        modal.runner.deploy_app(app)
    else:
        manager.local()
