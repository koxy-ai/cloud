import modal
import json
import shlex

class Keox:
    def __init__(self):
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
                "echo 'READY NOW'"
            )
        )

        return image

    def build_sandbox(self, api: str):
        image = self.build_image()
        json_api = json.loads(api)
        cpu = json_api["cpu"] if "cpu" in json_api else 1
        memory_request = json_api["memory"] if "memory" in json_api else 1024
        memory_limit = json_api["memory_limit"] if "memory_limit" in json_api else 2048
        autoscale = json_api["autoscale"] if "autoscale" in json_api else False

        sandbox = modal.Sandbox.create(
            *[
                "bash", 
                "-c", 
                f"""echo {shlex.quote(api)} > /source/api.json && python /source/src/builder.py source=/source/heart path=/koxy && /root/.deno/bin/deno run --allow-all /koxy/main.ts"""
            ],
            image=image,
            timeout=15,
            encrypted_ports=[9009],
            cpu=cpu if autoscale == False else None,
            memory=(memory_request, memory_limit) if autoscale == False else None,
            # gpu=modal.gpu.T4(count=1),
        )

        return sandbox