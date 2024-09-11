import modal
from datetime import datetime
from timing import future, min_to_ms

app = modal.App()

# @app.function(schedule=modal.Period(minutes=1))
def waker():
    sandboxes_pool = modal.Dict.from_name("sandbox-pool", create_if_missing=True)
    apis_pool = modal.Dict.from_name("sandbox-apis", create_if_missing=True)

    for sandbox in sandboxes_pool.values():
        print(sandbox)
        if sandbox["requests"] == None or len(sandbox["requests"]) < 20:
            continue

        

        latest_10_requests = sandbox["requests"][-10:]

        # Check if we have 10 requests during the last 10 minutes

        # sandbox["latest_request"] = datetime.now(timezone.utc).isoformat()

    pass

if __name__ == "__main__":
    waker()