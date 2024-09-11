from datetime import datetime, timezone, timedelta
import time

def min_to_ms(min: int | float) -> int:
    return (min * 60 * 1000).__round__()

def read_iso(iso: str) -> datetime:
        return datetime.fromisoformat(iso)

def now() -> int:
    return datetime.now(timezone.utc).timestamp() * 1000

def ago(iso: str) -> int:
    return (datetime.now(timezone.utc) - read_iso(iso)).total_seconds() * 1000

def future(iso: str) -> int:
    return (read_iso(iso) - datetime.now(timezone.utc)).total_seconds() * 1000