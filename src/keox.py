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
            .run_commands(
                "curl -fsSL https://deno.land/install.sh | sh -s v1.38.2",
                "git clone https://github.com/koxy-ai/cloud /source",
                f"echo {shlex.quote(json.dumps(self.api))} > /source/api.json",
                "python /source/src/builder.py source=/source/heart path=/koxy",
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

        cpu = api["cpu"] if "cpu" in api else None
        gpu = self.read_gpu()

        memory_request = api["memory"] if "memory" in api else 1024
        memory_limit = api["memory_limit"] if "memory_limit" in api else 2048
        memory = (memory_request, memory_limit) if isinstance(memory_request, int) and isinstance(memory_limit, int) else None

        timeout = api["timeout"] if "timeout" in api else 15
        autoscale = api["autoscale"] if "autoscale" in api else False

        onlog(f"[OPTION]: Timeout: {timeout}s")
        onlog(f"[OPTION]: vCPU: {(cpu or 1)*2} cores")
        onlog(f"[OPTION]: Memory: {memory_request}MB - {memory_limit}MB")
        onlog(f"[OPTION]: GPU: {gpu}")
        onlog(f"[OPTION]: Autoscale: {autoscale}")

        build_command = [ f"{self.deno} run --allow-all /koxy/main.ts" ]

        sandbox = modal.Sandbox.create(
            *[
                "bash", 
                "-c",
                " && ".join(build_command)
            ],
            image=image,
            timeout=timeout,
            encrypted_ports=[9009],
            cpu=cpu if autoscale == False else None,
            memory=memory if autoscale == False else None,
            gpu=gpu,
        )

        onlog(f"Built container: {sandbox.object_id}")

        tunnel_start = time.time()
        tunnel = sandbox.tunnels()[0]
        host = f"https://{tunnel.host}"
        onlog(f"Connected HTTPS tunnel in {str(time.time() - tunnel_start)[:4]}s")
        start_at = time.time()

        for line in sandbox.stdout:
            if str.startswith(str.lower(line), "listening"):
                took = time.time() - start_at
                print(f"Warmed container in {str(took)[:4]}s")
                onlog(line)
                break
            onlog(line)

        return [sandbox, host]

    def read_gpu(self):
        gpu = self.api["gpu"] if "gpu" in self.api else None

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