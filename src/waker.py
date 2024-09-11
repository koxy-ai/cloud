import modal
from datetime import datetime

app = modal.App()

# @app.function(schedule=modal.Period(minutes=1))
def waker():
    sandboxes_pool = modal.Dict.from_name("sandbox-pool", create_if_missing=True)
    apis_pool = modal.Dict.from_name("sandbox-apis", create_if_missing=True)

    for sandbox in sandboxes_pool.values():
        print(sandbox)
        if sandbox["latest_request"] == None:
            continue

        latest_request = datetime.fromisoformat(sandbox["latest_request"])
        now = datetime.now(timezone.utc)

        if (now - latest_request).total_seconds() < 60:
            print("warm")
            continue

        print("cold")

        # sandbox["latest_request"] = datetime.now(timezone.utc).isoformat()

    pass

if __name__ == "__main__":
    waker()