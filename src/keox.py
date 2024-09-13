import modal
import json
import shlex
import time
from typing import Callable, Any
from version import version

class Keox:
    api: dict
    deno: str = "/root/.deno/bin/deno"

    def __init__(self, api: dict):
        self.api = api
        pass

    def build_image(self, onlog: Callable[[str], Any], force: bool = False):
        image = (
            modal.Image.debian_slim(python_version="3.11.8", force_build=force)
            .apt_install("git")
            .apt_install("curl")
            .apt_install("unzip")
            .apt_install("sysstat")
            .run_commands(
                "curl -fsSL https://deno.land/install.sh | sh -s v1.38.2",
                "git clone https://github.com/koxy-ai/cloud /source",
                # TODO: Update this to be /source/src/ once ready to have deployed APIs:
                f"echo {shlex.quote(json.dumps(self.api))} > /source/src/api.json",
                "python /source/src/builder.py source=/source/heart path=/koxy",
                f"{self.deno} compile --allow-all --no-check --output /koxy/server /koxy/main.ts",
                f"echo 'Built image version: {version()}'"
            )
        )

        return image

    def build_sandbox(self, onlog: Callable[[str], Any], force: bool = False):
        start_at = time.time()
        api = self.api

        onlog(f"Compiling container image...")
        image = self.build_image(onlog, force)
        vol = modal.Volume.from_name(f"vol-{api['id']}", create_if_missing=True)

        onlog(f"Building image & warming up new container...")

        cpu = Keox.read_cpu(api)
        gpu = Keox.read_gpu(api)
        [memory_request, memory_limit, memory] = Keox.read_memory(api)

        timeout = Keox.read_timeout(api) + Keox.extra_timeout()

        onlog(f"[OPTION]: Timeout: {timeout}s")
        onlog(f"[OPTION]: vCPU: {(cpu or 1)*2} cores")
        onlog(f"[OPTION]: Memory: {memory_request}MB - {memory_limit}MB")
        onlog(f"[OPTION]: GPU: {gpu}")

        build_command = [ f"/koxy/server" ]

        sandbox = modal.Sandbox.create(
            *[ "bash", "-c", " && ".join(build_command) ],
            image=image,
            timeout=timeout,
            encrypted_ports=[9009],
            cpu=cpu,
            memory=memory,
            gpu=gpu,
        )

        onlog(f"Built container: {sandbox.object_id}")

        tunnel = sandbox.tunnels()[0]
        host = f"https://{tunnel.host}"
        onlog(f"Connected HTTPS tunnel with {host}")
        start_at = time.time()

        for line in sandbox.stdout:
            if str.startswith(str.lower(line), "listening"):
                took = time.time() - start_at
                print(f"Warmed container in {str(took)[:4]}s")
                onlog(line)
                break
            onlog(line)

        return [sandbox, host]

    @classmethod
    def read_property(cls, api: dict, key: str, default: Any = None):
        if key in api:
            return api[key]

        return default

    @classmethod
    def read_timeout(cls, api: dict):
        timeout = Keox.read_property(api, "timeout", 120)
        return timeout

    @classmethod
    def extra_timeout(cls):
        return 150

    @classmethod
    def read_cpu(cls, api: dict):
        cpu = api["cpu"] if "cpu" in api else 1
        return cpu

    @classmethod
    def read_memory(cls, api: dict):
        memory_request = Keox.read_property(api, "memory_request", 1024)
        memory_limit = Keox.read_property(api, "memory_limit", 2048)
        memory = (memory_request, memory_limit) if isinstance(memory_request, int) and isinstance(memory_limit, int) else None

        return [memory_request, memory_limit, memory]

    @classmethod
    def read_gpu(cls, api: dict):
        gpu = api["gpu"] if "gpu" in api else None

        if gpu == None:
            return None

        count = gpu["count"] if "count" in gpu else 0.125
        type = gpu["type"] if "type" in gpu else "T4"

        if type == "T4":
            return modal.gpu.T4(count=count)

        if type == "L4":
            return modal.gpu.L4(count=count)

        if type == "A10G":
            return modal.gpu.A10G(count=count)

        if type == "A100":
            return modal.gpu.A100(count=count)

        return None