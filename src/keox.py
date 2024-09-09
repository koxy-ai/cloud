import modal

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
                # "curl -fsSL https://deno.land/x/install/install.sh | sh",
                "git clone https://github.com/koxy-ai/cloud /source",
                "echo 'READY NOW'"
            )
        )

        return image