import modal
import json
import shlex

class Keox:
    api: dict

    def __init__(self, api: dict):
        self.api = api
        pass

    def build_image(self):
        image = (
            modal.Image.debian_slim(python_version="3.11.8")
            .apt_install("git")
            .apt_install("curl")
            .apt_install("unzip")
            .run_commands(
                "curl -fsSL https://deno.land/install.sh | sh",
                "git clone https://github.com/koxy-ai/cloud /source",
                f"echo {shlex.quote(json.dumps(self.api))} > /source/api.json",
                "python /source/src/builder.py source=/source/heart path=/koxy",
                "echo 'READY NOW'"
            )
        )

        return image

    def build_sandbox(self, new: bool):
        api = self.api
        image = self.build_image()
        vol = modal.Volume.from_name(f"vol-{api['id']}", create_if_missing=True)
        # deno_vol = modal.Volume.from_name(f"deno-vol-{api['id']}", create_if_missing=True)

        cpu = api["cpu"] if "cpu" in api else 1
        memory_request = api["memory"] if "memory" in api else 1024
        memory_limit = api["memory_limit"] if "memory_limit" in api else 2048
        autoscale = api["autoscale"] if "autoscale" in api else False

        build_command = [
            "/root/.deno/bin/deno run --allow-all /koxy/main.ts"
        ]

        spin_command = [
            "/root/.deno/bin/deno run --allow-all /koxy/main.ts"
        ]

        sandbox = modal.Sandbox.create(
            *[
                "bash", 
                "-c",
                " && ".join(build_command) if new == True else " && ".join(spin_command)
            ],
            image=image,
            timeout=15,
            encrypted_ports=[9009],
            cpu=cpu if autoscale == False else None,
            memory=(memory_request, memory_limit) if autoscale == False else None,
            # volumes={"/koxy": vol}
            # gpu=modal.gpu.T4(count=1),
        )

        return sandbox